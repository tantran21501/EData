import { writeJsonAtomic } from "../lib/files.mjs";

export async function collectDayNight() {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start) / 86_400_000);
  const dataset = {
    schema_version: 1,
    dataset: "day_night_parameters",
    source: "Calculated locally",
    generated_at: now.toISOString(),
    day_of_year: dayOfYear,
    utc_date: now.toISOString().slice(0, 10),
    note: "Calculate the solar terminator, sunrise and sunset on-device from time and coordinates; no API is required.",
  };
  await writeJsonAtomic("day-night.json", dataset);
  return dataset;
}
