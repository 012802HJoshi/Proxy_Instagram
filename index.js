const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const port = 4141;
const instagram = require("./Controller/instagram.js");

app.use("/instagram", instagram);
app.use("/", (req, res) => {
  res.status(200).send("Welcome to Rareprob Instagram Downloader API");
});

  app.listen(port, () => {
    console.log(`Server is running at port: ${port}`);
})
