require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');
const http = require('http');

// Serveur HTTP simple pour éviter que Render mette en pause le service
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: 'Kay Voter Pro',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, () => {
  console.log(`🌐 Serveur HTTP démarré sur le port ${PORT}`);
  console.log(`🔗 Keep-alive endpoint: http://localhost:${PORT}`);
});

const prisma = new PrismaClient();

// Configuration API
const API_URL = process.env.API_URL || 'https://clubstats-pro.onrender.com';
const API_KEY = process.env.DISCORD_API_KEY;

if (!API_KEY) {
  console.error('❌ ERREUR: DISCORD_API_KEY n\'est pas défini dans .env');
  process.exit(1);
}

// Créer le client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
});

// Configuration
const PREFIX = '!';
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Map pour suivre les messages de vote (messageId -> sessionId)
const voteMessages = new Map();

// Emojis pour les votes
const VOTE_EMOJIS = {
  present: '✅',
  absent: '❌',
  late: '🟡'
};

// Fonction pour synchroniser un vote avec l'API
async function syncVoteToAPI(sessionId, userId, username, response) {
  try {
    console.log(`🔄 Synchronisation vote: ${username} → ${response} (session: ${sessionId})`);
    
    const res = await fetch(`${API_URL}/api/discord/sync-vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        sessionId,
        discordId: userId,
        discordUsername: username,
        response
      })
    });

    const data = await res.json();
    
    if (data.success) {
      console.log(`✅ Vote synchronisé: ${username} → ${response} (${data.action})`);
      if (data.mapped) {
        console.log(`   ↳ Mappé vers: ${data.vote.playerName}`);
      }
      return { success: true, data };
    } else {
      console.error(`❌ Échec synchronisation: ${data.error}`);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    return { success: false, error: error.message };
  }
}

// Quand le bot est prêt
client.once('ready', () => {
  console.log('🤖 Bot Discord prêt !');
  console.log(`📝 Connecté en tant que ${client.user.tag}`);
  console.log(`🔧 Préfixe des commandes: ${PREFIX}`);
  console.log(`📢 Canal de rappels: ${CHANNEL_ID}`);
  console.log(`🌐 API URL: ${API_URL}`);
  console.log('✅ Le bot est opérationnel !');
  console.log('');
  console.log('⏰ Rappels automatiques programmés :');
  console.log('   • 10h00 (heure de Paris)');
  console.log('   • 14h00 (heure de Paris)');
  console.log('   • 18h00 (heure de Paris)');
  console.log('');
  
  // Démarrer les rappels automatiques
  startAutomaticReminders();
});

// Fonction pour récupérer les sessions actives avec les joueurs manquants
async function getActiveSessions() {
  try {
    const sessions = await prisma.voteSession.findMany({
      where: {
        isActive: true,
        date: {
          gte: new Date() // Seulement les sessions futures
        }
      },
      include: {
        votes: {
          include: {
            player: true
          }
        },
        club: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Pour chaque session, calculer qui n'a pas voté
    const sessionsWithMissing = await Promise.all(
      sessions.map(async (session) => {
        const allPlayers = await prisma.player.findMany({
          where: {
            clubId: session.clubId
          }
        });

        const voterIds = session.votes.map(v => v.playerId);
        const missingPlayers = allPlayers.filter(p => !voterIds.includes(p.id));

        return {
          ...session,
          allPlayers,
          missingPlayers,
          totalPlayers: allPlayers.length,
          totalVotes: session.votes.length
        };
      })
    );

    return sessionsWithMissing;
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions:', error);
    throw error;
  }
}

// Fonction pour formater la date
function formatDate(date) {
  return new Date(date).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });
}

// Fonction pour créer un embed Discord élégant avec boutons de vote
function createSessionEmbed(session) {
  const participationRate = session.totalPlayers > 0 
    ? Math.round((session.totalVotes / session.totalPlayers) * 100)
    : 0;

  const voteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'}/vote/${session.id}`;

  const embed = new EmbedBuilder()
    .setColor(participationRate < 50 ? 0xFF0000 : participationRate < 80 ? 0xFFA500 : 0x00FF00)
    .setTitle(`🗳️ ${session.title}`)
    .setDescription(`${session.description || 'Session de vote active'}\n\n🔗 **[CLIQUEZ ICI POUR VOTER](${voteLink})**\n\n**OU RÉAGISSEZ CI-DESSOUS :**\n${VOTE_EMOJIS.present} Présent\n${VOTE_EMOJIS.absent} Absent\n${VOTE_EMOJIS.late} En retard`)
    .addFields(
      { name: '📅 Date', value: formatDate(session.date), inline: true },
      { name: '📍 Lieu', value: session.location || 'Non spécifié', inline: true },
      { name: '📊 Participation', value: `${participationRate}% (${session.totalVotes}/${session.totalPlayers})`, inline: true }
    )
    .setFooter({ text: `ID: ${session.id} • Votez en réagissant avec les emojis !` })
    .setTimestamp();

  // Ajouter la liste des joueurs qui ONT voté
  if (session.votes && session.votes.length > 0) {
    const presentVotes = session.votes.filter(v => v.response === 'present');
    const absentVotes = session.votes.filter(v => v.response === 'absent');
    const lateVotes = session.votes.filter(v => v.response === 'late');

    if (presentVotes.length > 0) {
      const presentList = presentVotes
        .slice(0, 15)
        .map(v => v.player?.name || v.playerName)
        .join(', ');
      
      embed.addFields({
        name: `✅ Présents (${presentVotes.length})`,
        value: presentList + (presentVotes.length > 15 ? ` ... et ${presentVotes.length - 15} autres` : ''),
        inline: false
      });
    }

    if (lateVotes.length > 0) {
      const lateList = lateVotes
        .slice(0, 15)
        .map(v => v.player?.name || v.playerName)
        .join(', ');
      
      embed.addFields({
        name: `🟡 En retard (${lateVotes.length})`,
        value: lateList + (lateVotes.length > 15 ? ` ... et ${lateVotes.length - 15} autres` : ''),
        inline: false
      });
    }

    if (absentVotes.length > 0) {
      const absentList = absentVotes
        .slice(0, 15)
        .map(v => v.player?.name || v.playerName)
        .join(', ');
      
      embed.addFields({
        name: `❌ Absents (${absentVotes.length})`,
        value: absentList + (absentVotes.length > 15 ? ` ... et ${absentVotes.length - 15} autres` : ''),
        inline: false
      });
    }
  }

  // Ajouter la liste des joueurs manquants
  if (session.missingPlayers.length > 0) {
    const missingList = session.missingPlayers
      .slice(0, 15)
      .map(p => p.name)
      .join(', ');
    
    embed.addFields({
      name: `⏳ N'ont pas encore voté (${session.missingPlayers.length})`,
      value: missingList + (session.missingPlayers.length > 15 ? ` ... et ${session.missingPlayers.length - 15} autres` : ''),
      inline: false
    });
  }

  return embed;
}

// Fonction pour envoyer les rappels automatiques avec réactions
async function sendAutomaticReminders() {
  try {
    if (!CHANNEL_ID) {
      console.error('❌ DISCORD_CHANNEL_ID non configuré');
      return;
    }

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) {
      console.error('❌ Canal Discord introuvable');
      return;
    }

    const sessions = await getActiveSessions();

    if (sessions.length === 0) {
      console.log('ℹ️  Aucune session active - pas de rappel envoyé');
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    let timeEmoji = '🌅';
    let timeText = 'Matin';
    
    if (currentHour >= 14 && currentHour < 18) {
      timeEmoji = '☀️';
      timeText = 'Après-midi';
    } else if (currentHour >= 18) {
      timeEmoji = '🌆';
      timeText = 'Soir';
    }

    console.log(`📣 Envoi des rappels automatiques (${timeText})...`);

    // Envoyer un rappel pour chaque session
    for (const session of sessions) {
      const participationRate = session.totalPlayers > 0 
        ? Math.round((session.totalVotes / session.totalPlayers) * 100)
        : 0;

      // Envoyer uniquement si moins de 100% de participation
      if (participationRate < 100 && session.missingPlayers.length > 0) {
        const embed = createSessionEmbed(session);
        const voteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'}/vote/${session.id}`;
        
        let pingMessage = `${timeEmoji} **RAPPEL ${timeText.toUpperCase()}** ${timeEmoji}\n\n`;
        pingMessage += `🗳️ **${session.title}**\n`;
        pingMessage += `📅 ${formatDate(session.date)}\n\n`;
        pingMessage += `📊 Participation : **${participationRate}%** (${session.totalVotes}/${session.totalPlayers})\n\n`;
        pingMessage += `🔗 **Lien de vote :** ${voteLink}\n\n`;
        pingMessage += `⏰ **Votez directement ici en réagissant avec les emojis !**`;

        const message = await channel.send({ content: pingMessage, embeds: [embed] });
        
        // Ajouter les réactions pour voter
        await message.react(VOTE_EMOJIS.present);
        await message.react(VOTE_EMOJIS.absent);
        await message.react(VOTE_EMOJIS.late);
        
        // Stocker le message pour la synchronisation
        voteMessages.set(message.id, session.id);
        
        console.log(`✅ Rappel envoyé pour: ${session.title} (${participationRate}% participation)`);
      } else {
        console.log(`ℹ️  Session "${session.title}" à 100% - pas de rappel`);
      }
    }

    console.log(`✅ Rappels automatiques envoyés avec succès\n`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des rappels automatiques:', error);
  }
}

// Écouter les réactions pour les votes
client.on('messageReactionAdd', async (reaction, user) => {
  // Ignorer les réactions du bot lui-même
  if (user.bot) return;

  // Si la réaction est partielle, la récupérer complètement
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Erreur lors de la récupération de la réaction:', error);
      return;
    }
  }

  // Vérifier si c'est un message de vote
  const sessionId = voteMessages.get(reaction.message.id);
  if (!sessionId) return;

  // Déterminer le type de vote selon l'emoji
  let response = null;
  if (reaction.emoji.name === VOTE_EMOJIS.present) response = 'present';
  else if (reaction.emoji.name === VOTE_EMOJIS.absent) response = 'absent';
  else if (reaction.emoji.name === VOTE_EMOJIS.late) response = 'late';
  
  if (!response) return;

  console.log(`👍 Réaction détectée: ${user.username} → ${response}`);

  // Synchroniser avec l'API
  const result = await syncVoteToAPI(sessionId, user.id, user.username, response);
  
  if (result.success) {
    // Optionnel: Envoyer un message de confirmation en MP
    try {
      await user.send(`✅ Votre vote a été enregistré : **${response}** pour la session.`);
    } catch (error) {
      // L'utilisateur a peut-être désactivé les MPs
      console.log(`⚠️  Impossible d'envoyer un MP à ${user.username}`);
    }
  }
});

// Écouter les suppressions de réactions
client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Erreur lors de la récupération de la réaction:', error);
      return;
    }
  }

  const sessionId = voteMessages.get(reaction.message.id);
  if (!sessionId) return;

  console.log(`👎 Réaction supprimée: ${user.username}`);
  
  // Note: On ne supprime pas le vote, on le laisse tel quel
  // Si l'utilisateur change d'avis, il peut ajouter une autre réaction
});

