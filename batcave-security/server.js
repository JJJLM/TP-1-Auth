// Import des librairies et de la BDD
const express = require("express");
const bcrypt = require("bcrypt");
const db = require("./db");

// Créé du serveur Express
const app = express();
// Rend possible la lecture et l'écriture du JSON
app.use(express.json());
// Ouvre les fichiers frontend non protégés
app.use(express.static("public"));

// Lance le serveur en local, sur le port 3000
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

app.post("/register", async (req, res) => {
  // Récupère les identifiants saisis par l'utilisateur
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

    // Hachage du mot de passe avant stockage !
    const hash = await bcrypt.hash(password, 10);

    // Requête SQL pour insérer le nouvel utilisateur en base
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

const checkAuth = async (req, res, next) => {
  // Récupère l'en-tête pour la vérifier avant d'atteindre les routes protégées
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }
  // Décodage du Base64
  const base64 = authHeader.split(" ")[1];
  const [username, password] = Buffer.from(base64, "base64")
    .toString()
    .split(":");

  // Vérification en BDD
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
  // Comparaison des mots de passe avec bcrypt
  if (user && (await bcrypt.compare(password, user.password_hash))) {
    req.user = user; // On conserve l'utilisateur dans la requête, si besoin
    next();
  } else {
    return res.status(401).json({ error: "Identifiants invalides" });
  }
};

app.get("/", (_req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/bat-computer", (_req, res) => {
  res.sendFile(__dirname + "/private/bat-computer.html");
});

app.get("/api/me", checkAuth, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username });
});

app.post("/api/reports", checkAuth, (req, res) => {
  const { content } = req.body;
  if (!content || content.trim() === "") {
    return res.status(400).json({ error: "Le contenu du rapport est requis." });
  }
  db.prepare("INSERT INTO reports (user_id, content) VALUES (?, ?)").run(req.user.id, content.trim());
  res.status(201).json({ message: "Rapport enregistré." });
});

app.get("/api/reports", checkAuth, (req, res) => {
  const reports = db.prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json(reports);
});

app.get("/api/secrets", checkAuth, (_req, res) => {
  const secrets = db.prepare("SELECT * FROM secrets").all();
  res.json(secrets);
});

app.post("/api/secrets", checkAuth, (req, res) => {
  const { name, desc } = req.body;
  if (!name || !desc) {
    return res.status(400).json({ error: "Les champs name et desc sont requis." });
  }
  db.prepare("INSERT INTO secrets (name, desc) VALUES (?, ?)").run(name.trim(), desc.trim());
  res.status(201).json({ message: "Secret ajouté." });
});

app.use((_req, res) => {
  res.status(404).sendFile(__dirname + "/public/404.html");
});
