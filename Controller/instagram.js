const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const { instagramDownloader } = require("social-dl");

const router = express.Router();


const REQUEST_QUEUE = [];
let IS_PROCESSING = false;
const MIN_DELAY_MS = 8000;
const MAX_DELAY_MS = 20000;
const BLOCK_COOLDOWN_MS = 90 * 60 * 1000; // 90 min cooldown if hard-blocked
let blockedUntil = null;


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = () =>
  Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;

const isBlocked = () => blockedUntil && Date.now() < blockedUntil;

const setBlocked = () => {
  blockedUntil = Date.now() + BLOCK_COOLDOWN_MS;
  console.warn(`[Instagram] Hard block detected. Cooling down until ${new Date(blockedUntil).toISOString()}`);
};

// Rotate user agents to reduce fingerprinting
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
];

const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// ─── Axios Instance (no aggressive retry — we handle that manually) ────────────
const createAxiosInstance = () =>
  axios.create({
    timeout: 15000,
    headers: {
      "User-Agent": getRandomUA(),
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
    },
  });

// ─── URL Parsing ──────────────────────────────────────────────────────────────
const getPostId = (postUrl) => {
  if (!postUrl) throw new Error("Instagram URL was not provided");
  const match = postUrl.match(/\/(?:reels?|p)\/(?!audio\/)([a-zA-Z0-9_-]+)/);
  if (!match?.[1]) throw new Error("Instagram post ID was not found");
  return match[1];
};

// ─── Fetch Strategy 1: social-dl package ─────────────────────────────────────
const fetchFromPackage = async (url) => {
  const result = await instagramDownloader(url);
  if (!result?.status) throw new Error(result?.results || "Package fetch failed");
  return { source: "package", data: result };
};

// ─── Fetch Strategy 2: Web Page (no cookies) ─────────────────────────────────
const fetchFromWebPage = async (postUrl) => {
  const match = postUrl.match(/\/(?:reels?|p)\/(?!audio\/)([a-zA-Z0-9_-]+)/);
  if (!match?.[1]) throw new Error("Instagram valid post URL was not found");

  const axiosInstance = createAxiosInstance();
  const targetUrl = `https://www.instagram.com/p/${match[1]}/?__a=1&__d=dis`;
  const response = await axiosInstance.get(targetUrl);

  if (!response.data || response.data.require_login) {
    throw new Error("Web page fetch returned login wall");
  }
  return { source: "webpage", data: response.data };
};

// ─── Fetch Strategy 3: GraphQL API ───────────────────────────────────────────
// NOTE: The tokens below expire. If GraphQL consistently fails, they need refreshing
// by visiting instagram.com and extracting updated values from network requests.
const fetchFromGraphQL = async (postId) => {
  const axiosInstance = createAxiosInstance();

  const requestData = {
    av: "0",
    __d: "www",
    __user: "0",
    __a: "1",
    __req: "3",
    __hs: "19624.HYP:instagram_web_pkg.2.1..0.0",
    dpr: "3",
    __ccg: "UNKNOWN",
    __rev: "1008824440",
    __s: "xf44ne:zhh75g:xr51e7",
    __hsi: "7282217488877343271",
    __dyn:
      "7xeUmwlEnwn8K2WnFw9-2i5U4e0yoW3q32360CEbo1nEhw2nVE4W0om78b87C0yE5ufz81s8hwGwQwoEcE7O2l0Fwqo31w9a9x-0z8-U2zxe2GewGwso88cobEaU2eUlwhEe87q7-0iK2S3qazo7u1xwIw8O321LwTwKG1pg661pwr86C1mwraCg",
    __csr:
      "gZ3yFmJkillQvV6ybimnG8AmhqujGbLADgjyEOWz49z9XDlAXBJpC7Wy-vQTSvUGWGh5u8KibG44dBiigrgjDxGjU0150Q0848azk48N09C02IR0go4SaR70r8owyg9pU0V23hwiA0LQczA48S0f-x-27o05NG0fkw",
    __comet_req: "7",
    lsd: "AVqbxe3J_YA",
    jazoest: "2957",
    __spin_r: "1008824440",
    __spin_b: "trunk",
    __spin_t: "1695523385",
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
    variables: JSON.stringify({
      shortcode: postId,
      fetch_comment_count: "null",
      fetch_related_profile_media_count: "null",
      parent_comment_count: "null",
      child_comment_count: "null",
      fetch_like_count: "null",
      fetch_tagged_user_count: "null",
      fetch_preview_comment_count: "null",
      has_threaded_comments: "false",
      hoisted_comment_id: "null",
      hoisted_reply_id: "null",
    }),
    server_timestamps: "true",
    doc_id: "10015901848480474",
  };

  const response = await axiosInstance.post(
    "https://www.instagram.com/api/graphql",
    qs.stringify(requestData),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Sec-Fetch-Site": "same-origin",
        "X-FB-LSD": "AVqbxe3J_YA",
        "User-Agent": getRandomUA(),
      },
    }
  );

  const contentType = response.headers["content-type"];
  if (contentType !== "text/javascript; charset=utf-8") {
    throw new Error(`GraphQL unexpected content-type: ${contentType}`);
  }

  if (!response.data?.data) throw new Error("GraphQL response missing data");
  return { source: "graphql", data: response.data.data.xdt_shortcode_media };
};

