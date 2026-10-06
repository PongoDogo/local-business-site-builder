/* =====================================================================
   tracking.js — cookie banner, Consent Mode v2 (basic) and Google Analytics 4
   ---------------------------------------------------------------------
   The Google tag (gtag.js) is NOT in the HTML: it is injected from here, ONLY after "Αποδοχή".
   Rules this file implements (Greek law 3471/2006 art. 4 par. 5, Greek DPA guidelines 2020, EDPB 2/2023):
   - Before consent: NO request to Google, NO cookie.
   - "Αποδοχή" and "Απόρριψη" are equal (same size, same style, same level, no "X", no pre-ticked boxes).
   - The choice is kept 6 months (accept and reject alike) and can be changed from "Ρυθμίσεις cookies".
   - If purposes/providers change -> change CONSENT_VERSION and everybody is asked again.

   CHANGE THE GA ID: only the GOOGLE_TAG_ID line + the ?v= of this file in every HTML page (docs/TRACKING-SETUP.md).
   GOOGLE ADS / META: an ID alone is NOT enough. You need a new "Διαφήμιση" category (ADS_ENABLED),
   a new CONSENT_VERSION, banner + privacy texts, and the CSP domains in .htaccess, all in the same deploy.
   ===================================================================== */
(function () {
  'use strict';

  const GOOGLE_TAG_ID = '{{GA4_ID}}';              // Google Analytics 4 ('' = no tracking and no banner at all)
  const ADS_ENABLED = {{ADS_ENABLED}};            // "Advertising" category in the banner (Google Ads / Meta): not yet unless true

  const CONSENT_KEY = '{{CONSENT_KEY}}';          // the visitor's choice (localStorage, "necessary")
  const CONSENT_VERSION = '{{CONSENT_VERSION}}';  // version of the banner texts / purposes
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;       // 6 months
  // first-party cookies written by Google Analytics / Google Ads / Meta Pixel (deleted on withdrawal)
  const TRACKING_COOKIES = /^(_ga|_gid|_gat|_gcl_|_fbp|_fbc)/;
  const PRIVACY_URL = '/privacy.html#cookies';

  // All visible strings in one place (translate here for another language)
  const TEXT = {
    title: 'Cookies',
    intro: ADS_ENABLED
      ? 'Με τη συγκατάθεσή σας χρησιμοποιούμε cookies της Google και της Meta για στατιστικά και διαφήμιση. '
      : 'Με τη συγκατάθεσή σας χρησιμοποιούμε cookies της Google (Google Analytics) για στατιστικά επισκεψιμότητας. ',
    change: 'Μπορείτε να αλλάξετε την επιλογή σας όποτε θέλετε από τις «Ρυθμίσεις cookies». ',
    policy: 'Πολιτική απορρήτου',
    necessary: 'Απαραίτητα', necessaryNote: '(πάντα ενεργά)', necessaryDesc: 'Αποθήκευση της επιλογής σας.',
    stats: 'Στατιστικά', statsDesc: 'Μέτρηση επισκεψιμότητας (Google Analytics).',
    ads: 'Διαφήμιση', adsDesc: 'Μέτρηση και εξατομίκευση διαφημίσεων (Google Ads, Meta).',
    reject: 'Απόρριψη', accept: 'Αποδοχή', settings: 'Ρυθμίσεις', save: 'Αποθήκευση επιλογών',
  };

  // 1) dataLayer + Consent Mode v2: everything "denied" BEFORE anything else (the order matters)
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
  gtag('set', 'ads_data_redaction', true);

  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private browsing etc. */ } }

  // 2) Events (e.g. "phone_click") go to Google Analytics ONLY if the tag is loaded, i.e. only with consent.
  let tagLoaded = false;
  function track(event, params) {
    if (tagLoaded) gtag('event', event, params || {});
  }
  window.siteTrack = { track: track };   // main.js calls window.siteTrack.track(...)

  if (!GOOGLE_TAG_ID) return; // no ID -> stop here: no third-party script, no banner

  // 3) Previous choice: valid only if same version and younger than 6 months
  let consent = readJSON(CONSENT_KEY);
  if (!consent || consent.v !== CONSENT_VERSION || !(Date.now() - Date.parse(consent.ts) < MAX_AGE)) consent = null;

  // Google's code (gtag.js), loaded only with a "yes" to Statistics
  function loadGoogleTag() {
    if (tagLoaded) return;
    tagLoaded = true;
    gtag('js', new Date());
    gtag('config', GOOGLE_TAG_ID, {
      // statistics only: no advertising features (Google Signals / personalisation) without ads consent
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GOOGLE_TAG_ID);
    document.head.appendChild(tag);
  }

  // Deletes this site's Google/Meta cookies (every possible domain form)
  function deleteTrackingCookies() {
    const host = location.hostname;
    const domains = ['', host, '.' + host, '.' + host.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (c) {
      const name = c.split('=')[0].trim();
      if (!TRACKING_COOKIES.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
    try {
      Object.keys(localStorage).forEach(function (k) { if (/^_gcl/.test(k)) localStorage.removeItem(k); });
    } catch (e) { /* nothing */ }
  }

  // 4) Apply the choice (Consent Mode v2) and load the Google tag only with "yes"
  function applyConsent(choice, save) {
    const ads = ADS_ENABLED && !!choice.ads;
    const changed = tagLoaded && consent && (consent.analytics !== !!choice.analytics || consent.ads !== ads);
    consent = {
      v: CONSENT_VERSION,
      ts: save ? new Date().toISOString() : choice.ts,
      analytics: !!choice.analytics,
      ads: ads
    };
    if (save) writeJSON(CONSENT_KEY, consent);
    gtag('consent', 'update', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.ads ? 'granted' : 'denied',
      ad_user_data: consent.ads ? 'granted' : 'denied',
      ad_personalization: consent.ads ? 'granted' : 'denied'
    });
    // Changed their mind while the tag already runs: delete cookies and reload, because a script that
    // has loaded cannot be "unloaded".
    if (changed) { deleteTrackingCookies(); location.reload(); return; }
    if (consent.analytics) loadGoogleTag();
  }

  if (consent) applyConsent(consent, false);

  // 5) Cookie banner. "Accept" and "Reject" are equal. No "X".
  let banner = null;
  let returnFocus = null;
  function closeBanner() {
    if (!banner) return;
    banner.remove();
    banner = null;
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
    returnFocus = null;
  }
  function openBanner(showPrefs, opener) {
    closeBanner();
    returnFocus = opener || null;
    banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'cookie-banner-title');
    banner.setAttribute('aria-describedby', 'cookie-banner-text');
    banner.innerHTML =
      '<h2 class="cookie-banner__title" id="cookie-banner-title" tabindex="-1">' + TEXT.title + '</h2>' +
      '<p id="cookie-banner-text">' + TEXT.intro + TEXT.change + '<a href="' + PRIVACY_URL + '">' + TEXT.policy + '</a></p>' +
      '<div class="cookie-banner__prefs" hidden>' +
      '<p class="cookie-banner__pref cookie-banner__pref--fixed"><span class="cookie-banner__lock" aria-hidden="true"></span><span><strong>' + TEXT.necessary + '</strong> ' + TEXT.necessaryNote + '<br>' + TEXT.necessaryDesc + '</span></p>' +
      '<label class="cookie-banner__pref"><input type="checkbox" name="analytics"><span><strong>' + TEXT.stats + '</strong><br>' + TEXT.statsDesc + '</span></label>' +
      (ADS_ENABLED ? '<label class="cookie-banner__pref"><input type="checkbox" name="ads"><span><strong>' + TEXT.ads + '</strong><br>' + TEXT.adsDesc + '</span></label>' : '') +
      '</div>' +
      '<div class="cookie-banner__actions">' +
      '<button type="button" class="btn cookie-banner__choice" data-choice="reject">' + TEXT.reject + '</button>' +
      '<button type="button" class="btn cookie-banner__choice" data-choice="accept">' + TEXT.accept + '</button>' +
      '<button type="button" class="linklike cookie-banner__more" data-choice="prefs">' + TEXT.settings + '</button>' +
      '</div>';
    document.body.appendChild(banner);

    const prefs = banner.querySelector('.cookie-banner__prefs');
    const more = banner.querySelector('[data-choice="prefs"]');
    const box = function (name) { return banner.querySelector('[name="' + name + '"]'); };
    if (consent) {
      box('analytics').checked = consent.analytics;
      if (box('ads')) box('ads').checked = consent.ads;
    }
    function showPreferences() {
      prefs.hidden = false;
      more.textContent = TEXT.save;
      more.dataset.choice = 'save';
      box('analytics').focus();
    }

    banner.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-choice]');
      if (!btn) return;
      const choice = btn.dataset.choice;
      if (choice === 'prefs') { showPreferences(); return; }
      let picked;
      if (choice === 'accept') picked = { analytics: true, ads: true };
      if (choice === 'reject') picked = { analytics: false, ads: false };
      if (choice === 'save') picked = { analytics: box('analytics').checked, ads: !!(box('ads') && box('ads').checked) };
      closeBanner();
      applyConsent(picked, true);
    });

    if (showPrefs) {
      prefs.hidden = false;
      more.textContent = TEXT.save;
      more.dataset.choice = 'save';
      banner.querySelector('#cookie-banner-title').focus();
    }
  }

  // "Ρυθμίσεις cookies" (footer, privacy page): visible only when tracking is active
  document.querySelectorAll('[data-cookie-settings]').forEach(function (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function () { openBanner(true, btn); });
  });
  if (!consent) openBanner(false);
})();
