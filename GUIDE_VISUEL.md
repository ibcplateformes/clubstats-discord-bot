# 🎯 GUIDE VISUEL - INTÉGRATION DISCORD COMPLÈTE

## 📊 Vue d'ensemble du système

```
┌─────────────────────────────────────────────────────────────────┐
│                     🌐 ClubStats Pro Web App                     │
│                  https://clubstats-pro.onrender.com             │
│                                                                  │
│  ┌────────────┐      ┌──────────────┐      ┌────────────────┐ │
│  │   Admin    │ ───> │   Session    │ ───> │  Vote Session  │ │
│  │  Crée      │      │   de Vote    │      │    Active      │ │
│  └────────────┘      └──────────────┘      └────────────────┘ │
│                                                    │             │
└────────────────────────────────────────────────────┼─────────────┘
                                                     │
                    ┌────────────────────────────────┘
                    ▼
         ┌──────────────────────────┐
         │    📡 API Endpoint       │
         │  /api/discord/sessions   │
         │  /api/discord/sync-vote  │
         └──────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     🤖 Discord Bot (Render)                      │
│                                                                  │
│  1️⃣  Récupère sessions actives                                  │
│  2️⃣  Envoie rappels 10h/14h/18h                                 │
│  3️⃣  Détecte réactions emoji                                    │
│  4️⃣  Synchronise votes en temps réel                            │
│                                                                  │
│  ┌────────────────────────────────┐                             │
│  │  messageReactionAdd Event      │                             │
│  │  User: _ibc → ✅               │                             │
│  │  SessionId: cmh58d234...       │                             │
│  └────────────────────────────────┘                             │
│                │                                                 │
│                ▼                                                 │
│  ┌────────────────────────────────┐                             │
│  │  syncVoteToAPI()               │                             │
│  │  POST /api/discord/sync-vote   │                             │
│  └────────────────────────────────┘                             │
└──────────────────────────────────────┼──────────────────────────┘
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │   💾 PostgreSQL DB     │
                         │   • Votes table        │
                         │   • Players mapping    │
                         └────────────────────────┘
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │   ✅ Vote enregistré   │
                         │   Affiché sur le site  │
                         └────────────────────────┘
```

---

## 🔄 Flux détaillé de synchronisation

```
ÉTAPE 1: Admin crée une session
┌──────────────────────────────────┐
│  Site Web → Base de données      │
│  Session créée: "Match samedi"   │
│  Date: 26/10/2025 15:00          │
│  Status: Active ✅                │
└──────────────────────────────────┘
                ↓
ÉTAPE 2: Bot récupère les sessions
┌──────────────────────────────────┐
│  GET /api/discord/sessions       │
│  Headers: x-api-key: 27795d...   │
│  Response: [                      │
│    {                              │
│      id: "cmh58d234...",          │
│      title: "Match samedi",      │
│      date: "2025-10-26T15:00"    │
│    }                              │
│  ]                                │
└──────────────────────────────────┘
                ↓
ÉTAPE 3: Bot envoie le rappel Discord
┌──────────────────────────────────┐
│  💬 Canal Discord                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  🔔 RAPPEL                        │
│  🗳️ Match samedi                 │
│  📅 26 oct. 2025, 15:00          │
│  📊 Participation: 60% (6/10)    │
│                                   │
│  Votez avec les réactions:       │
│  ✅ Présent                       │
│  ❌ Absent                        │
│  🟡 En retard                     │
└──────────────────────────────────┘
                ↓
ÉTAPE 4: Joueur réagit
┌──────────────────────────────────┐
│  👤 _ibc clique sur ✅            │
│  Event: messageReactionAdd       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  reaction.emoji.name = "✅"       │
│  user.id = "692651621812797470"  │
│  user.username = "_ibc"          │
│  sessionId = "cmh58d234..."      │
└──────────────────────────────────┘
                ↓
ÉTAPE 5: Bot détecte la réaction
┌──────────────────────────────────┐
│  👍 Réaction détectée             │
│  _ibc → present                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  response = "present"             │
│  (✅ → present)                   │
│  (❌ → absent)                    │
│  (🟡 → late)                      │
└──────────────────────────────────┘
                ↓
ÉTAPE 6: Bot appelle l'API
┌──────────────────────────────────┐
│  POST /api/discord/sync-vote     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  Headers:                         │
│    x-api-key: 27795d09...        │
│  Body:                            │
│  {                                │
│    "sessionId": "cmh58d234...",  │
│    "discordId": "69265162...",   │
│    "discordUsername": "_ibc",    │
│    "response": "present"         │
│  }                                │
└──────────────────────────────────┘
                ↓
ÉTAPE 7: API traite le vote
┌──────────────────────────────────┐
│  🔍 Recherche mapping             │
│  discordId: 692651621...         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ✅ Mapping trouvé!               │
│  Discord: _ibc                   │
│  Joueur: Iniesta667ekip          │
└──────────────────────────────────┘
                ↓
┌──────────────────────────────────┐
│  💾 Enregistrement en BDD         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  UPDATE votes SET                │
│    response = 'present',         │
│    playerName = 'Iniesta667ekip',│
│    updatedAt = NOW()             │
│  WHERE sessionId = 'cmh58d234'   │
│    AND playerName = 'Iniesta...' │
└──────────────────────────────────┘
                ↓
ÉTAPE 8: API répond
┌──────────────────────────────────┐
│  ✅ Succès                        │
│  {                                │
│    "success": true,              │
│    "message": "Vote updated",    │
│    "vote": {                     │
│      "id": "cmh58e7q4...",       │
│      "playerName": "Iniesta...", │
│      "response": "present"       │
│    },                             │
│    "action": "updated",          │
│    "mapped": true                │
│  }                                │
└──────────────────────────────────┘
                ↓
ÉTAPE 9: Bot envoie confirmation
┌──────────────────────────────────┐
│  💬 Message Privé à _ibc         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ✅ Votre vote a été enregistré  │
│  Réponse: Présent                │
│  Session: Match samedi           │
└──────────────────────────────────┘
                ↓
ÉTAPE 10: Affichage sur le site
┌──────────────────────────────────┐
│  🌐 ClubStats Pro                 │
│  Page: /vote/cmh58d234...        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  ✅ Présents (7):                 │
│     • Iniesta667ekip ⭐           │
│     • Joueur2                    │
│     • ...                         │
│                                   │
│  📊 Participation: 70% (7/10)    │
└──────────────────────────────────┘
```

