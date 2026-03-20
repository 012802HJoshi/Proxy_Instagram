const express = require("express");
const {
  SUPPORTED_COUNTRIES,
  SUPPORTED_CATEGORY_IDS,
  getCategoryListMeta,
  refreshCountryCache,
  readCountryCache,
  refreshCategoryCache,
  readCategoryCache,
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
    ],
    supportedCountries: SUPPORTED_COUNTRIES,
    categories: getCategoryListMeta(),
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

module.exports = router;

