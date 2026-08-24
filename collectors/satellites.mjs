import { fetchJson } from "../lib/http.mjs";
import { writeJsonAtomic } from "../lib/files.mjs";

const groups = ["stations", "weather", "starlink", "active"];

export async function collectSatellites() {
  const unique = new Map();
  for (const group of groups) {
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`;
    const result = await fetchJson(url, { cacheKey: `celestrak-${group}` });
    if (result.notModified) continue;
    for (const item of result.data) {
      const id = String(item.NORAD_CAT_ID);
      const current = unique.get(id);
      unique.set(id, {
        norad_id: Number(item.NORAD_CAT_ID),
        name: item.OBJECT_NAME,
        object_id: item.OBJECT_ID || null,
        object_type: item.OBJECT_TYPE || null,
        epoch: item.EPOCH,
        mean_motion: item.MEAN_MOTION,
        eccentricity: item.ECCENTRICITY,
        inclination: item.INCLINATION,
        ra_of_asc_node: item.RA_OF_ASC_NODE,
        arg_of_pericenter: item.ARG_OF_PERICENTER,
        mean_anomaly: item.MEAN_ANOMALY,
        ephemeris_type: item.EPHEMERIS_TYPE,
        classification_type: item.CLASSIFICATION_TYPE,
        groups: [...new Set([...(current?.groups || []), group])],
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  if (unique.size === 0) {
    throw new Error("All CelesTrak responses were not modified; force run later or retain previous dataset");
  }

  const items = [...unique.values()].sort((a, b) => a.norad_id - b.norad_id);
  const dataset = {
    schema_version: 1,
    dataset: "satellites",
    source: "CelesTrak GP data",
    source_url: "https://celestrak.org/NORAD/elements/",
    generated_at: new Date().toISOString(),
    groups,
    count: items.length,
    items,
  };
  await writeJsonAtomic("satellites.json", dataset);
  return dataset;
}
