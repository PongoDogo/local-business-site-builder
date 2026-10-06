<!doctype html>
<html lang="{{LANG}}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Πολιτική απορρήτου | {{LEGAL_NAME}}</title>
  <meta name="description" content="Ποια στοιχεία κρατά η {{LEGAL_NAME}} όταν μας καλείτε ή επισκέπτεστε τη σελίδα, για πόσο, και ποια δικαιώματα έχετε.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{{SITE_URL}}/privacy.html">
  <meta name="theme-color" content="{{THEME_COLOR}}">
  <meta name="format-detection" content="telephone=no">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="{{LOCALE}}">
  <meta property="og:site_name" content="{{LEGAL_NAME}}">
  <meta property="og:title" content="Πολιτική απορρήτου | {{LEGAL_NAME}}">
  <meta property="og:description" content="Ποια στοιχεία κρατά η {{LEGAL_NAME}}, για πόσο, και ποια δικαιώματα έχετε.">
  <meta property="og:url" content="{{SITE_URL}}/privacy.html">
  <meta property="og:image" content="{{SITE_URL}}/assets/img/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
{{#if HAS_SVG_FAVICON}}  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
{{/if}}  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
{{FONT_PRELOADS}}  <link rel="stylesheet" href="/assets/css/style.css?v={{CSS_VERSION}}">
{{#if HAS_GA}}  <script src="/assets/js/tracking.js?v={{JS_VERSION}}" defer></script>
{{/if}}  <script src="/assets/js/main.js?v={{JS_VERSION}}" defer></script>
</head>
<body>
<!-- LEGAL NOTE for the agency: this text is a starting point based on Greek GDPR / ePrivacy practice.
     The business owner (or their lawyer / DPO) must confirm it describes what the business REALLY does.
     Update it in the SAME change whenever a provider, a form, an ad pixel or a new purpose is added. -->

<a class="skip-link" href="#main">{{T_SKIP}}</a>

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
    <h1>Πολιτική απορρήτου</h1>
    <p>Τελευταία ενημέρωση: {{DATE_EL}}</p>

    <h2>Ποιοι είμαστε</h2>
    <p>Υπεύθυνος για τα δεδομένα σας είναι η επιχείρηση <strong>{{LEGAL_NAME}}</strong>, {{STREET}}, {{LOCALITY}} {{POSTAL}}, τηλ. <a class="nowrap" href="tel:{{PHONE_E164}}" data-track="phone" data-location="privacy">{{PHONE_DISPLAY}}</a>, email <a href="mailto:{{EMAIL}}">{{EMAIL}}</a>.</p>

    <h2>Τι στοιχεία κρατάμε και γιατί</h2>
    <ul>
      <li><strong>Όταν μας καλείτε ή μας στέλνετε email:</strong> το όνομα, το τηλέφωνο ή το email σας και τη διεύθυνση όπου θα γίνει η εργασία, για να σας απαντήσουμε, να σας πούμε τιμή και να κάνουμε τη δουλειά. Νομική βάση: η σύμβαση που ζητάτε να κλείσουμε (άρθρο 6 παρ. 1 β΄ ΓΚΠΔ).</li>
{{#if HAS_FORM}}      <li><strong>Όταν συμπληρώνετε τη φόρμα επικοινωνίας:</strong> [ΧΡΕΙΑΖΕΤΑΙ: ποια πεδία (όνομα, τηλέφωνο, μήνυμα), ποιος τα λαμβάνει (πάροχος φόρμας/email), πόσο διατηρούνται]. Νομική βάση: άρθρο 6 παρ. 1 β΄ ΓΚΠΔ.</li>
{{/if}}      <li><strong>Παραστατικά (απόδειξη ή τιμολόγιο):</strong> τα στοιχεία που ορίζει η φορολογική νομοθεσία. Νομική βάση: νομική υποχρέωση (άρθρο 6 παρ. 1 γ΄).</li>
      <li><strong>Επίσκεψη στη σελίδα:</strong> ο server καταγράφει αυτόματα τεχνικά στοιχεία (διεύθυνση IP, ώρα, σελίδα, πρόγραμμα περιήγησης). Νομική βάση: το έννομο συμφέρον μας να λειτουργεί η σελίδα με ασφάλεια (άρθρο 6 παρ. 1 στ΄).</li>
    </ul>
    <p>Δεν είστε υποχρεωμένοι να μας δώσετε στοιχεία, αλλά χωρίς τηλέφωνο και διεύθυνση δεν μπορούμε να κάνουμε την εργασία. Τα στοιχεία του παραστατικού τα απαιτεί ο νόμος.</p>

    <h2 id="cookies">Cookies και στατιστικά</h2>
{{#if HAS_GA}}    <p>Μόνο αν το επιτρέψετε, η σελίδα χρησιμοποιεί το Google Analytics της Google Ireland Ltd για στατιστικά επισκεψιμότητας (πόσοι επισκέπτονται τη σελίδα και ποια σημεία της χρησιμοποιούν). Τα cookies του μένουν στη συσκευή σας έως 2 έτη και τα στατιστικά διαγράφονται μετά από 14 μήνες το αργότερο. Νομική βάση: η συγκατάθεσή σας (άρθρο 6 παρ. 1 α΄ ΓΚΠΔ, άρθρο 4 παρ. 5 ν. 3471/2006). Χωρίς συγκατάθεση δεν φορτώνεται τίποτα από την Google. Η επιλογή σας αποθηκεύεται στη συσκευή σας για 6 μήνες. Μπορείτε να ανακαλέσετε τη συγκατάθεση οποτεδήποτε από τις <button class="linklike" type="button" data-cookie-settings hidden>Ρυθμίσεις cookies</button>· η ανάκληση δεν επηρεάζει όσα έγιναν πριν από αυτήν.</p>
{{#else}}    <p>Η σελίδα δεν χρησιμοποιεί cookies παρακολούθησης ούτε εργαλεία στατιστικών. Δεν φορτώνεται τίποτα από τρίτους χωρίς να το ζητήσετε εσείς.</p>
{{/if}}{{#if HAS_MAP}}    <p>Ο χάρτης Google φορτώνεται μόνο αν πατήσετε «Εμφάνιση χάρτη Google». Τότε η Google λαμβάνει τη διεύθυνση IP σας και μπορεί να ορίσει δικά της cookies.</p>
{{/if}}
    <h2>Ποιοι βλέπουν τα στοιχεία</h2>
    <ul>
      <li>Ο πάροχος φιλοξενίας της σελίδας, για τα τεχνικά στοιχεία της επίσκεψης.</li>
      <li>Ο πάροχος του email μας, όταν μας γράφετε.</li>
{{#if HAS_GA_OR_MAP}}      <li>Η Google, {{GOOGLE_RECIPIENT_TEXT}}.</li>
{{/if}}      <li>Η ΑΑΔΕ και, όπου χρειάζεται, λογιστής, για τα παραστατικά.</li>
    </ul>
    <p>Οι πάροχοι{{#if HAS_GA_OR_MAP}} και η Google{{/if}} μπορεί να επεξεργάζονται δεδομένα και εκτός Ευρωπαϊκής Ένωσης, με τις εγγυήσεις του ΓΚΠΔ (τυποποιημένες συμβατικές ρήτρες ή EU-US Data Privacy Framework).</p>

    <h2>Για πόσο τα κρατάμε</h2>
    <ul>
      <li>Στοιχεία όσων μας ρώτησαν αλλά δεν έγινε εργασία: όσο χρειάζεται για να απαντήσουμε στο αίτημά τους.</li>
      <li>Στοιχεία πελατών και παραστατικά: όσο ορίζει η φορολογική νομοθεσία (κατά κανόνα 5 έτη από το τέλος της χρήσης).</li>
      <li>Τεχνικά στοιχεία επίσκεψης: όσο τα κρατά ο πάροχος φιλοξενίας για την ασφάλεια των servers του.</li>
    </ul>

    <h2>Τα δικαιώματά σας</h2>
    <p>Μπορείτε να ζητήσετε να δείτε, να διορθώσετε ή να διαγράψετε τα στοιχεία σας, να περιορίσετε τη χρήση τους ή να τα πάρετε σε ηλεκτρονική μορφή. Η διαγραφή δεν ισχύει για παραστατικά όσο ο νόμος μάς υποχρεώνει να τα κρατάμε.</p>
    <p><strong>Μπορείτε επίσης να αντιταχθείτε</strong> στην καταγραφή των τεχνικών στοιχείων της επίσκεψής σας.</p>
    <p>Για όλα αυτά, στείλτε μας email ή πάρτε μας τηλέφωνο. Αν θεωρείτε ότι δεν σεβαστήκαμε τα δικαιώματά σας, μπορείτε να κάνετε καταγγελία στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (<a href="https://www.dpa.gr" target="_blank" rel="noopener">www.dpa.gr</a>).</p>

    <p><a href="/">← Επιστροφή στην αρχική</a></p>
  </div>
</main>

<footer class="site-footer">
  <div class="container footer__bottom">
    <p>{{LEGAL_NAME}} · {{STREET}}, {{LOCALITY}} {{POSTAL}} · <a href="tel:{{PHONE_E164}}" data-track="phone" data-location="footer">{{PHONE_DISPLAY}}</a> · <a href="mailto:{{EMAIL}}">{{EMAIL}}</a></p>
    <p>ΑΦΜ: {{AFM}} · Αρ. ΓΕΜΗ: {{GEMI}} · <a href="/privacy.html">{{T_PRIVACY}}</a>{{#if HAS_GA}}<button class="linklike footer__cookies" type="button" data-cookie-settings hidden>{{T_COOKIE_SETTINGS}}</button>{{/if}}</p>
  </div>
</footer>

<nav class="callbar" aria-label="{{T_QUICK_CALL}}">
  <a class="callbar__btn" href="tel:{{PHONE_E164}}" data-track="phone" data-location="callbar"><span class="callbar__label">{{T_CALL_BAR}}</span> <span class="callbar__number nowrap">{{PHONE_DISPLAY}}</span></a>
</nav>

</body>
</html>
