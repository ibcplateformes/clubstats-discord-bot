require('dotenv').config();
const fetch = require('node-fetch');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');
const http = require('http');

// Serveur HTTP simple pour éviter que Render mette en pause le service
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: 'Kay Voter Pro - Buttons Edition',
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
  ],
});

// Configuration
const PREFIX = '!';
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Map pour suivre les messages de vote (messageId -> sessionId)
const voteMessages = new Map();

// Fonction pour synchroniser un vote avec l'API
async function syncVoteToAPI(sessionId, userId, username, response) {
  try {
    console.log(`🔄 Synchronisation vote: ${username} → ${response} (session: ${sessionId})`);
    console.log(`🌐 URL: ${API_URL}/api/discord/sync-vote`);
    
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

    console.log(`📊 Status code: ${res.status}`);
    
    // Vérifier si la réponse est OK avant de parser
    if (!res.ok) {
      const text = await res.text();
      console.error(`❌ Réponse HTTP ${res.status}:`, text.substring(0, 200));
      return { success: false, error: `HTTP ${res.status}` };
    }
    
    const contentType = res.headers.get('content-type');
    console.log(`📝 Content-Type: ${contentType}`);
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error(`❌ Pas de JSON reçu, Content-Type: ${contentType}`);
      console.error(`📄 Corps de la réponse:`, text.substring(0, 200));
      return { success: false, error: 'Response is not JSON' };
    }

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
  console.log('🔘 Mode BOUTONS activé - v3.0.1');
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
          gte: new Date()
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

    const sessionsWithMissing = await Promise.all(
      sessions.map(async (session) => {
        const allPlayers = await prisma.player.findMany({
          where: {
            clubId: session.clubId
          }
        });

        // Récupérer les votes Discord
        const discordVotes = await prisma.vote.findMany({
          where: {
            sessionId: session.id
          }
        });

        // Combiner les deux types de votes
        const allVotesMap = new Map();
        
        // Ajouter les votes Discord
        discordVotes.forEach(v => {
          allVotesMap.set(v.playerName.toLowerCase(), {
            playerName: v.playerName,
            response: v.response,
            player: null
          });
        });
        
        // Ajouter/remplacer avec les votes du site
        session.votes.forEach(v => {
          const playerName = v.player?.name || 'Joueur supprimé';
          allVotesMap.set(playerName.toLowerCase(), {
            playerName: playerName,
            response: v.status,
            player: v.player
          });
        });
        
        const combinedVotes = Array.from(allVotesMap.values());
        const voterIds = session.votes.map(v => v.playerId);
        const missingPlayers = allPlayers.filter(p => !voterIds.includes(p.id));

        return {
          ...session,
          votes: combinedVotes,
          allPlayers,
          missingPlayers,
          totalPlayers: allPlayers.length,
          totalVotes: combinedVotes.length
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

// Fonction pour créer un embed Discord avec boutons de vote
function createSessionEmbed(session) {
  const participationRate = session.totalPlayers > 0 
    ? Math.round((session.totalVotes / session.totalPlayers) * 100)
    : 0;

  const voteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'}/vote/${session.id}`;

  const embed = new EmbedBuilder()
    .setColor(participationRate < 50 ? 0xFF0000 : participationRate < 80 ? 0xFFA500 : 0x00FF00)
    .setTitle(`🗳️ ${session.title}`)
    .setDescription(`${session.description || 'Session de vote active'}\n\n🔗 **[Lien de vote web](${voteLink})**\n\n**OU VOTEZ ICI avec les boutons ci-dessous** ⬇️`)
    .addFields(
      { name: '📅 Date', value: formatDate(session.date), inline: true },
      { name: '📍 Lieu', value: session.location || 'Non spécifié', inline: true },
      { name: '📊 Participation', value: `${participationRate}% (${session.totalVotes}/${session.totalPlayers})`, inline: true }
    )
    .setFooter({ text: `ID: ${session.id} • Cliquez sur les boutons pour voter !` })
    .setTimestamp();

  // Compter les votes par type
  const presentVotes = session.votes.filter(v => v.response === 'present');
  const absentVotes = session.votes.filter(v => v.response === 'absent');
  const lateVotes = session.votes.filter(v => v.response === 'late');

  if (presentVotes.length > 0) {
    const presentList = presentVotes
      .slice(0, 10)
      .map(v => v.playerName || v.player?.name || 'Inconnu')
      .join(', ');
    
    embed.addFields({
      name: `✅ Présents (${presentVotes.length})`,
      value: presentList + (presentVotes.length > 10 ? ` ... et ${presentVotes.length - 10} autres` : ''),
      inline: false
    });
  }

  if (lateVotes.length > 0) {
    const lateList = lateVotes
      .slice(0, 10)
      .map(v => v.playerName || v.player?.name || 'Inconnu')
      .join(', ');
    
    embed.addFields({
      name: `🟡 En retard (${lateVotes.length})`,
      value: lateList + (lateVotes.length > 10 ? ` ... et ${lateVotes.length - 10} autres` : ''),
      inline: false
    });
  }

  if (absentVotes.length > 0) {
    const absentList = absentVotes
      .slice(0, 10)
      .map(v => v.playerName || v.player?.name || 'Inconnu')
      .join(', ');
    
    embed.addFields({
      name: `❌ Absents (${absentVotes.length})`,
      value: absentList + (absentVotes.length > 10 ? ` ... et ${absentVotes.length - 10} autres` : ''),
      inline: false
    });
  }

  if (session.missingPlayers.length > 0) {
    const missingList = session.missingPlayers
      .slice(0, 10)
      .map(p => p.name)
      .join(', ');
    
    embed.addFields({
      name: `⏳ N'ont pas encore voté (${session.missingPlayers.length})`,
      value: missingList + (session.missingPlayers.length > 10 ? ` ... et ${session.missingPlayers.length - 10} autres` : ''),
      inline: false
    });
  }

  return embed;
}

// Fonction pour créer les boutons de vote
function createVoteButtons(sessionId) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`vote_present_${sessionId}`)
        .setLabel('✅ Présent')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`vote_absent_${sessionId}`)
        .setLabel('❌ Absent')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`vote_late_${sessionId}`)
        .setLabel('🟡 En retard')
        .setStyle(ButtonStyle.Primary)
    );
  
  return row;
}

