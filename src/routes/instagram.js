const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();

/**
 * Decrypts the obfuscated Packed JavaScript from SnapSave response.
 * @param {string} data - Response payload from SnapSave.
 * @returns {string|null} - Plaintext decrypted JavaScript code (containing HTML chunks).
 */
function decryptSnapSave(data) {
  if (typeof data !== "string") return null;
  const obfuscatedCode = data.replace(
    "return decodeURIComponent(escape(r))",
    "return JSON.stringify(r);"
  );
  try {
    const jsCode = eval(obfuscatedCode);
    return jsCode;
  } catch (err) {
    console.error("[Instagram] Decryption failed:", err.message);
    return null;
  }
}

/**
 * Scrapes and extracts media details from snapsave.app
 * @param {string} targetUrl - User submitted Instagram post or reel URL.
 * @returns {Promise<Array>} - Extracted media items.
 */
async function downloadInstagramMedia(targetUrl) {
  let url = targetUrl;

  // 1. Follow redirects for share or short URLs (e.g. /share/ or /s/)
  if (url.includes("/share/") || url.includes("/s/")) {
    try {
      const redirectRes = await axios.get(url, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        },
        maxRedirects: 5,
        timeout: 10000,
      });
      const path = redirectRes?.request?.path;
      if (path) {
        url = `https://www.instagram.com${path}`;
      } else {
        const $ = cheerio.load(redirectRes.data);
        const alternateLink = $('link[rel="alternate"]').attr("href");
        if (alternateLink) {
          url = alternateLink;
        }
      }
      console.log(`[Instagram] Resolved short/share redirect URL to: ${url}`);
    } catch (err) {
      console.error(`[Instagram] Failed to follow redirect: ${err.message}`);
    }
  }

  // 2. Fetch from snapsave
  const headers = {
    accept: "application/json",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    origin: "https://snapsave.app",
    referer: "https://snapsave.app/id",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  };

  const response = await axios.post(
    "https://snapsave.app/action.php",
    new URLSearchParams({ url }),
    { headers, timeout: 15000 }
  );

  if (response.status !== 200) {
    throw new Error("Unable to fetch data from Instagram downloader service");
  }

  // 3. Decrypt response
  const jsCode = decryptSnapSave(response.data);
  if (!jsCode) {
    throw new Error("Failed to decrypt response from Instagram downloader service");
  }

  if (jsCode.includes("Error: Unable to connect to Instagram server")) {
    throw new Error("Downloader service was unable to connect to Instagram. Please retry later.");
  }

  const startIdx = jsCode.indexOf("<div");
  if (startIdx === -1) {
    throw new Error("No media found for this Instagram URL");
  }
  const endIdx = jsCode.lastIndexOf("</div>") + "</div>".length;
  if (endIdx === -1) {
    throw new Error("No media found for this Instagram URL");
  }
  const innerHTMLString = jsCode
    .substring(startIdx, endIdx)
    .replaceAll("\\", "");

  const $ = cheerio.load(innerHTMLString);
  const items = [];

  function extractPhotoUrl(inputUrl) {
    try {
      const parsed = new URL(inputUrl);
      return parsed.searchParams.get("photo") || inputUrl;
    } catch {
      return inputUrl;
    }
  }

  $(".row").each((index, rowElement) => {
    $(rowElement)
      .find(".download-items")
      .each((idx, downloadItem) => {
        let thumbnail = $(downloadItem).find("img").attr("src");
        if (thumbnail && thumbnail.includes("https://snapinsta.app/photo.php?photo=")) {
          thumbnail = extractPhotoUrl(thumbnail);
        }

        let downloadLink = $(downloadItem)
          .find("a")
          .attr("href")
          ?.replaceAll("&dl=1", "");
        if (downloadLink && downloadLink.includes("https://snapinsta.app/photo.php?photo=")) {
          downloadLink = extractPhotoUrl(downloadLink);
        }

        let mediaType = $(downloadItem)
          .find(".download-items__btn span")
          .text()
          .trim()
          .replace("Download ", "")
          .toLowerCase();

        // Fallback for mediaType detection
        if (!mediaType) {
          if (downloadLink && (downloadLink.includes(".mp4") || downloadLink.includes("video"))) {
            mediaType = "video";
          } else {
            mediaType = "photo";
          }
        }

        if (mediaType === "image" || mediaType === "photo") {
          mediaType = "photo";
        }

        if (downloadLink) {
          items.push({
            type: mediaType === "video" ? "video" : "photo",
            thumb: thumbnail || "",
            duration: null,
            has_audio: null,
            variants: [
              {
                bitrate: null,
                content_type: mediaType === "video" ? "video/mp4" : "image/jpg",
                quality: "HD",
                url: downloadLink,
              },
            ],
          });
        }
      });
  });

  if (items.length === 0) {
    throw new Error("No download links parsed from downloader response");
  }

  return items;
}

// ─── Route ────────────────────────────────────────────────────────────────────
router.post("/download/post", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const cleanUrl = url.trim();
  if (!cleanUrl.match(/^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv|stories|share|s)(\/[a-zA-Z0-9_.-]*)?\/?/i)) {
    return res.status(400).json({ error: "Invalid Instagram URL format" });
  }

  try {
    console.log(`[Instagram] Executing downloader strategy for: ${cleanUrl}`);
    const mediaDetails = await downloadInstagramMedia(cleanUrl);
    return res.status(200).json(mediaDetails);
  } catch (error) {
    console.error(`[Instagram] Route error: ${error.message}`);
    const status = error.message.includes("Unable to connect") || error.message.includes("parsed") ? 502 : 500;
    return res.status(status).json({ error: error.message || "Internal Server Error" });
  }
});

module.exports = router;