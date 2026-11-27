/* Post-Fire Planting Guide — one task per screen. */
(function () {
  'use strict';
  const D = window.PFG_DATA, M = window.PFG_MODEL, T = window.PFG_T;
  const $ = s => document.querySelector(s);

  const state = { lang: 'ko', screen: 'home', mode: 'test', answers: {}, frameG: null, phmode: null, phVal: null, texture: null, scen: 'wildfire', cmp: null, sheet: null };
  try { const s = localStorage.getItem('pfg-lang'); if (s === 'ko' || s === 'en') state.lang = s; else throw 0; }
  catch (e) { state.lang = (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en'; }

  // ---------- helpers ----------
  const t = (k, v) => { const e = T[k]; let s = e ? (e[state.lang] || e.ko) : k; if (v) for (const n in v) s = s.split('{' + n + '}').join(v[n]); return s; };
  const L = v => (v && typeof v === 'object') ? (v[state.lang] || v.ko) : v;
  const fx = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
  const pct = v => String(Math.round(v));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const batchim = w => { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
  const cropName = c => state.lang === 'ko' ? c.ko : c.en;
  const SCEN_KEY = { wildfire: 'ecWild', salty: 'ecSalty', firewood: 'ecWorst' };
  const VKEY = { yes: 'vYes', fix: 'vFix', maybe: 'vMaybe', no: 'vNo' };
  const same = r => Math.round(r.lo) === Math.round(r.hi);
  const rangeTxt = r => same(r) ? `${pct(r.lo)}%` : `${pct(r.lo)}–${pct(r.hi)}%`;
  const r10 = v => Math.round(v / 10) * 10;
  const limeText = lp => { const lo = r10(lp.gMin), hi = r10(lp.gMax); return lo < 5 ? t('gramsUpTo', { b: hi }) : lo === hi ? `${hi} g` : t('gramsRange', { a: lo, b: hi }); };
  const ph1 = v => fx(v, 1);
  const phValid = v => isFinite(v) && v >= 3 && v <= 11;
  const num = s => parseFloat(String(s).replace(',', '.'));

  // ---------- icons (one per option row, 36 px) ----------
  const ICON = {
    tree: '<svg viewBox="0 0 48 48"><path d="M24 6c-7 0-12 5-12 11 0 5 3 8 7 9v14h10V26c4-1 7-4 7-9 0-6-5-11-12-11z" fill="#3f8f45"/><rect x="21" y="26" width="6" height="16" fill="#7b5a43"/></svg>',
    field: '<svg viewBox="0 0 48 48"><rect x="4" y="34" width="40" height="8" rx="2" fill="#7b5a43"/><path d="M10 34c0-6 2-10 2-14M18 34c0-5-2-9-3-12M26 34c0-7 2-11 3-15M34 34c0-5-1-8-3-11M40 34c0-4 1-7 2-9" stroke="#3f8f45" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    green: '<svg viewBox="0 0 48 48"><circle cx="24" cy="17" r="12" fill="#3f8f45"/><rect x="21" y="26" width="6" height="16" fill="#6b5040"/></svg>',
    scorched: '<svg viewBox="0 0 48 48"><circle cx="24" cy="17" r="12" fill="#b07a3c"/><rect x="21" y="26" width="6" height="16" fill="#4a3f38"/></svg>',
    consumed: '<svg viewBox="0 0 48 48"><path d="M24 42V12M24 22l-8-8M24 18l7-7M24 28l-6-4M24 26l7-5" stroke="#6a625c" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    litter: '<svg viewBox="0 0 48 48"><rect x="4" y="36" width="40" height="6" rx="2" fill="#6a625c"/><path d="M8 36l3-5 3 5M18 36l2-4 2 4M30 36l3-5 3 5" stroke="#d07a2c" stroke-width="2.5" fill="none"/><circle cx="24" cy="15" r="9" fill="#3f8f45"/><rect x="22" y="22" width="4" height="14" fill="#6b5040"/></svg>',
    shrub: '<svg viewBox="0 0 48 48"><rect x="4" y="36" width="40" height="6" rx="2" fill="#6a625c"/><path d="M10 36c0-8 4-14 8-16M38 36c0-8-4-14-8-16" stroke="#d07a2c" stroke-width="3" fill="none"/><circle cx="24" cy="12" r="8" fill="#3f8f45"/><rect x="22" y="18" width="4" height="18" fill="#6b5040"/></svg>',
  };
  const CHECK = '<svg class="opt-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHEV = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // ---------- inputs ----------
  function currentLoad() {
    if (state.mode === 'measure') return state.frameG > 0 ? { load: M.frameToLoad(state.frameG), source: 'measure' } : null;
    const r = M.severityFromAnswers(state.answers);
    return r ? { load: D.SEVERITY[r.cls].load, cls: r.cls, basis: r.basis, source: 'test' } : null;
  }
  function currentPH() {
    if ((state.phmode === 'after' || state.phmode === 'before') && phValid(state.phVal)) return { mode: state.phmode, value: state.phVal };
    return { mode: 'unknown' };
  }
  // a screen deep in the flow needs the earlier answers
  function valid(s) {
    const a = state.answers;
    switch (s) {
      case 'canopy': return a.trees === 'yes';
      case 'under': return a.trees === 'yes' && a.canopy === 'green';
      case 'ash': return a.trees === 'no';
      case 'severity': case 'ph': return !!currentLoad();
      case 'texture': return !!currentLoad() && !!state.phmode;
      case 'result': return !!currentLoad() && !!state.phmode && !!state.texture;
      default: return true;
    }
  }

  // ---------- navigation (browser back works, also on Android) ----------
  const PROGRESS = { trees: 1, canopy: 2, ash: 2, weigh: 2, under: 3, severity: 4, ph: 5, texture: 6 };
  let lock = false, pendingCompare = false;
  function go(s) { if (lock) return; lock = true; state.screen = s; history.pushState({ s }, ''); render(true); lock = false; }
  window.addEventListener('popstate', e => {
    const st = e.state || { s: 'home' };
    if (state.sheet) {
      hideSheet();
      if (st.s === state.screen && !st.sheet) { if (pendingCompare) { pendingCompare = false; showCompare(); } return; }
    }
    if (st.sheet) { history.back(); return; }
    state.screen = valid(st.s) ? st.s : 'home';
    render(true);
  });
  $('#backBtn').addEventListener('click', () => history.back());

  let ctaAction = null;
  function setCTA(label, enabled, action) {
    const c = $('#cta');
    if (!label) { c.hidden = true; ctaAction = null; return; }
    c.hidden = false; c.classList.toggle('grey', state.screen === 'result');
    const b = $('#ctaBtn'); b.textContent = label; b.disabled = !enabled; ctaAction = action;
  }
  $('#ctaBtn').addEventListener('click', () => { if (ctaAction && !$('#ctaBtn').disabled) ctaAction(); });

  // ---------- building blocks ----------
  const optBtn = (name, it, on) => `<button type="button" class="opt${on ? ' on' : ''}" data-opt="${name}" data-val="${it.v}" aria-pressed="${!!on}">` +
    (it.icon ? `<span class="opt-ic" aria-hidden="true">${it.icon}</span>` : '') + (it.sw ? `<span class="opt-sw" style="background:${it.sw}" aria-hidden="true"></span>` : '') +
    `<span class="opt-tx"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${CHECK}</button>`;
  const optList = (name, items, sel) => `<div class="opts">${items.map(it => optBtn(name, it, sel === it.v)).join('')}</div>`;
  const title = s => `<h1 class="title" tabindex="-1">${esc(s)}</h1>`;
  const linkBtn = (key, to) => `<button type="button" class="text-link" data-go="${to}">${esc(t(key))}${CHEV}</button>`;

  function apply(name, val) {
    const a = state.answers;
    switch (name) {
      case 'trees': state.mode = 'test'; a.trees = val; delete a.canopy; delete a.under; delete a.ash; return val === 'yes' ? 'canopy' : 'ash';
      case 'canopy': a.canopy = val; delete a.under; return val === 'green' ? 'under' : 'severity';
      case 'under': a.under = val; return 'severity';
      case 'ash': a.ash = val; return 'severity';
      case 'ph':
        state.phmode = val;
        if (val === 'unknown') { state.phVal = null; return 'texture'; }
        render(false); const inp = $('#phIn'); if (inp) inp.focus();
        return null;
      case 'texture': state.texture = val; return 'result';
    }
    return null;
  }

  // ---------- drawn plants: the one graphic that carries the result ----------
  const PG = { ground: 150, max: 112, trayH: 34 };
  const BLADES = [[-15, .7, -24], [-10, .88, -13], [-5, 1, -4], [0, .93, 5], [5, .8, 14], [10, .64, 24], [-2, .52, -11]];
  const mix = (c1, c2, k) => '#' + [0, 2, 4].map(i => Math.round(parseInt(c1.substr(i + 1, 2), 16) * (1 - k) + parseInt(c2.substr(i + 1, 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const leafColour = f => mix('#b59f3e', '#3b8a42', Math.max(0, Math.min(1, (f - 0.15) / 0.75)));
  function bladePaths(frac, base, attrs) {
    const h0 = PG.max * frac; if (h0 < 0.6) return '';
    const w = 2 + 1.4 * frac;
    return BLADES.map(([dx, rh, lean]) => {
      const h = h0 * rh, x = 80 + dx, l = lean * frac;
      return `<path d="M${(x - w).toFixed(1)},${base} Q${(x - w + l * 0.2).toFixed(1)},${(base - h * 0.55).toFixed(1)} ${(x + l).toFixed(1)},${(base - h).toFixed(1)} Q${(x + w + l * 0.3).toFixed(1)},${(base - h * 0.5).toFixed(1)} ${(x + w).toFixed(1)},${base}Z" ${attrs}/>`;
    }).join('');
  }
  function potSVG(load, grains, withRef) {
    const ashT = 2 + 8 * Math.min(load, 34.2) / 34.2;   // drawing only: a thicker grey layer for more ash
    const top = +(PG.ground - ashT).toFixed(1), refY = top - PG.max;
    let specks = '';
    for (let i = 0; i < 16; i++) specks += `<circle cx="${18 + (i * 37) % 124}" cy="${(top + 1 + (i * 5) % Math.max(1, ashT)).toFixed(1)}" r="0.9" fill="#74766f"/>`;
    let g = '';
    if (grains) for (let i = 0; i < 18; i++) g += `<circle cx="${22 + (i * 47) % 116}" cy="${PG.ground + 6 + (i * 11) % 23}" r="2.1" fill="${grains[0]}" stroke="${grains[1]}" stroke-width=".7"/>`;
    const svg = (withRef ? `<line x1="4" x2="156" y1="${refY}" y2="${refY}" class="refline"/><text x="6" y="${refY - 4}" class="reftxt">100%</text>` : '') +
      `<g class="ghost-g"></g><rect x="12" y="${PG.ground}" width="136" height="${PG.trayH}" rx="8" fill="#6b4a35"/>${g}` +
      `<rect x="12" y="${top}" width="136" height="${ashT + 3}" rx="2" fill="#a6a8a2"/>${specks}` +
      `<ellipse cx="80" cy="${top + 0.5}" rx="4.2" ry="2.4" fill="#c4a061"/><g class="plant-g"></g>`;
    return { svg, base: top };
  }
  function homeArt() {
    const p = potSVG(6, null, false);
    return `<svg viewBox="0 20 160 168">${p.svg.replace('<g class="plant-g"></g>', bladePaths(0.92, p.base, `fill="${leafColour(1)}"`))}</svg>`;
  }

  const anim = { now: 0, after: 0, tNow: 0, tNowHi: 0, tAfter: 0, base: PG.ground, raf: 0, played: false, labels: null, io: null };
  function drawFrame(n, a) {
    const gn = $('#svgNow .plant-g'), ga = $('#svgAfter .plant-g'); if (!gn || !ga) return;
    gn.innerHTML = bladePaths(n, anim.base, `fill="${leafColour(anim.tNow)}"`);
    ga.innerHTML = bladePaths(a, anim.base, `fill="${leafColour(anim.tAfter)}"`);
    $('#bigNow').textContent = `${Math.round(n * 100)}%`;
    $('#bigAfter').textContent = `${Math.round(a * 100)}%`;
  }
  function finishFrame() { if (!anim.labels || !$('#stage')) return; $('#bigNow').textContent = anim.labels.now; $('#bigAfter').textContent = anim.labels.after; $('#stage').classList.add('done'); }
  function play(fromZero) {
    cancelAnimationFrame(anim.raf);
    const stage = $('#stage'); if (!stage) return;
    anim.played = true;
    const tn = anim.tNow, ta = anim.tAfter;
    stage.classList.remove('done');
    if (reduce()) { anim.now = tn; anim.after = ta; drawFrame(tn, ta); finishFrame(); return; }
    const n0 = fromZero ? 0 : anim.now, a0 = fromZero ? 0 : anim.after;
    const span = fromZero ? Math.max(tn, ta) : Math.max(Math.abs(tn - n0), Math.abs(ta - a0));
    const dur = fromZero ? 500 + 1900 * span : 200 + 800 * span, start = performance.now();
    const step = ts => {
      const k = Math.min(1, (ts - start) / dur), e = 1 - Math.pow(1 - k, 3);
      // from zero both plants rise at the same speed, so the one that stops early looks stunted
      if (fromZero) { const h = e * span; anim.now = Math.min(tn, h); anim.after = Math.min(ta, h); }
      else { anim.now = n0 + (tn - n0) * e; anim.after = a0 + (ta - a0) * e; }
      drawFrame(anim.now, anim.after);
      if (k < 1) anim.raf = requestAnimationFrame(step); else finishFrame();
    };
    anim.raf = requestAnimationFrame(step);
  }

  // ---------- results ----------
  function compute() {
    const c = currentLoad(), ph = M.phPrediction(c.load, currentPH());
    const ranked = M.rank(c.load, ph, state.texture, state.scen);
    if (!ranked.some(x => x.crop.id === state.cmp)) state.cmp = ranked[0].crop.id;
    return { c, ph, ec: M.ecScenarios(c.load), ranked, sel: ranked.find(x => x.crop.id === state.cmp) };
  }
  const phRangeTxt = ph => ph.lo === ph.hi ? ph1(ph.lo) : `${ph1(ph.lo)}–${ph1(ph.hi)}${ph.beyond ? '+' : ''}`;

  function headHTML(R) {
    const top = R.ranked[0], n = cropName(top.crop), b = batchim(n);
    const v = { name: n, nameIga: n + (b ? '이' : '가'), nameEulreul: n + (b ? '을' : '를'), now: rangeTxt(top.g.now), after: rangeTxt(top.g.after) };
    const chips = [R.c.cls ? t('sevName_' + R.c.cls) : t('sevMeasured'), `${fx(R.c.load, 1)} Mg/ha`, `pH ${phRangeTxt(R.ph)}`];
    return `${title(t('res_' + top.verdict, v))}<p class="desc">${esc(t('res_' + top.verdict + 'Desc', v))}</p>` +
      `<div class="chips-meta">${chips.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
  }

  function fillCompare(R) {
    $('#scenSel').innerHTML = M.SCEN.map(k => `<button type="button" aria-pressed="${state.scen === k}" data-scen="${k}">${esc(t(SCEN_KEY[k]))}</button>`).join('');
    $('#cropSel').innerHTML = R.ranked.map(x => `<button type="button" aria-pressed="${x.crop.id === state.cmp}" data-cmp="${x.crop.id}">${esc(cropName(x.crop))}</button>`).join('');
    const row = $('#cropSel'), sb = row.querySelector('[aria-pressed="true"]');
    if (sb && (sb.offsetLeft < row.scrollLeft || sb.offsetLeft + sb.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollLeft = Math.max(0, sb.offsetLeft - 20);
    const a = R.sel, c = a.crop, p = a.plan, g = a.g, ph = R.ph;
    $('#capAfter').textContent = t({ none: 'cmpSame', lime: 'cmpLime', sulfur: 'cmpSulfur', measure: 'cmpFix' }[p.action]);
    $('#phNow').textContent = t('cmpPH', { v: phRangeTxt(ph) });
    let phA;
    if (p.action === 'none') phA = $('#phNow').textContent;
    else if (p.action === 'lime') phA = t('cmpPH', { v: ph1(p.target) });
    else if (p.action === 'sulfur' && (ph.mode === 'after' || p.sulfur.capped)) phA = t('cmpPH', { v: ph1(ph.hi - p.sulfur.steps) });
    else phA = t('cmpPH', { v: `${ph1(c.ph[0])}–${ph1(c.ph[1])}` });
    $('#phAfterV').textContent = phA;
    const grains = p.action === 'lime' ? ['#f7f5ee', '#b9b39f'] : p.action === 'sulfur' ? ['#e3c23c', '#b3901b'] : null;
    const pn = potSVG(R.c.load, null, true), pa = potSVG(R.c.load, grains, true);
    $('#svgNow').innerHTML = pn.svg; $('#svgAfter').innerHTML = pa.svg; anim.base = pn.base;
    anim.tNow = g.now.lo / 100; anim.tNowHi = g.now.hi / 100; anim.tAfter = g.after.lo / 100;
    anim.labels = { now: rangeTxt(g.now), after: rangeTxt(g.after) };
    const ranged = !same(g.now);
    $('#svgNow .ghost-g').innerHTML = ranged ? bladePaths(anim.tNowHi, anim.base, 'class="ghost-p"') : '';
    $('#ghostL').hidden = !ranged;
    const dLo = g.after.lo - g.now.hi, dHi = g.after.lo - g.now.lo, d = $('#delta');
    if (p.action === 'none' || dHi < 0.5) d.hidden = true;
    else { d.hidden = false; d.textContent = ranged && dHi - dLo >= 1 ? t('cmpDeltaMax', { d: pct(dHi) }) : t('cmpDelta', { d: pct(dHi) }); }
    // what to do
    let main = '';
    if (p.action === 'none') main = t('todoNone');
    const tex = L(T.texName)[state.texture];
    if (p.action === 'lime') main = t('todoLime', { g: limeText(p), t: ph1(p.target), tex });
    if (p.action === 'sulfur') main = t('todoSulfur', { g: Math.round(p.sulfur.gPerM2), v: fx(p.sulfur.steps, 1), tex });
    if (p.action === 'measure') main = t('todoMeasure', { o1: ph1(c.ph[0]), o2: ph1(c.ph[1]), lime: `${r10(p.lime.gMax)} g`, s: Math.round(p.sulfur.gPerM2) });
    const extra = [];
    if (p.action === 'lime') extra.push(t('limeColour'));
    if (p.action === 'lime' && ph.mode !== 'after') extra.push(t('todoRange'));
    if (p.action === 'sulfur' && p.sulfur.capped) extra.push(t('sulfurCapped'));
    if (p.action === 'sulfur') extra.push(p.sulfur.seasons > 1 ? t('sulfurSplit', { n: p.sulfur.seasons }) : t('sulfurOne'));
    if (a.by[state.scen].salt < 99.5) extra.push(t('todoSalt', { g: pct(a.by[state.scen].salt) }));
    $('#todo').innerHTML = `<h3>${esc(t('todoTitle'))}</h3><p class="do">${esc(main)}</p>` + extra.map(x => `<p class="sm">${esc(x)}</p>`).join('');
  }

  function cropsHTML(R) {
    return R.ranked.map(a => {
      const cr = a.crop, none = a.plan.action === 'none';
      const val = none ? `${rangeTxt(a.g.now)}` : `${rangeTxt(a.g.now)} → <em>${rangeTxt(a.g.after)}</em>`;
      return `<li><button type="button" class="row" data-crop="${cr.id}">
        <span class="row-main"><b>${esc(cropName(cr))}</b><span class="row-sub"><span class="badge ${a.verdict}">${esc(t(VKEY[a.verdict]))}</span>${esc(t(cr.use === 'grain' ? 'useGrain' : 'useCover'))}</span></span>
        <span class="row-val">${val}</span>${CHEV}</button></li>`;
    }).join('');
  }

  function summaryHTML(R) {
    const sel = k => state.scen === k ? ' class="sel"' : '';
    const ec = R.ec, ph = R.ph;
    const phNote = ph.mode === 'after' ? t('phAfterNote') : `${t('phBase', { b: ph1(ph.base) })} · ${t('phRangeNote')}${ph.beyond ? '. ' + t('phBeyond') : ''}`;
    return `<div class="kv"><span>${esc(t('sumLoad'))}</span><div>${fx(R.c.load, 1)} Mg/ha<small>${esc(R.c.cls ? t('sevName_' + R.c.cls) : t('sevMeasured'))}</small></div></div>
      <div class="kv"><span>${esc(t('sumEC'))}</span><div><ul>
        <li${sel('wildfire')}><b>${fx(ec.wildfire[1], 2)}</b>dS/m · ${esc(t('ecWild'))}</li>
        <li${sel('salty')}><b>${fx(ec.salty, 1)}</b>dS/m · ${esc(t('ecSalty'))}</li>
        <li${sel('firewood')}><b>${fx(ec.firewood, 1)}</b>dS/m · ${esc(t('ecWorstLong'))}</li></ul></div></div>
      <div class="kv"><span>${esc(t('sumPH'))}</span><div>${phRangeTxt(ph)}<small>${esc(phNote)}</small></div></div>`;
  }

  function updateResult(tween) {
    const R = compute();
    $('#resHead').innerHTML = headHTML(R);
    fillCompare(R);
    $('#crops').innerHTML = cropsHTML(R);
    $('#summary').innerHTML = summaryHTML(R);
    if (anim.played) play(!tween); else { anim.now = anim.after = 0; drawFrame(0, 0); }
    return R;
  }
  function showCompare() {
    updateResult(false);
    const el = $('#compareCard'); if (el) el.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
    play(true);
  }

  // ---------- sheet (opens only when a crop row is tapped) ----------
  let lastFocus = null;
  function adviceList(a, ph) {
    const c = a.crop, p = a.plan, out = [], tex = L(T.texName)[state.texture];
    if (p.action === 'none') out.push(t('todoNone'));
    if (p.action === 'lime') { out.push(t('todoLime', { g: limeText(p), t: ph1(p.target), tex })); out.push(t('limeColour')); if (p.belowTable) out.push(t('limeBelow')); }
    if (p.action === 'sulfur') {
      if (p.sulfur.capped) out.push(t('sulfurCapped'));
      out.push(t('todoSulfur', { g: Math.round(p.sulfur.gPerM2), v: fx(p.sulfur.steps, 1), tex }));
      out.push(t('sulfurSurface'));
      out.push(p.sulfur.seasons > 1 ? t('sulfurSplit', { n: p.sulfur.seasons }) : t('sulfurOne'));
    }
    if (p.action === 'measure') out.push(t('todoMeasure', { o1: ph1(c.ph[0]), o2: ph1(c.ph[1]), lime: `${r10(p.lime.gMax)} g`, s: Math.round(p.sulfur.gPerM2) }));
    if ((p.action === 'lime' || p.action === 'sulfur') && ph.mode !== 'after') out.push(t('todoRange'));
    if (p.action !== 'none') out.push(t('soilTest'));
    return out;
  }
  function phText(a) {
    if (a.phWorst === 2) return t('phOk');
    if (a.phBest === 0) return t('phBad');
    if (a.tooLow && a.sLo < 2) return t('phLowW');
    if (a.tooHigh && a.sHi < 2) return t('phHighW');
    return t('phPart');
  }
  function renderSheet() {
    const R = compute(), a = R.ranked.find(x => x.crop.id === state.sheet); if (!a) return;
    const cr = a.crop, none = a.plan.action === 'none';
    $('#sheetBody').innerHTML = `<h2 class="sheet-title" id="sheetTitle" tabindex="-1">${esc(cropName(cr))}</h2>
      <p class="sheet-sub">${esc(cr.sci)} · ${esc(t(cr.use === 'grain' ? 'useGrain' : 'useCover'))}</p>
      <span class="badge ${a.verdict} sheet-badge">${esc(t(VKEY[a.verdict]))}</span>
      <div class="duo"><div><small>${esc(t('gNow'))}</small><b>${rangeTxt(a.g.now)}</b></div><div class="${none ? '' : 'up'}"><small>${esc(t('gAfter'))}</small><b>${rangeTxt(a.g.after)}</b></div></div>
      <p class="ph-line"><span class="dot s${a.phWorst}"></span><span>${esc(phText(a))} · ${esc(t('phLine', { o1: ph1(cr.ph[0]), o2: ph1(cr.ph[1]), a1: ph1(cr.phAbs[0]), a2: ph1(cr.phAbs[1]) }))}</span></p>
      ${a.germRisk ? `<p class="caution">${esc(t('germW', { ec: fx(a.ecSel, 1) }))}</p>` : ''}
      <h3 class="sheet-h">${esc(t('todoTitle'))}</h3><ul class="bul">${adviceList(a, R.ph).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <h3 class="sheet-h">${esc(t('saltOnly'))}</h3><p class="small">${M.SCEN.map(k => `${esc(t(SCEN_KEY[k]))} ${pct(a.salt[k])}%`).join(' · ')}</p>
      <h3 class="sheet-h">${esc(t('evTitle'))}</h3><span class="evtag ${cr.measured ? 'm' : 'l'}">${esc(t(cr.measured ? 'evMeasured' : 'evLit'))}</span>
      ${cr.measured ? `<p class="small">${esc(t('teamNote'))}</p><p class="small">${esc(t('barleyPh'))}</p>` : ''}
      <p class="small">${esc(t('saltSrc', { a: fx(cr.a, 1), ec0: fx(cr.ec0, 1), src: cr.salt === 'FAO 29' ? 'Ayers & Westcot, 1985' : 'Maas, 1990' }))} ${esc(t('phSrc'))}.</p>`;
    $('#sheetClose').textContent = t('close');
    $('#sheetCompare').textContent = t('sheetCompare');
  }
  function openSheet(id) {
    lastFocus = document.activeElement;
    state.sheet = id; renderSheet();
    $('#sheetWrap').hidden = false; document.body.style.overflow = 'hidden';
    history.pushState({ s: state.screen, sheet: true }, '');
    $('#sheetTitle').focus({ preventScroll: true });
  }
  function hideSheet() {
    state.sheet = null; $('#sheetWrap').hidden = true; document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  $('#sheetWrap').addEventListener('click', e => { if (e.target.closest('[data-close]')) history.back(); });
  $('#sheetCompare').addEventListener('click', () => { state.cmp = state.sheet; pendingCompare = true; history.back(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.sheet) history.back(); });

  // ---------- screens ----------
  const SCREENS = {
    home(scr) {
      scr.innerHTML = `<div class="brand"><img src="icons/favicon.svg" alt="" width="32" height="32"><span>${esc(t('appName'))}</span></div>
        ${title(t('homeTitle'))}<p class="desc">${esc(t('homeDesc'))}</p>
        <div class="home-art" aria-hidden="true">${homeArt()}</div>
        <ul class="points"><li>${esc(t('homeP1'))}</li><li>${esc(t('homeP2'))}</li><li>${esc(t('homeP3'))}</li></ul>
        ${linkBtn('aboutLink', 'about')}
        <p class="foot">${esc(t('foot'))}<br><b>안상현, 오정효, 이준우, 윤상철, 이현진, 박지훈, 서한슬</b></p>`;
      setCTA(t('homeCta'), true, () => go('trees'));
    },
    trees(scr) {
      scr.innerHTML = title(t('qTrees')) + optList('trees', [{ v: 'yes', label: t('treesYes'), icon: ICON.tree }, { v: 'no', label: t('treesNo'), icon: ICON.field }], state.mode === 'test' ? state.answers.trees : null) + linkBtn('weighLink', 'weigh');
      setCTA(null);
    },
    canopy(scr) {
      scr.innerHTML = title(t('qCanopy')) + optList('canopy', [{ v: 'green', label: t('canGreen'), icon: ICON.green }, { v: 'scorched', label: t('canScorched'), icon: ICON.scorched }, { v: 'consumed', label: t('canConsumed'), icon: ICON.consumed }], state.answers.canopy);
      setCTA(null);
    },
    under(scr) {
      scr.innerHTML = title(t('qUnder')) + optList('under', [{ v: 'low', label: t('underLow'), sub: t('underLowSub'), icon: ICON.litter }, { v: 'tall', label: t('underTall'), sub: t('underTallSub'), icon: ICON.shrub }], state.answers.under);
      setCTA(null);
    },
    ash(scr) {
      scr.innerHTML = title(t('qAsh')) + optList('ash', [{ v: 'black', label: t('ashBlack'), sw: '#2b2b2b' }, { v: 'grey', label: t('ashGrey'), sw: '#8f918d' }, { v: 'white', label: t('ashWhite'), sw: '#ecebe6' }], state.answers.ash);
      setCTA(null);
    },
    weigh(scr) {
      scr.innerHTML = `${title(t('qWeigh'))}<p class="desc">${esc(t('weighDesc'))}</p>
        <div class="field"><label for="frameG">${esc(t('weighLabel'))}</label><div class="field-row"><input id="frameG" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="${state.frameG != null ? state.frameG : ''}"><span class="unit">g</span></div><p class="hint" id="frameHint"></p></div>`;
      const inp = $('#frameG'), hint = $('#frameHint');
      const upd = () => {
        const v = num(inp.value), ok = isFinite(v) && v > 0;
        state.frameG = ok ? v : null;
        hint.textContent = ok ? `${fx(M.frameToLoad(v), 1)} Mg/ha` : (inp.value ? t('weighHint') : '');
        hint.classList.toggle('err', !!inp.value && !ok);
        setCTA(t('next'), ok, () => { state.mode = 'measure'; go('severity'); });
      };
      inp.addEventListener('input', upd); upd();
    },
    severity(scr) {
      const c = currentLoad(), lvl = c.cls;
      let h = title(t(c.source === 'measure' ? 'sevTitle_measure' : 'sevTitle_' + lvl)) +
        `<div class="big-num">${fx(c.load, 1)}<small>Mg/ha</small></div><p class="desc">${esc(t('sevDesc', { load: fx(c.load, 1) }))}</p>`;
      if (lvl) {
        const idx = { low: 0, mid: 1, high: 2 }[lvl];
        h += `<div class="gauge" aria-hidden="true">${[0, 1, 2].map(i => `<span class="${i <= idx ? 'on' : ''}"></span>`).join('')}</div>
          <div class="gauge-l" aria-hidden="true">${['sevLow', 'sevMid', 'sevHigh'].map((k, i) => i === idx ? `<b>${esc(t(k))}</b>` : `<span>${esc(t(k))}</span>`).join('')}</div>`;
      }
      if (c.basis === 'moderate') h += `<p class="note">${esc(t('sevBasisModerate'))}</p>`;
      if (c.basis === 'ash') h += `<p class="note">${esc(t('sevBasisAsh'))}</p>`;
      if (c.source === 'test') h += `<p class="hint">${esc(t('sevSrc'))}</p>`;
      scr.innerHTML = h;
      setCTA(t('next'), true, () => go('ph'));
    },
    ph(scr) {
      const items = [{ v: 'after', label: t('phAfter') }, { v: 'before', label: t('phBefore') }, { v: 'unknown', label: t('phUnknown') }];
      const field = `<div class="opt-field"><div class="field"><label for="phIn">${esc(t('phLabel'))}</label><div class="field-row"><input id="phIn" type="text" inputmode="decimal" autocomplete="off" placeholder="6.5" value="${state.phVal != null ? state.phVal : ''}"></div><p class="hint" id="phHint"></p></div></div>`;
      scr.innerHTML = `${title(t('qPh'))}<p class="desc">${esc(t('phDesc'))}</p><div class="opts">` +
        items.map(it => optBtn('ph', it, state.phmode === it.v) + (state.phmode === it.v && it.v !== 'unknown' ? field : '')).join('') + '</div>';
      const inp = $('#phIn');
      if (inp) {
        const hint = $('#phHint');
        const upd = () => {
          const v = num(inp.value), ok = phValid(v);
          state.phVal = ok ? v : null;
          hint.textContent = inp.value && !ok ? t('phHint') : ''; hint.classList.toggle('err', !!inp.value && !ok);
          setCTA(t('next'), ok, () => go('texture'));
        };
        inp.addEventListener('input', upd); upd();
      } else setCTA(null);
    },
    texture(scr) {
      scr.innerHTML = `${title(t('qTexture'))}<p class="desc">${esc(t('texDesc'))}</p>` +
        optList('texture', [{ v: 'sandy', label: t('texSandy'), sub: t('texSandySub') }, { v: 'loam', label: t('texLoam'), sub: t('texLoamSub') }, { v: 'clay', label: t('texClay'), sub: t('texClaySub') }], state.texture);
      setCTA(null);
    },
    result(scr) {
      scr.innerHTML = `<section class="res-head" id="resHead"></section>
        <section class="card" id="compareCard" aria-labelledby="cmpTitle">
          <h2 class="sec-title" id="cmpTitle">${esc(t('cmpTitle'))}</h2>
          <p class="sec-desc">${esc(t('cmpHint'))}</p>
          <div class="chips" id="cropSel" role="group" aria-label="${esc(t('cropLabel'))}"></div>
          <div class="stage" id="stage">
            <figure class="pot now"><figcaption>${esc(t('cmpNow'))}</figcaption><svg viewBox="0 0 160 196" id="svgNow" aria-hidden="true"></svg><div class="big" id="bigNow">0%</div><div class="phv" id="phNow"></div></figure>
            <figure class="pot after"><figcaption id="capAfter"></figcaption><svg viewBox="0 0 160 196" id="svgAfter" aria-hidden="true"></svg><div class="big" id="bigAfter">0%</div><div class="phv" id="phAfterV"></div><div class="delta" id="delta" hidden></div></figure>
          </div>
          <p class="legend"><span><span class="ref-sw"></span>${esc(t('cmpRef'))}</span><span id="ghostL" hidden><span class="ghost-sw"></span>${esc(t('cmpGhost'))}</span></p>
          <div class="todo" id="todo" aria-live="polite"></div>
          <p class="lbl" id="scenL">${esc(t('scenTry'))}</p><div class="seg" id="scenSel" role="group" aria-labelledby="scenL"></div>
          <button type="button" class="btn-text" id="replay">${esc(t('replay'))}</button>
        </section>
        <section class="card" aria-labelledby="cropsT"><h2 class="sec-title" id="cropsT">${esc(t('cropsTitle'))}</h2><p class="sec-desc">${esc(t('cropsHint'))}</p><ul class="rows" id="crops"></ul></section>
        <section class="card" aria-labelledby="sumT"><h2 class="sec-title" id="sumT">${esc(t('sumTitle'))}</h2><div id="summary"></div></section>
        <button type="button" class="link-row" data-go="about"><span>${esc(t('aboutLink'))}</span>${CHEV}</button>
        <div class="end"><button type="button" class="btn secondary" id="restart">${esc(t('restart'))}</button></div>
        <p class="foot">${esc(t('foot'))}</p>`;
      updateResult(false);
      if (anim.io) anim.io.disconnect();
      if ('IntersectionObserver' in window) {
        anim.io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !anim.played) play(true); }), { threshold: 0.4 });
        anim.io.observe($('#stage'));
      } else play(true);
      setCTA(null);
    },
    about(scr) {
      const how = ['how1', 'how2', 'how3', 'how4', 'howPH', 'howMin', 'howAfter', 'how5'], lims = ['lim1', 'lim2', 'lim3', 'lim4', 'lim5', 'lim6', 'lim7', 'lim8', 'lim9'];
      scr.innerHTML = title(t('aboutTitle')) +
        `<section class="about-sec"><h2>${esc(t('howTitle'))}</h2><ol>${how.map(k => `<li>${esc(t(k))}</li>`).join('')}</ol></section>` +
        `<section class="about-sec"><h2>${esc(t('limitsTitle'))}</h2><ul>${lims.map(k => `<li>${esc(t(k))}</li>`).join('')}</ul></section>` +
        `<section class="about-sec"><h2>${esc(t('sourcesTitle'))}</h2><ul class="src">${D.SOURCES.map(s => `<li><b>${esc(L(s.item))}</b><span>${esc(L(s.value))}</span><i>${esc(L(s.src))}</i></li>`).join('')}</ul></section>` +
        `<section class="about-sec"><h2>${esc(t('refsTitle'))}</h2><ul class="refs">${D.REFERENCES.map(r => `<li>${r}</li>`).join('')}</ul></section>` +
        `<p class="foot">${esc(t('foot'))}<br><b>안상현, 오정효, 이준우, 윤상철, 이현진, 박지훈, 서한슬</b></p>`;
      setCTA(null);
    },
  };

  function render(enter) {
    if (!valid(state.screen)) { state.screen = 'home'; history.replaceState({ s: 'home' }, ''); }
    const s = state.screen, scr = $('#screen');
    document.documentElement.lang = state.lang;
    document.title = t('appName');
    const lb = $('#langBtn'); lb.textContent = t('langBtn'); lb.setAttribute('lang', state.lang === 'ko' ? 'en' : 'ko'); lb.setAttribute('aria-label', t('langLabel'));
    $('#backLabel').textContent = t('back');
    $('#installBtn').textContent = t('install');
    $('#backBtn').hidden = s === 'home';
    $('.app').classList.toggle('on-grey', s === 'result');
    const p = PROGRESS[s]; $('#progress').hidden = !p; if (p) $('#progressBar').style.width = (p / 7 * 100) + '%';
    if (enter) { cancelAnimationFrame(anim.raf); anim.played = false; }
    SCREENS[s](scr);
    if (enter) {
      scr.classList.remove('enter'); void scr.offsetWidth; scr.classList.add('enter');
      window.scrollTo(0, 0);
      const h = scr.querySelector('.title'); if (h) h.focus({ preventScroll: true });
    }
    if (state.sheet) renderSheet();
  }

  // ---------- events on the current screen ----------
  $('#screen').addEventListener('click', e => {
    const o = e.target.closest('[data-opt]');
    if (o) {
      o.parentElement.querySelectorAll('.opt').forEach(b => { const on = b === o; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      const next = apply(o.dataset.opt, o.dataset.val);
      if (next) setTimeout(() => go(next), reduce() ? 0 : 200);
      return;
    }
    const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
    const sc = e.target.closest('[data-scen]'); if (sc) { state.scen = sc.dataset.scen; updateResult(true); return; }
    const cm = e.target.closest('[data-cmp]'); if (cm) { state.cmp = cm.dataset.cmp; updateResult(false); return; }
    const cr = e.target.closest('[data-crop]'); if (cr) { openSheet(cr.dataset.crop); return; }
    if (e.target.closest('#replay')) { play(true); return; }
    if (e.target.closest('#restart')) { state.answers = {}; state.mode = 'test'; state.frameG = null; state.phmode = null; state.phVal = null; state.texture = null; state.cmp = null; go('trees'); }
  });
  $('#langBtn').addEventListener('click', () => {
    state.lang = state.lang === 'ko' ? 'en' : 'ko';
    try { localStorage.setItem('pfg-lang', state.lang); } catch (e) { /* language resets on reload */ }
    render(false);
  });

  // ---------- install (PWA) ----------
  let deferred = null;
  const toast = msg => { const el = $('#toast'); el.textContent = msg; el.hidden = false; clearTimeout(toast.id); toast.id = setTimeout(() => { el.hidden = true; }, 4000); };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
  window.addEventListener('appinstalled', () => { $('#installBtn').hidden = true; });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (isIOS && !standalone) $('#installBtn').hidden = false;
  $('#installBtn').addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch (e) { /* dismissed */ } deferred = null; $('#installBtn').hidden = true; }
    else if (isIOS) toast(t('iosInstall'));
  });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* offline cache unavailable */ }); });
  }

  history.replaceState({ s: 'home' }, '');
  render(false);
})();
