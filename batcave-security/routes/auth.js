const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/db");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const trimmedUsername = username.trim();
  if (trimmedUsername.includes(" ") || trimmedUsername === "") {
    return res.status(400).send("Erreur : Le nom d'utilisateur ne doit pas contenir d'espaces.");
  }

  if (password.length < 8) {
    return res.status(400).send("Erreur : Le mot de passe doit faire 8 caractères minimum siv ous ne voulez pas être aussi faible que Superman.");
  }

  try {
    const existingUser = db.prepare("SELECT * FROM users WHERE username = ?").get(trimmedUsername);
    if (existingUser) {
      return res.status(409).send("Erreur : Vous essayez d'usurper l'identité d'un justicier déjà enregistré, ce n'est pas très héroïque.");
    }

    const hash = await bcrypt.hash(password, 10);
    db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(trimmedUsername, hash);
    res.status(201).send("Utilisateur créé avec succès !");
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).send("Erreur : Vous essayez d'usurper l'identité d'un justicier déjà enregistré, ce n'est pas très héroïque.");
    }
    console.error("Erreur lors de l'inscription :", err);
    res.status(500).send("Erreur interne du serveur.");
  }
});

router.post("/logout", (_req, res) => {
  res.status(200).json({ message: "Déconnecté." });
});

module.exports = router;
