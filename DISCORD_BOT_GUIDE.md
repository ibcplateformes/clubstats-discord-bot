# 🤖 Guide d'Installation du Bot Discord pour ClubStats Pro

## 📋 Prérequis

1. Un compte Discord
2. Les permissions d'administrateur sur votre serveur Discord
3. Node.js installé sur votre machine

## 🚀 Étape 1 : Créer le Bot sur Discord

### 1.1 Accéder au Portail Développeur Discord

1. Allez sur https://discord.com/developers/applications
2. Cliquez sur **"New Application"**
3. Donnez un nom à votre bot (ex: "ClubStats Vote Bot")
4. Acceptez les conditions et cliquez sur **"Create"**

### 1.2 Configurer le Bot

1. Dans le menu de gauche, cliquez sur **"Bot"**
2. Cliquez sur **"Add Bot"** puis confirmez
3. **IMPORTANT** : Copiez le **Token** (cliquez sur "Reset Token" puis "Copy")
   ⚠️ Ne partagez JAMAIS ce token !

### 1.3 Activer les Intents

Dans la section **"Privileged Gateway Intents"**, activez :
- ✅ MESSAGE CONTENT INTENT
- ✅ SERVER MEMBERS INTENT (optionnel)

Cliquez sur **"Save Changes"**

### 1.4 Inviter le Bot sur votre Serveur

1. Dans le menu de gauche, cliquez sur **"OAuth2"** > **"URL Generator"**
2. Dans **SCOPES**, cochez :
   - ✅ `bot`
3. Dans **BOT PERMISSIONS**, cochez :
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Add Reactions
4. Copiez l'URL générée en bas de la page
5. Ouvrez cette URL dans votre navigateur
6. Sélectionnez votre serveur et cliquez sur **"Autoriser"**

## 🔧 Étape 2 : Installation et Configuration

### 2.1 Installer les Dépendances

```bash
cd ~/clubstats-pro/clubstats-pro
npm install discord.js dotenv
```

### 2.2 Configurer les Variables d'Environnement

Ajoutez ces lignes à votre fichier `.env` :

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=votre_token_ici
DISCORD_CHANNEL_ID=id_du_canal_optionnel

# Base URL de votre application (pour les liens de vote)
NEXT_PUBLIC_BASE_URL=http://localhost:3002
```

**Comment trouver l'ID du canal Discord :**
1. Dans Discord, activez le "Mode Développeur" : Paramètres utilisateur > Avancé > Mode développeur
2. Faites un clic droit sur le canal où vous voulez que le bot envoie les messages
3. Cliquez sur "Copier l'identifiant"
4. Collez cet ID dans `DISCORD_CHANNEL_ID`

### 2.3 Placer le Fichier du Bot

Copiez le fichier `discord-bot.js` dans votre projet :

```bash
# Créez un dossier pour le bot
mkdir -p ~/clubstats-pro/clubstats-pro/bot

# Copiez le fichier discord-bot.js dans ce dossier
cp discord-bot.js ~/clubstats-pro/clubstats-pro/bot/
```

## ▶️ Étape 3 : Lancer le Bot

### 3.1 Démarrage Manuel

```bash
cd ~/clubstats-pro/clubstats-pro
node bot/discord-bot.js
```

Vous devriez voir :
```
🤖 Bot Discord prêt !
📝 Connecté en tant que ClubStats Vote Bot#1234
🔧 Préfixe des commandes: !
✅ Le bot est opérationnel !
```

### 3.2 Garder le Bot Actif (avec PM2)

Pour que le bot reste actif en permanence :

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer le bot avec PM2
pm2 start bot/discord-bot.js --name "discord-vote-bot"

# Sauvegarder la configuration
pm2 save

# Configurer le démarrage automatique
pm2 startup
```

**Commandes utiles PM2 :**
```bash
pm2 list              # Liste des processus
pm2 logs discord-vote-bot  # Voir les logs
pm2 restart discord-vote-bot  # Redémarrer
pm2 stop discord-vote-bot     # Arrêter
pm2 delete discord-vote-bot   # Supprimer
```

## 📱 Étape 4 : Utiliser le Bot

### Commandes Disponibles

**`!rappel`** - Envoie un rappel pour toutes les sessions actives
- Affiche un embed élégant avec les détails de la session
- Liste tous les joueurs qui n'ont pas encore voté
- Inclut le lien de vote

**`!sessions`** - Liste toutes les sessions actives
- Vue d'ensemble de toutes les sessions en cours
- Taux de participation pour chaque session

**`!aide`** - Affiche l'aide
- Liste toutes les commandes disponibles

