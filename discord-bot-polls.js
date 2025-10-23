require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cron = require('node-cron');
const http = require('http');

// Serveur HTTP pour keep-alive et webhooks
const PORT = process.env.PORT || 10000;
const server = http.createServer(async (req, res) => {
  // Webhook pour recevoir les notifications de sessions
  if (req.method === 'POST' && req.url === '/webhook/session') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { sessionId, action } = data;
        
        console.log(`🔔 Notification reçue: ${action} - Session ${sessionId}`);
        
        // Créer ou mettre à jour le sondage Discord
        if (action === 'created' || action === 'updated') {
          await handleSessionNotification(sessionId);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('❌ Erreur webhook:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Internal error' }));
      }
    });
  } else {
    // Keep-alive endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      bot: 'Kay Voter Poll',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  }
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
    GatewayIntentBits.GuildMembers,
  ],
});

// ========================================
// FONCTIONS API
// ========================================

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

async function createSessionOnSite(title, type, date, location, description = null) {
  try {
    const response = await fetch(`${API_URL}/api/vote-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({
        title,
        type,
        date,
        location,
        description
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API error');
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Erreur lors de la création de la session:', error);
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
    
    // Ajouter la liste des votants
    if (session.voters && session.voters.length > 0) {
      const presentVoters = session.voters.filter(v => v.response === 'present').map(v => v.name);
      const absentVoters = session.voters.filter(v => v.response === 'absent').map(v => v.name);
      const lateVoters = session.voters.filter(v => v.response === 'late').map(v => v.name);
      
      let votersList = '';
      if (presentVoters.length > 0) {
        votersList += `✅ **Présents (${presentVoters.length}):**\n${presentVoters.join(', ')}\n\n`;
      }
      if (lateVoters.length > 0) {
        votersList += `🟡 **En retard (${lateVoters.length}):**\n${lateVoters.join(', ')}\n\n`;
      }
      if (absentVoters.length > 0) {
        votersList += `❌ **Absents (${absentVoters.length}):**\n${absentVoters.join(', ')}`;
      }
      
      if (votersList) {
        embed.addFields({ name: '👥 Liste des votes', value: votersList, inline: false });
      }
    }
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
// GESTION DES NOTIFICATIONS DE SESSIONS
// ========================================

async function handleSessionNotification(sessionId) {
  try {
    console.log(`📢 Création du sondage pour la session ${sessionId}...`);
    
    const sessions = await getActiveSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      console.error(`❌ Session ${sessionId} introuvable`);
      return;
    }
    
    if (!CHANNEL_ID) {
      console.error('❌ CHANNEL_ID non configuré');
      return;
    }
    
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) {
      console.error('❌ Canal Discord introuvable');
      return;
    }
    
    await createPollForSession(channel, session);
    console.log(`✅ Sondage créé automatiquement pour: ${session.title}`);
  } catch (error) {
    console.error('❌ Erreur lors de la création automatique du sondage:', error);
  }
}

// ========================================
// GESTION DES VOTES (BOUTONS)
// ========================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (!interaction.customId.startsWith('vote_')) return;

  const [, response, sessionId] = interaction.customId.split('_');
  const username = interaction.user.username;
  const userId = interaction.user.id;

  console.log(`📝 Vote reçu: ${username} (ID: ${userId}) -> ${response} pour session ${sessionId}`);

  try {
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

  // Commande: !createpoll - Créer une session depuis Discord
  if (command === 'createpoll' || command === 'createsession') {
    try {
      const fullText = message.content.slice(PREFIX.length + command.length).trim();
      
      if (!fullText) {
        return message.reply(`❌ **Format invalide !**\n\nUtilise ce format :\n\`!createpoll Titre, AAAA-MM-JJ HH:MM, Lieu\`\n\n**Exemple :**\n\`!createpoll Match vs FC Goro, 2025-10-25 15:00, Stade Municipal\``);
      }
      
      const parts = fullText.split(',').map(p => p.trim());
      
      if (parts.length < 3) {
        return message.reply(`❌ **Format invalide !**\n\nIl manque des informations. Utilise ce format :\n\`!createpoll Titre, AAAA-MM-JJ HH:MM, Lieu\`\n\n**Exemple :**\n\`!createpoll Match vs FC Goro, 2025-10-25 15:00, Stade Municipal\``);
      }
      
      const title = parts[0];
      const dateStr = parts[1];
      const location = parts[2];
      
      // Valider et parser la date
      const dateRegex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/;
      const match = dateStr.match(dateRegex);
      
      if (!match) {
        return message.reply(`❌ **Format de date invalide !**\n\nUtilise le format : \`AAAA-MM-JJ HH:MM\`\n\n**Exemple :**\n\`2025-10-25 15:00\``);
      }
      
      const [, year, month, day, hour, minute] = match;
      const sessionDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00.000Z`);
      
      if (isNaN(sessionDate.getTime())) {
        return message.reply(`❌ **Date invalide !**\n\nVérifie que la date est correcte.`);
      }
      
      // Déterminer le type automatiquement selon des mots-clés
      let type = 'training';
      const titleLower = title.toLowerCase();
      if (titleLower.includes('match') || titleLower.includes('vs')) {
        type = 'match';
      } else if (titleLower.includes('tournoi') || titleLower.includes('tournament')) {
        type = 'tournament';
      } else if (titleLower.includes('amical') || titleLower.includes('friendly')) {
        type = 'friendly';
      }
      
      await message.reply('⏳ Création de la session en cours...');
      
      const result = await createSessionOnSite(title, type, sessionDate.toISOString(), location);
      
      if (result.success || result.session) {
        const sessionId = result.session?.id || result.id;
        
        const sessions = await getActiveSessions();
        const session = sessions.find(s => s.id === sessionId);
        
        if (session) {
          await createPollForSession(message.channel, session);
          await message.reply(`✅ **Session créée avec succès !**\n📝 ID: \`${sessionId}\`\n🗳️ Le sondage a été créé ci-dessus.`);
        } else {
          await message.reply(`✅ Session créée sur le site (ID: \`${sessionId}\`)\n⚠️ Utilise \`!polls\` pour créer le sondage.`);
        }
      }
    } catch (error) {
      console.error('Erreur création session:', error);
      await message.reply(`❌ **Erreur lors de la création de la session.**\n\nDétails : ${error.message}`);
    }
  }

  // Commande: !polls
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
        { name: `${PREFIX}createpoll`, value: 'Créer une nouvelle session de vote\nFormat : `!createpoll Titre, AAAA-MM-JJ HH:MM, Lieu`\nExemple : `!createpoll Match vs FC Goro, 2025-10-25 15:00, Stade`', inline: false },
        { name: `${PREFIX}polls`, value: 'Créer des sondages avec boutons pour toutes les sessions actives', inline: false },
        { name: `${PREFIX}sessions`, value: 'Afficher la liste des sessions actives', inline: false },
        { name: `${PREFIX}moncode`, value: 'Recevoir ton code PIN pour voter sur le site (message privé)', inline: false },
        { name: `${PREFIX}aide`, value: 'Afficher ce message', inline: false }
      )
      .setFooter({ text: 'ClubStats Pro - Bot Discord avec Sondages' })
      .setTimestamp();

    await message.reply({ embeds: [helpEmbed] });
  }

  // Commande: !moncode - Obtenir son code PIN
  if (command === 'moncode' || command === 'pin' || command === 'code') {
    try {
      const discordId = message.author.id;
      const username = message.author.username;

      // Récupérer le code PIN depuis l'API
      const response = await fetch(`${API_URL}/api/discord/get-pin?discordId=${discordId}`, {
        headers: {
          'x-api-key': API_KEY
        }
      });

      if (!response.ok) {
        const error = await response.json();
        return message.reply(`❌ ${error.error || 'Impossible de récupérer ton code PIN.'}`);
      }

      const data = await response.json();

      if (data.success && data.pin) {
        // Envoyer le code en message privé
        try {
          await message.author.send(
            `🔐 **Ton code PIN pour voter**\n\n` +
            `👤 Compte Discord : ${username}\n` +
            `🎮 Joueur mappé : ${data.playerName}\n` +
            `🔢 **Code PIN : `${data.pin}`**\n\n` +
            `Utilise ce code sur ${API_URL} pour voter aux sessions !\n\n` +
            `⚠️ Ne partage jamais ce code avec quelqu'un d'autre.`
          );
          await message.reply('✅ Je t\'ai envoyé ton code PIN en message privé !');
        } catch (dmError) {
          // Si impossible d'envoyer en DM, répondre publiquement (risqué mais mieux que rien)
          await message.reply(
            `❌ Je ne peux pas t'envoyer de message privé.\n` +
            `🔐 Ton code PIN : ||${data.pin}|| (clique pour révéler)\n` +
            `⚠️ Supprime ce message après l'avoir noté !`
          );
        }
      } else {
        await message.reply(
          `❌ **Aucun code PIN trouvé**\n\n` +
          `Tu n'es pas encore mappé à un joueur du site.\n` +
          `Demande à un admin de te mapper sur ${API_URL}/dashboard/discord`
        );
      }
    } catch (error) {
      console.error('Erreur récupération PIN:', error);
      await message.reply('❌ Erreur lors de la récupération de ton code PIN.');
    }
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

function startAutomaticPolls() {
  cron.schedule('0 10 * * *', () => {
    console.log('\n⏰ Rappel automatique 10h00');
    sendAutomaticPolls();
  }, { timezone: "Europe/Paris" });

  cron.schedule('0 14 * * *', () => {
    console.log('\n⏰ Rappel automatique 14h00');
    sendAutomaticPolls();
  }, { timezone: "Europe/Paris" });

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
    
    const guilds = client.guilds.cache;
    
    if (guilds.size === 0) {
      console.log('⚠️  Le bot n\'est dans aucun serveur');
      return;
    }

    const guild = guilds.first();
    
    if (!guild) return;

    console.log(`🏛️  Serveur: ${guild.name} (${guild.memberCount} membres)`);

    await guild.members.fetch();
    
    const members = guild.members.cache
      .filter(member => !member.user.bot)
      .map(member => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.displayName,
        avatar: member.user.displayAvatarURL()
      }));

    console.log(`👤 ${members.length} membres récupérés (hors bots)`);

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

function startAutomaticCleanup() {
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
  
  syncDiscordMembers();
  
  startAutomaticPolls();
  startAutomaticCleanup();
});

client.login(process.env.DISCORD_BOT_TOKEN);

process.on('unhandledRejection', error => {
  console.error('❌ Erreur non gérée:', error);
});

process.on('SIGINT', () => {
  console.log('\n👋 Arrêt du bot...');
  client.destroy();
  process.exit(0);
});
