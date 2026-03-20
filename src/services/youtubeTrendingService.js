const fs = require("fs/promises");
const path = require("path");

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

const TRENDING_DEFS = [
  { key: "trending_GLOBAL", query: "trending shorts", videoDuration: "short", order: "viewCount" },
  { key: "trending_IN", query: "trending shorts", region: "IN", videoDuration: "short", order: "viewCount" },
  { key: "trending_KR", query: "trending shorts", region: "KR", videoDuration: "short", order: "viewCount" },
  { key: "trending_BR", query: "trending shorts", region: "BR", videoDuration: "short", order: "viewCount" },
  { key: "trending_AE", query: "trending shorts", region: "AE", videoDuration: "short", order: "viewCount" },
];

const CACHE_DIR = path.join(process.cwd(), "cache");
const COUNTRY_BY_DEF = {
  trending_GLOBAL: "GLOBAL",
  trending_IN: "IN",
  trending_KR: "KR",
  trending_BR: "BR",
  trending_AE: "AE",
};

const SUPPORTED_COUNTRIES = Object.values(COUNTRY_BY_DEF);

/** 10 categories × 10 shorts each (search query tuned for Shorts). */
const CATEGORY_DEFS = [
  { id: "gaming", label: "Gaming", query: "gaming shorts", videoDuration: "short", order: "viewCount" },
  { id: "comedy", label: "Comedy", query: "comedy funny shorts", videoDuration: "short", order: "viewCount" },
  { id: "music", label: "Music", query: "music shorts", videoDuration: "short", order: "viewCount" },
  { id: "food", label: "Food", query: "food cooking shorts", videoDuration: "short", order: "viewCount" },
  { id: "fitness", label: "Fitness", query: "fitness workout shorts", videoDuration: "short", order: "viewCount" },
  { id: "tech", label: "Tech", query: "technology tech shorts", videoDuration: "short", order: "viewCount" },
  { id: "beauty", label: "Beauty", query: "beauty makeup shorts", videoDuration: "short", order: "viewCount" },
  { id: "travel", label: "Travel", query: "travel shorts", videoDuration: "short", order: "viewCount" },
  { id: "education", label: "Education", query: "education learn shorts", videoDuration: "short", order: "viewCount" },
  { id: "sports", label: "Sports", query: "sports highlights shorts", videoDuration: "short", order: "viewCount" },
];

const SUPPORTED_CATEGORY_IDS = CATEGORY_DEFS.map((c) => c.id);

const CATEGORIES_CACHE_DIR = path.join(CACHE_DIR, "categories");

function getApiKeys() {
  return [process.env.YOUTUBE_API_KEY, process.env.YOUTUBE_TWO_API_KEY].filter(Boolean);
}

function toSearchParams(def, apiKey) {
  const maxResults = String(def.maxResults ?? 30);
  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    maxResults,
    q: def.query,
    videoDuration: def.videoDuration,
    order: def.order,
  });

  if (def.region) {
    params.set("regionCode", def.region);
  }

  return params;
}

/** Pick one thumbnail URL: best quality available from YouTube snippet. */
function pickThumbnailUrl(thumbnails) {
  if (!thumbnails || typeof thumbnails !== "object") return "";
  const order = ["maxres", "standard", "high", "medium", "default"];
  for (const key of order) {
    const t = thumbnails[key];
    if (t?.url) return t.url;
  }
  return "";
}

function mapVideo(item) {
  const videoId = item.id?.videoId || null;
  const thumbs = item.snippet?.thumbnails || {};

  return {
    videoId,
    /** Direct link to the video (watch page). */
    videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
    title: item.snippet?.title || "",
    channelTitle: item.snippet?.channelTitle || "",
    description: item.snippet?.description || "",
    publishedAt: item.snippet?.publishedAt || null,
    thumbnail: pickThumbnailUrl(thumbs),
  };
}