---

## 📁 Structure des fichiers

```
clubstats-discord-bot/
│
├── 🤖 BOTS
│   ├── discord-bot-complete.js       ⭐ Bot principal (RECOMMANDÉ)
│   ├── discord-bot-auto.js           📅 Rappels automatiques uniquement
│   └── discord-bot-polls.js          🗳️ Sondages Discord natifs
│
├── 📋 CONFIGURATION
│   ├── .env                          🔐 Configuration (À CRÉER)
│   ├── .env.complete.example         📝 Template de configuration
│   ├── package.json                  📦 Dépendances
│   └── prisma/                       🗄️ Schéma base de données
│
├── 🧪 TESTS
│   ├── test-sync.sh                  ✅ Test connexion API
│   └── start.sh                      🚀 Démarrage guidé
│
└── 📚 DOCUMENTATION
    ├── README.md                     📖 Guide principal
    ├── GUIDE_COMPLET_SYNCHRONISATION.md  📘 Guide détaillé
    ├── RECAPITULATIF_INTEGRATION.md  📋 Récapitulatif complet
    ├── COMMANDES_RAPIDES.md          ⚡ Commandes utiles
    └── GUIDE_VISUEL.md               🎯 Ce fichier
```

---

## 🎮 Commandes Discord - Aide visuelle

