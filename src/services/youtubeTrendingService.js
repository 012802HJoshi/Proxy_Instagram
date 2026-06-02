const fs = require("fs/promises");
const path = require("path");

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

const TRENDING_DEFS = [
  { key: "trending_GLOBAL", query: "#shorts", region: "US", relevanceLanguage: "en", videoDuration: "short", order: "relevance"},
  { key: "trending_IN", query: "#shorts", region: "IN", relevanceLanguage: "hi", videoDuration: "short", order: "relevance" },
  { key: "trending_KR", query: "한국 일상 재미있는 쇼츠 #shorts", region: "KR", relevanceLanguage: "ko", videoDuration: "short", order: "relevance" },
  { key: "trending_BR", query: "brasil engraçado vida cotidiana #shorts", region: "BR", relevanceLanguage: "pt", videoDuration: "short", order: "relevance" },
  { key: "trending_AE", query: "شورت dubai uae viral trending #shorts", region: "AE", relevanceLanguage: "ar", videoDuration: "short", order: "relevance" },
];

const CACHE_DIR = path.join(process.cwd(), "cache");
const COUNTRY_BY_DEF = {
  trending_GLOBAL: "GLOBAL",
  trending_IN: "INDIA",
  trending_KR: "KOREA",
  trending_BR: "BRAZIL",
  trending_AE: "ARAB",
};

const SUPPORTED_COUNTRIES = Object.values(COUNTRY_BY_DEF);

/** 10 categories × 10 shorts each. Queries bias toward YouTube Shorts (#shorts + topical terms). videoDuration=short is API filter for videos under 4 min (closest to Shorts; no shorts-only flag in Search). */
const CATEGORY_DEFS = [
  { id: "gaming", label: "Gaming", icon: "https://img.rareprob.com/img/yt-category/games.webp", color: "#D9C7F7", query: "gaming clips compilation bgmi #shorts", videoDuration: "short", order: "relevance" },
  { id: "comedy", label: "Comedy", icon: "https://img.rareprob.com/img/yt-category/comedy.webp", color: "#BFE9E5", query: "funny comedy skits memes #shorts", videoDuration: "short", order: "relevance" },
  { id: "music", label: "Music", icon: "https://img.rareprob.com/img/yt-category/music.webp", color: "#FFD1CC", query: "trending song cover mashup #shorts", videoDuration: "short", order: "relevance" },
  { id: "food", label: "Food", icon: "https://img.rareprob.com/img/yt-category/food.webp", color: "#CFE8FF", query: "satisfying food cooking recipe ASMR #shorts", videoDuration: "short", order: "relevance" },
  { id: "fitness", label: "Fitness", icon: "https://img.rareprob.com/img/yt-category/fitness.webp", color: "#E3F7C8", query: "gym workout fitness yoga motivation #shorts", videoDuration: "short", order: "relevance" },
  { id: "tech", label: "Tech", icon: "https://img.rareprob.com/img/yt-category/tech.webp", color: "#F9D0E0", query: "cool tech gadgets smart review #shorts", videoDuration: "short", order: "relevance" },
  { id: "beauty", label: "Beauty", icon: "https://img.rareprob.com/img/yt-category/makeup.webp", color: "#D4D9F8", query: "makeup beauty skincare GRWM tutorial #shorts", videoDuration: "short", order: "relevance" },
  { id: "travel", label: "Travel", icon: "https://img.rareprob.com/img/yt-category/travel.webp", color: "#D2F5E9", query: "travel vlog aesthetic places explore #shorts", videoDuration: "short", order: "relevance" },
  { id: "education", label: "Education", icon: "https://img.rareprob.com/img/yt-category/education.webp", color: "#FFE7B8", query: "mind blowing facts science tutorial learn #shorts", videoDuration: "short", order: "relevance" },
  { id: "sports", label: "Sports", icon: "https://img.rareprob.com/img/yt-category/sports.webp", color: "#F2D6FF", query: "sports highlights football basketball goals clips #shorts", videoDuration: "short", order: "relevance" },
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
  const requestedResults = def.maxResults ?? 30;
  // Request double the results (up to 50 max allowed by YouTube API) to allow filtering landscape videos on the backend
  const maxResults = String(Math.min(requestedResults * 2, 50));
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

/** Check which thumbnail URLs actually exist by sending fast HEAD requests. */
async function findActiveThumbnail(videoId, snippetThumb) {
  if (!videoId) {
    return {
      thumbnail: snippetThumb,
      thumbnailBackup: "",
      isVertical: false
    };
  }

  const candidates = [
    `https://i.ytimg.com/vi/${videoId}/oar2.jpg`,
    `https://i.ytimg.com/vi/${videoId}/oardefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/oar1.jpg`,
    `https://i.ytimg.com/vi/${videoId}/oar3.jpg`
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        return {
          thumbnail: url,
          thumbnailBackup: snippetThumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          isVertical: true
        };
      }
    } catch (err) {
      // Ignore and try next format
    }
  }

  // Fallback to standard landscape thumbnails
  return {
    thumbnail: snippetThumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    thumbnailBackup: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    isVertical: false
  };
}

function mapVideo(item) {
  const videoId = item.id?.videoId || null;
  const thumbs = item.snippet?.thumbnails || {};
  const snippetThumb = pickThumbnailUrl(thumbs);

  return {
    videoId,
    /** Direct link to the video (watch page). */
    videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
    title: item.snippet?.title || "",
    channelTitle: item.snippet?.channelTitle || "",
    description: item.snippet?.description || "",
    publishedAt: item.snippet?.publishedAt || null,
    thumbnail: "", // Will be dynamically resolved
    thumbnailBackup: "", // Will be dynamically resolved
    snippetThumb // Temporary property for resolution
  };
}

async function fetchWithAnyKey(def) {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("Missing YouTube API keys. Set YOUTUBE_API_KEY and YOUTUBE_TWO_API_KEY.");
  }

  const requestedLimit = Number(def.maxResults) || 30;
  let lastError = "Unknown YouTube API error";
  for (const key of keys) {
    const query = toSearchParams(def, key).toString();
    const response = await fetch(`${YOUTUBE_SEARCH_URL}?${query}`);
    const data = await response.json().catch(() => ({}));

    if (response.ok && Array.isArray(data.items)) {
      // Limit search results to the total fetched items (up to 50 max)
      const limit = Math.min(requestedLimit * 2, 50);
      const mappedVideos = data.items.map(mapVideo).slice(0, limit);

      // Concurrently verify and update the thumbnail fields for all videos in parallel
      await Promise.all(
        mappedVideos.map(async (video) => {
          const { thumbnail, thumbnailBackup, isVertical } = await findActiveThumbnail(video.videoId, video.snippetThumb);
          video.thumbnail = thumbnail;
          video.thumbnailBackup = thumbnailBackup;
          video.isVertical = isVertical;
          delete video.snippetThumb; // Clean up temporary property
        })
      );

      // Filter out non-vertical (landscape) videos to ensure relevance
      let filtered = mappedVideos.filter((video) => video.isVertical);

      // Fallback to original list if filtering left us with an empty list
      if (filtered.length === 0) {
        filtered = mappedVideos;
      }

      // Remove the temporary isVertical property and slice to requested limit
      return filtered.map((video) => {
        delete video.isVertical;
        return video;
      }).slice(0, requestedLimit);
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

