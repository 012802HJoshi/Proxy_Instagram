const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const router = express.Router();

router.get("/rate/:currency", async (req, res) => {
  try {
    const currencyParam = req.params.currency;
    if (!currencyParam) {
      return res.status(400).json({ error: "Currency parameter is required" });
    }

    const currencyCode = currencyParam.trim().toUpperCase();

    // Read local exchange.json
    const filePath = path.join(__dirname, "../../exchange.json");
    const fileContent = await fs.readFile(filePath, "utf8");
    const exchangeData = JSON.parse(fileContent);

    const rates = exchangeData.conversion_rates || exchangeData.rates;
    if (!rates) {
      return res.status(500).json({ error: "Invalid exchange data structure: conversion_rates or rates not found." });
    }

    const usdToLocalRate = rates[currencyCode];
    if (usdToLocalRate === undefined) {
      return res.status(404).json({ 
        error: `Exchange rate for currency '${currencyCode}' not found in exchange.json.` 
      });
    }

    // Since the rate is (1 USD = usdToLocalRate local currency units),
    // to convert local currency to USD, the rate is 1 / usdToLocalRate.
    const localToUsdRate = 1 / usdToLocalRate;

    return res.json({
      currency: currencyCode,
      rate_to_usd: localToUsdRate,
      usd_to_currency: usdToLocalRate,
      last_updated_utc: exchangeData.time_last_update_utc
    });
  } catch (error) {
    console.error("Error fetching rate:", error);
    return res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

module.exports = router;