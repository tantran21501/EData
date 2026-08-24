export const sources = {
  earthquakes: {
    intervalHours: 3,
    requestBudgetPerRun: 1,
    upstreamLimit: "USGS does not publish a fixed request rate; one cached GeoJSON feed request per run",
  },
  naturalEvents: {
    intervalHours: 6,
    requestBudgetPerRun: 1,
    upstreamLimit: "NASA API default 1,000 requests/hour with key; this feed is called 4 times/day",
  },
  // Temporarily disabled: requires FIRMS_MAP_KEY which is not configured yet.
  // wildfires: {
  //   intervalHours: 6,
  //   requestBudgetPerRun: 1,
  //   upstreamLimit: "NASA FIRMS MAP_KEY: 5,000 requests/10 minutes; this job uses at most 4/day",
  //   requiresSecret: "FIRMS_MAP_KEY",
  // },
  satellites: {
    intervalHours: 12,
    requestBudgetPerRun: 4,
    upstreamLimit: "CelesTrak publishes no fixed GP endpoint quota; four requests twice/day",
  },
  spaceWeather: {
    intervalHours: 3,
    requestBudgetPerRun: 3,
    upstreamLimit: "NOAA SWPC publishes no fixed quota; three product-file requests every 3 hours",
  },
  dayNight: {
    intervalHours: 24,
    requestBudgetPerRun: 0,
    upstreamLimit: "Calculated locally; no upstream requests",
  },
};

export const scheduleSummary = {
  dispatcher: "Every 3 hours at minute 17 UTC",
  worstCaseRequestsPerDay: Object.values(sources).reduce(
    (sum, source) => sum + (24 / source.intervalHours) * source.requestBudgetPerRun,
    0,
  ),
};
