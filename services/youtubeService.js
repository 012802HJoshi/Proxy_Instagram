const fs = require('fs');
const path = require('path');
const axios = require('axios');
const categories = require('../config/categories');

const CACHE_FILE = path.join(__dirname, '..', 'storage', 'youtube-cache.json');
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

let cache = {
  updatedAt: null,
  totalCategories: categories.length,
  data: {}
};

function ensureStorageDir() {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadCacheFromDisk() {
  ensureStorageDir();

  if (!fs.existsSync(CACHE_FILE)) {
    return false;
  }

  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    cache = {
      updatedAt: parsed.updatedAt || null,
      totalCategories: categories.length,
      data: parsed.data || {}
    };

    return true;
  } catch (error) {
    console.error('Failed to load cache file:', error.message);
    return false;
  }
}

function saveCacheToDisk() {
  ensureStorageDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

function getThumbnail(item) {
  return (
    item.snippet?.thumbnails?.high?.url ||
    item.snippet?.thumbnails?.medium?.url ||
    item.snippet?.thumbnails?.default?.url ||
    null
  );
}

function normalizeVideo(item, category) {
  const videoId = item.id?.videoId || null;

  return {
    categoryKey: category.key,
    categoryQuery: category.query,
    region: category.region,
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    channelTitle: item.snippet?.channelTitle || '',
    publishedAt: item.snippet?.publishedAt || null,
    thumbnail: getThumbnail(item),
    videoId,
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null
  };
}

async function fetchCategory(category, apiKey) {
  const response = await axios.get(YOUTUBE_SEARCH_URL, {
    params: {
      key: apiKey,
      part: 'snippet',
      maxResults: 10,
      type: 'video',
      q: category.query,
      videoDuration: category.videoDuration || 'short',
      order: category.order || 'relevance',
      regionCode: category.region,
      safeSearch: 'moderate'
    },
    timeout: 20000
  });

  const items = Array.isArray(response.data?.items) ? response.data.items : [];
  return items.map((item) => normalizeVideo(item, category));
}

async function refreshAllCategories(apiKey) {
  if (!apiKey) {
    throw new Error('Missing YOUTUBE_API_KEY');
  }

  const nextData = {};
  const errors = [];

  const results = await Promise.allSettled(
    categories.map(async (category) => {
      const videos = await fetchCategory(category, apiKey);
      return { key: category.key, payload: { ...category, totalVideos: videos.length, videos } };
    })
  );

  results.forEach((result, index) => {
    const category = categories[index];

    if (result.status === 'fulfilled') {
      nextData[result.value.key] = result.value.payload;
      return;
    }

    errors.push({
      category: category.key,
      message: result.reason?.message || 'Unknown error'
    });

    if (cache.data[category.key]) {
      nextData[category.key] = cache.data[category.key];
    }
  });

  cache = {
    updatedAt: new Date().toISOString(),
    totalCategories: categories.length,
    data: nextData
  };

  saveCacheToDisk();

  return {
    updatedAt: cache.updatedAt,
    totalCategories: categories.length,
    successCount: Object.keys(nextData).length,
    failedCount: errors.length,
    errors
  };
}

function getAllCachedData() {
  return cache;
}

function getCategoryData(categoryKey) {
  return cache.data[categoryKey] || null;
}

function getCategories() {
  return categories;
}

module.exports = {
  loadCacheFromDisk,
  saveCacheToDisk,
  refreshAllCategories,
  getAllCachedData,
  getCategoryData,
  getCategories,
  CACHE_FILE
};
