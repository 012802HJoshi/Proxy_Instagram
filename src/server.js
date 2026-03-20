require("dotenv").config();

const app = require("./app");
const {
  refreshAllTrendingCaches,
  refreshAllCategoryCaches,
} = require("./services/youtubeTrendingService");

const PORT = process.env.PORT || 4141;
const REFRESH_ON_START = (process.env.REFRESH_ON_START || "true").toLowerCase() === "true";

async function startServer() {
  if (REFRESH_ON_START) {
    const trendingResults = await refreshAllTrendingCaches();
    // eslint-disable-next-line no-console
    console.log("Trending refresh results:", trendingResults);
    const categoryResults = await refreshAllCategoryCaches();
    // eslint-disable-next-line no-console
    console.log("Category refresh results (10 × 10 shorts):", categoryResults);
  }

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error.message);
  process.exit(1);
});

