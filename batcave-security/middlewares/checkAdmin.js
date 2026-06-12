const checkAdmin = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Accès refusé : droits insuffisants." });
  }
  next();
};

module.exports = checkAdmin;
