const fs = require("fs/promises");
const path = require("path");

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

const TRENDING_DEFS = [
  { key: "trending_GLOBAL", query: "#shorts", videoDuration: "short", order: "viewCount" },
  { key: "trending_IN", query: "#shorts", region: "IN", relevanceLanguage: "hi", videoDuration: "short", order: "relevance" },
  { key: "trending_KR", query: "#shorts", region: "KR", relevanceLanguage: "ko", videoDuration: "short", order: "relevance" },
  { key: "trending_BR", query: "#shorts", region: "BR", relevanceLanguage: "pt", videoDuration: "short", order: "relevance" },
  { key: "trending_AE", query: "#shorts", region: "AE", relevanceLanguage: "ar", videoDuration: "short", order: "relevance" },
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

/** 10 categories × 10 shorts each. Queries bias toward YouTube Shorts (#shorts + topical terms). videoDuration=short is API filter for videos under 4 min (closest to Shorts; no shorts-only flag in Search). */
const CATEGORY_DEFS = [
  { id: "gaming", label: "Gaming", icon: "https://img.rareprob.com/img/yt-category/gaming.webp", color: "#D9C7F7", query: "gaming gameplay esports clips #shorts youtube shorts", videoDuration: "short", order: "viewCount" },
  { id: "comedy", label: "Comedy", icon: "https://img.rareprob.com/img/yt-category/comedy.webp", color: "#BFE9E5", query: "comedy skits funny viral memes #shorts youtube shorts", videoDuration: "short", order: "viewCount" },
  { id: "music", label: "Music", icon: "https://img.rareprob.com/img/yt-category/music.webp", color: "#FFD1CC", query: "music cover remix viral song dance #shorts youtube shorts", videoDuration: "short", order: "viewCount" },
  { id: "food", label: "Food", icon: "https://img.rareprob.com/img/yt-category/food.webp", color: "#CFE8FF", query: "food recipe cooking street food ASMR #shorts youtube shorts", videoDuration: "short", order: "viewCount" },
  { id: "fitness", label: "Fitness", icon: "https://img.rareprob.com/img/yt-category/fitness.webp", color: "#E3F7C8", query: "workout fitness gym exercise home training #shorts youtube shorts", videoDuration: "short", order: "viewCount" },
  { id: "tech", label: "Tech", icon: "https://img.rareprob.com/img/yt-category/tech.webp", color: "#F9D0E0", query: "tech gadgets smartphone AI review tips #shorts youtube shorts", videoDuration: "short", order: "viewCount" },
  { id: "beauty", label: "Beauty", icon: "https://img.rareprob.com/img/yt-category/beauty.webp", color: "#D4D9F8", query: "makeup beauty skincare GRWM tutorial #shorts youtube shorts", videoDuration: "short", order: "viewCount" },
  { id: "travel", label: "Travel", icon: "https://img.rareprob.com/img/yt-category/travel.webp", color: "#D2F5E9", query: "travel vlog places adventure POV trip #shorts youtube shorts", videoDuration: "short", order: "viewCount" },
  { id: "education", label: "Education", icon: "https://img.rareprob.com/img/yt-category/education.webp", color: "#FFE7B8", query: "learn facts explain how to tutorial science #shorts youtube shorts", videoDuration: "short", order: "viewCount" },
  { id: "sports", label: "Sports", icon: "https://img.rareprob.com/img/yt-category/sports.webp", color: "#F2D6FF", query: "sports highlights football basketball moments goals #shorts youtube shorts", videoDuration: "short", order: "viewCount" },
];

const SUPPORTED_CATEGORY_IDS = CATEGORY_DEFS.map((c) => c.id);

const CATEGORIES_CACHE_DIR = path.join(CACHE_DIR, "categories");

const FITNESS_CATEGORY_META = CATEGORY_DEFS.find((c) => c.id === "fitness");

/** Fitness hub: Shorts per sub-topic (cached under cache/fitness/<id>.json). */
const FITNESS_SUBCATEGORY_DEFS = [
  {
    id: "exercises",
    label: "Exercises",
    icon: FITNESS_CATEGORY_META?.icon || "",
    color: FITNESS_CATEGORY_META?.color || "#E3F7C8",
    query: "workout exercises training routine moves #shorts youtube shorts",
    videoDuration: "short",
    order: "viewCount",
  },
  {
    id: "diet",
    label: "Diet",
    icon: FITNESS_CATEGORY_META?.icon || "",
    color: FITNESS_CATEGORY_META?.color || "#E3F7C8",
    query: "diet nutrition meal plan healthy eating weight loss tips #shorts youtube shorts",
    videoDuration: "short",
    order: "viewCount",
  },
  {
    id: "yoga",
    label: "Yoga",
    icon: FITNESS_CATEGORY_META?.icon || "",
    color: FITNESS_CATEGORY_META?.color || "#E3F7C8",
    query: "yoga stretching poses flow flexibility #shorts youtube shorts",
    videoDuration: "short",
    order: "viewCount",
  },
  {
    id: "stress-relief",
    label: "Stress relief",
    icon: FITNESS_CATEGORY_META?.icon || "",
    color: FITNESS_CATEGORY_META?.color || "#E3F7C8",
    query: "stress relief relaxation calm mindfulness breathing meditation #shorts youtube shorts",
    videoDuration: "short",
    order: "viewCount",
  },
  {
    id: "cardio",
    label: "Cardio",
    icon: FITNESS_CATEGORY_META?.icon || "",
    color: FITNESS_CATEGORY_META?.color || "#E3F7C8",
    query: "cardio HIIT running fat burn heart rate #shorts youtube shorts",
    videoDuration: "short",
    order: "viewCount",
  },
  {
    id: "muscle-building",
    label: "Muscle building",
    icon: FITNESS_CATEGORY_META?.icon || "",
    color: FITNESS_CATEGORY_META?.color || "#E3F7C8",
    query: "muscle building hypertrophy strength gains protein gym #shorts youtube shorts",
    videoDuration: "short",
    order: "viewCount",
  },
  {
    id: "body-weight",
    label: "Body weight",
    icon: FITNESS_CATEGORY_META?.icon || "",
    color: FITNESS_CATEGORY_META?.color || "#E3F7C8",
    query: "bodyweight calisthenics no equipment pull ups push ups core #shorts youtube shorts",
    videoDuration: "short",
    order: "viewCount",
  },
];

const SUPPORTED_FITNESS_SUBCATEGORY_IDS = FITNESS_SUBCATEGORY_DEFS.map((c) => c.id);

const FITNESS_CACHE_DIR = path.join(CACHE_DIR, "fitness");

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

  if (def.relevanceLanguage) {
    params.set("relevanceLanguage", def.relevanceLanguage);
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
  const snippetThumb = pickThumbnailUrl(thumbs);
  const oarBase = videoId ? `https://i.ytimg.com/vi/${videoId}` : null;

  return {
    videoId,
    /** Direct link to the video (watch page). */
    videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
    title: item.snippet?.title || "",
    channelTitle: item.snippet?.channelTitle || "",
    description: item.snippet?.description || "",
    publishedAt: item.snippet?.publishedAt || null,
    thumbnail: oarBase ? `${oarBase}/oar2.jpg` : snippetThumb,
    thumbnailBackup: oarBase ? `${oarBase}/oardefault.jpg` : "",
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

async function ensureFitnessCacheDir() {
  await fs.mkdir(FITNESS_CACHE_DIR, { recursive: true });
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
    icon: categoryDef.icon,
    color: categoryDef.color,
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
  return CATEGORY_DEFS.map(({ id, label, icon, color }) => ({ id, label, icon, color }));
}

function getFitnessSubcategoryListMeta() {
  return FITNESS_SUBCATEGORY_DEFS.map(({ id, label, icon, color }) => ({ id, label, icon, color }));
}

function cachePathForFitnessSubcategory(subId) {
  const safe = String(subId).toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return path.join(FITNESS_CACHE_DIR, `${safe}.json`);
}

async function writeFitnessSubcategoryCache(subDef, videos) {
  await ensureFitnessCacheDir();
  const id = subDef.id.toLowerCase();
  const payload = {
    fitnessSubcategory: id,
    label: subDef.label,
    icon: subDef.icon,
    color: subDef.color,
    updatedAt: new Date().toISOString(),
    total: videos.length,
    videos,
  };
  await fs.writeFile(cachePathForFitnessSubcategory(id), JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

async function readFitnessSubcategoryCache(subId) {
  const id = String(subId).toLowerCase();
  const file = cachePathForFitnessSubcategory(id);
  const raw = await fs.readFile(file, "utf-8");
  return JSON.parse(raw);
}

async function refreshFitnessSubcategoryCache(subId) {
  const id = String(subId).toLowerCase();
  const subDef = FITNESS_SUBCATEGORY_DEFS.find((c) => c.id === id);
  if (!subDef) {
    throw new Error(`Unsupported fitness subcategory: ${id}`);
  }

  const searchDef = {
    query: subDef.query,
    videoDuration: subDef.videoDuration,
    order: subDef.order,
    maxResults: 10,
  };

  const videos = await fetchWithAnyKey(searchDef);
  return writeFitnessSubcategoryCache(subDef, videos);
}

async function refreshAllFitnessCaches() {
  const results = [];

  for (const { id } of FITNESS_SUBCATEGORY_DEFS) {
    try {
      const payload = await refreshFitnessSubcategoryCache(id);
      results.push({ subcategory: id, ok: true, total: payload.total });
    } catch (error) {
      results.push({ subcategory: id, ok: false, error: error.message });
    }
  }

  return results;
}

module.exports = {
  SUPPORTED_COUNTRIES,
  SUPPORTED_CATEGORY_IDS,
  SUPPORTED_FITNESS_SUBCATEGORY_IDS,
  getCategoryListMeta,
  getFitnessSubcategoryListMeta,
  refreshAllTrendingCaches,
  refreshCountryCache,
  readCountryCache,
  refreshAllCategoryCaches,
  refreshCategoryCache,
  readCategoryCache,
  refreshFitnessSubcategoryCache,
  readFitnessSubcategoryCache,
  refreshAllFitnessCaches,
};

