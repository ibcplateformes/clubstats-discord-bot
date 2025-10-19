require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');

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
const PREFIX = '!'; // Préfixe pour les commandes
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID; // ID du canal où envoyer les messages

// Quand le bot est prêt
client.once('ready', () => {
  console.log('🤖 Bot Discord prêt !');
  console.log(`📝 Connecté en tant que ${client.user.tag}`);
  console.log(`🔧 Préfixe des commandes: ${PREFIX}`);
  console.log('✅ Le bot est opérationnel !');
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

  const embed = new EmbedBuilder()
    .setColor(participationRate < 50 ? 0xFF0000 : participationRate < 80 ? 0xFFA500 : 0x00FF00)
    .setTitle(`🗳️ ${session.title}`)
    .setDescription(session.description || 'Session de vote active')
    .addFields(
      { name: '📅 Date', value: formatDate(session.date), inline: true },
      { name: '📍 Lieu', value: session.location || 'Non spécifié', inline: true },
      { name: '📊 Participation', value: `${participationRate}% (${session.totalVotes}/${session.totalPlayers})`, inline: true }
    )
    .addFields(
      { name: '✅ Ont voté', value: `${session.totalVotes} joueurs`, inline: true },
      { name: '❌ Manquants', value: `${session.missingPlayers.length} joueurs`, inline: true }
    )
    .setFooter({ text: `ID: ${session.id}` })
    .setTimestamp();

  // Ajouter la liste des joueurs manquants (max 25)
  if (session.missingPlayers.length > 0) {
    const missingList = session.missingPlayers
      .slice(0, 25)
      .map(p => `• ${p.name}`)
      .join('\n');
    
    embed.addFields({
      name: '👥 Joueurs n\'ayant pas encore voté',
      value: missingList || 'Aucun'
    });

    if (session.missingPlayers.length > 25) {
      embed.addFields({
        name: '⚠️',
        value: `... et ${session.missingPlayers.length - 25} autres joueurs`
      });
    }
  }

  // Ajouter le lien de vote
  const voteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/vote/${session.id}`;
  embed.addFields({
    name: '🔗 Lien de vote',
    value: voteLink
  });

  return embed;
}

// Commande: !rappel - Envoie un rappel pour toutes les sessions actives
client.on('messageCreate', async (message) => {
  // Ignorer les messages du bot lui-même
  if (message.author.bot) return;

  // Ignorer les messages qui ne commencent pas par le préfixe
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Commande: !rappel
  if (command === 'rappel') {
    try {
      await message.reply('🔄 Récupération des sessions actives...');

      const sessions = await getActiveSessions();

      if (sessions.length === 0) {
        return message.channel.send('ℹ️ Aucune session active pour le moment.');
      }

      // Envoyer un message pour chaque session
      for (const session of sessions) {
        const embed = createSessionEmbed(session);
        
        // Message de ping pour les joueurs manquants
        let pingMessage = '🔔 **RAPPEL DE VOTE** 🔔\n\n';
        
        if (session.missingPlayers.length > 0) {
          pingMessage += `Les joueurs suivants n'ont pas encore voté pour **${session.title}** :\n\n`;
          pingMessage += session.missingPlayers.map(p => `• ${p.name}`).join('\n');
          pingMessage += '\n\n⏰ **N\'oubliez pas de voter !**';
        }

        await message.channel.send({ content: pingMessage, embeds: [embed] });
      }

      await message.react('✅');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rappel:', error);
      await message.reply('❌ Erreur lors de l\'envoi du rappel.');
    }
  }

  // Commande: !sessions - Liste toutes les sessions actives
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
        { name: `${PREFIX}rappel`, value: 'Envoie un rappel de vote pour toutes les sessions actives avec la liste des joueurs manquants', inline: false },
        { name: `${PREFIX}sessions`, value: 'Affiche la liste de toutes les sessions de vote actives', inline: false },
        { name: `${PREFIX}aide`, value: 'Affiche ce message d\'aide', inline: false }
      )
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

// Export pour utilisation dans d'autres fichiers
module.exports = { client, getActiveSessions, createSessionEmbed };
