const { normalizeLocation } = require("../config/locations");

// Unifica ubicaciones existentes ("zitacuaro", "Zitácuaro, Mich.") al formato del catálogo.
// Es idempotente y no toca textos que no reconoce.
async function normalizeExistingLocations(query) {
  const r = await query("SELECT DISTINCT location FROM jobs");
  let changed = 0;
  for (const { location } of r.rows) {
    const { label, known } = normalizeLocation(location);
    if (known && label !== location) {
      const u = await query("UPDATE jobs SET location=$1 WHERE location=$2", [label, location]);
      changed += u.rowCount;
    }
  }
  return changed;
}

module.exports = { normalizeExistingLocations };
