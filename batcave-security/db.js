const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const db = new Database("database.db");

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'USER'
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    route TEXT NOT NULL,
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS secrets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    desc TEXT NOT NULL
  )
`
).run();

const seedSecrets = [
  { name: "Batarang", desc: "Arme de jet télécommandée, revient à l'envoyeur." },
  { name: "Grappin de Chauve-Souris", desc: "Permet de grimper et de se déplacer entre les toits." },
  { name: "Gel Explosif", desc: "Adhère aux surfaces, détonation à distance." },
  { name: "Brouilleur Tactique", desc: "Neutralise les communications ennemies dans un rayon de 50m." },
  { name: "Décodeur Séquentiel", desc: "Permet de décrypter les codes et messages chiffrés en Base64." },
];

const insertSecret = db.prepare("INSERT INTO secrets (name, desc) VALUES (?, ?)");
const countSecrets = db.prepare("SELECT COUNT(*) as count FROM secrets").get();
if (countSecrets.count === 0) {
  for (const s of seedSecrets) insertSecret.run(s.name, s.desc);
}

const seedUsers = [
  { username: "batman",    password: "gotham123", role: "ADMIN" },
  { username: "robin",     password: "gotham123", role: "ADMIN" },
  { username: "alfred",    password: "gotham123", role: "ADMIN" },
  { username: "joker",     password: "gotham123", role: "USER" },
  { username: "bane",      password: "gotham123", role: "USER" },
  { username: "penguin",   password: "gotham123", role: "USER" },
];

const insertUser = db.prepare("INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)");
for (const u of seedUsers) {
  const hash = bcrypt.hashSync(u.password, 10);
  insertUser.run(u.username, hash, u.role);
}

const seedReports = [
  { username: "batman", content: "Mission Joker — Secteur Narrows. Interpellé le Joker au sommet de la Gotham First National Bank après une poursuite de 40 minutes. Neutralisé sans victime civile. Transfert à Arkham effectué." },
  { username: "batman", content: "Opération Bane — Port de Gotham. Bane tenait un convoi d'armes chimiques. Combat rapproché, côtes fêlées. Convoi saisi, Bane en fuite vers les égouts sud." },
  { username: "robin", content: "Patrouille East End. Démantèlement d'un réseau de trafic de faux Batarangs. 3 suspects arrêtés, transmis au GCPD. Batman m'a félicité, c'est rare." },
  { username: "robin", content: "Mission Penguin — Iceberg Lounge. Infiltration réussie en tant que serveur. Récupération de documents compromettants sur la corruption au conseil municipal. Exfiltration sans encombre." },
  { username: "alfred", content: "Maintenance Batmobile — remplacement turbine gauche après impact RPG lors de la mission du 14. Révision complète du système de blindage. Durée : 6 heures." },
  { username: "joker", content: "Plan A : faire sauter le pont. Raté, Batman encore. Plan B : empoisonner le réseau d'eau. Raté, Batman encore. Plan C : en cours d'élaboration. Ha ha ha." },
  { username: "bane", content: "Tentative de prise de contrôle de la Bat-Cave échouée. La sécurité a été renforcée depuis la dernière fois. Il me faut plus d'hommes et un autre accès." },
];

const insertReport = db.prepare("INSERT INTO reports (user_id, content) VALUES (?, ?)");
const countReports = db.prepare("SELECT COUNT(*) as count FROM reports").get();
if (countReports.count === 0) {
  for (const r of seedReports) {
    const user = db.prepare("SELECT id FROM users WHERE username = ?").get(r.username);
    if (user) insertReport.run(user.id, r.content);
  }
}

module.exports = db;
