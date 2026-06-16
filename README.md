# BigQuery Release Notes Dashboard

Une application web moderne, légère et réactive pour suivre, filtrer et partager les notes de version officielles de Google Cloud BigQuery.

Développée en **Python (Flask)** pour le backend, et en **Vanilla HTML5 / CSS3 / ES6+ JavaScript** pour le frontend, elle intègre un parseur XML intelligent et un gestionnaire de cache pour des performances optimales.

---

## 🚀 Fonctionnalités Clés

- **Parseur de Flux Granulaire** : Découpe les entrées journalières de Google Cloud en cartes individuelles et catégorisées par type de mise à jour (`Feature`, `Issue`, `Change`, `Breaking`, `Announcement`).
- **Filtrage & Recherche Temps Réel** : Recherche par mots-clés dans le texte avec surbrillance dynamique et filtres rapides par catégorie.
- **Partage Twitter (X) Intégré** :
  - Ouvre un éditeur de tweet personnalisé (modal native `<dialog>`).
  - Adapte automatiquement la description pour respecter la limite de 280 caractères, incluant le lien officiel de la mise à jour et des hashtags pertinents.
  - Indicateur de progression circulaire dynamique en temps réel.
  - Génère un lien de partage via *Twitter Web Intents* sécurisé.
- **Mise en cache intelligente** : Les requêtes XML sont mises en cache en mémoire pendant 1 heure pour un chargement instantané. Un bouton de rafraîchissement manuel permet de forcer la mise à jour du cache.
- **Design Premium** : Interface sombre moderne (Glassmorphism), animations de chargement fluides (CSS Shimmers) et design adaptatif pour mobile et ordinateur.

---

## 📂 Structure du Projet

```text
├── app.py                  # Serveur Flask, gestionnaire de cache et parseur XML
├── templates/
│   └── index.html          # Structure HTML5 sémantique et modales natives
├── static/
│   ├── css/
│   │   └── style.css       # Charte graphique sombre, variables HSL et animations
│   └── js/
│       └── main.js         # Logique client, filtres, recherche et éditeur de Tweet
├── .gitignore              # Règles d'exclusion Git standard pour Python/Flask/IDEs
└── README.md               # Documentation du projet
```

---

## 🛠️ Installation et Lancement

### Prérequis

Assurez-vous d'avoir Python 3 installé sur votre machine.

### 1. Installation des dépendances

Le projet utilise uniquement des bibliothèques Python standards et populaires :
```bash
pip install flask beautifulsoup4 lxml requests
```

### 2. Démarrage de l'application

Lancez le serveur Flask :
```bash
python3 app.py
```

L'application démarrera par défaut sur le port `5001`.

### 3. Accès dans le navigateur

Ouvrez votre navigateur et accédez à l'adresse suivante :
👉 **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 🏛️ Architecture & Flux des données

1. **Serveur (`app.py`)** : Récupère le flux RSS Atom de Google Cloud, utilise `BeautifulSoup` pour découper le bloc HTML journalier au niveau des balises de titre, et distribue le JSON nettoyé via l'API `/api/release-notes`.
2. **Client (`main.js`)** : Interroge l'API Flask, stocke l'état en mémoire locale, applique le moteur de recherche et gère les événements de la modale native.
3. **Partage (`Twitter Web Intent`)** : Utilise le partage officiel de Twitter `https://twitter.com/intent/tweet?text=...` pour envoyer le tweet rédigé sans nécessiter de clés d'API Twitter complexes ni d'authentification OAuth côté serveur.
