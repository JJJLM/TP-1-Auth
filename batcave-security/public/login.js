document.getElementById("login-form").onsubmit = async (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const credentials = btoa(`${username}:${password}`);

  const response = await fetch("/bat-computer", {
    headers: { Authorization: `Basic ${credentials}` },
  });

  const msg = document.getElementById("message");
  if (response.ok) {
    // Redirige vers la page protégée — le navigateur conserve l'en-tête Basic Auth
    window.location.href = "/bat-computer";
  } else {
    msg.className = "error";
    msg.innerText = "Identifiants invalides. Vérifie ton nom et mot de passe.";
  }
};
