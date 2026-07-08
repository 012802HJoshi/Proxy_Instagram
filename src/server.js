const node_cron = require("node-cron");
const fs = require('fs/promises');

require("dotenv").config();

const app = require("./app");

const {
  refreshAllTrendingCaches,
  refreshAllCategoryCaches,
  refreshAllFitnessCaches,
} = require("./services/youtubeTrendingService");
const { default: axios } = require("axios");

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

  let count = 0;

  node_cron.schedule("0 1 * * *", async () => {
    try {
      console.log("Updating exchange rates dynamically...");
      const response = await axios.get("https://open.er-api.com/v6/latest/USD");
      const data = response.data;
      if (data && data.rates && !data.conversion_rates) {
        data.conversion_rates = data.rates;
      }
      await fs.writeFile(
        "exchange.json",
        JSON.stringify(data, null, 2),
        "utf8"
      );
      console.log("Exchange rates updated successfully in exchange.json");
    } catch (error) {
      console.error("Error updating exchange rates in cron:", error.message);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata",
  });

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    console.error("Server error:", error.message);
  });
}

async function createFile(content) {
  try {
    fs.writeFile('exchange.json', content, 'utf8');
  } catch (err) {
    console.log('Error writing file:', err.message);
  }
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