async function fetchWithAnyKey(def) {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("Missing YouTube API keys. Set YOUTUBE_API_KEY and YOUTUBE_TWO_API_KEY.");
  }

  let lastError = "Unknown YouTube API error";
  for (const key of keys) {
    const query = toSearchParams(def, key).toString();
    const response = await fetch(`${YOUTUBE_SEARCH_URL}?${query}`);
    const data = await response.json().catch(() => ({}));

    if (response.ok && Array.isArray(data.items)) {
      const limit = Math.min(Number(def.maxResults) || 30, 50);
      return data.items.map(mapVideo).slice(0, limit);
    }

    lastError = `${response.status} ${data?.error?.message || response.statusText}`;
  }

  throw new Error(lastError);
}

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function ensureCategoriesCacheDir() {
  await fs.mkdir(CATEGORIES_CACHE_DIR, { recursive: true });
}

function cachePathForCountry(country) {
  return path.join(CACHE_DIR, `${country.toUpperCase()}.json`);
}

async function writeCountryCache(country, videos) {
  await ensureCacheDir();
  const payload = {
    country: country.toUpperCase(),
    updatedAt: new Date().toISOString(),
    total: videos.length,
    videos,
  };
  await fs.writeFile(cachePathForCountry(country), JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

async function readCountryCache(country) {
  const file = cachePathForCountry(country);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw);
}

async function refreshCountryCache(country) {
  const countryCode = country.toUpperCase();
  const def = TRENDING_DEFS.find((item) => COUNTRY_BY_DEF[item.key] === countryCode);
  if (!def) {
    throw new Error(`Unsupported country: ${countryCode}`);
  }

  const videos = await fetchWithAnyKey(def);
  return writeCountryCache(countryCode, videos);
}

async function refreshAllTrendingCaches() {
  const results = [];

  for (const country of SUPPORTED_COUNTRIES) {
    try {
      const payload = await refreshCountryCache(country);
      results.push({ country, ok: true, total: payload.total });
    } catch (error) {
      results.push({ country, ok: false, error: error.message });
    }
  }

  return results;
}

function cachePathForCategory(categoryId) {
  const safe = String(categoryId).toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return path.join(CATEGORIES_CACHE_DIR, `${safe}.json`);
}

async function writeCategoryCache(categoryDef, videos) {
  await ensureCategoriesCacheDir();
  const id = categoryDef.id.toLowerCase();
  const payload = {
    category: id,
    label: categoryDef.label,
    updatedAt: new Date().toISOString(),
    total: videos.length,
    videos,
  };
  await fs.writeFile(cachePathForCategory(id), JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

async function readCategoryCache(categoryId) {
  const id = String(categoryId).toLowerCase();
  const file = cachePathForCategory(id);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw);
}

async function refreshCategoryCache(categoryId) {
  const id = String(categoryId).toLowerCase();
  const categoryDef = CATEGORY_DEFS.find((c) => c.id === id);
  if (!categoryDef) {
    throw new Error(`Unsupported category: ${id}`);
  }

  const searchDef = {
    query: categoryDef.query,
    videoDuration: categoryDef.videoDuration,
    order: categoryDef.order,
    maxResults: 10,
  };

  const videos = await fetchWithAnyKey(searchDef);
  return writeCategoryCache(categoryDef, videos);
}

async function refreshAllCategoryCaches() {
  const results = [];

  for (const { id } of CATEGORY_DEFS) {
    try {
      const payload = await refreshCategoryCache(id);
      results.push({ category: id, ok: true, total: payload.total });
    } catch (error) {
      results.push({ category: id, ok: false, error: error.message });
    }
  }

  return results;
}

function getCategoryListMeta() {
  return CATEGORY_DEFS.map(({ id, label }) => ({ id, label }));
}

module.exports = {
  SUPPORTED_COUNTRIES,
  SUPPORTED_CATEGORY_IDS,
  getCategoryListMeta,
  refreshAllTrendingCaches,
  refreshCountryCache,
  readCountryCache,
  refreshAllCategoryCaches,
  refreshCategoryCache,
  readCategoryCache,
};

