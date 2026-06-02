require("dotenv").config();

const app = require("./app");
const {
  refreshAllTrendingCaches,
  refreshAllCategoryCaches,
  refreshAllFitnessCaches,
} = require("./services/youtubeTrendingService");

const PORT = process.env.PORT || 4141;
const REFRESH_ON_START = (process.env.REFRESH_ON_START || "true").toLowerCase() === "true";

async function startServer() {
  if (REFRESH_ON_START) {
    const trendingResults = await refreshAllTrendingCaches();
    console.log("Trending refresh results:", trendingResults);
    const categoryResults = await refreshAllCategoryCaches();
    console.log("Category refresh results (10 × 10 shorts):", categoryResults);
    const fitnessResults = await refreshAllFitnessCaches();
    console.log("Fitness subcategory refresh results (7 × 10 shorts):", fitnessResults);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    console.error("Server error:", error.message);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
