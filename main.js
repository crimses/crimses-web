/*
 * main.js — CRIMSES
 * IIFE clásico (sin módulos ES) para que funcione en file://, FTP y cualquier
 * hosting. Cada init está aislado con safe() para que un fallo puntual no
 * rompa el resto del sitio. Ver README.md para cómo editar contenido.
 */
(function () {
  "use strict";

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  /* ---------------------------------------------------------------
   * Año en el footer
   * --------------------------------------------------------------- */
  function initFooterYear() {
    var el = $("[data-year]");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------------
   * Nav: se solidifica al hacer scroll + menú móvil
   * --------------------------------------------------------------- */
  function initNav() {
    var nav = $("[data-nav]");
    if (!nav) return;

    var onScroll = function () {
      if (window.scrollY > 40) nav.classList.add("is-solid");
      else nav.classList.remove("is-solid");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    var toggle = $("[data-nav-toggle]");
    var mobile = $("[data-nav-mobile]");
    if (!toggle || !mobile) return;

    var closeMobile = function () {
      mobile.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", function () {
      var isOpen = mobile.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    $$("a", mobile).forEach(function (a) {
      a.addEventListener("click", closeMobile);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobile.classList.contains("is-open")) {
        closeMobile();
        toggle.focus();
      }
    });
  }

  /* ---------------------------------------------------------------
   * Scroll suave nativo para anchors (ver gotcha B.1.4 — sin Lenis,
   * más robusto entre distintas configuraciones de Windows)
   * --------------------------------------------------------------- */
  function initSmoothAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var navOffset = 88;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - navOffset,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  /* ---------------------------------------------------------------
   * Cursor personalizado — solo desktop con puntero fino.
   * Oculto por opacity:0 hasta el primer mousemove (evita el punto
   * fantasma en 0,0 — gotcha A.3). Reacciona a links y cards.
   * --------------------------------------------------------------- */
  function initCursor() {
    if (!fineHover) return;
    var cursor = $("[data-cursor]");
    var dot = $("[data-cursor-dot]", cursor);
    var ring = $("[data-cursor-ring]", cursor);
    if (!cursor || !dot || !ring) return;

    var mx = 0, my = 0, rx = 0, ry = 0, ready = false;
    var lerp = reduced ? 1 : 0.18;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0) translate(-50%,-50%)";
      if (!ready) {
        ready = true;
        rx = mx; ry = my;
        ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0) translate(-50%,-50%)";
        cursor.classList.add("is-ready");
      }
    });

    function loop() {
      rx += (mx - rx) * lerp;
      ry += (my - ry) * lerp;
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function bindContext(selector, className) {
      $$(selector).forEach(function (el) {
        el.addEventListener("mouseover", function (e) {
          if (!el.contains(e.relatedTarget)) cursor.classList.add(className);
        });
        el.addEventListener("mouseout", function (e) {
          if (!el.contains(e.relatedTarget)) cursor.classList.remove(className);
        });
      });
    }
    bindContext("[data-cursor-link]", "is-link");
    bindContext("[data-cursor-card]", "is-card");
  }

  /* ---------------------------------------------------------------
   * Fondo del hero: anillo de partículas color coral (canvas 2D) que
   * ondula solo todo el tiempo y se aparta del cursor cuando pasa
   * cerca (efecto "imán"). Puramente decorativo — pointer-events:none
   * y aria-hidden en el <canvas> (ver index.html). Se apaga entero con
   * reduced-motion (es un loop infinito — gotcha de animaciones).
   * --------------------------------------------------------------- */
  /* ---------------------------------------------------------------
   * Campo de partículas reutilizable: coral, ondulan solas y se apartan
   * del cursor. Lo usa el fondo del hero (initHeroParticles).
   * --------------------------------------------------------------- */
  function createParticleField(canvas, container) {
    if (!canvas || !container) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var cfg = {
      waveSpeed: 0.4,
      waveAmplitude: 16,  // px, se multiplica por ampJitter de cada partícula
      particleSize: 2.1,  // px
      lerpSpeed: 0.06,
      magnetRadius: 130,  // px
      edgeMargin: 0.04     // % del ancho/alto que se deja libre en los bordes
    };
    var colorRgb = "255, 111, 60"; // --coral

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var mx = -9999, my = -9999;
    var particles = [];

    function countFor(width, height) {
      var area = width * height;
      return Math.max(140, Math.min(420, Math.round(area / 1800)));
    }

    function resize() {
      var rect = container.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (!w || !h) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = countFor(w, h);
      if (particles.length !== count) {
        particles = [];
        var m = cfg.edgeMargin;
        for (var i = 0; i < count; i++) {
          var fx = m + Math.random() * (1 - m * 2);
          var fy = m + Math.random() * (1 - m * 2);
          particles.push({
            fx: fx,
            fy: fy,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            speedJitter: 0.6 + Math.random() * 0.8,
            ampJitter: 0.5 + Math.random() * 0.9,
            size: cfg.particleSize * (0.5 + Math.random() * 0.9),
            alpha: 0.16 + Math.random() * 0.5,
            x: fx * w,
            y: fy * h
          });
        }
      }
    }

    window.addEventListener("mousemove", function (e) {
      var rect = container.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
    });
    window.addEventListener("mouseleave", function () { mx = -9999; my = -9999; });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    resize();

    var t0 = performance.now();

    function frame(now) {
      if (!w || !h || !particles.length) {
        resize();
        if (!w || !h || !particles.length) {
          requestAnimationFrame(frame);
          return;
        }
      }

      var t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);

      particles.forEach(function (p) {
        var baseX = p.fx * w;
        var baseY = p.fy * h;
        var amp = cfg.waveAmplitude * p.ampJitter;
        var wx = Math.sin(t * cfg.waveSpeed * p.speedJitter + p.phaseX) * amp;
        var wy = Math.cos(t * cfg.waveSpeed * p.speedJitter * 0.85 + p.phaseY) * amp;
        var tx = baseX + wx;
        var ty = baseY + wy;

        var dx = tx - mx, dy = ty - my;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < cfg.magnetRadius) {
          var push = 1 - dist / cfg.magnetRadius;
          var ang = Math.atan2(dy, dx);
          tx += Math.cos(ang) * push * 46;
          ty += Math.sin(ang) * push * 46;
        }

        p.x += (tx - p.x) * cfg.lerpSpeed;
        p.y += (ty - p.y) * cfg.lerpSpeed;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + colorRgb + "," + p.alpha + ")";
        ctx.fill();
      });

      requestAnimationFrame(frame);
    }
    // Primer cuadro sincrónico: evita un canvas vacío mientras se espera el
    // primer tick de rAF (que además queda en pausa si la pestaña no está
    // visible, p. ej. al cargar en segundo plano).
    frame(t0);
  }

  function initHeroParticles() {
    if (reduced) return;
    var canvas = $("[data-hero-particles]");
    var hero = $("[data-hero]");
    createParticleField(canvas, hero);
  }

  /* ---------------------------------------------------------------
   * Sección "Cómo trabajamos": el cohete recorre el camino (un <path>
   * de SVG) de mundo en mundo, en bucle infinito — vuela, llega al
   * final, se apaga y reaparece al principio. Solo desktop (el mapa
   * está oculto en mobile, ver @media 960px en styles.css). Si el
   * usuario prefiere menos movimiento, el cohete se oculta directamente
   * y el mapa/los pasos quedan estáticos y perfectamente legibles.
   * --------------------------------------------------------------- */
  function initRoadmap() {
    var map = $(".roadmap-map");
    var pathEl = document.getElementById("roadmap-line");
    var rocket = $("[data-roadmap-rocket]");
    if (!map || !pathEl || !rocket) return;
    if (reduced) {
      rocket.style.display = "none";
      return;
    }

    var total = pathEl.getTotalLength();
    var VB_W = 1000;
    var VB_H = 420;
    var scale = 0;

    function resize() {
      var rect = map.getBoundingClientRect();
      if (!rect.width) return;
      scale = rect.width / VB_W;
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    resize();

    // Para cada círculo de mundo, buscamos a qué longitud de recorrido del
    // <path> corresponde (una sola vez, no en cada cuadro) para poder
    // "encenderlo" en naranja justo cuando el cohete llega a esa altura.
    var worldEls = $$(".roadmap-world", map);
    var worldLens = worldEls.map(function (el) {
      var cs = getComputedStyle(el);
      var wx = (parseFloat(cs.getPropertyValue("--wx")) || 0) / 100 * VB_W;
      var wy = (parseFloat(cs.getPropertyValue("--wy")) || 0) / 100 * VB_H;
      var best = Infinity, bestLen = 0;
      var step = Math.max(1, total / 400);
      for (var l = 0; l <= total; l += step) {
        var p = pathEl.getPointAtLength(l);
        var d = (p.x - wx) * (p.x - wx) + (p.y - wy) * (p.y - wy);
        if (d < best) { best = d; bestLen = l; }
      }
      return bestLen;
    });
    var LIT_EPS = total * 0.01;

    function updateLit(len) {
      for (var i = 0; i < worldEls.length; i++) {
        if (len >= worldLens[i] - LIT_EPS) {
          worldEls[i].classList.add("is-lit");
        } else {
          worldEls[i].classList.remove("is-lit");
        }
      }
    }

    function clearLit() {
      for (var i = 0; i < worldEls.length; i++) worldEls[i].classList.remove("is-lit");
    }

    var FLY = 9000;   // ms: duración del viaje de mundo 1 a mundo 6
    var HOLD = 1200;  // ms: pausa llegando al final
    var FADE = 500;   // ms: se apaga antes de reaparecer al principio
    var GAP = 400;    // ms: quieto y oculto antes de reiniciar
    var CYCLE = FLY + HOLD + FADE + GAP;

    function easeInOutCubic(x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    var LOOKAHEAD = 4;

    function moveTo(len) {
      len = Math.max(0, Math.min(total, len));
      var p = pathEl.getPointAtLength(len);
      var angleDeg;
      if (len + LOOKAHEAD <= total) {
        var ahead = pathEl.getPointAtLength(len + LOOKAHEAD);
        angleDeg = Math.atan2(ahead.y - p.y, ahead.x - p.x) * (180 / Math.PI);
      } else {
        // A los últimos px del camino no les queda "adelante" que medir:
        // getPointAtLength se clampeaba en total y daba un vector de
        // longitud cero (ángulo 0 fijo) — de ahí el giro brusco a
        // horizontal justo al llegar al mundo 6. Acá tomamos la
        // tangente mirando hacia atrás, que en un tramo tan corto da
        // prácticamente el mismo ángulo que veníamos usando.
        var behind = pathEl.getPointAtLength(Math.max(0, len - LOOKAHEAD));
        angleDeg = Math.atan2(p.y - behind.y, p.x - behind.x) * (180 / Math.PI);
      }
      rocket.style.transform =
        "translate(" + (p.x * scale - 32) + "px, " + (p.y * scale - 32) + "px) rotate(" + (angleDeg + 90) + "deg)";
      updateLit(len);
    }

    function frame(now) {
      if (!scale) {
        resize();
        requestAnimationFrame(frame);
        return;
      }

      var t = now % CYCLE;
      if (t < FLY) {
        moveTo(easeInOutCubic(t / FLY) * total);
        rocket.style.opacity = String(Math.min(1, t / 400));
      } else if (t < FLY + HOLD) {
        moveTo(total);
        rocket.style.opacity = "1";
      } else if (t < FLY + HOLD + FADE) {
        moveTo(total);
        rocket.style.opacity = String(1 - (t - FLY - HOLD) / FADE);
      } else {
        moveTo(0);
        rocket.style.opacity = "0";
        clearLit();
      }

      requestAnimationFrame(frame);
    }
    // Primer cuadro sincrónico (mismo motivo que en initHeroParticles: evita
    // depender solo de rAF, que se pausa si la pestaña arranca oculta).
    frame(performance.now());
  }

  /* ---------------------------------------------------------------
   * Elemento firma: comparador de arrastre "antes / después" en el
   * hero. .compare tiene la variable CSS --pos (0–100) que recorta
   * la copia .mock-browser--after vía clip-path (ver styles.css).
   * initCompareSlider() maneja arrastre (puntero), teclado y click
   * directo. playCompareSweep() hace el barrido automático de
   * bienvenida y el que dispara el botón "Ver la transformación".
   * --------------------------------------------------------------- */
  function setComparePos(compare, handle, pct) {
    pct = Math.max(0, Math.min(100, pct));
    compare.style.setProperty("--pos", pct + "%");
    handle.setAttribute("aria-valuenow", String(Math.round(pct)));
    return pct;
  }

  function pctFromClientX(compare, clientX) {
    var rect = compare.getBoundingClientRect();
    if (!rect.width) return 50;
    return ((clientX - rect.left) / rect.width) * 100;
  }

  function initCompareSlider() {
    var compare = $("[data-compare]");
    var handle = $("[data-compare-handle]", compare);
    if (!compare || !handle) return;

    var dragging = false;

    function onMove(e) {
      if (!dragging) return;
      setComparePos(compare, handle, pctFromClientX(compare, e.clientX));
    }

    compare.addEventListener("pointerdown", function (e) {
      dragging = true;
      compare.setPointerCapture(e.pointerId);
      setComparePos(compare, handle, pctFromClientX(compare, e.clientX));
    });
    compare.addEventListener("pointermove", onMove);
    compare.addEventListener("pointerup", function () { dragging = false; });
    compare.addEventListener("pointercancel", function () { dragging = false; });

    handle.addEventListener("keydown", function (e) {
      var current = parseFloat(handle.getAttribute("aria-valuenow")) || 0;
      var step = 5;
      var next = null;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = current - step;
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = current + step;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = 100;
      if (next === null) return;
      e.preventDefault();
      setComparePos(compare, handle, next);
    });
  }

  function playCompareSweep() {
    var compare = $("[data-compare]");
    var handle = $("[data-compare-handle]", compare);
    if (!compare || !handle) return;

    if (reduced) {
      setComparePos(compare, handle, 50);
      return;
    }

    var start = parseFloat(getComputedStyle(compare).getPropertyValue("--pos")) || 38;
    var keyframes = [start, 82, 18, 50];
    var stepDuration = 480;
    var i = 0;

    function nextStep() {
      if (i >= keyframes.length) return;
      var from = i === 0 ? start : keyframes[i - 1];
      var to = keyframes[i];
      var t0 = performance.now();
      i++;
      function tick(now) {
        var t = Math.min(1, (now - t0) / stepDuration);
        var eased = 1 - Math.pow(1 - t, 3);
        setComparePos(compare, handle, from + (to - from) * eased);
        if (t < 1) requestAnimationFrame(tick);
        else nextStep();
      }
      requestAnimationFrame(tick);
    }
    nextStep();
  }

  function bindReplayButton() {
    var btn = $("[data-replay-morph]");
    if (!btn) return;
    btn.addEventListener("click", playCompareSweep);
  }

  /* ---------------------------------------------------------------
   * Secuencia de carga: un único momento orquestado en el hero
   * (splash → nav → kicker → título → subtítulo → acciones → mock
   * browser → morph). Si GSAP no cargó, se revela todo igual sin
   * animación — el contenido nunca depende de que la librería exista.
   * --------------------------------------------------------------- */
  function initLoadSequence() {
    var splash = $("[data-splash]");
    var heroReveals = $$(".hero [data-reveal]");
    var started = false;

    function revealHeroInstant() {
      heroReveals.forEach(function (el) {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    }

    function runTimeline() {
      if (started) return;
      started = true;

      if (!window.gsap) {
        revealHeroInstant();
        setTimeout(playCompareSweep, 500);
        return;
      }

      gsap.set(heroReveals, { opacity: 0, y: reduced ? 0 : 26 });
      var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.to(heroReveals, {
        opacity: 1,
        y: 0,
        duration: reduced ? 0.4 : 0.9,
        stagger: reduced ? 0 : 0.12
      }).add(playCompareSweep, reduced ? "-=0.2" : "+=0.35");
    }

    function hideSplash() {
      if (!splash) { runTimeline(); return; }
      if (!splash.classList.contains("is-out")) {
        splash.classList.add("is-out");
      }
      setTimeout(runTimeline, reduced ? 120 : 350);
    }

    if (document.readyState === "complete") {
      setTimeout(hideSplash, 300);
    } else {
      window.addEventListener("load", function () { setTimeout(hideSplash, 250); });
    }
    // seguro adicional: si "load" nunca llega (recurso colgado), arrancar igual
    setTimeout(hideSplash, 4200);
  }

  /* ---------------------------------------------------------------
   * Scroll-triggered reveals (todo lo que no es el hero) con stagger
   * real y easing custom vía GSAP + ScrollTrigger. Con seguro a los
   * 6s por si algún elemento nunca cruza el umbral (gotcha A.8).
   * --------------------------------------------------------------- */
  function initScrollReveals() {
    var items = $$("[data-reveal]").filter(function (el) { return !el.closest(".hero"); });
    if (!items.length) return;

    if (!(window.gsap && window.ScrollTrigger)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    gsap.set(items, { opacity: 0, y: reduced ? 0 : 26 });

    ScrollTrigger.batch(items, {
      start: "top 88%",
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: reduced ? 0.35 : 0.85,
          ease: "expo.out",
          stagger: reduced ? 0 : 0.1,
          onComplete: function () {
            batch.forEach(function (el) { el.classList.add("is-visible"); });
          }
        });
      }
    });

    setTimeout(function () {
      items.forEach(function (el) {
        if (!el.classList.contains("is-visible") && el.getBoundingClientRect().top < window.innerHeight) {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.3 });
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ---------------------------------------------------------------
   * Trabajos realizados: carrusel de banners tipo Apple.
   * Cada <li class="work-slide"> es un banner ilustrado; el carril
   * (.work-carousel-track) se corre con transform: translateX(), calculado
   * a partir del ancho real del slide activo (offsetLeft), para que quede
   * siempre alineado al mismo punto de la izquierda y el siguiente asome
   * por el borde derecho — el desplazamiento en sí lo suaviza la propia
   * CSS transition del carril, no hace falta lerp a mano.
   *
   * Avanza solo cada AUTOPLAY_MS; se puede pausar con el botón, saltar a
   * un slide con los puntitos (que además muestran cuánto falta para el
   * próximo avance, como una barra de progreso), pasar con las flechas
   * del teclado con foco adentro del carrusel, o deslizando el dedo en
   * mobile. Con prefers-reduced-motion arranca pausado (nada de loop
   * automático) pero se puede seguir navegando a mano en cualquier
   * momento — y si el usuario igual toca "reproducir", el avance
   * automático funciona (es una acción que el usuario pidió, no un loop
   * ambiental que se le imponga).
   * --------------------------------------------------------------- */
  function initWorkCarousel() {
    var root = $("[data-work-carousel]");
    var track = $("[data-work-track]", root || document);
    var slides = $$("[data-work-slide]", track || document);
    var dotsWrap = $("[data-work-dots]", root || document);
    var dots = $$("[data-work-dot]", dotsWrap || document);
    var playBtn = $("[data-work-play]", root || document);
    var titleEl = $("[data-work-title]");
    var descEl = $("[data-work-desc]");
    if (!root || !track || !slides.length || !dots.length) return;

    var n = slides.length;
    var AUTOPLAY_MS = 5000;
    var current = 0;
    var playing = !reduced;
    var pausedByHover = false;
    var startTime = 0;
    var raf = null;

    function updateTransform() {
      track.style.transform = "translateX(-" + slides[current].offsetLeft + "px)";
    }

    function updateCaption() {
      var s = slides[current];
      if (titleEl) titleEl.textContent = s.getAttribute("data-title") || "";
      if (descEl) descEl.textContent = s.getAttribute("data-desc") || "";
    }

    function updateClasses() {
      slides.forEach(function (s, i) { s.classList.toggle("is-active", i === current); });
      dots.forEach(function (d, i) {
        var isActive = i === current;
        d.classList.toggle("is-active", isActive);
        if (isActive) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
        var fill = d.firstElementChild;
        if (fill) fill.style.transform = "scaleX(0)";
      });
    }

    function goTo(i) {
      current = ((i % n) + n) % n;
      startTime = 0;
      updateTransform();
      updateCaption();
      updateClasses();
    }

    function setPlaying(next) {
      playing = next;
      startTime = 0;
      if (playBtn) {
        playBtn.classList.toggle("is-paused", !playing);
        playBtn.setAttribute("aria-label", playing ? "Pausar reproducción automática" : "Reanudar reproducción automática");
      }
      ensureRunning();
    }

    function ensureRunning() {
      if (raf) return;
      raf = requestAnimationFrame(loop);
    }

    function loop(t) {
      raf = null;
      var advancing = playing && !pausedByHover && !document.hidden;

      if (advancing) {
        if (!startTime) startTime = t;
        var elapsed = t - startTime;
        var p = Math.min(1, elapsed / AUTOPLAY_MS);
        var fill = dots[current] && dots[current].firstElementChild;
        if (fill) fill.style.transform = "scaleX(" + p + ")";
        if (p >= 1) goTo(current + 1);
      } else {
        startTime = 0;
      }

      if (playing) ensureRunning();
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () { goTo(i); });
    });

    slides.forEach(function (slide, i) {
      slide.addEventListener("click", function () {
        if (i !== current) goTo(i);
      });
    });

    if (playBtn) {
      playBtn.addEventListener("click", function () { setPlaying(!playing); });
    }

    // Pausa al pasar el mouse (solo puntero fino) — igual que los otros
    // carruseles del sitio, para poder mirar el banner con calma. No
    // toca el botón de play/pausa: es un pausado temporal, no una acción
    // del usuario.
    if (fineHover) {
      root.addEventListener("mouseenter", function () { pausedByHover = true; });
      root.addEventListener("mouseleave", function () { pausedByHover = false; ensureRunning(); });
    }

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1); }
    });

    // Deslizar con el dedo en mobile — umbral de 40px para no confundir
    // con un scroll vertical normal de la página.
    var touchX = null;
    root.addEventListener("touchstart", function (e) {
      touchX = e.changedTouches[0].clientX;
    }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) < 40) return;
      goTo(dx < 0 ? current + 1 : current - 1);
    }, { passive: true });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateTransform, 150);
    });

    updateTransform();
    updateCaption();
    updateClasses();
    if (!playing && playBtn) {
      playBtn.classList.add("is-paused");
      playBtn.setAttribute("aria-label", "Reanudar reproducción automática");
    }
    if (playing) ensureRunning();
  }

  /* ---------------------------------------------------------------
   * Reseñas: contorno que brilla en naranja siguiendo el cursor,
   * bien pegado al borde de la card (::after con mask-composite,
   * ver .testimonial-card en styles.css). Solo desktop con puntero
   * fino: en touch no hay cursor que seguir, así que ni se activa
   * (la card se ve igual, sin el brillo).
   * --------------------------------------------------------------- */
  function initTestimonialGlow() {
    if (!fineHover) return;
    var cards = $$(".testimonial-card");
    if (!cards.length) return;

    cards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--glow-x", x + "%");
        card.style.setProperty("--glow-y", y + "%");
      });
    });
  }

  /* ---------------------------------------------------------------
   * Formulario de contacto — envía a Formspree (sin backend propio).
   * --------------------------------------------------------------- */
  function initContactForm() {
    var form = $("[data-contact-form]");
    if (!form) return;
    var status = $("[data-form-status]", form);
    var btn = $('button[type="submit"]', form);
    var endpoint = "https://formspree.io/f/xwlkndzr";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      if (btn) btn.disabled = true;
      if (status) {
        status.textContent = "Enviando…";
        status.classList.remove("is-success");
      }

      var emailValue = form.querySelector("#cf-email");

      fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form)
      })
        .then(function (response) {
          if (!response.ok) throw new Error("form submission failed");
          if (status) {
            status.textContent = "¡Listo! Te vamos a responder a la brevedad" +
              (emailValue && emailValue.value ? " a " + emailValue.value : "") + ".";
            status.classList.add("is-success");
          }
          form.reset();
        })
        .catch(function () {
          if (status) {
            status.textContent = "No pudimos enviar tu mensaje. Escribinos directo a support@crimses.com.";
            status.classList.remove("is-success");
          }
        })
        .then(function () {
          if (btn) btn.disabled = false;
        });
    });
  }

  /* ---------------------------------------------------------------
   * Boot
   * --------------------------------------------------------------- */
  function boot() {
    safe(initFooterYear, "initFooterYear");
    safe(initNav, "initNav");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initCursor, "initCursor");
    safe(initHeroParticles, "initHeroParticles");
    safe(initCompareSlider, "initCompareSlider");
    safe(initRoadmap, "initRoadmap");
    safe(initWorkCarousel, "initWorkCarousel");
    safe(initTestimonialGlow, "initTestimonialGlow");
    safe(initContactForm, "initContactForm");
    safe(bindReplayButton, "bindReplayButton");
    safe(initScrollReveals, "initScrollReveals");
    safe(initLoadSequence, "initLoadSequence");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
