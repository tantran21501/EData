# EarthLiveCamera Earth Data Workers

GitHub Actions collectors that download and normalize Earth datasets into static JSON for an iOS application. The app reads files from `public/data`; it never calls upstream providers directly.

## Included datasets

| Dataset | Output | Refresh interval | Requests/run | Maximum requests/day |
|---|---|---:|---:|---:|
| USGS earthquakes | `earthquakes.json` | 3 hours | 1 | 8 |
| NASA EONET natural events | `natural-events.json` | 6 hours | 1 | 4 |
| NASA FIRMS wildfires | `wildfires.json` | 6 hours | 1 | 4 |
| CelesTrak satellite elements | `satellites.json` | 12 hours | 4 | 8 |
| NOAA SWPC space weather | `space-weather.json` | 3 hours | 3 | 24 |
| Day/night parameters | `day-night.json` | 24 hours | 0 | 0 |

Worst case: 48 upstream HTTP requests/day. This is deliberately conservative. FIRMS uses only four requests/day compared with its documented allowance of 5,000 requests per 10 minutes. NASA EONET uses four requests/day compared with the common NASA API allowance of 1,000 requests/hour. Sources without a published numeric limit are queried only a few times per day, with conditional requests, retry and exponential backoff.

> The manifest computes this value from `config/sources.mjs`. If you change an interval, the reported budget changes automatically.

## How scheduling works

GitHub Actions starts the dispatcher every three hours at minute 17 UTC. Starting away from minute zero reduces schedule delays during GitHub's busiest period. Each collector reads `.state/fetch-state.json` and runs only when its own interval has elapsed.

If one provider fails, its existing JSON remains untouched. Other collectors continue. The workflow records the error in state and retries on the next dispatcher run.

By default, an individual upstream failure does not fail the complete workflow, allowing successful datasets to be committed. Set `FAIL_ON_SOURCE_ERROR=true` if you prefer strict CI behavior.

## Setup

1. Create an empty GitHub repository.
2. Copy this entire folder into the repository root.
3. Commit and push it to the default branch.
4. Open **Settings → Actions → General → Workflow permissions**.
5. Select **Read and write permissions**.
6. Open **Settings → Secrets and variables → Actions**.
7. Add the optional secret `FIRMS_MAP_KEY`.
8. Run **Actions → Collect Earth data → Run workflow** once with `force` enabled.

Get a free FIRMS key from:

https://firms.modaps.eosdis.nasa.gov/api/map_key/

Without `FIRMS_MAP_KEY`, only the wildfire collector is skipped. Every other dataset continues to work.

## Run locally

Node.js 20 or newer is required. There are no npm dependencies.

```bash
cp .env.example .env
export FIRMS_MAP_KEY="your-key"
npm run collect:force
npm run validate
```

Update only selected collectors:

```bash
node scripts/run.mjs --force --only=earthquakes,naturalEvents
```

## Files consumed by iOS

Start by fetching:

```text
https://raw.githubusercontent.com/OWNER/REPOSITORY/BRANCH/public/data/manifest.json
```

Then fetch only the datasets needed by the app. For production traffic, place GitHub Pages, Cloudflare CDN or another static CDN in front of `public/data` instead of relying on `raw.githubusercontent.com` as a high-volume application API.

Every dataset includes:

- `schema_version`
- `dataset`
- `source`
- `source_url`
- `generated_at`
- `count` where applicable
- normalized `items`

## Adjust refresh intervals

Edit `config/sources.mjs`. Do not set an interval below three hours unless you also change the GitHub Actions dispatcher cron.

Recommended lower bounds for this project:

| Source | Recommended minimum |
|---|---:|
| USGS summary feed | 1 hour |
| NASA EONET | 3 hours |
| NASA FIRMS | 3 hours |
| CelesTrak GP data | 6 hours |
| NOAA product files | 1 hour |

The supplied defaults use slower intervals to minimize load while remaining useful for a snapshot-based application.

## Reliability behavior

- Conditional HTTP requests use `ETag` and `Last-Modified` where providers support them.
- HTTP 429 and 5xx responses use exponential backoff.
- A 30-second timeout prevents hanging jobs.
- JSON is written atomically through a temporary file.
- Previous valid data is preserved when a collector fails.
- GitHub `concurrency` prevents overlapping scheduled jobs.
- Generated data is committed only when files actually change.

## Important notes

- GitHub cron schedules are not guaranteed to start at the exact minute.
- Public GitHub repositories can disable scheduled workflows after long inactivity; check Actions periodically.
- Do not expose `FIRMS_MAP_KEY` in source code or generated JSON.
- Respect every provider's attribution and redistribution terms in the iOS application.
- Satellite JSON contains orbital elements. Calculate positions and passes on-device using an SGP4 library.
