/* Post-Fire Planting Guide — page logic. */
(function () {
  'use strict';
  const D = window.PFG_DATA, M = window.PFG_MODEL, T = window.PFG_T;
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));

  const state = { lang: 'ko', mode: 'test', answers: {}, frameG: null, phmode: 'unknown', phAfter: null, phBefore: null, texture: 'loam', shown: false, open: null };
  try { const s = localStorage.getItem('pfg-lang'); if (s === 'ko' || s === 'en') state.lang = s; else throw 0; }
  catch (e) { state.lang = (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en'; }

  const t = (k, v) => { const e = T[k]; let s = e ? (e[state.lang] || e.ko) : k; if (v) for (const n in v) s = s.split('{' + n + '}').join(v[n]); return s; };
  const L = v => (v && typeof v === 'object') ? (v[state.lang] || v.ko) : v;
  const fx = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
  const pct = v => String(Math.round(v));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- simple line icons for answer cards ----------
  const ICON = {
    tree: '<svg viewBox="0 0 48 48"><path d="M24 6c-7 0-12 5-12 11 0 5 3 8 7 9v14h10V26c4-1 7-4 7-9 0-6-5-11-12-11z" fill="#3f8f45"/><rect x="21" y="26" width="6" height="16" fill="#7b5a43"/></svg>',
    field: '<svg viewBox="0 0 48 48"><rect x="4" y="34" width="40" height="8" fill="#7b5a43"/><path d="M10 34c0-6 2-10 2-14M18 34c0-5-2-9-3-12M26 34c0-7 2-11 3-15M34 34c0-5-1-8-3-11M40 34c0-4 1-7 2-9" stroke="#3f8f45" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    green: '<svg viewBox="0 0 48 48"><circle cx="24" cy="17" r="12" fill="#3f8f45"/><rect x="21" y="26" width="6" height="16" fill="#5a4436"/></svg>',
    scorched: '<svg viewBox="0 0 48 48"><circle cx="24" cy="17" r="12" fill="#a8743a"/><rect x="21" y="26" width="6" height="16" fill="#2d2a27"/></svg>',
    consumed: '<svg viewBox="0 0 48 48"><path d="M24 42V12M24 22l-8-8M24 18l7-7M24 28l-6-4M24 26l7-5" stroke="#2d2a27" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    litter: '<svg viewBox="0 0 48 48"><rect x="4" y="36" width="40" height="6" fill="#4a4743"/><path d="M8 36l3-5 3 5M18 36l2-4 2 4M30 36l3-5 3 5" stroke="#d07a2c" stroke-width="2.5" fill="none"/><circle cx="24" cy="15" r="9" fill="#3f8f45"/><rect x="22" y="22" width="4" height="14" fill="#5a4436"/></svg>',
    shrub: '<svg viewBox="0 0 48 48"><rect x="4" y="36" width="40" height="6" fill="#4a4743"/><path d="M10 36c0-8 4-14 8-16M38 36c0-8-4-14-8-16" stroke="#d07a2c" stroke-width="3" fill="none"/><circle cx="24" cy="12" r="8" fill="#3f8f45"/><rect x="22" y="18" width="4" height="18" fill="#5a4436"/></svg>',
  };
  $$('[data-icon]').forEach(el => { el.innerHTML = ICON[el.dataset.icon] || ''; });

  // ---------- reading inputs ----------
  function currentLoad() {
    if (state.mode === 'measure') {
      if (!(state.frameG > 0)) return null;
      return { load: M.frameToLoad(state.frameG), source: 'measure' };
    }
    const r = M.severityFromAnswers(state.answers);
    if (!r) return null;
    return { load: D.SEVERITY[r.cls].load, cls: r.cls, basis: r.basis, source: 'test' };
  }
  function currentPH() {
    const m = state.phmode;
    if (m === 'after' && isFinite(state.phAfter)) return { mode: 'after', value: state.phAfter };
    if (m === 'before' && isFinite(state.phBefore)) return { mode: 'before', value: state.phBefore };
    return { mode: 'unknown' };
  }

  // ---------- step 1 visibility and summary ----------
  function syncQuestions() {
    const a = state.answers;
    $('#qCanopy').hidden = a.trees !== 'yes';
    $('#qUnder').hidden = !(a.trees === 'yes' && a.canopy === 'green');
    $('#qAsh').hidden = a.trees !== 'no';
    $('#paneTest').hidden = state.mode !== 'test';
    $('#paneMeasure').hidden = state.mode !== 'measure';
    $('#tabTest').setAttribute('aria-selected', state.mode === 'test');
    $('#tabMeasure').setAttribute('aria-selected', state.mode === 'measure');
  }
  function renderSev() {
    const c = currentLoad(), out = $('#sevOut');
    if (!c) { out.className = 'result-line'; out.textContent = state.mode === 'measure' ? t('measNeed') : t('sevNeed'); $('#goBtn').disabled = true; return; }
    out.className = 'result-line ok';
    if (c.source === 'measure') out.textContent = t('measOut', { load: fx(c.load, 1) });
    else {
      const cls = t({ low: 'sevLow', mid: 'sevMid', high: 'sevHigh' }[c.cls]);
      out.innerHTML = `<b>${esc(t('sevOut', { cls, load: fx(c.load, 1) }))}</b>` +
        (c.basis === 'moderate' ? `<span class="note">${esc(t('sevBasisModerate'))}</span>` : '') +
        (c.basis === 'ash' ? `<span class="note">${esc(t('sevBasisAsh'))}</span>` : '');
    }
    $('#goBtn').disabled = false;
  }

  // ---------- results ----------
  const VERDICT_ICON = {
    yes: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    maybe: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v6M8 12.5v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    no: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  };
  function phText(a) {
    if (a.phWorst === 2) return t('phOk');
    if (a.phBest === 0) return t('phBad');
    if (a.tooLow && a.sLo < 2) return t('phLowW');
    if (a.tooHigh && a.sHi < 2) return t('phHighW');
    return t('phPart');
  }
  function advice(a, ph) {
    const c = a.crop, out = [];
    if (!a.tooHigh && !a.tooLow) out.push(t('advNone'));
    if (a.tooHigh) {
      const s = M.sulfurPlan(ph.hi, c, state.texture);
      if (s) {
        if (s.capped) out.push(t('advCapped'));
        out.push(t('advHigh', { steps: t('unitPH', { v: fx(s.steps, 1) }), g: Math.round(s.gPerM2), tex: L(T.texName)[state.texture] }));
        out.push(s.seasons > 1 ? t('advSplit', { n: s.seasons }) : t('advOne'));
      }
    }
    if (a.tooLow) out.push(t('advLow', { o1: fx(c.ph[0], 1) }));
    if (ph.mode !== 'after' && (a.tooHigh || a.tooLow)) out.push(t('advMeasure'));
    if (a.tooHigh || a.tooLow) out.push(t('advTest'));
    return out;
  }
  function renderResults() {
    const c = currentLoad(); if (!c) return;
    const ph = M.phPrediction(c.load, currentPH());
    const ec = M.ecScenarios(c.load);
    const sevName = c.cls ? t({ low: 'sevLow', mid: 'sevMid', high: 'sevHigh' }[c.cls]) : null;
    const phTxt = ph.mode === 'after' ? `${fx(ph.lo, 1)} <small>${esc(t('phAfterNote'))}</small>`
      : `${fx(ph.lo, 1)}–${fx(ph.hi, 1)}${ph.beyond ? '+' : ''} <small>${esc(t('phBase', { b: fx(ph.base, 1) }))}</small>`;
    $('#summary').innerHTML = `
      <div class="kv"><span>${esc(t('sumLoad'))}</span><b>${fx(c.load, 1)} <small>Mg/ha</small></b>${sevName ? `<em>${esc(sevName)}</em>` : ''}</div>
      <div class="kv"><span>${esc(t('sumEC'))}</span>
        <ul class="ec"><li><b>${fx(ec.wildfire[1], 2)}</b> <small>dS/m · ${esc(t('ecWild'))}</small></li>
        <li><b>${fx(ec.salty, 1)}</b> <small>dS/m · ${esc(t('ecSalty'))}</small></li>
        <li><b>${fx(ec.firewood, 1)}</b> <small>dS/m · ${esc(t('ecWorst'))}</small></li></ul></div>
      <div class="kv"><span>${esc(t('sumPH'))}</span><b>${phTxt}</b>${ph.mode !== 'after' ? `<em class="muted">${esc(t('phRangeNote'))}${ph.beyond ? ' · ' + esc(t('phBeyond')) : ''}</em>` : ''}</div>`;
    const ranked = M.rank(c.load, ph);
    $('#crops').innerHTML = ranked.map(a => {
      const cr = a.crop, v = a.verdict, open = state.open === cr.id;
      const g = a.g;
      return `<li class="crop ${v}${open ? ' open' : ''}">
        <button type="button" class="crop-head" aria-expanded="${open}" data-crop="${cr.id}">
          <span class="vchip ${v}">${VERDICT_ICON[v]}${esc(t({ yes: 'vYes', maybe: 'vMaybe', no: 'vNo' }[v]))}</span>
          <span class="cname">${esc(state.lang === 'ko' ? cr.ko : cr.en)}<i>${esc(cr.sci)}</i></span>
          <span class="tag">${esc(t(cr.use === 'grain' ? 'useGrain' : 'useCover'))}</span>
        </button>
        <div class="growth" role="group" aria-label="${esc(t('gLine'))}">
          <div class="gcell"><b>${pct(g.wildfire)}%</b><small>${esc(t('ecWild'))}</small></div>
          <div class="gcell"><b>${pct(g.salty)}%</b><small>${esc(t('ecSalty'))}</small></div>
          <div class="gcell muted"><b>${pct(g.firewood)}%</b><small>${esc(t('ecWorst'))}</small></div>
        </div>
        <p class="phrow"><span class="dot s${a.phWorst}"></span>${esc(phText(a))} · ${esc(t('phLine', { o1: fx(cr.ph[0], 1), o2: fx(cr.ph[1], 1), a1: fx(cr.phAbs[0], 1), a2: fx(cr.phAbs[1], 1) }))}</p>
        ${a.germRisk ? `<p class="warn">${esc(t('germW'))}</p>` : ''}
        <div class="detail"${open ? '' : ' hidden'}>
          <h4>${esc(t('adviceTitle'))}</h4>
          <ul>${advice(a, ph).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          <p class="ev"><span class="evtag ${cr.measured ? 'm' : 'l'}">${esc(t(cr.measured ? 'evMeasured' : 'evLit'))}</span></p>
          ${cr.measured ? `<p class="small">${esc(t('teamNote'))}</p>` : ''}
          <p class="small">${esc(t('saltSrc', { a: fx(cr.a, 1), ec0: fx(cr.ec0, 1), src: cr.salt === 'FAO 29' ? 'Ayers & Westcot, 1985' : 'Maas, 1990' }))} · ${esc(t('phSrc'))}</p>
        </div>
      </li>`;
    }).join('');
    $$('.crop-head').forEach(b => b.addEventListener('click', () => { state.open = state.open === b.dataset.crop ? null : b.dataset.crop; renderResults(); }));
  }

  // ---------- about ----------
  function renderAbout() {
    $('#how').innerHTML = ['how1', 'how2', 'how3', 'how4', 'how5'].map(k => `<li>${esc(t(k))}</li>`).join('');
    $('#limits').innerHTML = ['lim1', 'lim2', 'lim3', 'lim4', 'lim5', 'lim6'].map(k => `<li>${esc(t(k))}</li>`).join('');
    $('#sources').innerHTML = `<thead><tr><th>${esc(t('colItem'))}</th><th>${esc(t('colVal'))}</th><th>${esc(t('colSrc'))}</th></tr></thead><tbody>` +
      D.SOURCES.map(s => `<tr><td>${esc(L(s.item))}</td><td>${esc(L(s.value))}</td><td>${esc(L(s.src))}</td></tr>`).join('') + '</tbody>';
    $('#refs').innerHTML = D.REFERENCES.map(r => `<li>${r}</li>`).join('');
  }

  function applyText() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
    $('#langBtn').textContent = t('langBtn');
    document.title = t('appName');
  }
  function renderAll() { applyText(); syncQuestions(); renderSev(); renderAbout(); if (state.shown) renderResults(); }

  // ---------- events ----------
  $('#tabTest').addEventListener('click', () => { state.mode = 'test'; renderAll(); });
  $('#tabMeasure').addEventListener('click', () => { state.mode = 'measure'; renderAll(); });
  ['trees', 'canopy', 'under', 'ash'].forEach(n => $$(`input[name="${n}"]`).forEach(i => i.addEventListener('change', () => {
    state.answers[n] = i.value;
    if (n === 'trees') { delete state.answers.canopy; delete state.answers.under; delete state.answers.ash; $$('input[name="canopy"],input[name="under"],input[name="ash"]').forEach(x => { x.checked = false; }); }
    if (n === 'canopy') { delete state.answers.under; $$('input[name="under"]').forEach(x => { x.checked = false; }); }
    syncQuestions(); renderSev(); if (state.shown) renderResults();
  })));
  $('#frameG').addEventListener('input', e => { const v = parseFloat(e.target.value); state.frameG = isFinite(v) ? v : null; renderSev(); if (state.shown) renderResults(); });
  $$('input[name="phmode"]').forEach(i => i.addEventListener('change', () => { state.phmode = i.value; if (state.shown) renderResults(); }));
  [['#phAfter', 'phAfter', 'after'], ['#phBefore', 'phBefore', 'before']].forEach(([sel, key, mode]) => {
    const el = $(sel);
    el.addEventListener('focus', () => { $(`input[name="phmode"][value="${mode}"]`).checked = true; state.phmode = mode; });
    el.addEventListener('input', () => { const v = parseFloat(el.value); state[key] = isFinite(v) && v >= 3 && v <= 11 ? v : null; state.phmode = mode; $(`input[name="phmode"][value="${mode}"]`).checked = true; if (state.shown) renderResults(); });
  });
  $$('input[name="texture"]').forEach(i => i.addEventListener('change', () => { state.texture = i.value; if (state.shown) renderResults(); }));
  $('#goBtn').addEventListener('click', () => {
    state.shown = true; $('#results').hidden = false; renderResults();
    $('#results').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  // results update live once shown, so the button steps aside while they are on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => $('#cta').classList.toggle('away', state.shown && e.isIntersecting)))
      .observe($('#results'));
  }
  $('#langBtn').addEventListener('click', () => {
    state.lang = state.lang === 'ko' ? 'en' : 'ko';
    try { localStorage.setItem('pfg-lang', state.lang); } catch (e) { /* language resets on reload */ }
    renderAll();
  });

  // ---------- install (PWA) ----------
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
  $('#installBtn').addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch (e) { /* dismissed */ } deferred = null; $('#installBtn').hidden = true; }
  });
  window.addEventListener('appinstalled', () => { $('#installBtn').hidden = true; });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (isIOS && !standalone) { const b = $('#installBtn'); b.hidden = false; b.addEventListener('click', () => alertIOS()); }
  function alertIOS() { const p = document.createElement('p'); p.className = 'toast'; p.textContent = t('iosInstall'); document.body.appendChild(p); setTimeout(() => p.remove(), 4000); }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache unavailable */ }); });
  }

  renderAll();
})();
