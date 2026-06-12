const express = require("express");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const trimmedUsername = username.trim();
  if (trimmedUsername.includes(" ") || trimmedUsername === "") {
    return res
      .status(400)
      .send("Erreur : Le nom d'utilisateur ne doit pas contenir d'espaces.");
  }

  if (password.length < 8) {
    return res
      .status(400)
      .send(
        "Erreur : Le mot de passe doit faire 8 caractères minimum siv ous ne voulez pas être aussi faible que Superman."
      );
  }

  try {
    const existingUser = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(trimmedUsername);

    if (existingUser) {
      return res
        .status(409)
        .send(
          "Erreur : Vous essayez d'usurper l'identité d'un justicier déjà enregistré, ce n'est pas très héroïque."
        );
    }

    const hash = await bcrypt.hash(password, 10);

    const insert = db.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)"
    );
    insert.run(trimmedUsername, hash);
    res.status(201).send("Utilisateur créé avec succès !");
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(409)
        .send(
          "Erreur : Vous essayez d'usurper l'identité d'un justicier déjà enregistré, ce n'est pas très héroïque."
        );
    }
    console.error("Erreur lors de l'inscription :", err);
    res.status(500).send("Erreur interne du serveur.");
  }
});

const failedAttempts = {};
const MAX_ATTEMPTS = 3;
const BLOCK_DURATION = 30 * 1000;

const checkAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  const base64 = authHeader.split(" ")[1];
  const [username, password] = Buffer.from(base64, "base64")
    .toString()
    .split(":");

  const attempt = failedAttempts[username];
  if (attempt && attempt.blockedUntil > Date.now()) {
    const remaining = Math.ceil((attempt.blockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      error: `Trop de tentatives éronnées. Réessayez dans ${remaining}s.`,
    });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);

  if (user && (await bcrypt.compare(password, user.password_hash))) {
    delete failedAttempts[username];

    db.prepare("INSERT INTO logs (username, route) VALUES (?, ?)").run(
      user.username,
      req.path
    );

    req.user = user;
    next();
  } else {
    if (!failedAttempts[username])
      failedAttempts[username] = { count: 0, blockedUntil: 0 };
    failedAttempts[username].count += 1;
    if (failedAttempts[username].count >= MAX_ATTEMPTS) {
      failedAttempts[username].blockedUntil = Date.now() + BLOCK_DURATION;
      return res
        .status(429)
        .json({ error: "Trop de tentatives. Compte bloqué 30 secondes." });
    }
    return res.status(401).json({ error: "Identifiants invalides." });
  }
};


app.get("/", (_req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/bat-computer", (_req, res) => {
  res.sendFile(__dirname + "/private/bat-computer.html");
});

app.get("/api/me", checkAuth, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
  });
});

app.post("/logout", (_req, res) => {
  res.status(200).json({ message: "Déconnecté." });
});

const checkAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res
      .status(403)
      .json({ error: "Accès refusé : droits insuffisants." });
  }
  next();
};

app.post("/api/reports", checkAuth, checkAdmin, (req, res) => {
  const { content } = req.body;
  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "Le contenu du rapport est requis." });
  }
  db.prepare("INSERT INTO reports (user_id, content) VALUES (?, ?)").run(
    req.user.id,
    content.trim()
  );
  res.status(201).json({ message: "Rapport enregistré." });
});

app.get("/api/reports", checkAuth, (req, res) => {
  const reports = db
    .prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json(reports);
});

app.get("/api/secrets", checkAuth, (_req, res) => {
  const secrets = db.prepare("SELECT * FROM secrets").all();
  res.json(secrets);
});

app.post("/api/secrets", checkAuth, checkAdmin, (req, res) => {
  const { name, desc } = req.body;
  if (!name || !desc) {
    return res
      .status(400)
      .json({ error: "Les champs name et desc sont requis." });
  }
  db.prepare("INSERT INTO secrets (name, desc) VALUES (?, ?)").run(
    name.trim(),
    desc.trim()
  );
  res.status(201).json({ message: "Secret ajouté." });
});

app.use((_req, res) => {
  res.status(404).sendFile(__dirname + "/public/404.html");
});
