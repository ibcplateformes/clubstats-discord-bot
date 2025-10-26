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
const ADMIN_ROLE_NAMES = (process.env.ADMIN_ROLE_NAMES || 'Admin').split(',').map(r => r.trim());

// Map pour suivre les messages de vote (messageId -> sessionId)
const voteMessages = new Map();

// Fonction pour vérifier si un utilisateur est admin
function isAdmin(member) {
  if (!member || !member.roles) return false;
  return member.roles.cache.some(role => ADMIN_ROLE_NAMES.includes(role.name));
}

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

  const voteLink = `${API_URL}/vote/${session.id}`;

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
        const voteLink = `${API_URL}/vote/${session.id}`;
        
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

  // Commande: !moncode - Récupérer son code PIN
  if (command === 'moncode') {
    try {
      const discordUsername = message.author.username;
      
      // Chercher le mapping Discord -> Player
      const mapping = await prisma.discordPlayerMapping.findUnique({
        where: {
          discordUsername: discordUsername
        },
        include: {
          player: true
        }
      });

      if (!mapping || !mapping.player) {
        return message.reply(
          '❌ **Aucun code PIN trouvé**\n\n' +
          'Ton compte Discord n\'est pas encore lié \u00e0 un joueur.\n' +
          'Demande \u00e0 un admin de créer le lien ou utilise le site web pour voter.'
        );
      }

      if (!mapping.player.pin) {
        return message.reply(
          '⚠️ **Code PIN non défini**\n\n' +
          `Ton compte est lié au joueur **${mapping.player.name}** mais aucun code PIN n'a été généré.\n` +
          'Demande \u00e0 un admin de générer un code PIN pour toi.'
        );
      }

      // Envoyer le code en message privé
      try {
        await message.author.send(
          `🔑 **Ton code PIN personnel**\n\n` +
          `Joueur: **${mapping.player.name}**\n` +
          `Code PIN: **${mapping.player.pin}**\n\n` +
          `🔒 Utilise ce code pour voter sur le site web: ${API_URL}/vote\n\n` +
          `⚠️ Ne partage jamais ton code PIN avec quelqu'un d'autre !`
        );
        
        await message.reply('✅ Je t\'ai envoyé ton code PIN en message privé ! Vérifie tes DMs.');
      } catch (dmError) {
        // Si l'envoi en DM échoue (DMs fermés)
        console.error('Erreur envoi DM:', dmError);
        await message.reply(
          '❌ **Impossible d\'envoyer le message privé**\n\n' +
          'Active tes messages privés ou demande \u00e0 un admin de te communiquer ton code PIN.'
        );
      }
    } catch (error) {
      console.error('Erreur !moncode:', error);
      await message.reply('❌ Erreur lors de la récupération du code PIN.');
    }
  }

  // ========== COMMANDES ADMIN ==========

  // Commande: !clear - Nettoyer le canal
  if (command === 'clear' || command === 'nettoyer') {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Cette commande est réservée aux admins.');
    }

    try {
      const amount = parseInt(args[0]) || 100;
      
      if (amount < 1 || amount > 100) {
        return message.reply('⚠️ Spécifie un nombre entre 1 et 100.');
      }

      const fetched = await message.channel.messages.fetch({ limit: amount });
      await message.channel.bulkDelete(fetched, true);
      
      const confirmMsg = await message.channel.send(`✅ ${fetched.size} message(s) supprimé(s) !`);
      setTimeout(() => confirmMsg.delete(), 3000);
    } catch (error) {
      console.error('Erreur !clear:', error);
      await message.reply('❌ Erreur lors de la suppression des messages.');
    }
  }

  // Commande: !clearall - Nettoyer TOUT le canal
  if (command === 'clearall') {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Cette commande est réservée aux admins.');
    }

    try {
      await message.reply('🧹 Nettoyage complet du canal en cours...');
      
      let deleted = 0;
      let fetched;
      
      do {
        fetched = await message.channel.messages.fetch({ limit: 100 });
        if (fetched.size > 0) {
          await message.channel.bulkDelete(fetched, true);
          deleted += fetched.size;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause pour éviter rate limit
        }
      } while (fetched.size >= 2);
      
      const confirmMsg = await message.channel.send(`✅ Canal nettoyé ! ${deleted} message(s) supprimé(s).`);
      setTimeout(() => confirmMsg.delete(), 5000);
    } catch (error) {
      console.error('Erreur !clearall:', error);
      await message.reply('❌ Erreur lors du nettoyage complet.');
    }
  }

  // Commande: !creersession - Créer une session de vote
  if (command === 'creersession') {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Cette commande est réservée aux admins.');
    }

    try {
      await message.reply(
        '🎯 **Création d\'une session de vote**\n\n' +
        'Format: `!creersession [titre] | [type] | [date] | [heure] | [lieu]`\n\n' +
        '**Types disponibles:** training, match, tournament, friendly\n' +
        '**Format date:** AAAA-MM-JJ (ex: 2025-10-27)\n' +
        '**Format heure:** HH:MM (ex: 20:00)\n\n' +
        '**Exemple:**\n' +
        '`!creersession Match vs FC Goro | match | 2025-10-27 | 20:00 | Stade Municipal`'
      );

      // Attendre la réponse de l'admin
      const filter = m => m.author.id === message.author.id && m.content.startsWith('!creersession ');
      const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });

      collector.on('collect', async m => {
        const content = m.content.slice('!creersession '.length);
        const parts = content.split('|').map(p => p.trim());

        if (parts.length < 4) {
          return m.reply('❌ Format incorrect ! Utilisez: `!creersession [titre] | [type] | [date] | [heure] | [lieu]`');
        }

        const [title, type, date, time, location] = parts;

        if (!['training', 'match', 'tournament', 'friendly'].includes(type)) {
          return m.reply('❌ Type invalide ! Utilisez: training, match, tournament ou friendly');
        }

        const dateTime = `${date}T${time}:00`;

        // Créer la session via l'API
        const res = await fetch(`${API_URL}/api/vote-sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            type,
            date: dateTime,
            location: location || '',
            description: `Session créée depuis Discord par ${message.author.username}`
          })
        });

        if (res.ok) {
          const data = await res.json();
          await m.reply(
            '✅ **Session créée avec succès !**\n\n' +
            `🎯 Titre: **${title}**\n` +
            `📅 Date: ${date} \u00e0 ${time}\n` +
            `📍 Lieu: ${location || 'Non spécifié'}\n\n` +
            'ID: `' + data.session.id + '`\n\n' +
            'Utilisez `!rappel` pour envoyer un rappel aux joueurs!'
          );
        } else {
          await m.reply('❌ Erreur lors de la création de la session.');
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          message.reply('⏱️ Temps écoulé ! Relancez la commande pour créer une session.');
        }
      });
    } catch (error) {
      console.error('Erreur !creersession:', error);
      await message.reply('❌ Erreur lors de la création de la session.');
    }
  }

  // Commande: !fermer - Fermer une session
  if (command === 'fermer') {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Cette commande est réservée aux admins.');
    }

    try {
      const sessionId = args[0];
      
      if (!sessionId) {
        return message.reply('⚠️ Spécifie l\'ID de la session ! Exemple: `!fermer cmh6lqf5e0001lspl0wzqdsta`');
      }

      const res = await fetch(`${API_URL}/api/vote-sessions/${sessionId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false })
      });

      if (res.ok) {
        await message.reply('✅ Session `' + sessionId + '` fermée !');
      } else {
        await message.reply('❌ Session introuvable.');
      }
    } catch (error) {
      console.error('Erreur !fermer:', error);
      await message.reply('❌ Erreur lors de la fermeture de la session.');
    }
  }

  // Commande: !ouvrir - Ouvrir une session
  if (command === 'ouvrir') {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Cette commande est réservée aux admins.');
    }

    try {
      const sessionId = args[0];
      
      if (!sessionId) {
        return message.reply('⚠️ Spécifie l\'ID de la session ! Exemple: `!ouvrir cmh6lqf5e0001lspl0wzqdsta`');
      }

      const res = await fetch(`${API_URL}/api/vote-sessions/${sessionId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });

      if (res.ok) {
        await message.reply('✅ Session `' + sessionId + '` ouverte !');
      } else {
        await message.reply('❌ Session introuvable.');
      }
    } catch (error) {
      console.error('Erreur !ouvrir:', error);
      await message.reply('❌ Erreur lors de l\'ouverture de la session.');
    }
  }

  // Commande: !supprimer - Supprimer une session
  if (command === 'supprimer') {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Cette commande est réservée aux admins.');
    }

    try {
      const sessionId = args[0];
      
      if (!sessionId) {
        return message.reply('⚠️ Spécifie l\'ID de la session ! Exemple: `!supprimer cmh6lqf5e0001lspl0wzqdsta`');
      }

      const res = await fetch(`${API_URL}/api/vote-sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await message.reply('✅ Session `' + sessionId + '` supprimée !');
      } else {
        await message.reply('❌ Session introuvable.');
      }
    } catch (error) {
      console.error('Erreur !supprimer:', error);
      await message.reply('❌ Erreur lors de la suppression de la session.');
    }
  }

  // Commande: !genererpin - Générer un code PIN pour un joueur
  if (command === 'genererpin') {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Cette commande est réservée aux admins.');
    }

    try {
      const playerName = args.join(' ');
      
      if (!playerName) {
        return message.reply('⚠️ Spécifie le nom du joueur ! Exemple: `!genererpin Iniesta667ekip`');
      }

      const club = await prisma.club.findFirst();
      if (!club) {
        return message.reply('❌ Aucun club trouvé.');
      }

      const player = await prisma.player.findFirst({
        where: {
          clubId: club.id,
          name: {
            contains: playerName,
            mode: 'insensitive'
          }
        }
      });

      if (!player) {
        return message.reply(`❌ Joueur "${playerName}" introuvable.`);
      }

      // Générer un PIN aléatoire de 4 chiffres
      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      await prisma.player.update({
        where: { id: player.id },
        data: { pin }
      });

      await message.reply(
        `✅ **Code PIN généré !**\n\n` +
        `Joueur: **${player.name}**\n` +
        `Code PIN: **${pin}**\n\n` +
        `Le joueur peut récupérer son code avec `!moncode``
      );
    } catch (error) {
      console.error('Erreur !genererpin:', error);
      await message.reply('❌ Erreur lors de la génération du PIN.');
    }
  }

  // Commande: !lier - Lier un utilisateur Discord à un joueur
  if (command === 'lier') {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Cette commande est réservée aux admins.');
    }

    try {
      if (args.length < 2) {
        return message.reply('⚠️ Format: `!lier @utilisateur Nom_Du_Joueur`');
      }

      const mention = message.mentions.users.first();
      if (!mention) {
        return message.reply('❌ Vous devez mentionner un utilisateur Discord.');
      }

      const playerName = args.slice(1).join(' ');
      
      const club = await prisma.club.findFirst();
      if (!club) {
        return message.reply('❌ Aucun club trouvé.');
      }

      const player = await prisma.player.findFirst({
        where: {
          clubId: club.id,
          name: {
            contains: playerName,
            mode: 'insensitive'
          }
        }
      });

      if (!player) {
        return message.reply(`❌ Joueur "${playerName}" introuvable.`);
      }

      // Créer ou mettre à jour le mapping
      await prisma.discordPlayerMapping.upsert({
        where: {
          discordUsername: mention.username
        },
        create: {
          discordId: mention.id,
          discordUsername: mention.username,
          playerId: player.id
        },
        update: {
          discordId: mention.id,
          playerId: player.id
        }
      });

      await message.reply(
        `✅ **Lien créé !**\n\n` +
        `Discord: **${mention.username}**\n` +
        `Joueur: **${player.name}**\n\n` +
        `${mention} peut maintenant utiliser \`!moncode\` pour récupérer son PIN !`
      );
    } catch (error) {
      console.error('Erreur !lier:', error);
      await message.reply('❌ Erreur lors de la création du lien.');
    }
  }

  // Commande: !mappings - Voir tous les mappings
  if (command === 'mappings') {
    if (!isAdmin(message.member)) {
      return message.reply('❌ Cette commande est réservée aux admins.');
    }

    try {
      const mappings = await prisma.discordPlayerMapping.findMany({
        include: {
          player: true
        }
      });

      if (mappings.length === 0) {
        return message.reply('📊 Aucun mapping Discord \u2194 Joueur.');
      }

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🔗 Mappings Discord \u2194 Joueurs')
        .setDescription(`${mappings.length} lien(s) actif(s)`)
        .setTimestamp();

      mappings.forEach((mapping, index) => {
        embed.addFields({
          name: `${index + 1}. ${mapping.discordUsername}`,
          value: `Joueur: **${mapping.player.name}**\nPIN: ${mapping.player.pin ? '✅' : '❌'}`,
          inline: true
        });
      });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur !mappings:', error);
      await message.reply('❌ Erreur lors de la récupération des mappings.');
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
        { name: `${PREFIX}moncode`, value: 'Récupère ton code PIN personnel en message privé', inline: false },
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
      });

    // Ajouter les commandes admin si l'utilisateur est admin
    if (isAdmin(message.member)) {
      helpEmbed.addFields({
        name: '🔧 Commandes Admin',
        value: 
          ``${PREFIX}clear [nombre]` - Supprimer X messages (max 100)\n` +
          ``${PREFIX}clearall` - Nettoyer TOUT le canal\n` +
          ``${PREFIX}creersession` - Créer une session de vote\n` +
          ``${PREFIX}fermer [id]` - Fermer une session\n` +
          ``${PREFIX}ouvrir [id]` - Ouvrir une session\n` +
          ``${PREFIX}supprimer [id]` - Supprimer une session\n` +
          ``${PREFIX}genererpin [joueur]` - Générer un code PIN\n` +
          ``${PREFIX}lier @user [joueur]` - Lier Discord ↔ Joueur\n` +
          ``${PREFIX}mappings` - Voir tous les mappings`,
        inline: false
      });
    }

    helpEmbed.setFooter({ text: 'ClubStats Pro - Bot Discord avec boutons et synchronisation API' })
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
