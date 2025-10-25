# ⚡ COMMANDES RAPIDES - BOT DISCORD

## 🚀 Installation & Démarrage

```bash
# Navigation vers le dossier du bot
cd /Users/ibc/clubstats-pro/clubstats-pro/clubstats-discord-bot

# Installation des dépendances
npm install

# Créer le fichier .env
cp .env.complete.example .env
nano .env

# Tester la connexion API
chmod +x test-sync.sh
./test-sync.sh

# Démarrer le bot (guidé)
chmod +x start.sh
./start.sh

# Démarrer le bot (direct)
npm start
```

---

## 🧪 Tests

```bash
# Test complet de synchronisation
./test-sync.sh

# Test manuel de l'API (remplacez SESSION_ID)
curl -X POST https://clubstats-pro.onrender.com/api/discord/sync-vote \
  -H "Content-Type: application/json" \
  -H "x-api-key: 27795d09e04cd6576d8eb58b42825e94739a90deece6603b52fa491e2cbedf68" \
  -d '{
    "sessionId": "SESSION_ID_ICI",
    "discordId": "123456789",
    "discordUsername": "TestUser",
    "response": "present"
  }'

# Récupérer les sessions actives
curl https://clubstats-pro.onrender.com/api/discord/sessions \
  -H "x-api-key: 27795d09e04cd6576d8eb58b42825e94739a90deece6603b52fa491e2cbedf68"
```

---

## 📊 Logs

```bash
# Voir les logs en temps réel
tail -f bot.log

# Logs des 50 dernières lignes
tail -50 bot.log

# Rechercher les synchronisations
grep "Vote synchronisé" bot.log

# Rechercher les erreurs
grep "❌" bot.log

# Rechercher les réactions
grep "Réaction détectée" bot.log

# Nettoyer les logs
> bot.log
```

---

## 💬 Commandes Discord

### Dans le canal Discord

```
!aide          # Affiche l'aide complète
!sessions      # Liste toutes les sessions actives
!rappel        # Envoie un rappel manuel avec votes
```

### Voter

Réagissez aux messages du bot avec :
- ✅ Présent
- ❌ Absent
- 🟡 En retard

---

## 🗄️ Base de données

```bash
# Se connecter à la base de données
psql $DATABASE_URL

# Voir les mappings Discord
SELECT * FROM discord_player_mappings;

# Ajouter un mapping
INSERT INTO discord_player_mappings (discord_id, discord_username, player_id)
VALUES ('DISCORD_ID', 'USERNAME', 'PLAYER_ID');

# Voir les votes d'une session
SELECT * FROM votes WHERE session_id = 'SESSION_ID';

# Voir les joueurs
SELECT id, name FROM players;

# Quitter
\q
```

---

## 🔧 Dépannage rapide

```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install

# Vérifier les variables d'environnement
cat .env
env | grep DISCORD

# Vérifier la connexion API
curl https://clubstats-pro.onrender.com/health

# Redémarrer le bot
pkill -f "node discord-bot"
npm start

# Vérifier les processus Node
ps aux | grep node
```

---

## 🚀 Déploiement

```bash
# Préparer pour le déploiement
cd /Users/ibc/clubstats-pro/clubstats-pro
git add clubstats-discord-bot/*
git commit -m "feat: Discord bot with API sync"
git push origin main

# Configuration Render (dans le dashboard)
# Build Command: npm install
# Start Command: npm start
# Variables: Copier depuis .env
```

---

## 📝 Vérifications avant production

```bash
# 1. Tester l'API
./test-sync.sh

# 2. Vérifier la clé API (doit être identique)
echo "Bot:"
grep DISCORD_API_KEY .env

echo "Site:"
grep DISCORD_API_KEY ../clubstats-pro/.env

# 3. Vérifier les permissions du bot
# → Allez sur https://discord.com/developers/applications
# → Bot → Privileged Gateway Intents
# → Activez: MESSAGE CONTENT, SERVER MEMBERS, PRESENCE

# 4. Tester les commandes Discord
# → !aide
# → !sessions
# → !rappel

# 5. Tester les réactions
# → Réagir avec ✅/❌/🟡 sur un message
# → Vérifier les logs: grep "Vote synchronisé" bot.log
# → Vérifier sur le site web
```

---

## 🆘 Commandes d'urgence

```bash
# Arrêter le bot immédiatement
pkill -9 -f "node discord-bot"

# Voir les erreurs récentes
tail -100 bot.log | grep "❌"

# Redémarrer proprement
pkill -f "node discord-bot"
sleep 2
npm start &

# Vérifier l'état
ps aux | grep "discord-bot"
```

---

## 📱 One-liners utiles

```bash
# Tout en une fois: install + config + test + start
cd clubstats-discord-bot && npm install && cp .env.complete.example .env && nano .env && ./test-sync.sh && npm start

# Redémarrage rapide
pkill -f discord-bot && sleep 1 && npm start &

# Logs + stats en direct
watch -n 5 'tail -20 bot.log && echo "---" && ps aux | grep discord-bot'

# Compter les votes synchronisés aujourd'hui
grep "Vote synchronisé" bot.log | grep "$(date +%Y-%m-%d)" | wc -l

# Voir les derniers utilisateurs ayant voté
grep "Réaction détectée" bot.log | tail -10
```

---

## 🔑 Variables essentielles

```bash
# À définir dans .env
DISCORD_BOT_TOKEN=         # Token du bot Discord
DISCORD_CHANNEL_ID=        # ID du canal pour les rappels
DISCORD_API_KEY=           # Clé API (identique au site)
API_URL=                   # https://clubstats-pro.onrender.com
NEXT_PUBLIC_BASE_URL=      # URL publique du site
DATABASE_URL=              # Connection string PostgreSQL
PORT=                      # 3000 (local) ou 10000 (Render)
```

---

## 📊 Monitoring

```bash
# Status du bot en JSON
curl http://localhost:3000

# Voir le uptime
curl http://localhost:3000 | jq '.uptime'

# Statistiques des votes (à créer)
echo "Votes synchronisés aujourd'hui:"
grep "Vote synchronisé" bot.log | grep "$(date +%Y-%m-%d)" | wc -l

echo "Derniers votes:"
grep "Vote synchronisé" bot.log | tail -5
```

---

## 🎯 Raccourcis

```bash
# Alias utiles (ajoutez dans ~/.bashrc ou ~/.zshrc)
alias bot-cd='cd /Users/ibc/clubstats-pro/clubstats-pro/clubstats-discord-bot'
alias bot-start='cd /Users/ibc/clubstats-pro/clubstats-pro/clubstats-discord-bot && npm start'
alias bot-logs='tail -f /Users/ibc/clubstats-pro/clubstats-pro/clubstats-discord-bot/bot.log'
alias bot-test='cd /Users/ibc/clubstats-pro/clubstats-pro/clubstats-discord-bot && ./test-sync.sh'
alias bot-restart='pkill -f discord-bot && sleep 1 && cd /Users/ibc/clubstats-pro/clubstats-pro/clubstats-discord-bot && npm start &'
```

---

**⚡ Gardez ce fichier sous la main pour une référence rapide !**
