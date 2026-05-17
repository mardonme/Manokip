// Manokip product catalog — 5 categories, 90 products.
// Counts (per spec): Manometers 80 · Pressure switches 2 · Solar panels 5 · Level gauges 2 · Protection relays 1.
// `cat` here is the canonical category key used by the seeder to map to Category rows.

export const CATEGORIES = [
  {
    key: 'manometers',
    count: 80,
    en: 'Manometers',
    ru: 'Манометры',
    uz: 'Manometrlar',
  },
  {
    key: 'pressure-switches',
    count: 2,
    en: 'Pressure switches',
    ru: 'Реле давления',
    uz: 'Bosim relelari',
  },
  {
    key: 'solar-panels',
    count: 5,
    en: 'Solar panels',
    ru: 'Солнечные панели',
    uz: 'Quyosh panellari',
  },
  {
    key: 'level-gauges',
    count: 2,
    en: 'Level gauges',
    ru: 'Уровнемеры',
    uz: 'Sath oʻlchagichlari',
  },
  {
    key: 'protection-relays',
    count: 1,
    en: 'Protection relays',
    ru: 'Реле защиты',
    uz: 'Himoya relelari',
  },
];

// ---- Manometer generator ------------------------------------------------
// 80 manometers across realistic series, ranges, and case diameters.
const MANOMETER_SERIES = [
  { model: 'DM8008-VU', desc: { en: 'Vibration-resistant gauge', ru: 'Виброустойчивый манометр', uz: 'Tebranishga chidamli manometr' } },
  { model: 'DA8008-VU', desc: { en: 'Vibration-resistant gauge', ru: 'Виброустойчивый манометр', uz: 'Tebranishga chidamli manometr' } },
  { model: 'MP2-Um',    desc: { en: 'Technical gauge',           ru: 'Технический манометр',     uz: 'Texnik manometr' } },
  { model: 'MP3-Um',    desc: { en: 'Technical gauge',           ru: 'Технический манометр',     uz: 'Texnik manometr' } },
  { model: 'MP4-U',     desc: { en: 'Industrial gauge',          ru: 'Промышленный манометр',    uz: 'Sanoat manometri' } },
  { model: 'MVP2-U',    desc: { en: 'Vacuum / pressure gauge',   ru: 'Мановакуумметр',            uz: 'Vakuum / bosim manometri' } },
  { model: 'VP3A-VU',   desc: { en: 'Ammonia vacuum gauge',      ru: 'Аммиачный мановакуумметр',  uz: 'Ammiakli vakuum manometri' } },
  { model: 'MTI-1218',  desc: { en: 'Reference gauge',           ru: 'Образцовый манометр',       uz: 'Etalon manometr' } },
  { model: 'EKM-1U',    desc: { en: 'Electrocontact gauge',      ru: 'Электроконтактный манометр', uz: 'Elektrokontakt manometr' } },
  { model: 'EKM-2U',    desc: { en: 'Electrocontact gauge',      ru: 'Электроконтактный манометр', uz: 'Elektrokontakt manometr' } },
  { model: 'DM02-100',  desc: { en: 'Corrosion-resistant gauge', ru: 'Коррозионностойкий манометр', uz: 'Korroziyaga chidamli manometr' } },
  { model: 'DM05-Ex',   desc: { en: 'Explosion-proof gauge',     ru: 'Взрывозащищённый манометр', uz: 'Portlashga chidamli manometr' } },
  { model: 'TM-510',    desc: { en: 'Railway gauge',             ru: 'Железнодорожный манометр',  uz: 'Temir yoʻl manometri' } },
  { model: 'DM-DIG',    desc: { en: 'Digital pressure gauge',    ru: 'Цифровой манометр',         uz: 'Raqamli manometr' } },
];

const RANGES = [
  '0–1 kgf/cm²', '0–2.5 kgf/cm²', '0–4 kgf/cm²', '0–6 kgf/cm²', '0–10 kgf/cm²',
  '0–16 kgf/cm²', '0–25 kgf/cm²', '0–40 kgf/cm²', '0–60 kgf/cm²', '0–100 kgf/cm²',
  '0–160 kgf/cm²', '0–250 kgf/cm²', '0–400 kgf/cm²',
  '−1…0 kgf/cm²', '−1…+3 kgf/cm²', '−1…+5 kgf/cm²', '−1…+9 kgf/cm²', '−1…+15 kgf/cm²', '−1…+24 kgf/cm²',
];

const DIAMETERS = [50, 63, 100, 160, 250];
const ACCURACIES = ['1.0', '1.5', '2.5', '0.6', '0.4'];