// ─── Media Detail Normalization ───────────────────────────────────────────────
const normalizeMedia = ({ source, data }) => {
  // Strategy 1: social-dl package
  if (source === "package") {
    return data.results.map((post) => ({
      type: post.type,
      thumb: post.thumbnail,
      duration: null,
      has_audio: null,
      variants: post.variants.map((v) => ({
        bitrate: null,
        content_type: post.type === "video" ? "video/mp4" : "image/jpg",
        quality: v.quality,
        url: v.url,
      })),
    }));
  }

  // Strategy 2: Web page (with cookies — items[] format)
  if (source === "webpage" && data.items) {
    const item = data.items[0];
    if (item.media_type === 1) {
      return [{
        type: "photo",
        thumb: item.image_versions2.candidates[0].url,
        duration: null,
        has_audio: !!item.music_metadata?.audio_type,
        variants: item.image_versions2.candidates.map((v) => ({
          bitrate: null,
          content_type: "image/jpg",
          quality: `${v.height}p`,
          url: v.url,
        })),
      }];
    } else if (item.media_type === 2) {
      return [{
        type: "video",
        thumb: item.image_versions2.candidates[0].url,
        duration: item.video_duration,
        has_audio: item.has_audio,
        variants: item.video_versions
          .map((v) => ({ bitrate: null, content_type: "video/mp4", quality: `${v.height}p`, url: v.url }))
          .filter((v, i, arr) => i === arr.findIndex((x) => x.quality === v.quality)),
      }];
    } else {
      return item.carousel_media.map((post) => {
        if (post.media_type === 1) {
          return {
            type: "photo",
            thumb: post.image_versions2.candidates[0].url,
            duration: null,
            has_audio: !!item.music_metadata?.audio_type,
            variants: post.image_versions2.candidates.map((v) => ({
              bitrate: null, content_type: "image/jpg", quality: `${v.height}p`, url: v.url,
            })),
          };
        }
        return {
          type: "video",
          thumb: post.image_versions2.candidates[0].url,
          duration: post.video_duration,
          has_audio: !!item.music_metadata?.audio_type,
          variants: post.video_versions
            .map((v) => ({ bitrate: null, content_type: "video/mp4", quality: `${v.height}p`, url: v.url }))
            .filter((v, i, arr) => i === arr.findIndex((x) => x.quality === v.quality)),
        };
      });
    }
  }

  // Strategy 2: Web page (no cookies — graphql format)
  if (source === "webpage" && data.graphql) {
    const media = data.graphql.shortcode_media;
    if (media.__typename === "GraphImage") {
      return [{ type: "photo", thumb: media.display_url, duration: null, variants: [{ bitrate: null, content_type: "image/jpg", quality: `${media.dimensions.height}p`, url: media.display_url }] }];
    } else if (media.__typename === "GraphVideo") {
      return [{ type: "video", thumb: media.display_url, duration: media.video_duration, variants: [{ bitrate: null, content_type: "video/mp4", quality: `${media.dimensions.height}p`, url: media.video_url }] }];
    } else {
      return media.edge_sidecar_to_children.edges.map(({ node }) =>
        node.__typename === "GraphImage"
          ? { type: "photo", thumb: node.display_url, duration: null, variants: [{ bitrate: null, content_type: "image/jpg", quality: `${node.dimensions.height}p`, url: node.display_url }] }
          : { type: "video", thumb: node.display_url, duration: null, variants: [{ bitrate: null, content_type: "video/mp4", quality: `${node.dimensions.height}p`, url: node.video_url }] }
      );
    }
  }

  // Strategy 3: GraphQL API (XDT format)
  if (source === "graphql") {
    if (data.__typename === "XDTGraphImage") {
      return [{ type: "photo", thumb: data.display_url, duration: null, has_audio: null, variants: [{ bitrate: null, content_type: "image/jpg", quality: "N/A", url: data.display_url }] }];
    } else if (data.__typename === "XDTGraphVideo") {
      return [{ type: "video", thumb: data.display_url, duration: data.video_duration * 1000, has_audio: data.has_audio, variants: [{ bitrate: null, content_type: "video/mp4", quality: "HD", url: data.video_url }] }];
    } else {
      return data.edge_sidecar_to_children.edges.map(({ node }) =>
        node.__typename === "XDTGraphImage"
          ? { type: "photo", thumb: node.display_url, duration: null, has_audio: null, variants: [{ bitrate: null, content_type: "image/jpg", quality: "N/A", url: node.display_url }] }
          : { type: "video", thumb: node.display_url, duration: node.video_duration * 1000, has_audio: node.has_audio, variants: [{ bitrate: null, content_type: "video/mp4", quality: "HD", url: node.video_url }] }
      );
    }
  }

  throw new Error("Unable to normalize media: unknown source/format");
};

