/* =====================================================================
   main.js — click measurement, mobile menu, folds (services/areas), click-to-load map
   ---------------------------------------------------------------------
   The page works WITHOUT this file (details/summary are native; the map has a plain link).
   Nothing here needs editing per page: what a button measures is declared in the HTML with
   data-track="phone|cta", data-location="hero", data-label="google_reviews".
   ===================================================================== */
(function () {
  'use strict';

  // If tracking.js did not load, the page continues normally
  const T = window.siteTrack || { track: function () { return ''; } };

  // ---------- 1) Click measurement (only reaches Google Analytics after consent) ----------
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-track]');
    if (!el) return;
    const type = el.getAttribute('data-track');
    const where = el.getAttribute('data-location') || '';
    if (type === 'phone') T.track('phone_click', { click_location: where });
    else T.track('cta_click', { click_location: where, cta_label: el.getAttribute('data-label') || '' });
  });

  // ---------- 2) Mobile menu: closes as soon as a section is chosen ----------
  document.querySelectorAll('.nav__mobile a').forEach(function (link) {
    link.addEventListener('click', function () { link.closest('details').removeAttribute('open'); });
  });

  // ---------- 3) Folds (<details data-fold>): closed rows on mobile, always-open cards from 900px ----------
  // (900px is the same breakpoint as in style.css: change both together.)
  const wide = window.matchMedia('(min-width: 900px)');
  const folds = document.querySelectorAll('details[data-fold]');
  function syncFolds() {
    folds.forEach(function (d) {
      d.open = wide.matches;
      d.querySelector('summary').tabIndex = wide.matches ? -1 : 0;
    });
  }
  syncFolds();
  wide.addEventListener('change', syncFolds);
  document.addEventListener('click', function (e) {
    if (wide.matches && e.target.closest('details[data-fold] > summary')) e.preventDefault();
  });
  // Arriving with a link to a closed fold (e.g. #camera): open it
  function openTarget() {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && target.matches('details[data-fold]')) target.open = true;
  }
  openTarget();
  window.addEventListener('hashchange', openTarget);

  // ---------- 4) Google map: loaded ONLY when the visitor presses the button ----------
  // (until then there is no connection to Google at all: privacy and speed)
  document.querySelectorAll('[data-map-load]').forEach(function (btn) {
    btn.hidden = false;   // without JavaScript the button stays hidden and only the plain link shows
    btn.addEventListener('click', function () {
      const box = btn.closest('[data-map-src]');
      const frame = document.createElement('iframe');
      frame.src = box.getAttribute('data-map-src');
      frame.title = box.getAttribute('data-map-title') || 'Google Maps';
      frame.allowFullscreen = true;
      box.replaceChildren(frame);
      T.track('cta_click', { click_location: 'map', cta_label: 'load_map' });
    });
  });
})();
