import { fetchText } from "../lib/http.mjs";
import { parseCsv } from "../lib/csv.mjs";
import { existingDataset, writeJsonAtomic } from "../lib/files.mjs";

const output = "wildfires.json";

export async function collectWildfires() {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) {
    const error = new Error("FIRMS_MAP_KEY is not configured");
    error.code = "SKIPPED_MISSING_SECRET";
    throw error;
  }

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/world/1`;
  const result = await fetchText(url, { accept: "text/csv", cacheKey: "firms-world-24h" });
  if (result.notModified) return existingDataset(output);
  const rows = parseCsv(result.data);
  const items = rows.map((row, index) => ({
    id: `firms-${row.latitude}-${row.longitude}-${row.acq_date}-${row.acq_time}-${index}`,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    brightness: Number(row.bright_ti4 || row.brightness) || null,
    confidence: row.confidence || null,
    satellite: row.satellite || null,
    instrument: row.instrument || null,
    acquired_date: row.acq_date,
    acquired_time: row.acq_time,
    daynight: row.daynight || null,
    frp: Number(row.frp) || null,
  })).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

  const dataset = {
    schema_version: 1,
    dataset: "wildfires",
    source: "NASA FIRMS VIIRS SNPP NRT",
    source_url: "https://firms.modaps.eosdis.nasa.gov/",
    generated_at: new Date().toISOString(),
    period: "past_24_hours",
    count: items.length,
    items,
  };
  await writeJsonAtomic(output, dataset);
  return dataset;
}