// ─── Core Fetch with Fallback Chain ──────────────────────────────────────────
const fetchWithFallback = async (url) => {
  const postId = getPostId(url);
  const strategies = [
    { name: "package",  fn: () => fetchFromPackage(url) },
    { name: "webpage",  fn: () => fetchFromWebPage(url) },
    { name: "graphql",  fn: () => fetchFromGraphQL(postId) },
  ];

  for (const strategy of strategies) {
    try {
      console.log(`[Instagram] Trying strategy: ${strategy.name}`);
      const result = await strategy.fn();
      console.log(`[Instagram] Success with strategy: ${strategy.name}`);
      return result;
    } catch (err) {
      // Detect hard block (429 / 401 / checkpoint)
      const status = err?.response?.status;
      if (status === 429 || status === 401 || err.message?.includes("checkpoint")) {
        setBlocked();
        throw new Error("Instagram rate limit hit. Please retry later.");
      }
      console.warn(`[Instagram] Strategy '${strategy.name}' failed: ${err.message}`);
    }
  }

  throw new Error("All fetch strategies exhausted");
};

// ─── Request Queue Processor ──────────────────────────────────────────────────
const processQueue = async () => {
  if (IS_PROCESSING || REQUEST_QUEUE.length === 0) return;
  IS_PROCESSING = true;

  while (REQUEST_QUEUE.length > 0) {
    if (isBlocked()) {
      const waitMs = blockedUntil - Date.now();
      console.warn(`[Instagram] Blocked. Queue waiting ${Math.round(waitMs / 1000)}s...`);
      // Reject all queued requests immediately rather than holding connections open
      while (REQUEST_QUEUE.length > 0) {
        const { reject } = REQUEST_QUEUE.shift();
        reject(new Error(`Instagram is rate-limited. Please try again after ${new Date(blockedUntil).toLocaleTimeString()}.`));
      }
      break;
    }

    const { url, resolve, reject } = REQUEST_QUEUE.shift();
    try {
      const result = await fetchWithFallback(url);
      resolve(result);
    } catch (err) {
      reject(err);
    }

    if (REQUEST_QUEUE.length > 0) {
      const delay = randomDelay();
      console.log(`[Instagram] Waiting ${delay}ms before next request...`);
      await sleep(delay);
    }
  }

  IS_PROCESSING = false;
};

const enqueueRequest = (url) =>
  new Promise((resolve, reject) => {
    REQUEST_QUEUE.push({ url, resolve, reject });
    processQueue();
  });

// ─── Route ────────────────────────────────────────────────────────────────────
router.post("/download/post", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  // Reject immediately if we already know we're blocked
  if (isBlocked()) {
    return res.status(429).json({
      error: "Instagram is currently rate-limited.",
      retryAfter: new Date(blockedUntil).toISOString(),
    });
  }

  try {
    const postData = await enqueueRequest(url);
    const mediaDetails = normalizeMedia(postData);
    return res.status(200).json(mediaDetails);
  } catch (error) {
    const status = error?.response?.status || 500;
    console.error(`[Instagram] Route error: ${error.message}`);

    if (status === 429 || error.message.includes("rate-limited")) {
      return res.status(429).json({
        error: error.message,
        retryAfter: blockedUntil ? new Date(blockedUntil).toISOString() : null,
      });
    }

    return res.status(status).json({ error: error.message || "Internal Server Error" });
  }
});

module.exports = router;