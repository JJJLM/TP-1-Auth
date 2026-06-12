const express = require("express");
const db = require("../config/db");
const checkAuth = require("../middlewares/checkAuth");
const checkAdmin = require("../middlewares/checkAdmin");

const router = express.Router();

router.get("/me", checkAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

router.get("/secrets", checkAuth, (_req, res) => {
  const secrets = db.prepare("SELECT * FROM secrets").all();
  res.json(secrets);
});

router.post("/secrets", checkAuth, checkAdmin, (req, res) => {
  const { name, desc } = req.body;
  if (!name || !desc) {
    return res.status(400).json({ error: "Les champs name et desc sont requis." });
  }
  db.prepare("INSERT INTO secrets (name, desc) VALUES (?, ?)").run(name.trim(), desc.trim());
  res.status(201).json({ message: "Secret ajouté." });
});

router.get("/reports", checkAuth, (req, res) => {
  const reports = db.prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(reports);
});

router.post("/reports", checkAuth, checkAdmin, (req, res) => {
  const { content } = req.body;
  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "Le contenu du rapport est requis." });
  }
  db.prepare("INSERT INTO reports (user_id, content) VALUES (?, ?)").run(req.user.id, content.trim());
  res.status(201).json({ message: "Rapport enregistré." });
});

module.exports = router;
