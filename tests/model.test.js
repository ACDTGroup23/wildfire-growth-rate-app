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
// pH response (Ecocrop plateau curve)
const C = id => D.CROPS.find(c => c.id === id);
near('phSuit barley 6.25', M.phSuit(6.25, C('barley')), 0.5, 1e-9);
near('phSuit rye 4.6', M.phSuit(4.6, C('rye')), 0.1, 1e-9);
near('phSuit stdwg 6.75', M.phSuit(6.75, C('stdwg')), 0.5, 1e-9);
near('phSuit barley 7.0 (best range)', M.phSuit(7.0, C('barley')), 1, 1e-9);
const sr = M.phSuitRange(4.6, 6.65, C('rye')); near('phSuitRange rye min', sr.min, 0.1, 1e-9); near('phSuitRange rye max', sr.max, 1, 1e-9);
// lime (Ippolito & Bauder 2021): loam light 4.6 -> 6.5 = 5800 lb/acre
near('lb/acre -> g/m2', D.LB_PER_ACRE_TO_G_PER_M2, 0.11209, 1e-5);
near('lime loam light @4.6', M.limeToTarget(4.6, 'loam', 'light'), 5800, 1e-9);
const lb = M.limePlan(4.6, 4.6, C('barley'), 'loam'); near('lime barley target', lb.target, 6.5, 1e-9); near('lime barley g/m2 light', lb.gMin, 650.1, 0.1); near('lime barley g/m2 dark', lb.gMax, 851.8, 0.1);
const lr = M.limePlan(4.6, 4.6, C('rye'), 'loam'); near('lime rye target', lr.target, 5.75, 1e-9); near('lime rye g/m2 light', lr.gMin, 425.9, 0.1);
eq('lime below table flag @4.3', M.limePlan(4.3, 4.3, C('barley'), 'loam').belowTable, true);
// assessments
const after = v => ({ lo: v, hi: v, mode: 'after' });
const ab = M.assess(C('barley'), 15.9, after(5.0), 'loam', 'wildfire'); near('barley now @pH5.0', ab.g.now.lo, 0, 1e-9); near('barley after lime', ab.g.after.lo, 100, 1e-9); eq('barley verdict', ab.verdict, 'fix'); eq('barley action', ab.plan.action, 'lime');
const ar = M.assess(C('rye'), 15.9, after(5.75), 'loam', 'wildfire'); eq('rye at 5.75 action', ar.plan.action, 'none'); eq('rye at 5.75 verdict', ar.verdict, 'yes');
const as = M.assess(C('stdwg'), 34.2, after(6.0), 'loam', 'firewood'); near('stdwg firewood after', as.g.after.lo, 40.57, 0.05); eq('stdwg firewood verdict', as.verdict, 'no');
const ac = M.assess(C('stdwg'), 6.0, after(8.8), 'loam', 'wildfire'); eq('stdwg 8.8 sulfur capped', ac.plan.sulfur.capped, true); near('stdwg after capped sulfur', ac.g.after.lo, 40, 1e-6);
const am = M.assess(C('rye'), 15.9, { lo: 4.6, hi: 6.6, mode: 'unknown' }, 'loam', 'wildfire'); eq('rye range spans both sides', am.plan.action, 'measure');
const r = M.rank(34.2, { lo: 4.6, hi: 6.65, mode: 'unknown' }, 'loam', 'wildfire');
console.log('rank @34.2, pH 4.6–6.65:', r.map(x => `${x.crop.id}:${x.verdict} now ${Math.round(x.g.now.lo)}–${Math.round(x.g.now.hi)} after ${Math.round(x.g.after.lo)} ${x.plan.action}`).join('\n  '));
console.log(fail ? `\n${fail} FAILED` : '\nall checks passed'); process.exit(fail ? 1 : 0);
