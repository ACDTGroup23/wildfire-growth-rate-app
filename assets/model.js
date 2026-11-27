/* Post-Fire Planting Guide — calculations. */
(function (root) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.PFG_DATA;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // ---- severity test -> class. Classes not sampled by Santín et al. (moderate, very high) go to the next higher class.
  function severityFromAnswers(a) {
    if (a.trees === 'yes') {
      if (a.canopy === 'consumed') return { cls: 'high', basis: 'canopy' };
      if (a.canopy === 'scorched') return { cls: 'mid', basis: 'canopy' };
      if (a.canopy === 'green') return a.under === 'tall' ? { cls: 'mid', basis: 'moderate' } : { cls: 'low', basis: 'canopy' };
      return null;
    }
    if (a.trees === 'no') {
      const m = { black: 'low', grey: 'mid', white: 'high' };
      return m[a.ash] ? { cls: m[a.ash], basis: 'ash' } : null;
    }
    return null;
  }
  const frameToLoad = g => g / 4;     // ash (g) in a 20 x 20 cm frame -> Mg/ha (1 Mg/ha = 0.01 g/cm²)

  // ---- soil-water EC in the root zone (same equation as the simulator, f = 1)
  const ecFrom = (load, ashEC) => ashEC * D.GEOM.ratio * load / (100 * D.GEOM.depth * D.GEOM.porosity);
  function ecScenarios(load) {
    return {
      wildfire: D.ASH_EC.wildfire.map(k => ecFrom(load, k)),
      salty: ecFrom(load, D.ASH_EC.salty),
      firewood: ecFrom(load, D.ASH_EC.firewood),
    };
  }
  const growth = (ec, c) => clamp(100 - (100 / (c.ec0 - c.a)) * (ec - c.a), 0, 100);   // Maas & Hoffman (1977)

  // ---- soil pH: rise from the team's measurement, linear through the origin, only inside the tested range
  const PH_SLOPE = (() => { const { loads: L, ph } = D.PH_MEAS; let sxy = 0, sxx = 0; for (let i = 0; i < L.length; i++) { sxy += L[i] * (ph[i] - ph[0]); sxx += L[i] * L[i]; } return sxy / sxx; })();
  const PH_MAXLOAD = Math.max(...D.PH_MEAS.loads);
  function phPrediction(load, input) {
    // input: { mode: 'after' | 'before' | 'unknown', value }
    if (input.mode === 'after') return { lo: input.value, hi: input.value, base: input.value, rise: 0, beyond: false, mode: 'after' };
    const base = input.mode === 'before' ? input.value : D.PH_DEFAULT;
    const rise = PH_SLOPE * Math.min(load, PH_MAXLOAD);
    return { lo: base, hi: base + rise, base, rise, beyond: load > PH_MAXLOAD, mode: input.mode };
  }
  // pH status for one value: 2 = optimal, 1 = possible (absolute range), 0 = outside
  const phStatus = (p, c) => (p >= c.ph[0] && p <= c.ph[1]) ? 2 : (p >= c.phAbs[0] && p <= c.phAbs[1]) ? 1 : 0;

  // ---- sulfur needed to bring pH down to the crop's optimal maximum (rounded up to 0.5 units, table to 2.0)
  function sulfurPlan(phNow, c, texture) {
    const need = phNow - c.ph[1];
    if (need <= 0) return null;
    const steps = Math.min(2, Math.ceil(need / 0.5 - 1e-9) * 0.5);
    const lb = D.SULFUR_LB[texture][steps];
    return { need, steps, gPerM2: lb * D.LB_PER_1000FT2_TO_G_PER_M2, seasons: Math.ceil(steps / 1 - 1e-9), capped: need > 2 };
  }

  // ---- pH response: Ecocrop plateau curve (Hijmans, 2021). 1 inside the best range, 0 at the absolute limits, straight line between
  function phSuit(p, c) {
    const [a1, a2] = c.phAbs, [o1, o2] = c.ph;
    if (p <= a1 || p >= a2) return 0;
    if (p < o1) return (p - a1) / (o1 - a1);
    if (p > o2) return (a2 - p) / (a2 - o2);
    return 1;
  }
  // lowest and highest suitability over a pH range (the curve has one plateau, so the minimum sits at an end)
  function phSuitRange(lo, hi, c) {
    const a = phSuit(lo, c), b = phSuit(hi, c);
    return { min: Math.min(a, b), max: (hi >= c.ph[0] && lo <= c.ph[1]) ? 1 : Math.max(a, b) };
  }

  // ---- lime (Ippolito & Bauder, 2021): lb/acre to reach pH 6.5, straight line between table columns; below 4.5 uses the 4.5 column
  function limeToTarget(p, texture, colour) {
    const S = D.LIME_LB_ACRE.start, v = D.LIME_LB_ACRE[texture][colour];
    if (p <= S[0]) return v[0];
    if (p >= S[S.length - 1]) return 0;
    let i = 0; while (p > S[i + 1]) i++;
    return v[i] + (v[i + 1] - v[i]) * (p - S[i]) / (S[i + 1] - S[i]);
  }
  // target: middle of the crop's best range, but not above the table's 6.5
  const limeTarget = c => Math.max(c.ph[0], Math.min(D.LIME_TARGET_MAX, (c.ph[0] + c.ph[1]) / 2));
  function limePlan(lo, hi, c, texture) {
    const T = limeTarget(c);
    const g = (p, colour) => Math.max(0, limeToTarget(p, texture, colour) - limeToTarget(T, texture, colour)) * D.LB_PER_ACRE_TO_G_PER_M2;
    // least: highest expected pH on light soil; most: lowest expected pH on dark soil
    return { target: T, gMin: g(hi, 'light'), gMax: g(lo, 'dark'), belowTable: lo < D.LIME_LB_ACRE.start[0] };
  }

  // ---- what to change for one crop
  function adjustPlan(c, ph, texture) {
    const low = ph.lo < c.ph[0], high = ph.hi > c.ph[1];
    if (!low && !high) return { action: 'none' };
    // range on both sides of the best pH: measure first; amounts shown for each end
    if (low && high) return { action: 'measure', lime: limePlan(ph.lo, ph.lo, c, texture), sulfur: sulfurPlan(ph.hi, c, texture) };
    if (low) return Object.assign({ action: 'lime' }, limePlan(ph.lo, ph.hi, c, texture));
    const s = sulfurPlan(ph.hi, c, texture);
    return { action: 'sulfur', sulfur: s, target: c.ph[1], phAfter: s.capped ? ph.hi - s.steps : null };
  }

  // ---- one crop's assessment. Growth = the more limiting of salt and pH (law of the minimum, as in Ecocrop)
  const SCEN = ['wildfire', 'salty', 'firewood'];
  const VR = { yes: 3, fix: 2, maybe: 1, no: 0 };
  function assess(c, load, ph, texture = 'loam', scen = 'wildfire') {
    const ec = ecScenarios(load);
    const salt = { wildfire: Math.min(...ec.wildfire.map(e => growth(e, c))), salty: growth(ec.salty, c), firewood: growth(ec.firewood, c) };
    const suit = phSuitRange(ph.lo, ph.hi, c);
    const plan = adjustPlan(c, ph, texture);
    // after the change: pH inside the best range, unless the sulfur need is beyond the table
    const afterSuit = plan.action === 'none' ? null : (plan.phAfter != null ? phSuit(plan.phAfter, c) : 1);
    const by = {};
    SCEN.forEach(k => {
      const now = { lo: Math.min(salt[k], 100 * suit.min), hi: Math.min(salt[k], 100 * suit.max) };
      const after = afterSuit == null ? { lo: now.lo, hi: now.hi } : { lo: Math.min(salt[k], 100 * afterSuit), hi: Math.min(salt[k], 100 * afterSuit) };
      by[k] = { now, after, salt: salt[k], saltLimited: salt[k] < 100 - 1e-9 };
    });
    const ecSel = scen === 'wildfire' ? ec.wildfire[1] : ec[scen];
    const germRisk = !!c.germ && ecSel > D.GERM_LIMIT;
    const g = by[scen];
    let verdict;
    if (g.after.lo < D.YIELD_LINES[1]) verdict = 'no';
    else if (germRisk || g.after.lo < D.YIELD_LINES[0]) verdict = 'maybe';
    else if (g.now.lo >= D.YIELD_LINES[0]) verdict = 'yes';
    else verdict = 'fix';
    const sLo = phStatus(ph.lo, c), sHi = phStatus(ph.hi, c);
    const phWorst = Math.min(sLo, sHi), phBest = Math.max(sLo, sHi);
    const tooHigh = ph.hi > c.ph[1], tooLow = ph.lo < c.ph[0];
    const score = VR[verdict] * 1e6 + g.after.lo * 1e3 + g.now.lo + g.now.hi / 1e3;
    return { crop: c, ec, ecSel, salt, suit, plan, by, g, germRisk, verdict, sLo, sHi, phWorst, phBest, tooHigh, tooLow, score };
  }
  function rank(load, ph, texture, scen) { return D.CROPS.map(c => assess(c, load, ph, texture, scen)).sort((a, b) => b.score - a.score); }

  const api = { clamp, severityFromAnswers, frameToLoad, ecFrom, ecScenarios, growth, PH_SLOPE, PH_MAXLOAD, phPrediction, phStatus,
    phSuit, phSuitRange, limeToTarget, limeTarget, limePlan, sulfurPlan, adjustPlan, SCEN, assess, rank };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PFG_MODEL = api;
})(typeof window !== 'undefined' ? window : globalThis);
