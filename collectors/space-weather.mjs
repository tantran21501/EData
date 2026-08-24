import { fetchJson } from "../lib/http.mjs";
import { existingDataset, writeJsonAtomic } from "../lib/files.mjs";

const endpoints = {
  kp: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  solarWind: "https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json",
  alerts: "https://services.swpc.noaa.gov/products/alerts.json",
};

function rowsToObjects(rows) {
  if (!Array.isArray(rows) || !Array.isArray(rows[0])) return rows;
  const [headers, ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? null])));
}

export async function collectSpaceWeather() {
  const previous = await existingDataset("space-weather.json") || {};
  const result = {};
  for (const [name, url] of Object.entries(endpoints)) {
    const response = await fetchJson(url, { cacheKey: `noaa-${name}` });
    const previousKey = name === "solarWind" ? "solar_wind" : name;
    result[name] = response.notModified ? previous[previousKey] ?? null : rowsToObjects(response.data);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const dataset = {
    schema_version: 1,
    dataset: "space_weather",
    source: "NOAA Space Weather Prediction Center",
    source_url: "https://www.swpc.noaa.gov/",
    generated_at: new Date().toISOString(),
    kp: result.kp,
    solar_wind: result.solarWind,
    alerts: result.alerts,
  };
  await writeJsonAtomic("space-weather.json", dataset);
  return dataset;
}
