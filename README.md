# CRIMSES — sitio propio

Vanilla HTML + CSS + JS, sin build ni frameworks. Abrí `index.html` directo en
el navegador o subilo a cualquier hosting — funciona igual.

```
crimses/
├── index.html
├── styles.css
├── main.js
├── lib/            ← GSAP + ScrollTrigger (descargados, no CDN)
├── assets/img/     ← reservado para fotos reales cuando existan
├── tools/          ← reservado para scripts de desarrollo
└── README.md
```

## Cómo agregar/editar un trabajo en "Trabajos realizados"

En `index.html`, dentro de `<section id="portfolio" class="work">`, cada
trabajo es un `<li class="work-slide">` (con un `<article class="work-banner">`
adentro) dentro de `.work-carousel-track`. Es un carrusel estilo Apple: un
slide grande centrado con un pedacito del siguiente asomando al costado,
título/descripción arriba que cambian según el slide activo, y abajo
puntitos + botón de play/pausa. Todo lo mueve `initWorkCarousel()` en
`main.js` (transform + transición CSS, sin librerías; auto-avanza cada 5s
salvo que el usuario pause, pase el mouse, o tenga "reducir movimiento"
activado). Los 4 que hay ahora son **maquetas/ilustraciones de demostración**
(badge "Ejemplo"): 1 es wireframe armado en HTML/CSS puro (clases `wfb-*`,
"Wine bar de barrio") y 3 ("Restaurante de autor", "Centro de estética",
"Carpintería a medida") usan una imagen ilustrativa en vez del wireframe,
como ejemplo de ambos formatos posibles. Justo arriba del primer
bloque hay un comentario en el HTML con estos mismos pasos:

1. Copiá un `<li class="work-slide">` completo (con su `<article
   class="work-banner">` adentro).
2. Cambiá `data-title` / `data-desc` del `<li>` (son los textos que se ven
   arriba del carrusel cuando ese slide está activo) y el texto de
   `.work-banner-url` (debe ser coherente con `data-title`).
3. El contenido de `.work-banner-hero` puede ser un wireframe `wfb-*` (como
   los slides 2 a 4) o una imagen: agregá la clase `work-banner-hero--photo`
   al div y adentro una `<img class="work-banner-photo" src="assets/img/...">`
   (se recorta sola con `object-fit: cover` — ver el slide 1 como ejemplo).
4. Si es un trabajo **real** de un cliente: borrá el
   `<span class="work-banner-badge">Ejemplo</span>`.
5. Actualizá el `aria-label` del `<article>` con el título nuevo.

No hace falta tocar `main.js` ni `styles.css` — el carrusel, el rótulo y los
puntitos ya funcionan con cualquier cantidad de slides (agregar o sacar un
`<li>` alcanza; recordá agregar/sacar también su `<button class="work-dot">`
correspondiente en `.work-carousel-dots`).

## Cómo agregar una reseña real

Mismo patrón, en `<section id="resenas">`. Cada reseña es un
`<article class="testimonial-card">` dentro de dos `<ul class="testimonial-marquee-list">`
idénticas (carrusel eterno sin JS, mismo truco que el de marcas): las
tarjetas entran y salen solas por los dos bordes de la pantalla en bucle. Hay
un comentario en el HTML con estos mismos pasos arriba del primer bloque:

1. Copiá un `<li>` completo con su `<article class="testimonial-card">`.
2. Borrá el `<span class="testimonial-demo-badge">`.
3. Reemplazá la cita, el nombre y el rubro/negocio.
4. Repetí el mismo cambio en **ambas** `<ul>` (son dos copias idénticas para
   que el loop sea parejo — si solo cambiás una, se nota el salto cuando el
   bucle vuelve a empezar).

## Cómo activar Instagram y WhatsApp

En `<section id="contacto">` hay dos `<span class="contact-pending">` que
dicen "Próximamente". Al lado de cada uno hay un comentario que indica el
`<a>` exacto a escribir. Cuando existan las cuentas:

1. Borrá el `<span class="contact-pending">Próximamente</span>`.
2. Escribí en su lugar el link que indica el comentario de al lado:
   - Instagram: `<a href="https://instagram.com/USUARIO" target="_blank" rel="noopener">@usuario</a>`
   - WhatsApp: `<a href="https://wa.me/549XXXXXXXXXX" target="_blank" rel="noopener">Escribinos</a>`
3. Reemplazá `USUARIO` / el número por los reales.

## Formulario de contacto

Hoy el formulario de `#contacto` valida los campos y simula un envío (mensaje
de éxito) pero no manda el mail a ningún lado todavía. En `main.js`, dentro de
`initContactForm()`, hay un comentario `// TODO backend` marcando exactamente
dónde reemplazar el `setTimeout` simulado por un `fetch()` real cuando haya
un servicio (Formspree, un backend propio, etc.).

## Datos de marca

`lib/manifest.js` expone `window.__BRAND__` (nombre, tagline, mail, año de
fundación) para que `main.js` no tenga textos de marca hardcodeados dentro
de la lógica. Si cambia el mail de contacto o la tagline, editar ahí.

## Notas técnicas rápidas

- GSAP y ScrollTrigger están en `lib/`, no por CDN — el sitio funciona sin
  internet y abierto directo como archivo (`file://`).
- Todo el contenido (servicios, trabajos, reseñas) está escrito directo en
  `index.html`, no generado por JS — así el sitio tiene contenido real aunque
  falle todo el JavaScript.
- Si el usuario tiene "reducir movimiento" activado en su sistema, las
  animaciones se acortan pero nada deja de funcionar.
- Cambiá el `?v=20260821` de `styles.css` y `main.js` cuando subas cambios a
  producción, para evitar que el navegador sirva una versión vieja en caché.
