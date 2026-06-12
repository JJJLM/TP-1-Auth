const bcrypt = require("bcrypt");
const db = require("../config/db");

const failedAttempts = {};
const MAX_ATTEMPTS = 3;
const BLOCK_DURATION = 30 * 1000;

const checkAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  const base64 = authHeader.split(" ")[1];
  const [username, password] = Buffer.from(base64, "base64").toString().split(":");

  const attempt = failedAttempts[username];
  if (attempt && attempt.blockedUntil > Date.now()) {
    const remaining = Math.ceil((attempt.blockedUntil - Date.now()) / 1000);
    return res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${remaining}s.` });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (user && (await bcrypt.compare(password, user.password_hash))) {
    delete failedAttempts[username];
    db.prepare("INSERT INTO logs (username, route) VALUES (?, ?)").run(user.username, req.path);
    req.user = user;
    next();
  } else {
    if (!failedAttempts[username]) failedAttempts[username] = { count: 0, blockedUntil: 0 };
    failedAttempts[username].count += 1;
    if (failedAttempts[username].count >= MAX_ATTEMPTS) {
      failedAttempts[username].blockedUntil = Date.now() + BLOCK_DURATION;
      return res.status(429).json({ error: "Trop de tentatives. Compte bloqué 30 secondes." });
    }
    return res.status(401).json({ error: "Identifiants invalides." });
  }
};

module.exports = checkAuth;
