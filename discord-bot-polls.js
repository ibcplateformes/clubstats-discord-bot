require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cron = require('node-cron');
const http = require('http');

// Serveur HTTP pour keep-alive
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    bot: 'Kay Voter Poll',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, () => {
  console.log(`🌐 Serveur HTTP démarré sur le port ${PORT}`);
});

// Configuration API
const API_URL = process.env.API_URL || 'https://clubstats-pro.onrender.com';
const API_KEY = process.env.API_KEY;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const PREFIX = '!';

// Vérifier les variables d'environnement
if (!API_KEY) {
  console.error('❌ ERREUR: API_KEY manquante dans les variables d\'environnement !');
  process.exit(1);
}

// Client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // Pour récupérer les membres
  ],
});

// ========================================
// FONCTIONS API
// ========================================

// Récupérer les sessions actives depuis l'API
async function getActiveSessions() {
  try {
    const response = await fetch(`${API_URL}/api/discord/sessions`, {
      headers: {
        'x-api-key': API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.sessions : [];
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des sessions:', error);
    return [];
  }
}

// Envoyer un vote à l'API
async function sendVoteToAPI(sessionId, discordId, discordUsername, response, comment = null) {
  try {
    const voteResponse = await fetch(`${API_URL}/api/discord/sync-vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        sessionId,
        discordId,
        discordUsername,
        response,
        comment
      })
    });

    if (!voteResponse.ok) {
      const error = await voteResponse.json();
      throw new Error(error.error || 'API error');
    }

    return await voteResponse.json();
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du vote:', error);
    throw error;
  }
}

// ========================================
// CRÉATION DES SONDAGES DISCORD
// ========================================

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });
}

function createPollEmbed(session) {
  const totalVotes = session.stats.total;
  const participationEmoji = totalVotes === 0 ? '📊' : 
                             totalVotes < 5 ? '🔴' : 
                             totalVotes < 10 ? '🟡' : '🟢';

  const embed = new EmbedBuilder()
    .setColor(totalVotes < 5 ? 0xFF0000 : totalVotes < 10 ? 0xFFA500 : 0x00FF00)
    .setTitle(`${getTypeIcon(session.type)} ${session.title}`)
    .setDescription(`**Clique sur un bouton ci-dessous pour voter !**`)
    .addFields(
      { name: '📅 Date', value: formatDate(session.date), inline: true },
      { name: '📍 Lieu', value: session.location || 'Non spécifié', inline: true },
      { name: `${participationEmoji} Votes`, value: `${totalVotes} vote(s)`, inline: true }
    );

  if (totalVotes > 0) {
    const stats = `✅ Présents: ${session.stats.present}\n❌ Absents: ${session.stats.absent}\n🟡 Retard: ${session.stats.late}\n❓ Peut-être: ${session.stats.maybe}`;
    embed.addFields({ name: '📊 Statistiques', value: stats, inline: false });
  }

  if (session.description) {
    embed.addFields({ name: '📝 Description', value: session.description, inline: false });
  }

  embed.setFooter({ text: `ID: ${session.id} | Aujourd'hui à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` })
       .setTimestamp();

  return embed;
}

function getTypeIcon(type) {
  const icons = {
    training: '🏋️',
    match: '⚽',
    tournament: '🏆',
    friendly: '🤝'
  };
  return icons[type] || '📅';
}

function createPollButtons(sessionId) {
  return new ActionRowBuilder()
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
        .setLabel('🟡 Retard')
        .setStyle(ButtonStyle.Primary)
    );
}

async function createPollForSession(channel, session) {
  const embed = createPollEmbed(session);
  const buttons = createPollButtons(session.id);

  await channel.send({
    content: `🗳️ **NOUVEAU SONDAGE** - Votez maintenant !`,
    embeds: [embed],
    components: [buttons]
  });
}

// ========================================
// GESTION DES VOTES (BOUTONS)
// ========================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  // Vérifier si c'est un bouton de vote
  if (!interaction.customId.startsWith('vote_')) return;

  const [, response, sessionId] = interaction.customId.split('_');
  const username = interaction.user.username;
  const userId = interaction.user.id;

  console.log(`📝 Vote reçu: ${username} (ID: ${userId}) -> ${response} pour session ${sessionId}`);

  try {
    // Envoyer le vote à l'API avec l'ID Discord
    const result = await sendVoteToAPI(sessionId, userId, username, response);

    if (result.success) {
      const responseText = {
        present: '✅ Présent',
        absent: '❌ Absent',
        late: '🟡 Retard'
      }[response];

      await interaction.reply({
        content: `✅ Ton vote **"${responseText}"** a été enregistré avec succès !`,
        ephemeral: true
      });

      console.log(`✅ Vote enregistré: ${username} -> ${response}`);

      // Mettre à jour le message du sondage
      await updatePollMessage(interaction.message, sessionId);
    } else {
      await interaction.reply({
        content: `❌ Erreur: ${result.error}`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors du vote:', error);
    await interaction.reply({
      content: '❌ Une erreur est survenue lors de l\'enregistrement de ton vote.',
      ephemeral: true
    });
  }
});

// Mettre à jour le message du sondage avec les nouvelles stats
async function updatePollMessage(message, sessionId) {
  try {
    const sessions = await getActiveSessions();
    const session = sessions.find(s => s.id === sessionId);

    if (!session) return;

    const embed = createPollEmbed(session);
    const buttons = createPollButtons(session.id);

    await message.edit({
      embeds: [embed],
      components: [buttons]
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du sondage:', error);
  }
}

// ========================================
// COMMANDES
// ========================================

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Commande: !polls - Créer des sondages pour toutes les sessions actives
  if (command === 'polls' || command === 'sondages') {
    try {
      const sessions = await getActiveSessions();

      if (sessions.length === 0) {
        return message.reply('ℹ️ Aucune session active pour le moment.');
      }

      await message.reply(`📊 Création de ${sessions.length} sondage(s)...`);

      for (const session of sessions) {
        await createPollForSession(message.channel, session);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await message.react('✅');
    } catch (error) {
      console.error('Erreur:', error);
      await message.reply('❌ Erreur lors de la création des sondages.');
    }
  }

  // Commande: !sessions - Liste des sessions
  if (command === 'sessions') {
    try {
      const sessions = await getActiveSessions();

      if (sessions.length === 0) {
        return message.reply('ℹ️ Aucune session active pour le moment.');
      }

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📋 Sessions de vote actives')
        .setDescription(`${sessions.length} session(s) disponible(s)`)
        .setTimestamp();

      sessions.forEach((session, index) => {
        embed.addFields({
          name: `${index + 1}. ${session.title}`,
          value: `📅 ${formatDate(session.date)}\n📊 Votes: ${session.stats.total}\n✅ ${session.stats.present} | ❌ ${session.stats.absent} | 🟡 ${session.stats.late}`,
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
      .setDescription('Commandes disponibles :')
      .addFields(
        { name: `${PREFIX}polls`, value: 'Créer des sondages avec boutons pour toutes les sessions actives', inline: false },
        { name: `${PREFIX}sessions`, value: 'Afficher la liste des sessions actives', inline: false },
        { name: `${PREFIX}aide`, value: 'Afficher ce message', inline: false }
      )
      .setFooter({ text: 'ClubStats Pro - Bot Discord avec Sondages' })
      .setTimestamp();

    await message.reply({ embeds: [helpEmbed] });
  }
});

// ========================================
// RAPPELS AUTOMATIQUES
// ========================================

async function sendAutomaticPolls() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) {
      console.error('❌ Canal introuvable');
      return;
    }

    const sessions = await getActiveSessions();

    if (sessions.length === 0) {
      console.log('ℹ️ Aucune session active, pas de rappel envoyé');
      return;
    }

    await channel.send('🔔 **RAPPEL AUTOMATIQUE** - N\'oubliez pas de voter !');

    for (const session of sessions) {
      await createPollForSession(channel, session);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ ${sessions.length} sondage(s) envoyé(s) automatiquement`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi automatique:', error);
  }
}

// Programmer les rappels automatiques
function startAutomaticPolls() {
  // 10h00
  cron.schedule('0 10 * * *', () => {
    console.log('\n⏰ Rappel automatique 10h00');
    sendAutomaticPolls();
  }, { timezone: "Europe/Paris" });

  // 14h00
  cron.schedule('0 14 * * *', () => {
    console.log('\n⏰ Rappel automatique 14h00');
    sendAutomaticPolls();
  }, { timezone: "Europe/Paris" });

  // 18h00
  cron.schedule('0 18 * * *', () => {
    console.log('\n⏰ Rappel automatique 18h00');
    sendAutomaticPolls();
  }, { timezone: "Europe/Paris" });

  console.log('✅ Rappels automatiques programmés');
}

// ========================================
// SYNCHRONISATION DES MEMBRES DISCORD
// ========================================

async function syncDiscordMembers() {
  try {
    console.log('👥 Synchronisation des membres Discord...');
    
    // Récupérer tous les serveurs (guilds) du bot
    const guilds = client.guilds.cache;
    
    if (guilds.size === 0) {
      console.log('⚠️  Le bot n'est dans aucun serveur');
      return;
    }

    // Prendre le premier serveur (en général il n'y en a qu'un)
    const guild = guilds.first();
    
    if (!guild) return;

    console.log(`🏛️  Serveur: ${guild.name} (${guild.memberCount} membres)`);

    // Récupérer tous les membres
    await guild.members.fetch();
    
    const members = guild.members.cache
      .filter(member => !member.user.bot) // Exclure les bots
      .map(member => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.displayName,
        avatar: member.user.displayAvatarURL()
      }));

    console.log(`👤 ${members.length} membres récupérés (hors bots)`);

    // Envoyer à l'API
    const response = await fetch(`${API_URL}/api/discord/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ members })
    });

    if (response.ok) {
      console.log(`✅ Membres synchronisés avec l'API`);
    } else {
      console.error('❌ Erreur lors de la synchronisation:', response.status);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des membres:', error);
  }
}

// ========================================
// NETTOYAGE AUTOMATIQUE DES SESSIONS
// ========================================

async function archiveOldSessions() {
  try {
    console.log('\n🧹 Nettoyage automatique des sessions passées...');
    
    const response = await fetch(`${API_URL}/api/cron/archive-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ ${result.archived} session(s) archivée(s)`);
      
      // Envoyer un message dans le canal si des sessions ont été archivées
      if (result.archived > 0 && CHANNEL_ID) {
        try {
          const channel = await client.channels.fetch(CHANNEL_ID);
          if (channel) {
            await channel.send(`🧹 Nettoyage automatique : ${result.archived} session(s) passée(s) archivée(s).`);
          }
        } catch (channelError) {
          console.log('ℹ️ Impossible d\'envoyer le message de nettoyage dans le canal');
        }
      }
    } else {
      console.error('❌ Erreur lors de l\'archivage:', response.status);
    }
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

// Programmer le nettoyage automatique
function startAutomaticCleanup() {
  // Tous les jours à 6h du matin
  cron.schedule('0 6 * * *', () => {
    console.log('\n⏰ Déclenchement du nettoyage automatique (6h00)');
    archiveOldSessions();
  }, {
    timezone: "Europe/Paris"
  });

  console.log('✅ Nettoyage automatique programmé (6h00 tous les jours)');
}

// ========================================
// DÉMARRAGE
// ========================================

client.once('ready', () => {
  console.log('🤖 Bot Discord prêt !');
  console.log(`📝 Connecté en tant que ${client.user.tag}`);
  console.log(`🔧 API: ${API_URL}`);
  console.log(`📢 Canal: ${CHANNEL_ID}`);
  console.log('✅ Le bot est opérationnel !');
  console.log('');
  console.log('⏰ Rappels automatiques : 10h, 14h, 18h (heure de Paris)');
  console.log('🧹 Nettoyage automatique : 6h00 (heure de Paris)');
  console.log('');
  
  // Synchroniser les membres Discord au démarrage
  syncDiscordMembers();
  
  startAutomaticPolls();
  startAutomaticCleanup();
});

client.login(process.env.DISCORD_BOT_TOKEN);

// Gestion des erreurs
process.on('unhandledRejection', error => {
  console.error('❌ Erreur non gérée:', error);
});

process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du bot...');
  client.destroy();
  process.exit(0);
});
