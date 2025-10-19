require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

const prisma = new PrismaClient();

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

// Quand le bot est prêt
client.once('ready', () => {
  console.log('🤖 Bot Discord prêt !');
  console.log(`📝 Connecté en tant que ${client.user.tag}`);
  console.log(`🔧 Préfixe des commandes: ${PREFIX}`);
  console.log(`📢 Canal de rappels: ${CHANNEL_ID}`);
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

// Fonction pour créer un embed Discord élégant
function createSessionEmbed(session) {
  const participationRate = session.totalPlayers > 0 
    ? Math.round((session.totalVotes / session.totalPlayers) * 100)
    : 0;

  const voteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3003'}/vote/${session.id}`;

  const embed = new EmbedBuilder()
    .setColor(participationRate < 50 ? 0xFF0000 : participationRate < 80 ? 0xFFA500 : 0x00FF00)
    .setTitle(`🗳️ ${session.title}`)
    .setDescription(`${session.description || 'Session de vote active'}\n\n🔗 **[CLIQUEZ ICI POUR VOTER](${voteLink})**`)
    .addFields(
      { name: '📅 Date', value: formatDate(session.date), inline: true },
      { name: '📍 Lieu', value: session.location || 'Non spécifié', inline: true },
      { name: '📊 Participation', value: `${participationRate}% (${session.totalVotes}/${session.totalPlayers})`, inline: true }
    )
    .setFooter({ text: `ID: ${session.id} • Total: ${session.totalPlayers} joueurs` })
    .setTimestamp();

  // Ajouter la liste des joueurs qui ONT voté
  if (session.votes && session.votes.length > 0) {
    const votedList = session.votes
      .slice(0, 25)
      .map(v => `✅ ${v.player.name}`)
      .join('\n');
    
    embed.addFields({
      name: `✅ Ont déjà voté (${session.totalVotes})`,
      value: votedList || 'Aucun',
      inline: false
    });

    if (session.votes.length > 25) {
      embed.addFields({
        name: '➕ Plus...',
        value: `... et ${session.votes.length - 25} autres joueurs ont voté`
      });
    }
  }

  // Ajouter la liste des joueurs manquants (max 25)
  if (session.missingPlayers.length > 0) {
    const missingList = session.missingPlayers
      .slice(0, 25)
      .map(p => `❌ ${p.name}`)
      .join('\n');
    
    embed.addFields({
      name: `❌ N'ont pas encore voté (${session.missingPlayers.length})`,
      value: missingList || 'Aucun',
      inline: false
    });

    if (session.missingPlayers.length > 25) {
      embed.addFields({
        name: '➕ Plus...',
        value: `... et ${session.missingPlayers.length - 25} autres joueurs n'ont pas voté`
      });
    }
  }

  return embed;
}

// Fonction pour envoyer les rappels automatiques
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
        pingMessage += `📊 Participation actuelle : **${participationRate}%** (${session.totalVotes}/${session.totalPlayers})\n`;
        pingMessage += `✅ **${session.totalVotes} ont voté** • ❌ **${session.missingPlayers.length} manquants**\n\n`;
        pingMessage += `🔗 **Lien de vote :** ${voteLink}\n\n`;
        pingMessage += `⏰ **N'oubliez pas de voter !**`;

        await channel.send({ content: pingMessage, embeds: [embed] });
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
  console.log(`📨 Message reçu: "${message.content}" de ${message.author.tag}`);
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  
  console.log(`✅ Commande détectée: ${message.content}`);

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Commande: !rappel
  if (command === 'rappel') {
    try {
      await message.reply('🔄 Envoi d\'un rappel manuel...');
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
        pingMessage += `📊 Participation : **${participationRate}%** (${session.totalVotes}/${session.totalPlayers})\n`;
        pingMessage += `✅ **${session.totalVotes} ont voté** • ❌ **${session.missingPlayers.length} manquants**\n\n`;
        pingMessage += `🔗 **Lien de vote :** ${voteLink}\n\n`;
        pingMessage += `⏰ **N'oubliez pas de voter !**`;

        await message.channel.send({ content: pingMessage, embeds: [embed] });
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
        { name: `${PREFIX}rappel`, value: 'Envoie un rappel manuel immédiat pour toutes les sessions actives', inline: false },
        { name: `${PREFIX}sessions`, value: 'Affiche la liste de toutes les sessions de vote actives', inline: false },
        { name: `${PREFIX}aide`, value: 'Affiche ce message d\'aide', inline: false }
      )
      .addFields({
        name: '⏰ Rappels automatiques',
        value: 'Le bot envoie des rappels automatiques 3 fois par jour :\n• 10h00\n• 14h00\n• 18h00\n\n(uniquement si des joueurs n\'ont pas encore voté)',
        inline: false
      })
      .setFooter({ text: 'ClubStats Pro - Bot Discord' })
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
  process.exit(0);
});
