# Be Code Platform

Ce dépôt contient une base de publication gratuite pour le projet Be Code, avec :
- API Node.js + Express
- Intégration OpenAI
- Frontend statique inspiré de la maquette
- Suivi des utilisateurs en stockage local JSON (prêt pour migration vers MongoDB si besoin)

## Installation

1. Crée un fichier `.env` à partir de `.env.example`
2. Ajoute ta clé OpenAI
3. Installe les dépendances :

```bash
npm install
```

4. Lance le serveur :

```bash
npm start
```

5. Ouvre :

```text
http://localhost:3000
```

## Variables d'environnement

```bash
PORT=3000
OPENAI_API_KEY=votre_cle_openai
```

## Déploiement

### Render / Railway
- branchez ce dépôt
- choisissez Node / web service
- configurez `PORT` et `OPENAI_API_KEY`
- démarre le service avec : `npm start`

### Vercel / Netlify
- déployez le frontend de `public/`
- configurez l'API vers un service backend dédié

## Remarques

- La clé OpenAI ne doit jamais être versionnée. Utilise toujours une variable d'environnement.
- Le stockage de données actuel est un fichier JSON pour un MVP rapide.
- La logique peut ensuite évoluer vers MongoDB Atlas, Supabase ou PostgreSQL.

## Créateur

Be Code — Monestime Arvens Warley
