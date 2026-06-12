const express = require("express");
const path = require("path");

const router = express.Router();

router.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

router.get("/bat-computer", (_req, res) => {
  res.sendFile(path.join(__dirname, "../views/bat-computer.html"));
});

module.exports = router;
