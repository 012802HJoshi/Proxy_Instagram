const express = require("express");
const {
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
} = require("../services/youtubeTrendingService");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    route: "/youtube",
    message: "YouTube trending shorts cache API",
    routes: [
      "GET /youtube/trending",
      "GET /youtube/trending/:country",
      "POST /youtube/trending/:country/refresh",
      "GET /youtube/categories",
      "GET /youtube/categories/:categoryId",
      "POST /youtube/categories/:categoryId/refresh",
      "POST /youtube/refresh",
      "GET /youtube/fitness",
      "POST /youtube/fitness/refresh",
      "GET /youtube/fitness/:subcategoryId",
      "POST /youtube/fitness/:subcategoryId/refresh",
    ],
    supportedCountries: SUPPORTED_COUNTRIES,
    categories: getCategoryListMeta(),
    fitnessSubcategories: getFitnessSubcategoryListMeta(),
  });
});

router.get("/trending", async (req, res) => {
  try {
    const data = await Promise.all(
      SUPPORTED_COUNTRIES.map(async (country) => {
        try {
          const cache = await readCountryCache(country);
          return { country, ...cache };
        } catch (error) {
          return { country, error: "Cache not found. Refresh this country first." };
        }
      })
    );

    return res.json({ countries: SUPPORTED_COUNTRIES, data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/trending/:country", async (req, res) => {
  const country = (req.params.country || "").toUpperCase();
  if (!SUPPORTED_COUNTRIES.includes(country)) {
    return res.status(400).json({
      message: "Unsupported country",
      supportedCountries: SUPPORTED_COUNTRIES,
    });
  }

  try {
    const cache = await readCountryCache(country);
    return res.json(cache);
  } catch (error) {
    return res.status(404).json({
      message: `Cache not found for ${country}. Use POST /youtube/trending/${country}/refresh`,
    });
  }
});

router.post("/trending/:country/refresh", async (req, res) => {
  const country = (req.params.country || "").toUpperCase();
  if (!SUPPORTED_COUNTRIES.includes(country)) {
    return res.status(400).json({
      message: "Unsupported country",
      supportedCountries: SUPPORTED_COUNTRIES,
    });
  }

  try {
    const result = await refreshCountryCache(country);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/** 10 categories × 10 shorts each (cached under cache/categories/<id>.json) */

router.get("/categories", async (req, res) => {
  try {
    const data = await Promise.all(
      SUPPORTED_CATEGORY_IDS.map(async (categoryId) => {
        try {
          const cache = await readCategoryCache(categoryId);
          return { categoryId, ...cache };
        } catch (error) {
          return { categoryId, error: "Cache not found. Refresh this category first." };
        }
      })
    );

    return res.json({
      categories: getCategoryListMeta(),
      data,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/categories/:categoryId", async (req, res) => {
  const categoryId = (req.params.categoryId || "").toLowerCase();
  if (!SUPPORTED_CATEGORY_IDS.includes(categoryId)) {
    return res.status(400).json({
      message: "Unsupported category",
      supportedCategories: SUPPORTED_CATEGORY_IDS,
    });
  }

  try {
    const cache = await readCategoryCache(categoryId);
    return res.json(cache);
  } catch (error) {
    return res.status(404).json({
      message: `Cache not found for ${categoryId}. Use POST /youtube/categories/${categoryId}/refresh`,
    });
  }
});

router.post("/categories/:categoryId/refresh", async (req, res) => {
  const categoryId = (req.params.categoryId || "").toLowerCase();
  if (!SUPPORTED_CATEGORY_IDS.includes(categoryId)) {
    return res.status(400).json({
      message: "Unsupported category",
      supportedCategories: SUPPORTED_CATEGORY_IDS,
    });
  }

  try {
    const result = await refreshCategoryCache(categoryId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const [trending, categories, fitness] = await Promise.all([
      refreshAllTrendingCaches(),
      refreshAllCategoryCaches(),
      refreshAllFitnessCaches(),
    ]);

    const summarize = (items) => ({
      total: items.length,
      ok: items.filter((item) => item.ok).length,
      failed: items.filter((item) => !item.ok).length,
    });

    return res.json({
      message: "Triggered full cache refresh.",
      summary: {
        trending: summarize(trending),
        categories: summarize(categories),
        fitness: summarize(fitness),
      },
      results: {
        trending,
        categories,
        fitness,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

/** Fitness hub: 7 subcategories × 10 shorts each (cache/fitness/<id>.json) */

router.get("/fitness", async (req, res) => {
  try {
    const data = await Promise.all(
      SUPPORTED_FITNESS_SUBCATEGORY_IDS.map(async (subcategoryId) => {
        try {
          const cache = await readFitnessSubcategoryCache(subcategoryId);
          return { subcategoryId, ...cache };
        } catch (error) {
          return { subcategoryId, error: "Cache not found. Refresh this subcategory first." };
        }
      })
    );

    return res.json({
      subcategories: getFitnessSubcategoryListMeta(),
      data,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/fitness/refresh", async (req, res) => {
  try {
    const results = await refreshAllFitnessCaches();
    return res.json({ results });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/fitness/:subcategoryId", async (req, res) => {
  const subcategoryId = (req.params.subcategoryId || "").toLowerCase();
  if (!SUPPORTED_FITNESS_SUBCATEGORY_IDS.includes(subcategoryId)) {
    return res.status(400).json({
      message: "Unsupported fitness subcategory",
      supportedSubcategories: SUPPORTED_FITNESS_SUBCATEGORY_IDS,
    });
  }

  try {
    const cache = await readFitnessSubcategoryCache(subcategoryId);
    return res.json(cache);
  } catch (error) {
    return res.status(404).json({
      message: `Cache not found for ${subcategoryId}. Use POST /youtube/fitness/${subcategoryId}/refresh`,
    });
  }
});

router.post("/fitness/:subcategoryId/refresh", async (req, res) => {
  const subcategoryId = (req.params.subcategoryId || "").toLowerCase();
  if (!SUPPORTED_FITNESS_SUBCATEGORY_IDS.includes(subcategoryId)) {
    return res.status(400).json({
      message: "Unsupported fitness subcategory",
      supportedSubcategories: SUPPORTED_FITNESS_SUBCATEGORY_IDS,
    });
  }

  try {
    const result = await refreshFitnessSubcategoryCache(subcategoryId);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

