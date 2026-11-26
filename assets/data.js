/* Post-Fire Planting Guide — inputs with sources (see SOURCES / REFERENCES). */
(function (root) {
  'use strict';

  // Fire severity classes and field ash loads (Santín et al., 2015; classes after Chafer et al., 2004, as cited there)
  const SEVERITY = {
    low:  { load: 6.0,  se: 0.7, santin: 'low' },      // ground and understorey (<0.5 m) burnt, canopy unaffected
    mid:  { load: 15.9, se: 0.9, santin: 'high' },     // understorey (<4 m) consumed, canopy scorched
    high: { load: 34.2, se: 2.1, santin: 'extreme' },  // all fuels consumed, including stems <1 cm thick
  };

  // EC of ash extract converted to ash:water 1:5 (dS/m). Santín et al. (2015) measured at 1:20, so x4 (EC is proportional
  // to dissolved salt, Rusydi 2018, assuming all salts dissolve at both ratios).
  const ASH_EC = {
    wildfire: [0.0433 * 4, 0.0564 * 4], // Santín 2015 ash extracts 43.3–56.4 µS/cm (1:20)
    salty: 3.2 * 4,                      // Californian wildfire ash up to 3200 µS/cm (Plumlee 2007; Hageman 2008, as cited in Santín 2015)
    firewood: 33.0,                      // firewood ash, Neina et al. (2020); same worst case as the team's simulator
  };

  // Root-zone geometry of the team's tray cell (EC model of the simulator): soil 4.4 cm deep, pore space 0.71
  const GEOM = { depth: 4.4, porosity: 0.71, ratio: 5 };  // ISO 11269-2 fill; Bilderback & Fonteno (1987)

  // Team measurement 13 Nov: soil-water pH of tray soil after the experiment (two meters averaged)
  const PH_MEAS = { loads: [0, 1.492, 3.979, 8.542], ph: [5.825, 5.67, 7.17, 7.78] };
  const PH_DEFAULT = 4.6;   // median pH(H2O) of Korean forest soils at the adequate level, 65 plots (Lee & Koo, 2020)

  // Crops: barley and its relatives in the tribe Triticeae with both salt-tolerance and pH data.
  // a = threshold ECe (dS/m), ec0 = ECe at 0% yield; pH ranges from FAO ECOCROP (optimal / absolute)
  const CROPS = [
    { id: 'barley', ko: '보리', en: 'Barley', sci: 'Hordeum vulgare', a: 8.0, ec0: 28, salt: 'FAO 29', ph: [6.5, 7.5], phAbs: [6.0, 8.0], germ: true, measured: true, use: 'grain' },
    { id: 'wheat', ko: '밀', en: 'Wheat', sci: 'Triticum aestivum', a: 6.0, ec0: 20, salt: 'FAO 29', ph: [6.0, 7.0], phAbs: [5.5, 8.5], germ: true, use: 'grain' },
    { id: 'durum', ko: '듀럼밀', en: 'Durum wheat', sci: 'Triticum durum', a: 5.7, ec0: 24, salt: 'FAO 29', ph: [6.0, 7.0], phAbs: [5.5, 8.5], use: 'grain' },
    { id: 'rye', ko: '호밀', en: 'Rye', sci: 'Secale cereale', a: 11.4, ec0: 11.4 + 100 / 10.8, salt: 'Maas 1990', ph: [5.5, 6.0], phAbs: [4.5, 8.0], use: 'grain' },
    { id: 'tallwg', ko: '키 큰 위트그라스', en: 'Tall wheatgrass', sci: 'Agropyron elongatum', a: 7.5, ec0: 31, salt: 'FAO 29', ph: [6.5, 8.0], phAbs: [6.0, 8.5], use: 'cover' },
    { id: 'fairwg', ko: '페어웨이 크레스티드 위트그라스', en: 'Fairway crested wheatgrass', sci: 'Agropyron cristatum', a: 7.5, ec0: 22, salt: 'FAO 29', ph: [5.5, 6.5], phAbs: [4.0, 8.5], use: 'cover' },
    { id: 'stdwg', ko: '스탠더드 크레스티드 위트그라스', en: 'Standard crested wheatgrass', sci: 'Agropyron desertorum', a: 3.5, ec0: 28, salt: 'FAO 29', ph: [5.8, 6.5], phAbs: [5.3, 7.0], use: 'cover' },
  ];
  const GERM_LIMIT = 4.0;      // barley and wheat: ECe should not exceed 4–5 dS/m at germination (FAO 29, Table 4 note 4)
  const YIELD_LINES = [90, 50]; // yield-potential columns of FAO 29 Table 4

  // Elemental sulfur to lower soil pH, lb per 1000 ft² mixed into the top 6 in (Oklahoma State University Extension)
  const SULFUR_LB = { sandy: { 0.5: 6, 1: 12, 1.5: 18, 2: 24 }, loam: { 0.5: 10, 1: 20, 1.5: 30, 2: 40 }, clay: { 0.5: 15, 1: 30, 1.5: 45, 2: 60 } };
  const LB_PER_1000FT2_TO_G_PER_M2 = 453.59237 / 92.90304;   // unit conversion

  // Team experiment summary (barley)
  const TEAM = {
    trays: { maxG: 0.9875, maxLoad: 8.5, p: 0.47 },   // no height difference up to 0.99 g per cell (two-way ANOVA, 46 plants)
    pots: [{ g: 15.11, load: 15.9, grew: '3/3' }, { g: 32.49, load: 34.2, grew: '1/3' }],
  };

  const SOURCES = [
    { item: { ko: '산불 강도 등급과 재 부하량', en: 'Fire severity classes and ash loads' }, value: '6.0 · 15.9 · 34.2 Mg/ha', src: 'Santín et al. (2015); classes of Chafer et al. (2004), as cited there' },
    { item: { ko: '산불 재의 EC (1:20 → 1:5 환산)', en: 'Wildfire ash EC (1:20 → 1:5)' }, value: '0.17–0.23 dS/m', src: 'Santín et al. (2015); ×4 for 1:5 (Rusydi, 2018)' },
    { item: { ko: '염이 많은 산불 재의 EC', en: 'EC of salty wildfire ash' }, value: '12.8 dS/m', src: 'Plumlee et al. (2007), Hageman et al. (2008), as cited in Santín et al. (2015); ×4' },
    { item: { ko: '땔감 재의 EC (가장 나쁜 경우)', en: 'Firewood ash EC (worst case)' }, value: '33 dS/m', src: 'Neina et al. (2020)' },
    { item: { ko: '뿌리 층 깊이 · 빈틈 비율', en: 'Root-zone depth · pore space' }, value: '4.4 cm · 0.71', src: { ko: '팀 모종판 칸; Bilderback & Fonteno (1987)', en: "Team's tray cell; Bilderback & Fonteno (1987)" } },
    { item: { ko: '재에 따른 흙 pH 상승', en: 'Soil pH rise with ash' }, value: '+0.24 per Mg/ha (0–8.5)', src: { ko: '팀 실측 (11/13, 실험 후 모종판 흙)', en: 'Team measurement (13 Nov, tray soil after the experiment)' } },
    { item: { ko: '흙 pH 기본값', en: 'Default soil pH' }, value: '4.6', src: 'Lee & Koo (2020)' },
    { item: { ko: '작물별 염 내성 (문턱 · 0% EC)', en: 'Crop salt tolerance (threshold · 0% EC)' }, value: { ko: '작물 카드에 표시', en: 'shown on each crop' }, src: 'Ayers & Westcot (1985); Maas (1990)' },
    { item: { ko: '작물별 알맞은 pH', en: 'Crop pH ranges' }, value: { ko: '작물 카드에 표시', en: 'shown on each crop' }, src: 'FAO Ecocrop; Hijmans (2021)' },
    { item: { ko: '싹 틀 때 EC 한계 (보리 · 밀)', en: 'EC limit at germination (barley, wheat)' }, value: '4–5 dS/m', src: 'Ayers & Westcot (1985), Table 4 note 4' },
    { item: { ko: '황 사용량', en: 'Sulfur rates' }, value: { ko: '흙 종류별 표', en: 'table by soil texture' }, src: 'Oklahoma State University Extension (n.d.)' },
    { item: { ko: '석회 양은 완충 pH로 결정', en: 'Lime rate from buffer pH' }, value: '—', src: 'Hannan (n.d.)' },
    { item: { ko: '보리 실측', en: 'Barley measurements' }, value: { ko: '모종판 46포기 · 화분 4개', en: '46 tray plants · 4 pots' }, src: { ko: '팀 기록표', en: 'Team record sheet' } },
  ];

  const REFERENCES = [
    'Ayers, R. S., & Westcot, D. W. (1985). <i>Water quality for agriculture</i> (FAO Irrigation and Drainage Paper No. 29, Rev. 1). Food and Agriculture Organization of the United Nations.',
    'Bilderback, T. E., & Fonteno, W. C. (1987). Effects of container geometry and media physical properties on air and water volumes in containers. <i>Journal of Environmental Horticulture, 5</i>(4), 180–182.',
    'Food and Agriculture Organization of the United Nations. (n.d.). <i>Ecocrop</i> [Database]. https://ecocrop.apps.fao.org/',
    'Hannan, J. (n.d.). <i>How to change your soil’s pH</i>. Iowa State University Extension and Outreach. https://yardandgarden.extension.iastate.edu/how-to/how-change-your-soils-ph',
    'Hijmans, R. J. (2021). <i>Recocrop: Estimating environmental suitability for plants</i> (Version 0.4-0) [Computer software]. https://github.com/cropmodels/Recocrop',
    'Lee, A. L., & Koo, N. (2020). Comparison of soil physicochemical properties according to the sensitivity of forest soil to acidification in the Republic of Korea. <i>Journal of Korean Society of Forest Science, 109</i>(2), 157–168. https://doi.org/10.14578/jkfs.2020.109.2.157',
    'Maas, E. V. (1990). Crop salt tolerance. In K. K. Tanji (Ed.), <i>Agricultural salinity assessment and management</i> (pp. 262–304). American Society of Civil Engineers.',
    'Maas, E. V., & Hoffman, G. J. (1977). Crop salt tolerance — Current assessment. <i>Journal of the Irrigation and Drainage Division, 103</i>(2), 115–134.',
    'Neina, D., Faust, S., & Joergensen, R. G. (2020). Characterization of charcoal and firewood ash for use in African peri-urban agriculture. <i>Chemical and Biological Technologies in Agriculture, 7</i>, Article 5.',
    'Oklahoma State University Extension. (n.d.). <i>Acidifying lawns and garden soils in Oklahoma</i>. https://extension.okstate.edu/fact-sheets/acidifying-lawns-and-garden-soils-in-oklahoma',
    'Rusydi, A. F. (2018). Correlation between conductivity and total dissolved solid in various type of water: A review. <i>IOP Conference Series: Earth and Environmental Science, 118</i>, Article 012019.',
    'Santín, C., Doerr, S. H., Otero, X. L., & Chafer, C. J. (2015). Quantity, composition and water contamination potential of ash produced under different wildfire severities. <i>Environmental Research, 142</i>, 297–308.',
  ];

  const api = { SEVERITY, ASH_EC, GEOM, PH_MEAS, PH_DEFAULT, CROPS, GERM_LIMIT, YIELD_LINES, SULFUR_LB, LB_PER_1000FT2_TO_G_PER_M2, TEAM, SOURCES, REFERENCES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PFG_DATA = api;
})(typeof window !== 'undefined' ? window : globalThis);
