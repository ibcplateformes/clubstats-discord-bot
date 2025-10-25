# 🚀 GUIDE COMPLET - BOT DISCORD AVEC SYNCHRONISATION API

## ✨ Nouvelles fonctionnalités

Le bot peut maintenant :
- ✅ **Synchroniser automatiquement les votes** depuis Discord vers votre site web
- 🎯 **Voter directement sur Discord** avec des réactions emoji
- 📊 **Afficher les votes en temps réel** dans les embeds Discord
- 🔄 **Mettre à jour les votes** automatiquement quand un utilisateur change sa réaction
- 💬 **Envoyer des confirmations** en message privé

---

## 📋 PRÉREQUIS

### 1️⃣ Vérifier que l'API est déployée

Votre API doit être accessible à cette URL :
```
https://clubstats-pro.onrender.com/api/discord/sync-vote
```

Testez avec :
```bash
curl -X POST https://clubstats-pro.onrender.com/api/discord/sync-vote \
  -H "Content-Type: application/json" \
  -H "x-api-key: 27795d09e04cd6576d8eb58b42825e94739a90deece6603b52fa491e2cbedf68" \
  -d '{
    "sessionId": "VOTRE_SESSION_ID",
    "discordId": "123456789",
    "discordUsername": "TestUser",
    "response": "present"
  }'
```

✅ Si vous recevez `{"success":true}`, l'API fonctionne !

### 2️⃣ Vérifier la clé API

Dans votre fichier `.env` principal (`/clubstats-pro/.env`), vérifiez que vous avez :
```bash
DISCORD_API_KEY=27795d09e04cd6576d8eb58b42825e94739a90deece6603b52fa491e2cbedf68
```

⚠️ **IMPORTANT** : Cette clé doit être **identique** dans les deux fichiers `.env` :
- `/clubstats-pro/.env` (site web)
- `/clubstats-pro/clubstats-discord-bot/.env` (bot Discord)

---

## 🛠️ INSTALLATION

### Étape 1 : Installer les dépendances

```bash
cd /Users/ibc/clubstats-pro/clubstats-pro/clubstats-discord-bot

npm install
```

### Étape 2 : Configurer le fichier .env

```bash
# Copier le fichier exemple
cp .env.complete.example .env

# Éditer le fichier
nano .env
```

Remplissez les valeurs suivantes :

```bash
# Token du bot Discord
DISCORD_BOT_TOKEN=VOTRE_TOKEN_DISCORD

# ID du canal pour les rappels
DISCORD_CHANNEL_ID=VOTRE_CHANNEL_ID

# URL de l'API
API_URL=https://clubstats-pro.onrender.com

# Clé API (DOIT être identique au site)
DISCORD_API_KEY=27795d09e04cd6576d8eb58b42825e94739a90deece6603b52fa491e2cbedf68

# URL publique du site
NEXT_PUBLIC_BASE_URL=https://clubstats-pro.onrender.com

# Port pour Render
PORT=3000

# Base de données (copiez depuis le .env principal)
DATABASE_URL="postgresql://..."
```

### Étape 3 : Tester localement

```bash
node discord-bot-complete.js
```

Vous devriez voir :
```
🌐 Serveur HTTP démarré sur le port 3000
🤖 Bot Discord prêt !
📝 Connecté en tant que Kay Voter#1234
🔧 Préfixe des commandes: !
📢 Canal de rappels: 123456789
🌐 API URL: https://clubstats-pro.onrender.com
✅ Le bot est opérationnel !
```

---

## 🎯 UTILISATION

### 1️⃣ Voter avec des réactions

Quand le bot envoie un rappel, les joueurs peuvent voter directement en ajoutant une réaction :

- ✅ **Présent**
- ❌ **Absent**
- 🟡 **En retard**

Le vote est **automatiquement synchronisé** avec le site web !

### 2️⃣ Commandes disponibles

#### `!rappel`
Envoie un rappel manuel avec les boutons de vote.

```
Utilisateur: !rappel
Bot: 🔄 Envoi d'un rappel manuel avec votes par réactions...
     [Affiche les sessions avec réactions]
```

#### `!sessions`
Affiche toutes les sessions actives.

```
Utilisateur: !sessions
Bot: [Liste des sessions avec statistiques]
```

#### `!aide`
Affiche l'aide complète.

---

## 🔄 FLUX DE SYNCHRONISATION

Voici comment fonctionne la synchronisation des votes :

1. 🤖 **Le bot envoie un rappel** sur Discord avec des emojis de réaction
2. 👤 **Un joueur réagit** avec ✅, ❌ ou 🟡
3. 📡 **Le bot détecte la réaction** via l'événement `messageReactionAdd`
4. 🔍 **Le bot récupère les infos** : Discord ID, username, type de vote
5. 🚀 **Le bot envoie à l'API** :
   ```javascript
   POST /api/discord/sync-vote
   {
     "sessionId": "cmh58d23400068086e3rkrgq1",
     "discordId": "692651621812797470",
     "discordUsername": "_ibc",
     "response": "present"
   }
   ```
6. 💾 **L'API enregistre le vote** dans la base de données
7. ✅ **Le site web affiche le vote** en temps réel
8. 💬 **Le bot envoie une confirmation** en MP au joueur

---

## 🗺️ MAPPING DISCORD ↔ JOUEURS

### Option A : Mapping automatique par username

Le bot utilise le **username Discord** pour trouver le joueur sur le site.

Si un joueur Discord s'appelle `"Iniesta667"` et qu'un joueur sur le site s'appelle `"Iniesta667"`, le vote sera automatiquement lié.

