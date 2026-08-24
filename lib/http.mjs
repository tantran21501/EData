import fs from "node:fs/promises";
import path from "node:path";

const timeoutMs = Number(process.env.HTTP_TIMEOUT_MS || 30_000);
const maxRetries = Number(process.env.MAX_RETRIES || 3);
const userAgent = process.env.USER_AGENT || "EarthLiveCamera-DataCollector/1.0";
const cachePath = path.resolve(".state/http-cache.json");

let cache;

async function loadCache() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(cachePath, "utf8"));
  } catch {
    cache = {};
  }
  return cache;
}

async function saveCache() {
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchResource(url, { accept = "application/json", cacheKey = url } = {}) {
  const httpCache = await loadCache();
  const cached = httpCache[cacheKey] || {};

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers = { Accept: accept, "User-Agent": userAgent };
      if (cached.etag) headers["If-None-Match"] = cached.etag;
      if (cached.lastModified) headers["If-Modified-Since"] = cached.lastModified;

      const response = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);

      if (response.status === 304) {
        return { notModified: true, status: 304, headers: response.headers };
      }

      if (response.ok) {
        httpCache[cacheKey] = {
          etag: response.headers.get("etag") || undefined,
          lastModified: response.headers.get("last-modified") || undefined,
        };
        await saveCache();
        return { response, notModified: false, status: response.status, headers: response.headers };
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === maxRetries) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }

      const retryAfter = Number(response.headers.get("retry-after"));
      await delay(Number.isFinite(retryAfter) ? retryAfter * 1000 : 2 ** attempt * 1500);
    } catch (error) {
      clearTimeout(timer);
      if (attempt === maxRetries) throw error;
      await delay(2 ** attempt * 1500);
    }
  }

  throw new Error(`Unable to fetch ${url}`);
}

export async function fetchJson(url, options) {
  const result = await fetchResource(url, options);
  if (result.notModified) return result;
  return { ...result, data: await result.response.json() };
}

export async function fetchText(url, options) {
  const result = await fetchResource(url, options);
  if (result.notModified) return result;
  return { ...result, data: await result.response.text() };
}