### Exemple d'Utilisation

```
!rappel
```

Le bot va envoyer un message comme celui-ci :

```
🔔 RAPPEL DE VOTE 🔔

Les joueurs suivants n'ont pas encore voté pour Entraînement Tactique :

• Doucsforreal
• el4nite
• Killer_Moustapha
• Smooth_Moe
... et 30 autres joueurs

⏰ N'oubliez pas de voter !
```

Avec un embed Discord élégant contenant :
- 📅 Date et heure
- 📍 Lieu
- 📊 Taux de participation
- 🔗 Lien de vote direct

## 🔄 Étape 5 : Automatisation (Optionnel)

### 5.1 Rappels Automatiques Programmés

Pour envoyer des rappels automatiquement tous les jours :

```bash
# Créer un script de rappel automatique
cat > ~/clubstats-pro/clubstats-pro/bot/auto-reminder.js << 'EOF'
require('dotenv').config();
const { client, getActiveSessions, createSessionEmbed } = require('./discord-bot.js');

// Attendre que le bot soit prêt
client.once('ready', async () => {
  console.log('✅ Auto-reminder démarré');
  
  // Fonction pour envoyer les rappels
  async function sendReminders() {
    try {
      const channelId = process.env.DISCORD_CHANNEL_ID;
      if (!channelId) {
        console.error('❌ DISCORD_CHANNEL_ID non configuré');
        return;
      }

      const channel = await client.channels.fetch(channelId);
      const sessions = await getActiveSessions();

      if (sessions.length === 0) {
        console.log('ℹ️ Aucune session active');
        return;
      }

      for (const session of sessions) {
        // Ne rappeler que si moins de 80% ont voté
        const participationRate = (session.totalVotes / session.totalPlayers) * 100;
        
        if (participationRate < 80 && session.missingPlayers.length > 0) {
          const embed = createSessionEmbed(session);
          let message = '🔔 **RAPPEL AUTOMATIQUE** 🔔\n\n';
          message += `${session.missingPlayers.length} joueurs n'ont pas encore voté pour **${session.title}**\n\n`;
          message += '⏰ N\'oubliez pas de voter !';
          
          await channel.send({ content: message, embeds: [embed] });
          console.log(`✅ Rappel envoyé pour: ${session.title}`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi des rappels:', error);
    }
  }

  // Envoyer un rappel immédiatement au démarrage
  await sendReminders();

  // Puis tous les jours à 18h (heure de Paris)
  const schedule = require('node-schedule');
  schedule.scheduleJob('0 18 * * *', sendReminders);
  
  console.log('📅 Rappels programmés tous les jours à 18h');
});
EOF

# Installer node-schedule
npm install node-schedule

# Lancer avec PM2
pm2 start bot/auto-reminder.js --name "auto-reminder"
pm2 save
```

## 🎨 Personnalisation

### Modifier le Préfixe des Commandes

Dans `discord-bot.js`, ligne 12 :
```javascript
const PREFIX = '!'; // Changez en '/' ou autre
```

### Changer les Horaires de Rappel

Dans `auto-reminder.js`, modifiez la cron expression :
```javascript
// Tous les jours à 9h et 18h
schedule.scheduleJob('0 9,18 * * *', sendReminders);

// Tous les lundis, mercredis, vendredis à 17h
schedule.scheduleJob('0 17 * * 1,3,5', sendReminders);
```

## 🐛 Dépannage

### Le bot ne répond pas aux commandes

1. Vérifiez que le bot est en ligne (il doit avoir un point vert sur Discord)
2. Vérifiez que `MESSAGE CONTENT INTENT` est activé
3. Vérifiez les logs : `pm2 logs discord-vote-bot`

### Erreur "Invalid Token"

1. Vérifiez que vous avez copié le bon token
2. Le token doit être dans votre fichier `.env`
3. Assurez-vous qu'il n'y a pas d'espaces avant/après le token

### Le bot ne peut pas envoyer de messages

1. Vérifiez les permissions du bot dans votre serveur Discord
2. Le bot doit avoir les permissions "Envoyer des messages" et "Intégrer des liens"

## 📚 Ressources

- [Documentation Discord.js](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [PM2 Documentation](https://pm2.keymetrics.io/)

## ✨ Fonctionnalités Futures

Idées d'améliorations possibles :
- 🔔 Notifications par mention (@joueur) pour les rappels
- 📊 Statistiques de participation par joueur
- 🎮 Intégration avec les rôles Discord
- 📸 Génération d'images avec les stats
- 🗳️ Permettre de voter directement depuis Discord
