import { fetchJson } from "../lib/http.mjs";
import { existingDataset, writeJsonAtomic } from "../lib/files.mjs";

const output = "natural-events.json";
const url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=30&limit=500";

export async function collectNaturalEvents() {
  const result = await fetchJson(url);
  if (result.notModified) return existingDataset(output);

  const items = result.data.events.map((event) => {
    const geometry = event.geometry?.at(-1);
    const coordinates = geometry?.coordinates;
    return {
      id: event.id,
      title: event.title,
      description: event.description || null,
      closed_at: event.closed || null,
      categories: event.categories?.map((category) => ({ id: category.id, title: category.title })) || [],
      geometry_type: geometry?.type || null,
      coordinates: coordinates || null,
      observed_at: geometry?.date || null,
      magnitude_value: geometry?.magnitudeValue ?? null,
      magnitude_unit: geometry?.magnitudeUnit ?? null,
      sources: event.sources || [],
      detail_url: event.link,
    };
  });

  const dataset = {
    schema_version: 1,
    dataset: "natural_events",
    source: "NASA EONET",
    source_url: url,
    generated_at: new Date().toISOString(),
    period: "past_30_days",
    count: items.length,
    items,
  };
  await writeJsonAtomic(output, dataset);
  return dataset;
}
