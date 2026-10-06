// Catálogo de ubicaciones sugeridas y normalización.
// Objetivo: que "zitacuaro", "Zitácuaro, Mich." y "Zitácuaro, Michoacán" sean el mismo valor,
// sin impedir que una empresa publique en otra ciudad (se guarda el texto libre).

const DEFAULT_LOCATION = "Zitácuaro, Michoacán";

const strip = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,;/()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// bare: acepta el nombre solo (sin estado) porque es poco ambiguo en la región.
// loose: acepta textos más largos que lo contengan ("Col. Centro, Zitácuaro").
const MICH = "Michoacán";
const EDOMEX = "Estado de México";
const CATALOG = [
  { city: "Zitácuaro", state: MICH, bare: true, loose: true },
  { city: "Ciudad Hidalgo", state: MICH, aliases: ["cd hidalgo", "hidalgo michoacan", "hidalgo mich"] },
  { city: "Tuxpan", state: MICH },
  { city: "Ocampo", state: MICH },
  { city: "Angangueo", state: MICH, bare: true },
  { city: "Tlalpujahua", state: MICH, bare: true },
  { city: "Jungapeo", state: MICH, bare: true },
  { city: "Juárez", state: MICH },
  { city: "Irimbo", state: MICH, bare: true },
  { city: "Susupuato", state: MICH, bare: true },
  { city: "Tuzantla", state: MICH, bare: true },
  { city: "Senguio", state: MICH, bare: true },
  { city: "Maravatío", state: MICH, bare: true },
  { city: "Morelia", state: MICH, bare: true },
  { city: "Toluca", state: EDOMEX, bare: true, aliases: ["toluca edomex", "toluca mex"] },
  { city: "Valle de Bravo", state: EDOMEX, bare: true },
  { city: "Ciudad de México", state: null, aliases: ["cdmx", "ciudad de mexico", "mexico df", "df", "distrito federal"] },
  { city: "Remoto", state: null, aliases: ["remoto", "home office", "trabajo remoto", "teletrabajo", "a distancia", "remote"] },
];

const stateAbbr = { [MICH]: ["mich", "michoacan", "michoacan de ocampo"], [EDOMEX]: ["edomex", "mex", "estado de mexico", "mexico"] };

const labelOf = (e) => (e.state ? `${e.city}, ${e.state}` : e.city);

const index = new Map(); // alias normalizado -> label
for (const e of CATALOG) {
  const label = labelOf(e);
  const c = strip(e.city);
  const names = new Set([strip(label), ...(e.aliases || []).map(strip)]);
  if (e.bare) names.add(c);
  if (e.state) for (const a of stateAbbr[e.state] || [strip(e.state)]) names.add(`${c} ${a}`);
  for (const n of names) if (!index.has(n)) index.set(n, label);
}
const looseEntries = CATALOG.filter((e) => e.loose).map((e) => ({ re: new RegExp(`(^| )${strip(e.city)}( |$)`), label: labelOf(e) }));

/** Devuelve { label, known }. Texto vacío => ubicación por defecto. */
function normalizeLocation(input) {
  const raw = String(input || "").replace(/\s+/g, " ").trim();
  if (!raw) return { label: DEFAULT_LOCATION, known: true };
  const key = strip(raw);
  if (index.has(key)) return { label: index.get(key), known: true };
  for (const l of looseEntries) if (l.re.test(key)) return { label: l.label, known: true };
  return { label: raw.slice(0, 80), known: false };
}

const suggestions = () => CATALOG.map(labelOf);

module.exports = { DEFAULT_LOCATION, normalizeLocation, suggestions, strip };