// Écouter les interactions (clics sur boutons)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // Extraire l'action et le sessionId du customId
  const [action, response, sessionId] = interaction.customId.split('_');
  
  if (action !== 'vote') return;

  console.log(`🔘 Bouton cliqué: ${interaction.user.username} → ${response}`);

  // Defer la réponse pour avoir plus de temps
  await interaction.deferReply({ ephemeral: true });

  // Synchroniser avec l'API
  const result = await syncVoteToAPI(sessionId, interaction.user.id, interaction.user.username, response);
  
  if (result.success) {
    // Répondre à l'utilisateur
    const responseEmojis = {
      present: '✅ Présent',
      absent: '❌ Absent',
      late: '🟡 En retard'
    };
    
    await interaction.editReply({
      content: `✅ Votre vote a été enregistré : **${responseEmojis[response]}**\n\nVotre vote a été synchronisé avec le site web !`,
    });

    // Mettre à jour l'embed avec les nouvelles stats
    try {
      const sessions = await getActiveSessions();
      const session = sessions.find(s => s.id === sessionId);
      
      if (session) {
        const updatedEmbed = createSessionEmbed(session);
        const buttons = createVoteButtons(sessionId);
        
        await interaction.message.edit({
          embeds: [updatedEmbed],
          components: [buttons]
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'embed:', error);
    }
  } else {
    await interaction.editReply({
      content: `❌ Erreur lors de l'enregistrement du vote : ${result.error}\n\nVeuillez réessayer ou voter sur le site web.`,
    });
  }
});

