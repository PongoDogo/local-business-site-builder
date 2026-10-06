<!doctype html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

  <title>{{SEO_TITLE}}</title>
  <meta name="description" content="{{SEO_DESCRIPTION}}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="{{SITE_URL}}/">
  <meta name="theme-color" content="{{THEME_COLOR}}">
  <meta name="format-detection" content="telephone=no">

  <meta property="og:type" content="website">
  <meta property="og:locale" content="{{LOCALE}}">
  <meta property="og:site_name" content="{{LEGAL_NAME}}">
  <meta property="og:title" content="{{SEO_TITLE}}">
  <meta property="og:description" content="{{SEO_DESCRIPTION}}">
  <meta property="og:url" content="{{SITE_URL}}/">
  <meta property="og:image" content="{{SITE_URL}}/assets/img/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{{OG_IMAGE_ALT}}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{SEO_TITLE}}">
  <meta name="twitter:description" content="{{SEO_DESCRIPTION}}">
  <meta name="twitter:image" content="{{SITE_URL}}/assets/img/og-image.png">

  <link rel="icon" href="/favicon.ico" sizes="48x48">
{{#if HAS_SVG_FAVICON}}  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
{{/if}}  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">

{{FONT_PRELOADS}}  <link rel="stylesheet" href="/assets/css/style.css?v={{CSS_VERSION}}">

{{#if HAS_GA}}  <script src="/assets/js/tracking.js?v={{JS_VERSION}}" defer></script>
{{/if}}  <script src="/assets/js/main.js?v={{JS_VERSION}}" defer></script>

  <!-- JSONLD:START (generated from site-facts.json by: scaffold.mjs derive; do not edit by hand) -->
{{JSONLD}}
  <!-- JSONLD:END -->
</head>
<body>

<a class="skip-link" href="#main">{{T_SKIP}}</a>

<header class="site-header">
  <div class="topbar">
    <div class="container topbar__inner">
      <p class="topbar__status">{{#if HOURS_247}}<span class="status-dot" aria-hidden="true"></span><span class="topbar__long">Ανοιχτά τώρα · 24 ώρες · 7 μέρες · Αργίες</span><span class="topbar__short">Ανοιχτά 24/7 &amp; αργίες</span>{{#else}}<span class="topbar__long">{{HOURS_TEXT}}</span><span class="topbar__short">{{HOURS_SHORT}}</span>{{/if}}</p>
      <a class="topbar__phone" href="tel:{{PHONE_E164}}" data-track="phone" data-location="topbar">
        <svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>
        <span class="nowrap">{{PHONE_DISPLAY}}</span>
      </a>
    </div>
  </div>

  <div class="container header__main">
    <a class="brand" href="/" aria-label="{{LEGAL_NAME}} — {{T_HOME}}">
{{LOGO_IMG}}      <span class="brand__text">
        <span class="brand__name">{{BRAND_WORD}}</span>
        <span class="brand__tag">{{TAGLINE}}</span>
      </span>
    </a>

    <nav class="nav" aria-label="{{T_MAIN_MENU}}">
      <details class="nav__mobile">
        <summary class="nav__toggle"><span class="nav__toggle-text">{{T_MENU}}</span><svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary>
        <ul class="nav__list">
{{NAV_ITEMS}}        </ul>
      </details>
      <ul class="nav__list nav__list--desktop">
{{NAV_ITEMS}}      </ul>
    </nav>

    <a class="btn btn--call btn--header" href="tel:{{PHONE_E164}}" data-track="phone" data-location="header">
      <svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>
      <span>{{T_CALL_NOW}}</span>
    </a>
  </div>
</header>

<main id="main">

[ΧΡΕΙΑΖΕΤΑΙ: build the page sections here (hero, prices, reviews, services, areas, FAQ, contact callout) following references/04-conversion-and-content.md, then delete this line]

</main>

<footer class="site-footer">
  <div class="container footer__grid">
    <div class="footer__col">
      <p class="footer__brand"><span>{{LEGAL_NAME}}</span></p>
      <p>{{FOOTER_BLURB}}</p>
    </div>

    <div class="footer__col">
      <p class="footer__title">{{T_CONTACT}}</p>
      <ul class="footer__list">
        <li><a class="footer__phone" href="tel:{{PHONE_E164}}" data-track="phone" data-location="footer">{{PHONE_DISPLAY}}</a></li>
        <li><a href="mailto:{{EMAIL}}">{{EMAIL}}</a></li>
        <li>
          <address>{{STREET}}, <span class="nowrap">{{LOCALITY}} {{POSTAL}}</span></address>
{{#if MAPS_URL}}          <a href="{{MAPS_URL}}" target="_blank" rel="noopener">{{T_SEE_MAPS}}</a>
{{/if}}        </li>
      </ul>
    </div>

    <div class="footer__col">
      <p class="footer__title">{{T_HOURS_AREAS}}</p>
      <p>{{HOURS_FOOTER}}</p>
      <p>{{AREAS_FOOTER}}</p>
    </div>

    <div class="footer__col">
      <p class="footer__title">{{T_BUSINESS_DATA}}</p>
      <p class="footer__legal">{{LEGAL_NAME}}<br>ΑΦΜ: {{AFM}}<br>Αρ. ΓΕΜΗ: {{GEMI}}</p>
      <ul class="footer__list">
        <li><a href="/privacy.html">{{T_PRIVACY}}</a></li>
{{#if HAS_GA}}        <li><button class="linklike" type="button" data-cookie-settings hidden>{{T_COOKIE_SETTINGS}}</button></li>
{{/if}}      </ul>
    </div>
  </div>
  <div class="container footer__bottom">
    <p>© {{LEGAL_NAME}}</p>
  </div>
</footer>

<nav class="callbar" aria-label="{{T_QUICK_CALL}}">
  <a class="callbar__btn" href="tel:{{PHONE_E164}}" data-track="phone" data-location="callbar">
    <svg class="icon callbar__icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>
    <span class="callbar__label">{{T_CALL_BAR}}</span>
    <span class="callbar__number nowrap">{{PHONE_DISPLAY}}</span>
  </a>
</nav>

</body>
</html>
