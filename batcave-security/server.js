require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const authRouter = require("./routes/auth");
const apiRouter = require("./routes/batcomputer");
const viewsRouter = require("./routes/views");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.use(session({
  name: "bat_identity",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 1800000,
  },
}));

app.use("/auth", authRouter);
app.use("/api", apiRouter);
app.use(viewsRouter);

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public/404.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
