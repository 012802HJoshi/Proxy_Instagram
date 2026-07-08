const express = require("express");
const youtubeRouter = require("./routes/youtube");
const instagramRouter = require("./routes/instagram");
const exchangeRouter = require("./routes/exchange");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "YouTube Shorts API V0.1.0" });
});

app.use("/youtube", youtubeRouter);
app.use("/instagram", instagramRouter);
app.use("/exchange", exchangeRouter);
module.exports = app;