const manometers = [];
for (let i = 0; i < 80; i++) {
  const s = MANOMETER_SERIES[i % MANOMETER_SERIES.length];
  const range = RANGES[i % RANGES.length];
  const dia = DIAMETERS[Math.floor(i / MANOMETER_SERIES.length) % DIAMETERS.length];
  const acc = ACCURACIES[i % ACCURACIES.length];
  const priceBase = 60_000 + ((i * 8731) % 420_000);
  const priceRounded = Math.round(priceBase / 1000) * 1000;
  manometers.push({
    id: i + 1,
    cat: 'manometers',
    model: s.model,
    desc: s.desc,
    range,
    dia,
    acc,
    price: `from ${priceRounded.toLocaleString('ru-RU')}`,
  });
}

// ---- Pressure switches (2) ----------------------------------------------
const pressureSwitches = [
  {
    id: 81, cat: 'pressure-switches',
    model: 'RD-1U', desc: { en: 'Mechanical pressure switch', ru: 'Механическое реле давления', uz: 'Mexanik bosim relesi' },
    range: '0.05–6 bar', dia: null, acc: '1.5', price: 'from 380 000',
  },
  {
    id: 82, cat: 'pressure-switches',
    model: 'RD-2U', desc: { en: 'Differential pressure switch', ru: 'Реле перепада давления', uz: 'Bosim farqi relesi' },
    range: '0.5–25 bar', dia: null, acc: '1.5', price: 'from 520 000',
  },
];

// ---- Solar panels (5) ---------------------------------------------------
const solarPanels = [
  {
    id: 83, cat: 'solar-panels',
    model: 'MSP-100M', desc: { en: 'Monocrystalline solar panel 100 W', ru: 'Монокристаллическая солнечная панель 100 Вт', uz: 'Monokristalli quyosh paneli 100 Vt' },
    range: '100 W · 18 V', dia: null, acc: null, price: 'from 1 200 000',
  },
  {
    id: 84, cat: 'solar-panels',
    model: 'MSP-200M', desc: { en: 'Monocrystalline solar panel 200 W', ru: 'Монокристаллическая солнечная панель 200 Вт', uz: 'Monokristalli quyosh paneli 200 Vt' },
    range: '200 W · 24 V', dia: null, acc: null, price: 'from 2 100 000',
  },
  {
    id: 85, cat: 'solar-panels',
    model: 'MSP-300M', desc: { en: 'Monocrystalline solar panel 300 W', ru: 'Монокристаллическая солнечная панель 300 Вт', uz: 'Monokristalli quyosh paneli 300 Vt' },
    range: '300 W · 36 V', dia: null, acc: null, price: 'from 2 900 000',
  },
  {
    id: 86, cat: 'solar-panels',
    model: 'PSP-400P', desc: { en: 'Polycrystalline solar panel 400 W', ru: 'Поликристаллическая солнечная панель 400 Вт', uz: 'Polikristalli quyosh paneli 400 Vt' },
    range: '400 W · 36 V', dia: null, acc: null, price: 'from 3 600 000',
  },
  {
    id: 87, cat: 'solar-panels',
    model: 'MSP-550M', desc: { en: 'Monocrystalline solar panel 550 W', ru: 'Монокристаллическая солнечная панель 550 Вт', uz: 'Monokristalli quyosh paneli 550 Vt' },
    range: '550 W · 48 V', dia: null, acc: null, price: 'from 4 800 000',
  },
];

// ---- Level gauges (2) ---------------------------------------------------
const levelGauges = [
  {
    id: 88, cat: 'level-gauges',
    model: 'Umold-MLG', desc: { en: 'Microimpulse level meter', ru: 'Микроимпульсный уровнемер', uz: 'Mikroimpulsli sath oʻlchagich' },
    range: '0–20 m', dia: null, acc: '0.5%', price: 'on request',
  },
  {
    id: 89, cat: 'level-gauges',
    model: 'Umold-RLG', desc: { en: 'Radar level sensor', ru: 'Радарный уровнемер', uz: 'Radar sath datchigi' },
    range: '0–35 m', dia: null, acc: '0.3%', price: 'on request',
  },
];

// ---- Protection relay (1) ------------------------------------------------
const protectionRelays = [
  {
    id: 90, cat: 'protection-relays',
    model: 'CYCLOP DEM-61', desc: { en: 'Universal protection unit', ru: 'Универсальный блок защиты', uz: 'Universal himoya bloki' },
    range: '—', dia: null, acc: null, price: 'on request',
  },
];

export const PRODUCTS = [
  ...manometers,
  ...pressureSwitches,
  ...solarPanels,
  ...levelGauges,
  ...protectionRelays,
];
