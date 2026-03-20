const express = require("express");
const youtubeRouter = require("./routes/youtube");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "YouTube Shorts API" });
});

app.use("/youtube", youtubeRouter);

module.exports = app;

