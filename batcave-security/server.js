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
const PORT = 3000;
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
        "Erreur : Le mot de passe doit faire 8 caractères minimum siv ous ne voulez pas être aussi faible que Superman.",
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
          "Erreur : Vous essayez d'usurper l'identité d'un justicier déjà enregistré, ce n'est pas très héroïque.",
        );
    }

    // Hachage du mot de passe avant stockage !
    const hash = await bcrypt.hash(password, 10);

    // Requête SQL pour insérer le nouvel utilisateur en base
    const insert = db.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    );
    insert.run(trimmedUsername, hash);
    res.status(201).send("Utilisateur créé avec succès !");
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(409)
        .send(
          "Erreur : Vous essayez d'usurper l'identité d'un justicier déjà enregistré, ce n'est pas très héroïque.",
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
    // Ajoute l'en-tête pour demander au navigateur d'ouvrir la fenêtre de connexion
    res.setHeader("WWW-Authenticate", 'Basic realm="Administration"');
    return res.status(401).send("Authentification requise");
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
    // Renvoie une réponse 401 avec l'en-tête WWW-Authenticate en cas d'erreur
    res.setHeader("WWW-Authenticate", 'Basic realm="Administration"');
    return res.status(401).send("Identifiants invalides");
  }
};

app.get("/bat-computer", checkAuth, (req, res) => {
  // Sert le fichier bat-computer.html hors du dossier public (dans private/)
  res.sendFile(__dirname + "/private/bat-computer.html");
});

app.get("/api/secrets", checkAuth, (req, res) => {
  // Renvoie un tableau d'objets JSON représentant les gadgets de Batman
  res.json([
    {
      name: "Batarang",
      desc: "Arme de jet.",
      icon: "fa-shuriken",
    },
    {
      name: "Grappin de Chauve-Souris",
      desc: "Permet de grimper.",
      icon: "fa-anchor",
    },
    {
      name: "Gel Explosif",
      desc: "Permet de geler puis de tout faire péter.",
      icon: "fa-spray-can",
    },
    {
      name: "Brouilleur Tactique",
      desc: "Outil de neutralisation.",
      icon: "fa-wifi",
    },
    {
      name: "Décodeur Séquentiel",
      desc: "Permet de décoder le code en Base64.",
      icon: "fa-key",
    },
  ]);
});
