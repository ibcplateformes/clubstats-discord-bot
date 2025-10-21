# 🤖 Bot Discord avec Sondages - Guide de Déploiement

## 🎯 Ce qui a été créé

Un nouveau fichier `discord-bot-polls.js` qui :
- ✅ Récupère les sessions depuis l'API ClubStats
- ✅ Crée des sondages Discord avec boutons cliquables
- ✅ Envoie automatiquement les votes à l'API
- ✅ Met à jour les statistiques en temps réel
- ✅ Envoie des rappels automatiques 3x par jour

---

## 🚀 Déploiement sur Render

### **Étape 1 : Ajouter les variables d'environnement**

Sur https://dashboard.render.com → Service `clubstats-discord-bot` → **Environment**

Ajoutez ces 2 nouvelles variables :

| Variable | Valeur |
|----------|--------|
| `API_URL` | `https://clubstats-pro.onrender.com` |
| `API_KEY` | `27795d09e04cd6576d8eb58b42825e94739a90deece6603b52fa491e2cbedf68` |

**Variables existantes à garder :**
- `DISCORD_BOT_TOKEN`
- `DISCORD_CHANNEL_ID`
- `DATABASE_URL`
- `NEXT_PUBLIC_BASE_URL`

### **Étape 2 : Changer la commande de démarrage**

Sur Render → Service `clubstats-discord-bot` → **Settings**

Modifiez le **Start Command** :

**Ancien :** `npm start`  
**Nouveau :** `npm run start:polls`

Ou modifiez directement dans `package.json` le script `start` :
```json
"start": "node discord-bot-polls.js"
```

### **Étape 3 : Pousser les modifications**

```bash
cd /Users/ibc/clubstats-discord-bot

# Ajouter les fichiers
git add .
git commit -m "feat: add Discord polls with API synchronization"
git push origin main
```

Render va automatiquement redéployer le bot.

---

## 📝 Commandes Discord

### **!polls** ou **!sondages**
Crée des sondages avec boutons pour toutes les sessions actives

**Exemple :**
```
Vous: !polls

Bot: 📊 Création de 2 sondage(s)...

[Sondage 1 avec 3 boutons : ✅ Présent | ❌ Absent | 🟡 Retard]
[Sondage 2 avec 3 boutons : ✅ Présent | ❌ Absent | 🟡 Retard]
```

### **!sessions**
Affiche la liste des sessions actives avec statistiques

### **!aide** ou **!help**
Affiche l'aide

---

## 🎮 Utilisation

### **Pour les admins :**

1. Créez une session sur le site web
2. Sur Discord, tapez `!polls`
3. Le bot crée un sondage avec boutons

### **Pour les joueurs :**

1. Cliquez sur un bouton (✅ Présent / ❌ Absent / 🟡 Retard)
2. Le bot confirme le vote en privé
3. Le sondage se met à jour automatiquement
4. Le site web se met à jour en temps réel

---

## ⏰ Rappels automatiques

Le bot envoie automatiquement des sondages **3 fois par jour** :
- 🌅 **10h00** (heure de Paris)
- ☀️ **14h00** (heure de Paris)
- 🌆 **18h00** (heure de Paris)

---

## 🔄 Flux complet

```
1. Admin crée session sur site web
   ↓
2. Bot récupère session via API
   ↓
3. Bot crée sondage Discord avec boutons
   ↓
4. Joueur clique sur bouton (✅/❌/🟡)
   ↓
5. Bot envoie vote à API
   ↓
6. API enregistre vote en base de données
   ↓
7. Bot met à jour le sondage Discord
   ↓
8. Site web affiche les nouveaux votes
```

---

## 🧪 Test rapide

### **1. Tester l'API (depuis votre terminal)**

```bash
# Vérifier que l'API fonctionne
curl https://clubstats-pro.onrender.com/api/discord/sessions \
  -H "x-api-key: 27795d09e04cd6576d8eb58b42825e94739a90deece6603b52fa491e2cbedf68"
```

Vous devriez voir les sessions actives.

### **2. Tester le bot (sur Discord)**

Une fois le bot redémarré :
```
!polls
```

Le bot devrait créer des sondages avec boutons.

### **3. Tester un vote**

Cliquez sur un bouton (✅/❌/🟡).

**Vérifications :**
- ✅ Le bot répond "Vote enregistré"
- ✅ Le sondage se met à jour
- ✅ Le site web montre le nouveau vote

---

## 🐛 Debug

### **Si le bot ne démarre pas :**

Vérifiez les logs sur Render → Service `clubstats-discord-bot` → **Logs**

**Erreurs courantes :**

**"API_KEY manquante"**
→ Ajoutez la variable `API_KEY` dans Environment

**"Cannot fetch sessions"**
→ Vérifiez que `API_URL` est correct
→ Vérifiez que `API_KEY` est identique sur les 2 services

**"Channel not found"**
→ Vérifiez `DISCORD_CHANNEL_ID`

### **Si les votes ne s'enregistrent pas :**

**Vérifiez dans les logs du bot :**
```
📝 Vote reçu: Username -> present pour session abc123
✅ Vote enregistré: Username -> present
```

**Vérifiez dans les logs de l'API (clubstats-pro) :**
Recherchez des erreurs lors de `POST /api/discord/sync-vote`

---

## 📊 Différences avec l'ancien bot

| Fonctionnalité | Ancien bot | Nouveau bot |
|----------------|------------|-------------|
| **Rappels** | Liens de vote | Boutons cliquables |
| **Vote** | Cliquer lien → Aller sur site | 1 clic sur bouton |
| **Base de données** | Prisma direct | API centralisée |
| **Synchronisation** | Manuelle | Automatique |
| **Feedback** | Aucun | Message de confirmation |
| **Stats** | Statiques | Temps réel |

---

## 🎉 Prêt !

Une fois déployé :
1. ✅ Les joueurs votent en 1 clic sur Discord
2. ✅ Les votes sont synchronisés automatiquement
3. ✅ Le site web se met à jour en temps réel
4. ✅ Les rappels automatiques continuent

**C'est exactement ce que vous vouliez !** 🚀
