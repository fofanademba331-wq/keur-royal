"use strict";
// Remplacez les deux valeurs ci-dessous par celles de votre projet Supabase :
//  - SUPABASE_URL : l'adresse du projet (https://xxxx.supabase.co)
//  - SUPABASE_ANON_KEY : la clé PUBLISHABLE (commence par sb_publishable_) ou, à défaut, la clé "anon".
// Ces clés sont publiques par conception : la sécurité vient des règles RLS de database.sql.
// N'utilisez JAMAIS une clé "secret" ou "service_role" dans ce fichier.
const SUPABASE_URL = "https://VOTRE-PROJET.supabase.co";
const SUPABASE_ANON_KEY = "VOTRE_CLE_ANON";

const sb = window.supabase && !SUPABASE_URL.includes("VOTRE")
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const EXEMPLES = [
  { titre: "Villa moderne avec jardin", ville: "Keur Massar", type: "Villa", prix: 65000000, surface: 300, chambres: 4 },
  { titre: "Appartement lumineux", ville: "Dakar", type: "Appartement", prix: 38000000, surface: 95, chambres: 3 },
  { titre: "Terrain viabilisé", ville: "Keur Massar", type: "Terrain", prix: 12000000, surface: 200, chambres: null }
];
const fcfa = n => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

// Création d'éléments avec textContent : jamais de innerHTML avec des données (protection XSS).
function el(tag, classe, texte) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texte !== undefined && texte !== null) e.textContent = texte;
  return e;
}
function carte(b) {
  const c = el("article", "carte");
  const corps = el("div", "carte-corps");
  const details = [b.surface ? b.surface + " m²" : "", b.chambres ? b.chambres + " chambres" : ""].filter(Boolean).join(", ");
  corps.append(el("h3", "", b.titre), el("p", "gris", b.ville + (details ? " – " + details : "")), el("p", "prix", fcfa(b.prix)));
  const lien = el("a", "btn3d petit", "Me renseigner");
  lien.href = "inscription.html";
  corps.append(lien);
  c.append(el("div", "carte-img", b.type), corps);
  return c;
}
async function chargerBiens() {
  const zone = document.getElementById("liste-biens");
  if (!zone) return;
  let biens = EXEMPLES;
  if (sb) {
    const { data, error } = await sb.from("biens").select("titre,ville,type,prix,surface,chambres")
      .order("created_at", { ascending: false }).limit(12);
    if (!error && data && data.length) biens = data;
  }
  zone.replaceChildren(...biens.map(carte));
}

function afficher(zone, texte, ok) { zone.textContent = texte; zone.className = "msg " + (ok ? "ok" : "err"); }

const fi = document.getElementById("form-inscription");
if (fi) fi.addEventListener("submit", async e => {
  e.preventDefault();
  const f = fi.elements, msg = document.getElementById("msg");
  if (f.site.value) return; // piège à robots
  const nom = f.nom.value.trim(), tel = f.telephone.value.trim(), email = f.email.value.trim().toLowerCase(), mdp = f.mdp.value;
  if (nom.length < 2) return afficher(msg, "Entrez votre nom complet.", false);
  if (!/^[+0-9 ]{8,20}$/.test(tel)) return afficher(msg, "Entrez un numéro de téléphone valide.", false);
  if (mdp.length < 8 || !/[0-9]/.test(mdp) || !/[A-Za-z]/.test(mdp)) return afficher(msg, "Le mot de passe doit avoir 8 caractères minimum, avec des lettres et des chiffres.", false);
  if (mdp !== f.mdp2.value) return afficher(msg, "Les deux mots de passe sont différents.", false);
  if (!sb) return afficher(msg, "Configurez d'abord Supabase dans app.js.", false);
  const bouton = fi.querySelector("button"); bouton.disabled = true;
  const { error } = await sb.auth.signUp({ email, password: mdp, options: { data: { nom, telephone: tel } } });
  bouton.disabled = false;
  afficher(msg, error ? "Inscription impossible. Vérifiez vos informations." : "Compte créé. Ouvrez l'e-mail reçu pour confirmer votre adresse.", !error);
  if (!error) setTimeout(() => { location.href = "connexion.html"; }, 4000);
});

const fc = document.getElementById("form-connexion");
if (fc) fc.addEventListener("submit", async e => {
  e.preventDefault();
  const msg = document.getElementById("msg2");
  if (!sb) return afficher(msg, "Configurez d'abord Supabase dans app.js.", false);
  const { error } = await sb.auth.signInWithPassword({ email: fc.elements.email.value.trim().toLowerCase(), password: fc.elements.mdp.value });
  if (error) return afficher(msg, "E-mail ou mot de passe incorrect.", false);
  try {
    if (fc.elements.souvenir.checked) localStorage.setItem("kr_email", fc.elements.email.value.trim().toLowerCase());
    else localStorage.removeItem("kr_email");
  } catch (_) {}
  const { data } = await sb.from("profils").select("nom").maybeSingle();
  afficher(msg, "Bienvenue" + (data && data.nom ? ", " + data.nom : "") + ".", true);
});

// Remplit l'e-mail mémorisé (jamais le mot de passe) sur la page de connexion.
if (fc) {
  try {
    const memo = localStorage.getItem("kr_email");
    if (memo) { fc.elements.email.value = memo; fc.elements.souvenir.checked = true; }
  } catch (_) {}
}

// Oeil : afficher / masquer le mot de passe.
document.querySelectorAll(".oeil").forEach(b => b.addEventListener("click", () => {
  const champ = document.getElementById(b.dataset.cible);
  const visible = champ.type === "password";
  champ.type = visible ? "text" : "password";
  b.classList.toggle("barre", visible);
  b.setAttribute("aria-label", visible ? "Masquer le mot de passe" : "Afficher le mot de passe");
}));

chargerBiens();