### Option B : Mapping manuel en base de données

Pour lier précisément un Discord ID à un joueur :

```sql
INSERT INTO discord_player_mappings (discord_id, discord_username, player_id)
VALUES 
  ('692651621812797470', '_ibc', 'ID_DU_JOUEUR_SUR_LE_SITE'),
  ('123456789', 'Tlagss78', 'ID_DU_JOUEUR_2');
```

⚠️ **Avec le mapping**, le vote sera enregistré au nom du joueur du site, pas au username Discord.

### Comment obtenir les Discord IDs ?

1. **Activer le mode développeur** dans Discord :
   - Paramètres → Avancé → Mode Développeur ✅

2. **Copier l'ID d'un utilisateur** :
   - Clic droit sur l'utilisateur → Copier l'identifiant

---

## 📊 LOGS ET DEBUGGING

### Voir les logs du bot

```bash
# Logs en temps réel
tail -f bot.log

# Logs des dernières réactions
grep "Réaction détectée" bot.log

# Logs des synchronisations
grep "Vote synchronisé" bot.log
```

### Exemple de logs

```
👍 Réaction détectée: _ibc → present
🔄 Synchronisation vote: _ibc → present (session: cmh58d23400068086e3rkrgq1)
✅ Vote synchronisé: _ibc → present (updated)
   ↳ Mappé vers: Iniesta667ekip
```

---

## 🚀 DÉPLOIEMENT SUR RENDER

### Étape 1 : Créer un nouveau service

1. Allez sur https://dashboard.render.com
2. Cliquez sur **New +** → **Web Service**
3. Connectez votre repository GitHub
4. Sélectionnez le dossier `clubstats-discord-bot`

### Étape 2 : Configuration

```
Name: clubstats-discord-bot
Environment: Node
Build Command: npm install
Start Command: node discord-bot-complete.js
```

### Étape 3 : Variables d'environnement

Ajoutez toutes les variables du fichier `.env` :

```
DISCORD_BOT_TOKEN=...
DISCORD_CHANNEL_ID=...
API_URL=https://clubstats-pro.onrender.com
DISCORD_API_KEY=27795d09e04cd6576d8eb58b42825e94739a90deece6603b52fa491e2cbedf68
NEXT_PUBLIC_BASE_URL=https://clubstats-pro.onrender.com
PORT=10000
DATABASE_URL=postgresql://...
```

### Étape 4 : Déployer

Cliquez sur **Create Web Service**

Le bot sera déployé et restera actif 24/7 ! 🎉

---

## 🔧 TROUBLESHOOTING

### Le bot ne répond pas aux réactions

**Vérifiez les permissions du bot :**
1. Allez sur le Discord Developer Portal
2. Sélectionnez votre application
3. Bot → Privileged Gateway Intents :
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT
   - ✅ PRESENCE INTENT

**Réinvitez le bot** avec les bonnes permissions :
```
https://discord.com/api/oauth2/authorize?client_id=VOTRE_CLIENT_ID&permissions=274878286912&scope=bot
```

### Les votes ne se synchronisent pas

**Vérifiez la clé API :**
```bash
# Sur le site
grep DISCORD_API_KEY /Users/ibc/clubstats-pro/clubstats-pro/.env

# Sur le bot
grep DISCORD_API_KEY /Users/ibc/clubstats-pro/clubstats-pro/clubstats-discord-bot/.env
```

Les deux doivent être **identiques** !

**Testez l'API manuellement :**
```bash
curl -X POST https://clubstats-pro.onrender.com/api/discord/sync-vote \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOTRE_CLE" \
  -d '{"sessionId":"TEST","discordId":"123","discordUsername":"test","response":"present"}'
```

### Le bot crash au démarrage

**Vérifiez que toutes les variables sont définies :**
```bash
node discord-bot-complete.js 2>&1 | grep "❌"
```

**Vérifiez la connexion à la base de données :**
```bash
# Dans le dossier du bot
npx prisma db pull
```

---

## 📝 CHECKLIST FINALE

Avant de mettre en production, vérifiez :

- [ ] ✅ Le site web est déployé sur Render
- [ ] ✅ L'API `/api/discord/sync-vote` fonctionne
- [ ] ✅ La clé `DISCORD_API_KEY` est identique sur le site et le bot
- [ ] ✅ Le bot Discord a les bonnes permissions (MESSAGE CONTENT INTENT)
- [ ] ✅ Le token Discord est valide
- [ ] ✅ L'ID du canal Discord est correct
- [ ] ✅ La DATABASE_URL est correcte
- [ ] ✅ Les rappels automatiques sont programmés (10h, 14h, 18h)
- [ ] ✅ Le bot réagit aux commandes `!aide`, `!sessions`, `!rappel`
- [ ] ✅ Les réactions emoji synchronisent les votes

---

## 🎉 RÉSULTAT FINAL

Une fois tout configuré, voici le flux complet :

1. **Admin** crée une session sur le site web
2. **Bot** envoie automatiquement un rappel à 10h/14h/18h
3. **Joueurs** votent en cliquant sur ✅/❌/🟡
4. **Votes** sont synchronisés automatiquement avec le site
5. **Tout le monde** voit les résultats en temps réel
6. **Bot** met à jour l'embed Discord avec les statistiques

---

## 📚 RESSOURCES

- [Documentation Discord.js](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Render Dashboard](https://dashboard.render.com)
- [Prisma Documentation](https://www.prisma.io/docs)

---

**🚀 Vous êtes prêt à déployer !**

Si vous avez des questions, consultez les logs ou testez chaque étape individuellement.
