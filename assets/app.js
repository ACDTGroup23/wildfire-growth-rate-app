/* Post-Fire Planting Guide — page logic. */
(function () {
  'use strict';
  const D = window.PFG_DATA, M = window.PFG_MODEL, T = window.PFG_T;
  const $ = s => document.querySelector(s), $$ = s => Array.from(document.querySelectorAll(s));

  const state = { lang: 'ko', mode: 'test', answers: {}, frameG: null, phmode: 'unknown', phAfter: null, phBefore: null, texture: 'loam', shown: false, open: null, scen: 'wildfire', cmp: null };
  try { const s = localStorage.getItem('pfg-lang'); if (s === 'ko' || s === 'en') state.lang = s; else throw 0; }
  catch (e) { state.lang = (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en'; }

  const t = (k, v) => { const e = T[k]; let s = e ? (e[state.lang] || e.ko) : k; if (v) for (const n in v) s = s.split('{' + n + '}').join(v[n]); return s; };
  const L = v => (v && typeof v === 'object') ? (v[state.lang] || v.ko) : v;
  const fx = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
  const pct = v => String(Math.round(v));
  const smooth = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
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
    fix: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V4M4.5 7.5L8 4l3.5 3.5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    maybe: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v6M8 12.5v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    no: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  };
  const VKEY = { yes: 'vYes', fix: 'vFix', maybe: 'vMaybe', no: 'vNo' };
  const SCEN_KEY = { wildfire: 'ecWild', salty: 'ecSalty', firewood: 'ecWorst' };
  const cropName = c => state.lang === 'ko' ? c.ko : c.en;
  const same = r => Math.round(r.lo) === Math.round(r.hi);
  const rangeTxt = r => same(r) ? `${pct(r.lo)}%` : `${pct(r.lo)}–${pct(r.hi)}%`;
  const r10 = v => Math.round(v / 10) * 10;
  const limeText = lp => { const lo = r10(lp.gMin), hi = r10(lp.gMax); return lo < 5 ? t('gramsUpTo', { b: hi }) : lo === hi ? `${hi} g` : t('gramsRange', { a: lo, b: hi }); };
  const phTxt1 = v => fx(v, 1);

  function phText(a) {
    if (a.phWorst === 2) return t('phOk');
    if (a.phBest === 0) return t('phBad');
    if (a.tooLow && a.sLo < 2) return t('phLowW');
    if (a.tooHigh && a.sHi < 2) return t('phHighW');
    return t('phPart');
  }
  function advice(a, ph) {
    const c = a.crop, p = a.plan, out = [], tex = L(T.texName)[state.texture];
    if (p.action === 'none') out.push(t('advNone'));
    if (p.action === 'lime') {
      out.push(t('advLime', { t: phTxt1(p.target), g: limeText(p), tex }));
      out.push(t('advLimeColour'));
      if (p.belowTable) out.push(t('advLimeBelow'));
    }
    if (p.action === 'sulfur') {
      const s = p.sulfur;
      if (s.capped) out.push(t('advCapped'));
      out.push(t('advHigh', { steps: t('unitPH', { v: fx(s.steps, 1) }), g: Math.round(s.gPerM2), tex }));
      out.push(s.seasons > 1 ? t('advSplit', { n: s.seasons }) : t('advOne'));
    }
    if (p.action === 'measure') out.push(t('advBoth', { o1: phTxt1(c.ph[0]), o2: phTxt1(c.ph[1]), lime: `${r10(p.lime.gMax)} g`, s: Math.round(p.sulfur.gPerM2) }));
    if (ph.mode !== 'after' && p.action !== 'none' && p.action !== 'measure') out.push(t('advMeasure'));
    if (p.action !== 'none') out.push(t('advTest'));
    return out;
  }

  // ---------- before/after comparison (drawn plants that grow) ----------
  const PG = { ground: 150, max: 112, trayH: 34 };
  // blades: x offset, share of plant height, lean at full height
  const BLADES = [[-15, .7, -24], [-10, .88, -13], [-5, 1, -4], [0, .93, 5], [5, .8, 14], [10, .64, 24], [-2, .52, -11]];
  const anim = { now: 0, after: 0, tNow: 0, tNowHi: 0, tAfter: 0, base: PG.ground, raf: 0, played: false, labels: null };
  const mix = (c1, c2, k) => '#' + [0, 2, 4].map(i => Math.round(parseInt(c1.substr(i + 1, 2), 16) * (1 - k) + parseInt(c2.substr(i + 1, 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const leafColour = f => mix('#b59f3e', '#3b8a42', clamp01((f - 0.15) / 0.75));
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function bladePaths(frac, base, attrs) {
    const h0 = PG.max * frac; if (h0 < 0.6) return '';
    const w = 2 + 1.4 * frac;
    return BLADES.map(([dx, rh, lean]) => {
      const h = h0 * rh, x = 80 + dx, l = lean * frac;
      return `<path d="M${(x - w).toFixed(1)},${base} Q${(x - w + l * 0.2).toFixed(1)},${(base - h * 0.55).toFixed(1)} ${(x + l).toFixed(1)},${(base - h).toFixed(1)} Q${(x + w + l * 0.3).toFixed(1)},${(base - h * 0.5).toFixed(1)} ${(x + w).toFixed(1)},${base}Z" ${attrs}/>`;
    }).join('');
  }
  function potSVG(load, grains) {
    const ashT = 2 + 8 * Math.min(load, 34.2) / 34.2;          // drawing only: thicker grey layer for more ash
    const top = PG.ground - ashT, refY = top - PG.max;
    let specks = '';
    for (let i = 0; i < 16; i++) specks += `<circle cx="${18 + (i * 37) % 124}" cy="${(top + 1 + (i * 5) % Math.max(1, ashT)).toFixed(1)}" r="0.9" fill="#74766f"/>`;
    let g = '';
    if (grains) for (let i = 0; i < 18; i++) g += `<circle cx="${22 + (i * 47) % 116}" cy="${PG.ground + 6 + (i * 11) % 23}" r="2.1" fill="${grains[0]}" stroke="${grains[1]}" stroke-width=".7"/>`;
    anim.base = +top.toFixed(1);
    return `<line x1="4" x2="156" y1="${refY}" y2="${refY}" class="refline"/><text x="6" y="${refY - 4}" class="reftxt">100%</text>
      <g class="ghost-g"></g>
      <rect x="12" y="${PG.ground}" width="136" height="${PG.trayH}" rx="8" fill="#6b4a35"/>${g}
      <rect x="12" y="${top}" width="136" height="${ashT + 3}" rx="2" fill="#a6a8a2"/>${specks}
      <ellipse cx="80" cy="${top + 0.5}" rx="4.2" ry="2.4" fill="#c4a061"/>
      <g class="plant-g"></g>`;
  }
  function drawFrame(n, a) {
    $('#svgNow .plant-g').innerHTML = bladePaths(n, anim.base, `fill="${leafColour(anim.tNow)}"`);
    $('#svgAfter .plant-g').innerHTML = bladePaths(a, anim.base, `fill="${leafColour(anim.tAfter)}"`);
    $('#bigNow').textContent = `${Math.round(n * 100)}%`;
    $('#bigAfter').textContent = `${Math.round(a * 100)}%`;
  }
  function finishFrame() {
    const L2 = anim.labels; if (!L2) return;
    $('#bigNow').textContent = L2.now; $('#bigAfter').textContent = L2.after;
    $('#stage').classList.add('done');
  }
  function play(fromZero) {
    cancelAnimationFrame(anim.raf);
    const tn = anim.tNow, ta = anim.tAfter;
    $('#stage').classList.remove('done');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { anim.now = tn; anim.after = ta; drawFrame(tn, ta); finishFrame(); return; }
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

  function renderCompare(ranked, ph, load) {
    $('#scenSel').innerHTML = M.SCEN.map(k => `<button type="button" aria-pressed="${state.scen === k}" data-scen="${k}">${esc(t(SCEN_KEY[k]))}</button>`).join('');
    if (!ranked.some(x => x.crop.id === state.cmp)) state.cmp = ranked[0].crop.id;
    $('#cropSel').innerHTML = ranked.map(x => `<button type="button" aria-pressed="${x.crop.id === state.cmp}" data-cmp="${x.crop.id}"><span class="dot v-${x.verdict}"></span>${esc(cropName(x.crop))}</button>`).join('');
    const row = $('#cropSel'), sb = row.querySelector('[aria-pressed="true"]');
    if (sb && (sb.offsetLeft < row.scrollLeft || sb.offsetLeft + sb.offsetWidth > row.scrollLeft + row.clientWidth)) row.scrollLeft = Math.max(0, sb.offsetLeft - 8);
    const a = ranked.find(x => x.crop.id === state.cmp), c = a.crop, p = a.plan, g = a.g;
    $('#capAfter').textContent = t({ none: 'cmpSame', lime: 'cmpLime', sulfur: 'cmpSulfur', measure: 'cmpFix' }[p.action]);
    $('#phNow').textContent = t('cmpPH', { v: ph.lo === ph.hi ? phTxt1(ph.lo) : `${phTxt1(ph.lo)}–${phTxt1(ph.hi)}` });
    let phA;
    if (p.action === 'none') phA = $('#phNow').textContent;
    else if (p.action === 'lime') phA = t('cmpPH', { v: phTxt1(p.target) });
    else if (p.action === 'sulfur' && (ph.mode === 'after' || p.sulfur.capped)) phA = t('cmpPH', { v: phTxt1(ph.hi - p.sulfur.steps) });
    else phA = t('cmpPH', { v: `${phTxt1(c.ph[0])}–${phTxt1(c.ph[1])}` });
    $('#phAfterV').textContent = phA;
    const grains = p.action === 'lime' ? ['#f7f5ee', '#b9b39f'] : p.action === 'sulfur' ? ['#e3c23c', '#b3901b'] : null;
    $('#svgNow').innerHTML = potSVG(load, null);
    $('#svgAfter').innerHTML = potSVG(load, grains);
    // targets
    anim.tNow = g.now.lo / 100; anim.tNowHi = g.now.hi / 100; anim.tAfter = g.after.lo / 100;
    anim.labels = { now: rangeTxt(g.now), after: rangeTxt(g.after) };
    const ranged = !same(g.now);
    $('#svgNow .ghost-g').innerHTML = ranged ? bladePaths(anim.tNowHi, anim.base, 'class="ghost-p"') : '';
    $('#ghostL').hidden = !ranged;
    const dLo = g.after.lo - g.now.hi, dHi = g.after.lo - g.now.lo, d = $('#delta');
    if (p.action === 'none' || dHi < 0.5) d.hidden = true;
    else { d.hidden = false; d.textContent = ranged && dHi - dLo >= 1 ? t('cmpDeltaMax', { d: pct(dHi) }) : t('cmpDelta', { d: pct(dHi) }); }
    // what to do
    const tex = L(T.texName)[state.texture];
    let main = '', sw = '';
    if (p.action === 'none') main = t('todoNone');
    if (p.action === 'lime') { main = t('todoLime', { g: limeText(p), t: phTxt1(p.target), tex }); sw = 'lime'; }
    if (p.action === 'sulfur') { main = t('todoSulfur', { g: Math.round(p.sulfur.gPerM2), v: fx(p.sulfur.steps, 1), tex }); sw = 'sulfur'; }
    if (p.action === 'measure') main = t('todoMeasure', { o1: phTxt1(c.ph[0]), o2: phTxt1(c.ph[1]), lime: `${r10(p.lime.gMax)} g`, s: Math.round(p.sulfur.gPerM2) });
    const extra = [];
    if (p.action === 'lime') extra.push(t('advLimeColour'));
    if (p.action === 'lime' && ph.mode !== 'after') extra.push(t('todoRange'));
    if (p.action === 'sulfur' && p.sulfur.capped) extra.push(t('advCapped'));
    if (p.action === 'sulfur') extra.push(p.sulfur.seasons > 1 ? t('advSplit', { n: p.sulfur.seasons }) : t('advOne'));
    if (a.by[state.scen].salt < 99.5) extra.push(t('todoSalt', { g: pct(a.by[state.scen].salt) }));
    $('#todo').innerHTML = `<h4>${esc(t('todoTitle'))} · ${esc(cropName(c))}</h4><p class="do">${sw ? `<span class="amend ${sw}" aria-hidden="true"></span>` : ''}<span>${esc(main)}</span></p>` +
      extra.map(x => `<p class="small">${esc(x)}</p>`).join('');
    if (anim.played) play(false); else { anim.now = anim.after = 0; drawFrame(0, 0); }
  }

  function renderResults() {
    const c = currentLoad(); if (!c) return;
    const ph = M.phPrediction(c.load, currentPH());
    const ec = M.ecScenarios(c.load);
    const sevName = c.cls ? t({ low: 'sevLow', mid: 'sevMid', high: 'sevHigh' }[c.cls]) : null;
    const phTxt = ph.mode === 'after' ? `${fx(ph.lo, 1)} <small>${esc(t('phAfterNote'))}</small>`
      : `${fx(ph.lo, 1)}–${fx(ph.hi, 1)}${ph.beyond ? '+' : ''} <small>${esc(t('phBase', { b: fx(ph.base, 1) }))}</small>`;
    const sel = k => state.scen === k ? ' class="sel"' : '';
    $('#summary').innerHTML = `
      <div class="kv"><span>${esc(t('sumLoad'))}</span><b>${fx(c.load, 1)} <small>Mg/ha</small></b>${sevName ? `<em>${esc(sevName)}</em>` : ''}</div>
      <div class="kv"><span>${esc(t('sumEC'))}</span>
        <ul class="ec"><li${sel('wildfire')}><b>${fx(ec.wildfire[1], 2)}</b> <small>dS/m · ${esc(t('ecWild'))}</small></li>
        <li${sel('salty')}><b>${fx(ec.salty, 1)}</b> <small>dS/m · ${esc(t('ecSalty'))}</small></li>
        <li${sel('firewood')}><b>${fx(ec.firewood, 1)}</b> <small>dS/m · ${esc(t('ecWorst'))}</small></li></ul></div>
      <div class="kv"><span>${esc(t('sumPH'))}</span><b>${phTxt}</b>${ph.mode !== 'after' ? `<em class="muted">${esc(t('phRangeNote'))}${ph.beyond ? ' · ' + esc(t('phBeyond')) : ''}</em>` : ''}</div>`;
    const ranked = M.rank(c.load, ph, state.texture, state.scen);
    renderCompare(ranked, ph, c.load);
    $('#cropsScen').textContent = `(${t('scenLabel')}: ${t(SCEN_KEY[state.scen])})`;
    $('#crops').innerHTML = ranked.map(a => {
      const cr = a.crop, v = a.verdict, open = state.open === cr.id, g = a.g, none = a.plan.action === 'none';
      return `<li class="crop ${v}${open ? ' open' : ''}">
        <button type="button" class="crop-head" aria-expanded="${open}" data-crop="${cr.id}">
          <span class="vchip ${v}">${VERDICT_ICON[v]}${esc(t(VKEY[v]))}</span>
          <span class="cname">${esc(cropName(cr))}<i>${esc(cr.sci)}</i></span>
          <span class="tag">${esc(t(cr.use === 'grain' ? 'useGrain' : 'useCover'))}</span>
        </button>
        <div class="growth two" role="group" aria-label="${esc(t('gLine'))}">
          <div class="gcell"><small>${esc(t('gNow'))}</small><b>${rangeTxt(g.now)}</b></div>
          <div class="gcell${none ? ' muted' : ' up'}"><small>${esc(t(none ? 'gSame' : 'gAfter'))}</small><b>${rangeTxt(g.after)}</b></div>
          <button type="button" class="cmpbtn" data-cmpgo="${cr.id}">${esc(t('cmpBtn'))}</button>
        </div>
        <p class="phrow"><span class="dot s${a.phWorst}"></span>${esc(phText(a))} · ${esc(t('phLine', { o1: fx(cr.ph[0], 1), o2: fx(cr.ph[1], 1), a1: fx(cr.phAbs[0], 1), a2: fx(cr.phAbs[1], 1) }))}</p>
        ${a.germRisk ? `<p class="warn">${esc(t('germW', { ec: fx(a.ecSel, 1) }))}</p>` : ''}
        <div class="detail"${open ? '' : ' hidden'}>
          <h4>${esc(t('adviceTitle'))}</h4>
          <ul>${advice(a, ph).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          <p class="small">${esc(t('saltOnly'))}: ${M.SCEN.map(k => `${esc(t(SCEN_KEY[k]))} ${pct(a.salt[k])}%`).join(' · ')}</p>
          <p class="ev"><span class="evtag ${cr.measured ? 'm' : 'l'}">${esc(t(cr.measured ? 'evMeasured' : 'evLit'))}</span></p>
          ${cr.measured ? `<p class="small">${esc(t('teamNote'))}</p><p class="small">${esc(t('barleyPh'))}</p>` : ''}
          <p class="small">${esc(t('saltSrc', { a: fx(cr.a, 1), ec0: fx(cr.ec0, 1), src: cr.salt === 'FAO 29' ? 'Ayers & Westcot, 1985' : 'Maas, 1990' }))} · ${esc(t('phSrc'))}</p>
        </div>
      </li>`;
    }).join('');
  }

  // ---------- about ----------
  function renderAbout() {
    $('#how').innerHTML = ['how1', 'how2', 'how3', 'how4', 'howPH', 'howMin', 'howAfter', 'how5'].map(k => `<li>${esc(t(k))}</li>`).join('');
    $('#limits').innerHTML = ['lim1', 'lim2', 'lim3', 'lim4', 'lim5', 'lim6', 'lim7', 'lim8', 'lim9'].map(k => `<li>${esc(t(k))}</li>`).join('');
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
    $('#results').scrollIntoView({ behavior: smooth(), block: 'start' });
  });
  // results update live once shown, so the button steps aside while they are on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => $('#cta').classList.toggle('away', state.shown && e.isIntersecting)))
      .observe($('#results'));
  }
  // results: one listener per container
  $('#crops').addEventListener('click', e => {
    const go = e.target.closest('[data-cmpgo]');
    if (go) { state.cmp = go.dataset.cmpgo; renderResults(); anim.played = true; play(true); $('#compare').scrollIntoView({ behavior: smooth(), block: 'start' }); return; }
    const h = e.target.closest('.crop-head');
    if (h) { state.open = state.open === h.dataset.crop ? null : h.dataset.crop; renderResults(); }
  });
  $('#cropSel').addEventListener('click', e => { const b = e.target.closest('[data-cmp]'); if (!b) return; state.cmp = b.dataset.cmp; renderResults(); anim.played = true; play(true); });
  $('#scenSel').addEventListener('click', e => { const b = e.target.closest('[data-scen]'); if (!b) return; state.scen = b.dataset.scen; renderResults(); });
  $('#replay').addEventListener('click', () => { anim.played = true; play(true); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && state.shown && !anim.played) { anim.played = true; play(true); } }), { threshold: 0.45 }).observe($('#stage'));
  } else anim.played = true;
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
