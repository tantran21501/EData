import { sources, scheduleSummary } from "../config/sources.mjs";
import { collectEarthquakes } from "../collectors/earthquakes.mjs";
import { collectNaturalEvents } from "../collectors/natural-events.mjs";
import { collectWildfires } from "../collectors/wildfires.mjs";
import { collectSatellites } from "../collectors/satellites.mjs";
import { collectSpaceWeather } from "../collectors/space-weather.mjs";
import { collectDayNight } from "../collectors/day-night.mjs";
import { isDue, loadRunState, saveRunState, writeJsonAtomic } from "../lib/files.mjs";

const force = process.argv.includes("--force");
const onlyArg = process.argv.find((argument) => argument.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;
const state = await loadRunState();

const jobs = {
  earthquakes: collectEarthquakes,
  naturalEvents: collectNaturalEvents,
  wildfires: collectWildfires,
  satellites: collectSatellites,
  spaceWeather: collectSpaceWeather,
  dayNight: collectDayNight,
};

const results = [];
for (const [name, collector] of Object.entries(jobs)) {
  const configuration = sources[name];
  if (only && !only.has(name)) continue;
  if (!isDue(state.sources[name], configuration.intervalHours, force)) {
    results.push({ name, status: "not_due" });
    continue;
  }

  try {
    const dataset = await collector();
    const completedAt = new Date().toISOString();
    state.sources[name] = {
      ...state.sources[name],
      lastAttemptAt: completedAt,
      lastSuccessAt: completedAt,
      lastError: null,
      count: dataset?.count ?? null,
    };
    results.push({ name, status: "updated", count: dataset?.count ?? null });
  } catch (error) {
    const skipped = error.code === "SKIPPED_MISSING_SECRET";
    state.sources[name] = {
      ...state.sources[name],
      lastAttemptAt: new Date().toISOString(),
      lastError: error.message,
    };
    results.push({ name, status: skipped ? "skipped" : "failed", error: error.message });
    if (!skipped && process.env.FAIL_ON_SOURCE_ERROR === "true") process.exitCode = 1;
  }
  await saveRunState(state);
}

const manifest = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  dispatcher_schedule: scheduleSummary.dispatcher,
  estimated_max_upstream_requests_per_day: scheduleSummary.worstCaseRequestsPerDay,
  datasets: Object.fromEntries(Object.entries(sources).map(([name, source]) => [name, {
    file: `${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}.json`,
    interval_hours: source.intervalHours,
    request_budget_per_run: source.requestBudgetPerRun,
    last_success_at: state.sources[name]?.lastSuccessAt || null,
    last_error: state.sources[name]?.lastError || null,
  }])),
};

await writeJsonAtomic("manifest.json", manifest);
console.log(JSON.stringify({ force, results, manifest }, null, 2));
