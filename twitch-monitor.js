// Module de surveillance des lives Twitch
// Vérifie toutes les 3 minutes si un joueur est en live

// Import de node-fetch pour les requêtes HTTP
const fetch = require('node-fetch');

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const TWITCH_CHECK_INTERVAL = 3 * 60 * 1000; // 3 minutes
const CLUBSTATS_API_URL = process.env.CLUBSTATS_API_URL || 'https://clubstats-pro.onrender.com';

// DEBUG - Log pour vérifier les credentials
console.log('🔐 DEBUG Twitch credentials:');
console.log('  CLIENT_ID présent:', !!TWITCH_CLIENT_ID);
console.log('  CLIENT_ID (10 premiers):', TWITCH_CLIENT_ID ? TWITCH_CLIENT_ID.substring(0, 10) : 'MISSING');
console.log('  CLIENT_SECRET présent:', !!TWITCH_CLIENT_SECRET);
console.log('  CLIENT_SECRET (10 premiers):', TWITCH_CLIENT_SECRET ? TWITCH_CLIENT_SECRET.substring(0, 10) : 'MISSING');

let checkInterval = null;
let twitchAccessToken = null;
let tokenExpiresAt = null;

// Fonction pour obtenir un token d'accès Twitch
async function getTwitchAccessToken() {
  if (twitchAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return twitchAccessToken;
  }

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
    });

    if (!response.ok) {
      throw new Error(`Twitch OAuth error: ${response.status}`);
    }

    const data = await response.json();
    twitchAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;

    return twitchAccessToken;
  } catch (error) {
    console.error('Error getting Twitch access token:', error);
    return null;
  }
}

async function checkChannelLive(channelName) {
  try {
    const token = await getTwitchAccessToken();
    if (!token) return null;

    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${channelName}`,
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      console.error(`Twitch API error for ${channelName}:`, response.status);
      return null;
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const stream = data.data[0];
      return {
        isLive: true,
        streamId: stream.id,
        title: stream.title,
        gameName: stream.game_name,
        viewerCount: stream.viewer_count,
        thumbnailUrl: stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'),
        channelName: stream.user_name,
        startedAt: stream.started_at
      };
    }

    return { isLive: false };
  } catch (error) {
    console.error(`Error checking Twitch channel ${channelName}:`, error);
    return null;
  }
}

async function getActiveChannels() {
  try {
    const response = await fetch(`${CLUBSTATS_API_URL}/api/twitch/channels`);
    if (!response.ok) {
      console.error('Failed to fetch Twitch channels:', response.status);
      return [];
    }

    const channels = await response.json();
    return channels.filter(ch => ch.isActive);
  } catch (error) {
    console.error('Error fetching active Twitch channels:', error);
    return [];
  }
}

async function sendLiveNotification(client, channelData, liveData) {
  const DISCORD_CHANNEL_ID = '1219280175594995723';

  try {
    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    if (!channel) {
      console.error('Discord channel not found');
      return;
    }

    const embed = {
      color: 0x9146FF,
      title: '🟣 LIVE TWITCH EN COURS !',
      description: `**${channelData.player.name}** est en direct sur Twitch !`,
      fields: [
        {
          name: '🎮 Titre',
          value: liveData.title,
          inline: false
        },
        {
          name: '🕹️ Jeu',
          value: liveData.gameName || 'Non spécifié',
          inline: true
        },
        {
          name: '👥 Viewers',
          value: liveData.viewerCount.toString(),
          inline: true
        }
      ],
      image: {
        url: liveData.thumbnailUrl
      },
      footer: {
        text: 'HOF 221 - Heart of Football'
      },
      timestamp: new Date().toISOString()
    };

    await channel.send({
      content: `@everyone 🟣 **${channelData.player.name}** est en LIVE sur Twitch !`,
      embeds: [embed],
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 5,
          label: '▶️ REGARDER LE LIVE',
          url: `https://twitch.tv/${channelData.channelName}`
        }]
      }]
    });

    console.log(`✅ Notification Twitch envoyée pour ${channelData.player.name}`);
    await updateChannelStatus(channelData.id, liveData);
  } catch (error) {
    console.error('Error sending Twitch live notification:', error);
  }
}

async function updateChannelStatus(channelId, liveData) {
  try {
    await fetch(`${CLUBSTATS_API_URL}/api/twitch/channels/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channelId,
        lastLiveId: liveData.streamId,
        lastLiveTitle: liveData.title,
        lastGameName: liveData.gameName,
        lastLiveStarted: liveData.startedAt,
        notifiedAt: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Error updating Twitch channel status:', error);
  }
}

async function checkAllChannels(client) {
  console.log('🔍 Vérification des lives Twitch...');

  const channels = await getActiveChannels();

  if (channels.length === 0) {
    console.log('ℹ️ Aucune chaîne Twitch à surveiller');
    return;
  }

  console.log(`🟣 Surveillance de ${channels.length} chaîne(s) Twitch`);

  for (const channelData of channels) {
    const liveStatus = await checkChannelLive(channelData.channelName);

    if (liveStatus && liveStatus.isLive) {
      const shouldNotify = !channelData.lastLiveId ||
                          channelData.lastLiveId !== liveStatus.streamId ||
                          !channelData.notifiedAt ||
                          (new Date() - new Date(channelData.notifiedAt)) > 60 * 60 * 1000;

      if (shouldNotify) {
        console.log(`🟣 ${channelData.player.name} est EN LIVE sur Twitch !`);
        await sendLiveNotification(client, channelData, liveStatus);
      } else {
        console.log(`ℹ️ ${channelData.player.name} est toujours en live Twitch (déjà notifié)`);
      }
    }
  }

  console.log('✅ Vérification Twitch terminée');
}

function startTwitchMonitoring(client) {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.error('❌ TWITCH_CLIENT_ID ou TWITCH_CLIENT_SECRET non configurés !');
    return;
  }

  console.log('🟣 Démarrage de la surveillance Twitch...');
  console.log(`⏱️ Vérification toutes les ${TWITCH_CHECK_INTERVAL / 1000 / 60} minutes`);

  checkAllChannels(client);

  checkInterval = setInterval(() => {
    checkAllChannels(client);
  }, TWITCH_CHECK_INTERVAL);
}

function stopTwitchMonitoring() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('⏹️ Surveillance Twitch arrêtée');
  }
}

module.exports = {
  startTwitchMonitoring,
  stopTwitchMonitoring,
  checkAllChannels
};
