# ⚡ DÉMARRAGE RAPIDE - 5 MINUTES

## 🎯 Ce que vous devez faire

### 1️⃣ Configurer (2 min)

```bash
cd /Users/ibc/clubstats-pro/clubstats-pro/clubstats-discord-bot

# Créer .env
cp .env.complete.example .env
nano .env
```

**Remplissez ces 4 lignes** :
```bash
DISCORD_BOT_TOKEN=VOTRE_TOKEN         # https://discord.com/developers
DISCORD_CHANNEL_ID=VOTRE_CHANNEL      # Clic droit > Copier ID
DISCORD_API_KEY=27795d09e04cd...      # Déjà dans votre .env principal
DATABASE_URL="postgresql://..."       # Copier depuis .env principal
```

### 2️⃣ Installer (1 min)

```bash
npm install
```

### 3️⃣ Tester (1 min)

```bash
chmod +x test-sync.sh
./test-sync.sh
```

✅ Si vous voyez "API accessible" → Continuez  
❌ Si erreur → Vérifiez DISCORD_API_KEY

### 4️⃣ Démarrer (1 min)

```bash
npm start
```

Vous devriez voir :
```
🤖 Bot Discord prêt !
📝 Connecté en tant que Kay Voter#1234
✅ Le bot est opérationnel !
```

---

## 🎮 Tester sur Discord

1. Dans votre canal Discord, tapez :
   ```
   !rappel
   ```

2. Le bot affiche un message avec ✅ ❌ 🟡

3. Cliquez sur ✅

4. Regardez les logs :
   ```
   👍 Réaction détectée: VOTRE_NOM → present
   ✅ Vote synchronisé: VOTRE_NOM → present
   ```

5. Allez sur votre site web → Le vote apparaît ! 🎉

---

## ❓ Ça ne marche pas ?

### Le bot ne démarre pas
```bash
# Vérifier .env
cat .env | grep DISCORD_BOT_TOKEN
# Si vide → Ajoutez votre token

# Réinstaller
rm -rf node_modules
npm install
```

### Les votes ne se synchronisent pas
```bash
# Vérifier la clé API (DOIT être identique)
grep DISCORD_API_KEY .env
grep DISCORD_API_KEY ../clubstats-pro/.env

# Tester manuellement
./test-sync.sh
```

### Le bot ne répond pas
1. Allez sur https://discord.com/developers/applications
2. Sélectionnez votre bot
3. Bot → Privileged Gateway Intents :
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT
4. Sauvegardez et redémarrez le bot

---

## 📚 Aide complète

- **Guide complet** : [GUIDE_COMPLET_SYNCHRONISATION.md](./GUIDE_COMPLET_SYNCHRONISATION.md)
- **Commandes** : [COMMANDES_RAPIDES.md](./COMMANDES_RAPIDES.md)
- **Guide visuel** : [GUIDE_VISUEL.md](./GUIDE_VISUEL.md)

---

## 🚀 Déployer sur Render (Production)

1. **Push sur GitHub** :
   ```bash
   cd ..
   git add clubstats-discord-bot/*
   git commit -m "feat: Discord bot with sync"
   git push
   ```

2. **Sur Render** :
   - New + → Web Service
   - Connectez votre repo
   - Build: `npm install`
   - Start: `npm start`
   - Ajoutez toutes les variables du .env

3. **C'est tout !** Le bot sera actif 24/7 🎉

---

## ⚡ Commandes essentielles

```bash
# Démarrer
npm start

# Tester l'API
./test-sync.sh

# Voir les logs
tail -f bot.log

# Arrêter
Ctrl+C

# Sur Discord
!aide       # Aide
!sessions   # Liste des sessions
!rappel     # Envoyer un rappel
```

---

## ✅ Checklist finale

- [ ] .env configuré avec les 4 variables
- [ ] `npm install` exécuté
- [ ] `./test-sync.sh` → "API accessible"
- [ ] Bot démarre sans erreur
- [ ] `!aide` fonctionne sur Discord
- [ ] Réaction ✅ synchronise un vote
- [ ] Vote apparaît sur le site web

**Si tout est ✅ → C'est bon !** 🎉

---

## 🎯 Résumé en 3 phrases

1. **Configurez** le fichier `.env` avec vos tokens
2. **Démarrez** le bot avec `npm start`
3. **Testez** avec `!rappel` sur Discord et réagissez avec ✅

**C'est tout !** Le bot fait le reste automatiquement. 🤖✨
