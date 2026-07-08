const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const router = express.Router();

// Mapping of 2-letter and 3-letter country codes to 3-letter currency codes
const countryToCurrency = {
  // 2-letter codes
  "US": "USD", "IN": "INR", "GB": "GBP", "CA": "CAD", "AU": "AUD",
  "JP": "JPY", "KR": "KRW", "SG": "SGD", "AE": "AED", "CH": "CHF",
  "HK": "HKD", "MY": "MYR", "NZ": "NZD", "BR": "BRL", "MX": "MXN",
  "ZA": "ZAR", "SE": "SEK", "NO": "NOK", "DK": "DKK", "PL": "PLN",
  "TR": "TRY", "RU": "RUB", "TH": "THB", "ID": "IDR", "PH": "PHP",
  "VN": "VND", "PK": "PKR", "BD": "BDT", "LK": "LKR", "SA": "SAR",
  "IL": "ILS", "CN": "CNY", "TW": "TWD",
  "FR": "EUR", "DE": "EUR", "IT": "EUR", "ES": "EUR", "NL": "EUR",
  "BE": "EUR", "IE": "EUR", "AT": "EUR", "FI": "EUR", "GR": "EUR",
  "PT": "EUR",
  
  // 3-letter codes (often returned as storefront codes by Apple App Store)
  "USA": "USD", "IND": "INR", "GBR": "GBP", "CAN": "CAD", "AUS": "AUD",
  "JPN": "JPY", "KOR": "KRW", "SGP": "SGD", "ARE": "AED", "CHE": "CHF",
  "HKG": "HKD", "MYS": "MYR", "NZL": "NZD", "BRA": "BRL", "MEX": "MXN",
  "ZAF": "ZAR", "SWE": "SEK", "NOR": "NOK", "DNK": "DKK", "POL": "PLN",
  "TUR": "TRY", "RUS": "RUB", "THA": "THB", "IDN": "IDR", "PHL": "PHP",
  "VNM": "VND", "PAK": "PKR", "BGD": "BDT", "LKA": "LKR", "SAU": "SAR",
  "ISR": "ILS", "CHN": "CNY", "TWN": "TWD",
  "FRA": "EUR", "DEU": "EUR", "ITA": "EUR", "ESP": "EUR", "NLD": "EUR",
  "BEL": "EUR", "IRL": "EUR", "AUT": "EUR", "FIN": "EUR", "GRC": "EUR",
  "PRT": "EUR"
};

router.get("/rate/:country", async (req, res) => {
  try {
    const countryParam = req.params.country;
    if (!countryParam) {
      return res.status(400).json({ error: "Country parameter is required" });
    }

    const countryCode = countryParam.trim().toUpperCase();
    const currencyCode = countryToCurrency[countryCode];

    if (!currencyCode) {
      return res.status(400).json({ 
        error: `Country code '${countryParam}' is not supported or mapped.`,
        hint: "Please use standard 2-letter (e.g. US, IN, FR) or 3-letter (e.g. USA, IND, FRA) country codes."
      });
    }

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
        error: `Exchange rate for currency '${currencyCode}' (mapped from '${countryCode}') not found in exchange.json.` 
      });
    }

    // Since the rate is (1 USD = usdToLocalRate local currency units),
    // to convert local currency to USD, the rate is 1 / usdToLocalRate.
    const localToUsdRate = 1 / usdToLocalRate;

    return res.json({
      country: countryCode,
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