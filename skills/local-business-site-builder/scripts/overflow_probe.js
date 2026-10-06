/* overflow_probe.js — paste/run INSIDE the page (browser tool "javascript_tool", or DevTools console) at each phone/tablet width.
   Returns a JSON string with the layout problems that cost the most prompts on the original project:
   horizontal scroll, elements sticking out, decorative/absolute elements covering text, tiny tap targets, images wider than the viewport.
   Typical widths to test: 320, 360, 375, 390, 414, 600, 768, 900, 1024, 1280, 1440 (resize first, then reload, then run).     */
(() => {
  const vw = document.documentElement.clientWidth;
  const out = { viewport: vw, scrollWidth: document.documentElement.scrollWidth, problems: [] };
  const label = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };

  if (out.scrollWidth > vw + 1) out.problems.push({ type: 'horizontal-scroll', by: out.scrollWidth - vw });

  const all = [...document.body.querySelectorAll('*')].filter(visible);
  for (const e of all) {
    const r = e.getBoundingClientRect();
    if (r.right > vw + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('svg') && !e.closest('[aria-hidden="true"]')) {
      out.problems.push({ type: 'sticks-out-right', el: label(e), right: Math.round(r.right) });
      if (out.problems.length > 40) break;
    }
  }
  // decorative / absolutely positioned boxes overlapping text blocks
  const texts = [...document.querySelectorAll('h1,h2,h3,p,li,summary,a,button,label')].filter((e) => visible(e) && e.textContent.trim().length > 2);
  const overlays = all.filter((e) => ['absolute', 'fixed'].includes(getComputedStyle(e).position) && !['SCRIPT', 'STYLE'].includes(e.tagName));
  for (const o of overlays) {
    if (o.matches('.callbar, .cookie-banner, .skip-link, .nav__list, details > .nav__list, .map__card') || o.closest('.callbar, .cookie-banner, .nav__list, .map__card')) continue;
    const ro = o.getBoundingClientRect();
    for (const t of texts) {
      if (o.contains(t) || t.contains(o)) continue;
      const rt = t.getBoundingClientRect();
      const w = Math.min(ro.right, rt.right) - Math.max(ro.left, rt.left);
      const h = Math.min(ro.bottom, rt.bottom) - Math.max(ro.top, rt.top);
      if (w > 4 && h > 4 && (w * h) / (rt.width * rt.height) > 0.12) {
        out.problems.push({ type: 'covers-text', overlay: label(o), text: label(t) + ' "' + t.textContent.trim().slice(0, 30) + '"' });
        break;
      }
    }
  }
  // tap targets (touch devices): at least 44x44 CSS px, inline text links excepted
  if (vw <= 900) {
    for (const e of document.querySelectorAll('a, button, summary, input, select')) {
      if (!visible(e)) continue;
      const r = e.getBoundingClientRect();
      const inline = getComputedStyle(e).display === 'inline';
      if ((r.height < 44 || r.width < 44) && !inline) out.problems.push({ type: 'small-tap-target', el: label(e), size: Math.round(r.width) + 'x' + Math.round(r.height) });
    }
  }
  // images
  for (const img of document.images) {
    if (!visible(img)) continue;
    if (img.getBoundingClientRect().width > vw + 1) out.problems.push({ type: 'image-wider-than-viewport', el: label(img) });
    if (img.complete && img.naturalWidth === 0) out.problems.push({ type: 'broken-image', el: label(img), src: img.currentSrc || img.src });
  }
  // text clipped by overflow hidden (headings wider than their box)
  for (const e of document.querySelectorAll('h1,h2,h3,.btn,button')) {
    if (visible(e) && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') out.problems.push({ type: 'text-clipped', el: label(e) });
  }
  out.ok = out.problems.length === 0;
  return JSON.stringify(out);
})();
