/*
 * lib/manifest.js — datos globales de marca de CRIMSES.
 * El contenido de Servicios, Portfolio y Reseñas vive directo en index.html
 * (hardcodeado, con comentarios que explican cómo agregar items nuevos —
 * ver README.md). Este archivo solo expone datos que el propio main.js
 * necesita leer en tiempo de ejecución.
 */
(function () {
  "use strict";

  window.__BRAND__ = {
    name: "CRIMSES",
    tagline: "Tu negocio ya es bueno. Que se vea así también en internet.",
    email: "ccrimses@gmail.com",
    foundedYear: 2026
  };
})();