```
┌─────────────────────────────────────────────────────────────┐
│                    💬 Dans Discord                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Vous tapez:                                                │
│  !aide                                                      │
│                                                              │
│  Bot répond:                                                │
│  ┌───────────────────────────────────────────────┐        │
│  │ 🤖 Aide du Bot de Vote                        │        │
│  │                                                │        │
│  │ Commandes:                                     │        │
│  │ • !rappel   → Envoie un rappel manuel         │        │
│  │ • !sessions → Liste les sessions actives      │        │
│  │ • !aide     → Affiche cette aide              │        │
│  │                                                │        │
│  │ 🗳️ Voter:                                      │        │
│  │ Réagissez avec ✅ ❌ 🟡                        │        │
│  │                                                │        │
│  │ ⏰ Rappels automatiques: 10h, 14h, 18h        │        │
│  └───────────────────────────────────────────────┘        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Vous tapez:                                                │
│  !sessions                                                  │
│                                                              │
│  Bot répond:                                                │
│  ┌───────────────────────────────────────────────┐        │
│  │ 📋 Sessions de vote actives                   │        │
│  │                                                │        │
│  │ 1. Match samedi                               │        │
│  │    📅 26 oct. 2025, 15:00                     │        │
│  │    📊 Participation: 70% (7/10)               │        │
│  │    ❌ Manquants: 3                            │        │
│  │                                                │        │
│  │ 2. Entraînement mardi                         │        │
│  │    📅 29 oct. 2025, 19:00                     │        │
│  │    📊 Participation: 50% (5/10)               │        │
│  │    ❌ Manquants: 5                            │        │
│  └───────────────────────────────────────────────┘        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Vous tapez:                                                │
│  !rappel                                                    │
│                                                              │
│  Bot répond:                                                │
│  ┌───────────────────────────────────────────────┐        │
│  │ 🔔 RAPPEL MANUEL                              │        │
│  │                                                │        │
│  │ 🗳️ Match samedi                               │        │
│  │ 📅 26 octobre 2025, 15:00                     │        │
│  │                                                │        │
│  │ 📊 Participation: 70% (7/10)                  │        │
│  │ ✅ 7 ont voté • ❌ 3 manquants                │        │
│  │                                                │        │
│  │ 🔗 Lien: https://clubstats-pro.../vote/...   │        │
│  │                                                │        │
│  │ ⏰ Votez en réagissant ci-dessous !           │        │
│  │ ✅ Présent                                    │        │
│  │ ❌ Absent                                     │        │
│  │ 🟡 En retard                                  │        │
│  └───────────────────────────────────────────────┘        │
│  [Réactions: ✅ ❌ 🟡]                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Variables d'environnement - Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────┐
│                         .env                                  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  🤖 DISCORD                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  DISCORD_BOT_TOKEN=MTE1NDg...                                │
│    ↳ Token du bot (https://discord.com/developers)          │
│                                                               │
│  DISCORD_CHANNEL_ID=123456789012345678                       │
│    ↳ ID du canal pour les rappels                           │
│    ↳ Comment l'obtenir:                                      │
│       1. Activer Mode Développeur dans Discord               │
│       2. Clic droit sur le canal → Copier l'identifiant     │
│                                                               │
│  📡 API                                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  API_URL=https://clubstats-pro.onrender.com                 │
│    ↳ URL de votre API ClubStats                             │
│                                                               │
│  DISCORD_API_KEY=27795d09e04cd6576d8eb58b42825e94...        │
│    ↳ Clé API pour authentifier les requêtes                 │
│    ↳ ⚠️ DOIT être identique sur le site et le bot           │
│    ↳ Générer avec: openssl rand -hex 32                     │
│                                                               │
│  🌐 APPLICATION                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  NEXT_PUBLIC_BASE_URL=https://clubstats-pro.onrender.com    │
│    ↳ URL publique du site (pour les liens de vote)          │
│                                                               │
│  PORT=3000                                                   │
│    ↳ 3000 pour local, 10000 pour Render                     │
│                                                               │
│  💾 BASE DE DONNÉES                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│  DATABASE_URL="postgresql://user:pass@host:5432/db"         │
│    ↳ Connection string PostgreSQL                           │
│    ↳ Copier depuis /clubstats-pro/.env                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘

⚠️ IMPORTANT: DISCORD_API_KEY doit être identique dans:
   • /clubstats-pro/.env (site web)
   • /clubstats-discord-bot/.env (bot Discord)
```

---

## 🗺️ Mapping Discord ↔ Joueurs

```
┌─────────────────────────────────────────────────────────────┐
│             MAPPING DISCORD → JOUEURS SITE                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  OPTION 1: Mapping automatique (par username)               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│  Discord Username: "Iniesta667"                             │
│           ↓ (recherche automatique)                         │
│  Joueur Site: "Iniesta667" ✅                               │
│                                                              │
│  Vote enregistré au nom de: "Iniesta667"                   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  OPTION 2: Mapping manuel (par ID)                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                              │
│  Discord ID: "692651621812797470"                           │
│  Discord Username: "_ibc"                                   │
│           ↓ (table: discord_player_mappings)                │
│  Player ID: "clh58d2340..."                                 │
│  Player Name: "Iniesta667ekip" ✅                           │
│                                                              │
│  Vote enregistré au nom de: "Iniesta667ekip"               │
│                                                              │
│  Comment créer un mapping:                                  │
│  ```sql                                                      │
│  INSERT INTO discord_player_mappings                        │
│  (discord_id, discord_username, player_id)                  │
│  VALUES                                                      │
│  ('692651621812797470', '_ibc', 'clh58d2340...');          │
│  ```                                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

💡 Avantages du mapping manuel:
   ✅ Précision: Lien direct Discord ID ↔ Player ID
   ✅ Flexibilité: Username Discord ≠ nom sur le site
   ✅ Traçabilité: Historique des votes
```

