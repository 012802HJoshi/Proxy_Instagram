const dotenv = require("dotenv");
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

// ✅ All fitness category keys (must match keys in categories.js)
const fitnessCategoryKeys = [
  'home_workout',
  'gym_tips',
  'weight_loss',
  'yoga_shorts',
  'bodybuilding',
  'healthy_eating',
  'morning_routine',
  'stretching'
];

const app = express();

dotenv.config();

const apiKey = process.env.YOUTUBE_API_KEY;
const refreshOnStart = String(process.env.REFRESH_ON_START || 'true').toLowerCase() === 'true';

app.use(cors());
app.use(express.json());

const port = 4141;

const instagram = require("./Controller/instagram.js");
const twitterRoutes = require("./twitter/index.js");

app.use("/instagram", instagram);
app.use("/twitter", twitterRoutes);

// ─── Pagination Helper ────────────────────────────────────────────────────────
function paginate(videos, page, limit) {
  const totalVideos = videos.length;
  const totalPages  = Math.ceil(totalVideos / limit);
  const start       = (page - 1) * limit;
  const end         = start + limit;

  return {
    page,
    limit,
    totalVideos,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    videos: videos.slice(start, end)
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

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

// GET /api/categories?page=1&limit=10
app.get('/api/categories', (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);

  const allCategories = getCategories();
  const total         = allCategories.length;
  const totalPages    = Math.ceil(total / limit);
  const start         = (page - 1) * limit;

  res.json({
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    categories: allCategories.slice(start, start + limit)
  });
});

// GET /api/content?page=1&limit=10
app.get('/api/content', (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);

  const cache      = getAllCachedData();
  const allVideos  = Object.values(cache.data).flatMap(cat => cat.videos || []);
  const paginated  = paginate(allVideos, page, limit);

  res.json({
    updatedAt: cache.updatedAt,
    ...paginated
  });
});

// GET /api/content/:categoryKey?page=1&limit=10
app.get('/api/content/:categoryKey', (req, res) => {
  const category = getCategoryData(req.params.categoryKey);

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);

  res.json({
    categoryKey: category.key,
    categoryQuery: category.query,
    ...paginate(category.videos || [], page, limit)
  });
});

// POST /api/refresh
app.post('/api/refresh', async (req, res) => {
  try {
    const result = await refreshAllCategories(apiKey);
    res.json({ message: 'Refresh completed', ...result });
  } catch (error) {
    res.status(500).json({ message: 'Refresh failed', error: error.message });
  }
});

// GET /api/feed/:countryCode?page=1&limit=10
app.get('/api/feed/:countryCode', (req, res) => {
  const countryCode   = req.params.countryCode.toUpperCase();
  const categoryKeys  = countryCategoryMap[countryCode];

  if (!categoryKeys) {
    return res.status(404).json({ message: 'Country not supported' });
  }

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);

  let videos = [];
  categoryKeys.forEach((key) => {
    const category = getCategoryData(key);
    if (category?.videos) videos = videos.concat(category.videos);
  });

  // Shuffle for feed experience
  videos.sort(() => Math.random() - 0.5);

  res.json({
    country: countryCode,
    ...paginate(videos, page, limit)
  });
});

// ✅ GET /api/fitness?page=1&limit=10
app.get('/api/fitness', (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);

  let videos = [];
  fitnessCategoryKeys.forEach((key) => {
    const category = getCategoryData(key);
    if (category?.videos) videos = videos.concat(category.videos);
  });

  // Shuffle for a fresh feed feel
  videos.sort(() => Math.random() - 0.5);

  res.json({
    feed: 'fitness',
    ...paginate(videos, page, limit)
  });
});

// ✅ GET /api/fitness/:categoryKey?page=1&limit=10  (e.g. /api/fitness/yoga_shorts)
app.get('/api/fitness/:categoryKey', (req, res) => {
  const { categoryKey } = req.params;

  if (!fitnessCategoryKeys.includes(categoryKey)) {
    return res.status(404).json({ message: 'Fitness category not found' });
  }

  const category = getCategoryData(categoryKey);

  if (!category) {
    return res.status(404).json({ message: 'No data cached for this fitness category yet' });
  }

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);

  res.json({
    feed: 'fitness',
    categoryKey: category.key,
    categoryQuery: category.query,
    ...paginate(category.videos || [], page, limit)
  });
});


async function bootstrap() {
  const hasCache = loadCacheFromDisk();

  if (!hasCache) {
    console.log('No cache found. First server run detected. Fetching all category APIs...');
    await refreshAllCategories(apiKey);
  } else if (refreshOnStart) {
    console.log('Cache found. Refreshing all category APIs on startup...');
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