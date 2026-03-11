const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/download", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Tweet URL required" });
    }

    console.log("Incoming URL:", url);

    // extract tweet id
    const tweetId = url.match(/status\/(\d+)/)?.[1];

    if (!tweetId) {
      return res.status(400).json({ error: "Invalid tweet url" });
    }

    console.log("Tweet ID:", tweetId);

    // fetch tweet data
    const response = await axios.get(
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=1`
    );

    const tweet = response.data;

    console.log("Tweet data received");

    if (!tweet.mediaDetails) {
      return res.status(404).json({ error: "No media found in tweet" });
    }

    const media = tweet.mediaDetails.map((item) => {
      if (item.type === "photo") {
        return {
          type: "photo",
          thumbnail: item.media_url_https,
          variants: [
            {
              quality: "original",
              url: item.media_url_https,
            },
          ],
        };
      }

      if (item.type === "video" || item.type === "animated_gif") {
        const variants = item.video_info.variants
          .filter((v) => v.content_type === "video/mp4")
          .map((v) => ({
            bitrate: v.bitrate || null,
            url: v.url,
          }))
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

        return {
          type: item.type,
          thumbnail: item.media_url_https,
          duration: item.video_info.duration_millis,
          variants,
        };
      }
    });

    res.json({
      success: true,
      tweetId,
      media,
    });
  } catch (error) {
    console.error("Downloader error:", error.message);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;