function logout() {
  // Envoie d'identifiants erronés pour écraser le cache du navigateur
  fetch("/bat-computer", {
    headers: { Authorization: "Basic logout:logout" },
  }).then(() => {
    window.location.href = "/";
  });
}
