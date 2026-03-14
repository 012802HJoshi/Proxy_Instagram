require('dotenv').config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const {
  loadCacheFromDisk,
  refreshAllCategories,
  getAllCachedData,
  getCategoryData,
  getCategories,
  CACHE_FILE
} = require('./services/youtubeService');

const countryCategoryMap = {
  IN: [
    'cricket_shorts',
    'ipl_highlights',
    'tech_reviews_india',
    'mobile_tips_tricks',
    'bollywood_news',
    'indian_street_food',
    'indian_comedy',
    'motivation_hindi',
    'gaming_india',
    'finance_india'
  ],

  KR: [
    'kpop_shorts',
    'korean_drama_clips',
    'korean_street_food',
    'kbeauty_tips',
    'korean_dance',
    'korean_vlogs'
  ],

  BR: [
    'football_brazil',
    'brazil_funny',
    'brazil_street_food',
    'brazil_dance',
    'brazil_lifestyle'
  ],

  GLOBAL: [
    'funny_animals',
    'satisfying',
    'before_after',
    'magic_tricks',
    'quick_diy'
  ]
};

const app = express();

const apiKey = process.env.YOUTUBE_API_KEY;
const refreshOnStart = String(process.env.REFRESH_ON_START || 'true').toLowerCase() === 'true';

app.use(cors());
app.use(express.json());

const port = 4141;

const instagram = require("./Controller/instagram.js");
const twitterRoutes = require("./twitter/index.js");

app.use("/instagram", instagram);
app.use("/twitter", twitterRoutes);

app.get("/", (req, res) => {
  res.status(200).send("Welcome to Rareprob Instagram Downloader API");
});

app.get('/health', (req, res) => {
  const cache = getAllCachedData();

  res.json({
    ok: true,
    updatedAt: cache.updatedAt,
    totalCategories: cache.totalCategories,
    cacheFile: CACHE_FILE
  });
});

app.get('/api/categories', (req, res) => {
  res.json({
    total: getCategories().length,
    categories: getCategories()
  });
});

app.get('/api/content', (req, res) => {
  res.json(getAllCachedData());
});

app.get('/api/content/:categoryKey', (req, res) => {
  const category = getCategoryData(req.params.categoryKey);

  if (!category) {
    return res.status(404).json({
      message: 'Category not found'
    });
  }

  res.json(category);
});

app.post('/api/refresh', async (req, res) => {
  try {
    const result = await refreshAllCategories(apiKey);
    res.json({
      message: 'Refresh completed',
      ...result
    });
  } catch (error) {
    res.status(500).json({
      message: 'Refresh failed',
      error: error.message
    });
  }
});

app.get('/api/feed/:countryCode', (req, res) => {
  const countryCode = req.params.countryCode.toUpperCase();

  const categoryKeys = countryCategoryMap[countryCode];

  if (!categoryKeys) {
    return res.status(404).json({
      message: 'Country not supported'
    });
  }

  let videos = [];

  categoryKeys.forEach((key) => {
    const category = getCategoryData(key);

    if (category && category.videos) {
      videos = videos.concat(category.videos);
    }
  });

  // shuffle videos for feed experience
  videos.sort(() => Math.random() - 0.5);

  res.json({
    country: countryCode,
    totalVideos: videos.length,
    videos
  });
});

async function bootstrap() {
  const hasCache = loadCacheFromDisk();

  if (!hasCache) {
    console.log('No cache found. First server run detected. Fetching all 20 category APIs...');
    await refreshAllCategories(apiKey);
  } else if (refreshOnStart) {
    console.log('Cache found. Refreshing all 20 category APIs on startup...');
    try {
      await refreshAllCategories(apiKey);
    } catch (error) {
      console.error('Startup refresh failed. Serving last saved cache:', error.message);
    }
  } else {
    console.log('Cache found. Serving saved data without startup refresh.');
  }

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Server bootstrap failed:', error.message);
  process.exit(1);
});