// Démarrer les rappels automatiques programmés
function startAutomaticReminders() {
  // Rappel à 10h00 (heure de Paris)
  cron.schedule('0 10 * * *', () => {
    console.log('\n⏰ Déclenchement du rappel automatique de 10h00');
    sendAutomaticReminders();
  }, {
    timezone: "Europe/Paris"
  });

  // Rappel à 14h00 (heure de Paris)
  cron.schedule('0 14 * * *', () => {
    console.log('\n⏰ Déclenchement du rappel automatique de 14h00');
    sendAutomaticReminders();
  }, {
    timezone: "Europe/Paris"
  });

  // Rappel à 18h00 (heure de Paris)
  cron.schedule('0 18 * * *', () => {
    console.log('\n⏰ Déclenchement du rappel automatique de 18h00');
    sendAutomaticReminders();
  }, {
    timezone: "Europe/Paris"
  });

  console.log('✅ Tâches programmées activées');
}

// Commandes manuelles
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Commande: !rappel
  if (command === 'rappel') {
    try {
      await message.reply('🔄 Envoi d\'un rappel manuel avec votes par réactions...');
      const sessions = await getActiveSessions();

      if (sessions.length === 0) {
        return message.channel.send('ℹ️ Aucune session active pour le moment.');
      }

      for (const session of sessions) {
        const embed = createSessionEmbed(session);
        const participationRate = session.totalPlayers > 0 
          ? Math.round((session.totalVotes / session.totalPlayers) * 100)
          : 0;
        const voteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'}/vote/${session.id}`;
        
        let pingMessage = '🔔 **RAPPEL MANUEL** 🔔\n\n';
        pingMessage += `🗳️ **${session.title}**\n`;
        pingMessage += `📅 ${formatDate(session.date)}\n\n`;
        pingMessage += `📊 Participation : **${participationRate}%**\n\n`;
        pingMessage += `🔗 **Lien de vote :** ${voteLink}\n\n`;
        pingMessage += `⏰ **Votez directement ici en réagissant avec les emojis !**`;

        const voteMessage = await message.channel.send({ content: pingMessage, embeds: [embed] });
        
        // Ajouter les réactions
        await voteMessage.react(VOTE_EMOJIS.present);
        await voteMessage.react(VOTE_EMOJIS.absent);
        await voteMessage.react(VOTE_EMOJIS.late);
        
        // Stocker le message
        voteMessages.set(voteMessage.id, session.id);
      }

      await message.react('✅');
    } catch (error) {
      console.error('Erreur:', error);
      await message.reply('❌ Erreur lors de l\'envoi du rappel.');
    }
  }

  // Commande: !sessions
  if (command === 'sessions') {
    try {
      const sessions = await getActiveSessions();

      if (sessions.length === 0) {
        return message.reply('ℹ️ Aucune session active pour le moment.');
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📋 Sessions de vote actives')
        .setDescription(`${sessions.length} session(s) en cours`)
        .setTimestamp();

      sessions.forEach((session, index) => {
        const participationRate = session.totalPlayers > 0 
          ? Math.round((session.totalVotes / session.totalPlayers) * 100)
          : 0;

        embed.addFields({
          name: `${index + 1}. ${session.title}`,
          value: `📅 ${formatDate(session.date)}\n📊 Participation: ${participationRate}% (${session.totalVotes}/${session.totalPlayers})\n❌ Manquants: ${session.missingPlayers.length}`,
          inline: false
        });
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur:', error);
      await message.reply('❌ Erreur lors de la récupération des sessions.');
    }
  }

  // Commande: !aide
  if (command === 'aide' || command === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🤖 Aide du Bot de Vote')
      .setDescription('Voici la liste des commandes disponibles :')
      .addFields(
        { name: `${PREFIX}rappel`, value: 'Envoie un rappel manuel avec votes par réactions', inline: false },
        { name: `${PREFIX}sessions`, value: 'Affiche la liste de toutes les sessions de vote actives', inline: false },
        { name: `${PREFIX}aide`, value: 'Affiche ce message d\'aide', inline: false }
      )
      .addFields({
        name: '🗳️ Voter par réactions',
        value: `Réagissez aux messages de vote avec :\n${VOTE_EMOJIS.present} Présent\n${VOTE_EMOJIS.absent} Absent\n${VOTE_EMOJIS.late} En retard\n\nVotre vote sera automatiquement synchronisé !`,
        inline: false
      })
      .addFields({
        name: '⏰ Rappels automatiques',
        value: 'Le bot envoie des rappels automatiques 3 fois par jour :\n• 10h00\n• 14h00\n• 18h00',
        inline: false
      })
      .setFooter({ text: 'ClubStats Pro - Bot Discord avec synchronisation API' })
      .setTimestamp();

    await message.reply({ embeds: [helpEmbed] });
  }
});

// Connexion du bot
client.login(process.env.DISCORD_BOT_TOKEN);

// Gestion des erreurs
process.on('unhandledRejection', error => {
  console.error('Erreur non gérée:', error);
});

process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du bot...');
  client.destroy();
  prisma.$disconnect();
  process.exit(0);
});
