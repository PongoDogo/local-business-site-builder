<!doctype html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>{{T_404_TITLE}} | {{LEGAL_NAME}}</title>
  <meta name="robots" content="noindex">
  <meta name="theme-color" content="{{THEME_COLOR}}">
  <meta name="format-detection" content="telephone=no">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
{{#if HAS_SVG_FAVICON}}  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
{{/if}}  <!-- The 404 page is served at ANY url depth: every path here MUST start with "/" -->
  <link rel="stylesheet" href="/assets/css/style.css?v={{CSS_VERSION}}">
{{#if HAS_GA}}  <script src="/assets/js/tracking.js?v={{JS_VERSION}}" defer></script>
{{/if}}  <script src="/assets/js/main.js?v={{JS_VERSION}}" defer></script>
</head>
<body>

<header class="site-header">
  <div class="topbar">
    <div class="container topbar__inner">
      <p class="topbar__status">{{#if HOURS_247}}<span class="status-dot" aria-hidden="true"></span><span class="topbar__long">Ανοιχτά τώρα · 24 ώρες · 7 μέρες · Αργίες</span><span class="topbar__short">Ανοιχτά 24/7 &amp; αργίες</span>{{#else}}<span class="topbar__long">{{HOURS_TEXT}}</span><span class="topbar__short">{{HOURS_SHORT}}</span>{{/if}}</p>
      <a class="topbar__phone" href="tel:{{PHONE_E164}}" data-track="phone" data-location="topbar"><span class="nowrap">{{PHONE_DISPLAY}}</span></a>
    </div>
  </div>
  <div class="container header__main">
    <a class="brand" href="/" aria-label="{{LEGAL_NAME}} — {{T_HOME}}">
{{LOGO_IMG}}      <span class="brand__text"><span class="brand__name">{{BRAND_WORD}}</span><span class="brand__tag">{{TAGLINE}}</span></span>
    </a>
  </div>
</header>

<main id="main" class="page">
  <div class="container container--narrow">
    <h1>{{T_404_H1}}</h1>
    <p>{{T_404_TEXT}}</p>
    <div class="page__actions">
      <a class="btn btn--call btn--xl" href="tel:{{PHONE_E164}}" data-track="phone" data-location="404">
        <span class="btn__stack"><span class="btn__small">{{T_404_CALL}}</span><span class="btn__number nowrap">{{PHONE_DISPLAY}}</span></span>
      </a>
      <a class="btn btn--ghost btn--lg" href="/">{{T_404_HOME}}</a>
    </div>
  </div>
</main>

<footer class="site-footer">
  <div class="container footer__bottom">
    <p>{{LEGAL_NAME}} · {{STREET}}, {{LOCALITY}} {{POSTAL}} · <a href="tel:{{PHONE_E164}}" data-track="phone" data-location="footer">{{PHONE_DISPLAY}}</a></p>
    <p><a href="/privacy.html">{{T_PRIVACY}}</a>{{#if HAS_GA}}<button class="linklike footer__cookies" type="button" data-cookie-settings hidden>{{T_COOKIE_SETTINGS}}</button>{{/if}}</p>
  </div>
</footer>

<nav class="callbar" aria-label="{{T_QUICK_CALL}}">
  <a class="callbar__btn" href="tel:{{PHONE_E164}}" data-track="phone" data-location="callbar"><span class="callbar__label">{{T_CALL_BAR}}</span> <span class="callbar__number nowrap">{{PHONE_DISPLAY}}</span></a>
</nav>

</body>
</html>
