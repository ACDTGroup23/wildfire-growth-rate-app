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

  // ---- one crop's assessment
  function assess(c, load, ph) {
    const ec = ecScenarios(load);
    const g = { wildfire: Math.min(...ec.wildfire.map(e => growth(e, c))), salty: growth(ec.salty, c), firewood: growth(ec.firewood, c) };
    const sLo = phStatus(ph.lo, c), sHi = phStatus(ph.hi, c);
    const phWorst = Math.min(sLo, sHi), phBest = Math.max(sLo, sHi);
    const germRisk = !!c.germ && ec.salty > D.GERM_LIMIT;
    let verdict;
    if (g.salty < D.YIELD_LINES[1] || phBest === 0) verdict = 'no';
    else if (g.salty >= D.YIELD_LINES[0] && phWorst >= 1 && !germRisk) verdict = 'yes';
    else verdict = 'maybe';
    const tooHigh = ph.hi > c.ph[1], tooLow = ph.lo < c.ph[0];
    const score = { yes: 2, maybe: 1, no: 0 }[verdict] * 1000 + phWorst * 100 + phBest * 10 + g.salty / 100 + g.firewood / 1e4;
    return { crop: c, ec, g, sLo, sHi, phWorst, phBest, germRisk, verdict, tooHigh, tooLow, score };
  }
  function rank(load, ph) { return D.CROPS.map(c => assess(c, load, ph)).sort((a, b) => b.score - a.score); }

  const api = { clamp, severityFromAnswers, frameToLoad, ecFrom, ecScenarios, growth, PH_SLOPE, PH_MAXLOAD, phPrediction, phStatus, sulfurPlan, assess, rank };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PFG_MODEL = api;
})(typeof window !== 'undefined' ? window : globalThis);