---

## 📊 Dashboard de monitoring (conceptuel)

```
┌──────────────────────────────────────────────────────────────┐
│              📊 STATISTIQUES BOT DISCORD                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  🤖 Status Bot                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  • État: 🟢 En ligne                                         │
│  • Uptime: 24h 15m 32s                                       │
│  • Latency: 42ms                                             │
│  • Connecté en tant que: Kay Voter#1234                      │
│                                                               │
│  📈 Statistiques aujourd'hui (25 oct 2025)                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  • Rappels envoyés: 3 (10h, 14h, 18h)                       │
│  • Votes synchronisés: 47                                    │
│  • Réactions détectées: 52                                   │
│  • Erreurs: 0                                                │
│                                                               │
│  🗳️ Répartition des votes                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ✅ Présent:   28 (59%)  ████████████████████░░░░░         │
│  ❌ Absent:    15 (32%)  ██████████░░░░░░░░░░░░░░░         │
│  🟡 En retard:  4 (9%)   ███░░░░░░░░░░░░░░░░░░░░░░         │
│                                                               │
│  👥 Top voteurs                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  1. Iniesta667ekip     12 votes                              │
│  2. Tlagss78           10 votes                              │
│  3. abdoufapes          8 votes                              │
│                                                               │
│  ⏰ Prochains rappels                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  • 26 oct, 10:00 (dans 9h 45m)                              │
│  • 26 oct, 14:00 (dans 13h 45m)                             │
│  • 26 oct, 18:00 (dans 17h 45m)                             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de déploiement

```
AVANT LE DÉMARRAGE
═══════════════════════════════════════════════════════════════

Site Web
  ☐ Site déployé sur Render
  ☐ API /api/discord/sync-vote testée
  ☐ API /api/discord/sessions testée
  ☐ DISCORD_API_KEY définie dans .env

Bot Discord
  ☐ Token Discord créé
  ☐ Permissions configurées (MESSAGE CONTENT INTENT)
  ☐ Bot invité sur le serveur Discord
  ☐ ID du canal récupéré

Configuration Bot
  ☐ Fichier .env créé
  ☐ DISCORD_BOT_TOKEN rempli
  ☐ DISCORD_CHANNEL_ID rempli
  ☐ DISCORD_API_KEY rempli (identique au site)
  ☐ API_URL rempli
  ☐ DATABASE_URL rempli
  ☐ npm install exécuté

Tests
  ☐ ./test-sync.sh exécuté avec succès
  ☐ Bot démarre sans erreur
  ☐ Commande !aide fonctionne
  ☐ Commande !sessions fonctionne
  ☐ Commande !rappel fonctionne
  ☐ Réactions détectées
  ☐ Votes synchronisés
  ☐ Votes affichés sur le site

DÉPLOIEMENT PRODUCTION
═══════════════════════════════════════════════════════════════

Render
  ☐ Service créé sur Render
  ☐ Variables d'environnement ajoutées
  ☐ Bot déployé
  ☐ Bot en ligne 24/7
  ☐ Logs accessibles

Monitoring
  ☐ Vérifier les logs quotidiennement
  ☐ Surveiller les erreurs
  ☐ Vérifier les rappels automatiques
  ☐ Tester la synchronisation régulièrement

Documentation
  ☐ Équipe informée du fonctionnement
  ☐ Commandes Discord documentées
  ☐ Procédure de dépannage disponible
```

---

## 🎉 FÉLICITATIONS !

Si vous avez suivi ce guide, vous avez maintenant :

✅ Un bot Discord opérationnel
✅ Une synchronisation automatique des votes
✅ Des rappels automatiques 3x par jour
✅ Un système de mapping Discord ↔ Joueurs
✅ Une documentation complète

**Le système est prêt pour la production !** 🚀

---

📞 Support: Consultez les autres fichiers de documentation
📚 Guides: README.md, GUIDE_COMPLET_SYNCHRONISATION.md
⚡ Commandes: COMMANDES_RAPIDES.md
