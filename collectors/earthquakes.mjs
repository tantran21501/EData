import { fetchJson } from "../lib/http.mjs";
import { existingDataset, writeJsonAtomic } from "../lib/files.mjs";

const output = "earthquakes.json";
const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";

export async function collectEarthquakes() {
  const result = await fetchJson(url);
  if (result.notModified) return existingDataset(output);

  const items = result.data.features.map((feature) => ({
    id: feature.id,
    magnitude: feature.properties.mag,
    title: feature.properties.title,
    place: feature.properties.place,
    occurred_at: new Date(feature.properties.time).toISOString(),
    updated_at: new Date(feature.properties.updated).toISOString(),
    tsunami: Boolean(feature.properties.tsunami),
    alert: feature.properties.alert,
    significance: feature.properties.sig,
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
    depth_km: feature.geometry.coordinates[2],
    detail_url: feature.properties.url,
  }));

  const dataset = {
    schema_version: 1,
    dataset: "earthquakes",
    source: "USGS Earthquake Hazards Program",
    source_url: url,
    generated_at: new Date().toISOString(),
    period: "past_7_days",
    count: items.length,
    items,
  };
  await writeJsonAtomic(output, dataset);
  return dataset;
}
