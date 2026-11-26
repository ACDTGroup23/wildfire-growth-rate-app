// Run: node tests/model.test.js
const M = require('../assets/model.js'), D = require('../assets/data.js');
let fail = 0;
const near = (n, got, want, tol) => { const ok = Math.abs(got - want) <= tol; if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}: ${(+got).toFixed(3)} (expected ${want})`); };
const eq = (n, got, want) => { const ok = got === want; if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}: ${got} (expected ${want})`); };
// same EC as the simulator (firewood ash 33 dS/m): 3.2 / 8.4 / 18.1 dS/m at 6.0 / 15.9 / 34.2 Mg/ha
[[6.0, 3.17], [15.9, 8.40], [34.2, 18.06]].forEach(([L, e]) => near(`firewood EC @${L}`, M.ecFrom(L, 33), e, 0.01));
near('barley worst @34.2', M.growth(M.ecFrom(34.2, 33), D.CROPS[0]), 49.7, 0.1);
near('wildfire ash EC hi (1:5)', D.ASH_EC.wildfire[1], 0.2256, 1e-4);
near('wildfire EC @34.2 (hi)', M.ecFrom(34.2, D.ASH_EC.wildfire[1]), 0.1235, 0.001);
near('salty wildfire EC @34.2', M.ecFrom(34.2, 12.8), 7.01, 0.01);
near('frame 24 g -> Mg/ha', M.frameToLoad(24), 6.0, 1e-9);
near('pH slope per Mg/ha', M.PH_SLOPE, 0.2397, 0.0005);
const p = M.phPrediction(34.2, { mode: 'unknown' }); near('pH lo default', p.lo, 4.6, 1e-9); near('pH hi capped', p.hi, 4.6 + 0.2397 * 8.542, 0.005); eq('pH beyond flag', p.beyond, true);
eq('severity green+low', M.severityFromAnswers({ trees: 'yes', canopy: 'green', under: 'low' }).cls, 'low');
eq('severity green+tall', M.severityFromAnswers({ trees: 'yes', canopy: 'green', under: 'tall' }).cls, 'mid');
eq('severity scorched', M.severityFromAnswers({ trees: 'yes', canopy: 'scorched' }).cls, 'mid');
eq('severity consumed', M.severityFromAnswers({ trees: 'yes', canopy: 'consumed' }).cls, 'high');
eq('severity white ash', M.severityFromAnswers({ trees: 'no', ash: 'white' }).cls, 'high');
const s = M.sulfurPlan(7.8, D.CROPS[3], 'loam'); eq('sulfur steps rye 7.8->6.0', s.steps, 2); near('sulfur g/m2 loam 2 units', s.gPerM2, 195.3, 0.1);
near('lb/1000ft2 -> g/m2', D.LB_PER_1000FT2_TO_G_PER_M2, 4.882, 0.001);
const r = M.rank(34.2, { lo: 4.6, hi: 6.65 }); console.log('rank @34.2, pH 4.6–6.65:', r.map(x => `${x.crop.id}:${x.verdict}`).join(' '));
console.log(fail ? `\n${fail} FAILED` : '\nall checks passed'); process.exit(fail ? 1 : 0);