// Fonction pour envoyer les rappels automatiques avec boutons
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

    for (const session of sessions) {
      const participationRate = session.totalPlayers > 0 
        ? Math.round((session.totalVotes / session.totalPlayers) * 100)
        : 0;

      if (participationRate < 100 && session.missingPlayers.length > 0) {
        const embed = createSessionEmbed(session);
        const buttons = createVoteButtons(session.id);
        
        let pingMessage = `${timeEmoji} **RAPPEL ${timeText.toUpperCase()}** ${timeEmoji}\n\n`;
        pingMessage += `🗳️ **${session.title}**\n`;
        pingMessage += `📅 ${formatDate(session.date)}\n\n`;
        pingMessage += `📊 Participation : **${participationRate}%** (${session.totalVotes}/${session.totalPlayers})\n\n`;
        pingMessage += `⏰ **Cliquez sur les boutons ci-dessous pour voter !**`;

        const message = await channel.send({ 
          content: pingMessage, 
          embeds: [embed],
          components: [buttons]
        });
        
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

// Démarrer les rappels automatiques programmés
function startAutomaticReminders() {
  cron.schedule('0 10 * * *', () => {
    console.log('\n⏰ Déclenchement du rappel automatique de 10h00');
    sendAutomaticReminders();
  }, {
    timezone: "Europe/Paris"
  });

  cron.schedule('0 14 * * *', () => {
    console.log('\n⏰ Déclenchement du rappel automatique de 14h00');
    sendAutomaticReminders();
  }, {
    timezone: "Europe/Paris"
  });

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
      await message.reply('🔄 Envoi d\'un rappel manuel avec boutons de vote...');
      const sessions = await getActiveSessions();

      if (sessions.length === 0) {
        return message.channel.send('ℹ️ Aucune session active pour le moment.');
      }

      for (const session of sessions) {
        const embed = createSessionEmbed(session);
        const buttons = createVoteButtons(session.id);
        const participationRate = session.totalPlayers > 0 
          ? Math.round((session.totalVotes / session.totalPlayers) * 100)
          : 0;
        const voteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'}/vote/${session.id}`;
        
        let pingMessage = '🔔 **RAPPEL MANUEL** 🔔\n\n';
        pingMessage += `🗳️ **${session.title}**\n`;
        pingMessage += `📅 ${formatDate(session.date)}\n\n`;
        pingMessage += `📊 Participation : **${participationRate}%**\n\n`;
        pingMessage += `🔗 **Lien de vote :** ${voteLink}\n\n`;
        pingMessage += `⏰ **Cliquez sur les boutons ci-dessous pour voter !**`;

        const voteMessage = await message.channel.send({ 
          content: pingMessage, 
          embeds: [embed],
          components: [buttons]
        });
        
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
        { name: `${PREFIX}rappel`, value: 'Envoie un rappel manuel avec boutons de vote', inline: false },
        { name: `${PREFIX}sessions`, value: 'Affiche la liste de toutes les sessions de vote actives', inline: false },
        { name: `${PREFIX}aide`, value: 'Affiche ce message d\'aide', inline: false }
      )
      .addFields({
        name: '🔘 Voter avec les boutons',
        value: 'Cliquez simplement sur les boutons sous les messages de vote :\n✅ Présent\n❌ Absent\n🟡 En retard\n\nVotre vote sera automatiquement synchronisé avec le site web !',
        inline: false
      })
      .addFields({
        name: '⏰ Rappels automatiques',
        value: 'Le bot envoie des rappels automatiques 3 fois par jour :\n• 10h00\n• 14h00\n• 18h00',
        inline: false
      })
      .setFooter({ text: 'ClubStats Pro - Bot Discord avec boutons et synchronisation API' })
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
