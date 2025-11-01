// Module de surveillance des lives YouTube
// Vérifie toutes les 3 minutes si un joueur est en live

// Import de node-fetch pour les requêtes HTTP
const fetch = require('node-fetch');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHECK_INTERVAL = 3 * 60 * 1000; // 3 minutes
const CLUBSTATS_API_URL = process.env.CLUBSTATS_API_URL || 'https://clubstats-pro.onrender.com';

let checkInterval = null;

// Fonction pour vérifier si une chaîne est en live
async function checkChannelLive(channelId) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=live&key=${YOUTUBE_API_KEY}`
    );
    
    if (!response.ok) {
      console.error(`YouTube API error for ${channelId}:`, response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const live = data.items[0];
      return {
        isLive: true,
        videoId: live.id.videoId,
        title: live.snippet.title,
        thumbnail: live.snippet.thumbnails.high.url,
        channelName: live.snippet.channelTitle
      };
    }
    
    return { isLive: false };
  } catch (error) {
    console.error(`Error checking channel ${channelId}:`, error);
    return null;
  }
}

// Fonction pour récupérer les chaînes YouTube actives depuis l'API
async function getActiveChannels() {
  try {
    const response = await fetch(`${CLUBSTATS_API_URL}/api/youtube/channels`);
    if (!response.ok) {
      console.error('Failed to fetch YouTube channels:', response.status);
      return [];
    }
    
    const channels = await response.json();
    return channels.filter(ch => ch.isActive);
  } catch (error) {
    console.error('Error fetching active channels:', error);
    return [];
  }
}

// Fonction pour envoyer une notification Discord
async function sendLiveNotification(client, channelData, liveData) {
  const DISCORD_CHANNEL_ID = '1219280175594995723'; // #streams-📺
  
  try {
    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    
    if (!channel) {
      console.error('Discord channel not found');
      return;
    }

    const embed = {
      color: 0xFF0000, // Rouge pour LIVE
      title: '🔴 LIVE EN COURS !',
      description: `**${channelData.player.name}** est en direct sur YouTube !`,
      fields: [
        {
          name: '🎮 Titre',
          value: liveData.title,
          inline: false
        },
        {
          name: '📺 Chaîne',
          value: liveData.channelName,
          inline: true
        }
      ],
      thumbnail: {
        url: liveData.thumbnail
      },
      footer: {
        text: 'HOF 221 - Heart of Football'
      },
      timestamp: new Date().toISOString()
    };

    const message = await channel.send({
      content: `@everyone 🔴 **${channelData.player.name}** est en LIVE !`,
      embeds: [embed],
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 5,
          label: '▶️ REGARDER LE LIVE',
          url: `https://www.youtube.com/watch?v=${liveData.videoId}`
        }]
      }]
    });

    console.log(`✅ Notification envoyée pour ${channelData.player.name}`);
    
    // Mettre à jour la base de données
    await updateChannelStatus(channelData.id, liveData);
    
  } catch (error) {
    console.error('Error sending live notification:', error);
  }
}

// Fonction pour mettre à jour le statut d'une chaîne
async function updateChannelStatus(channelId, liveData) {
  try {
    await fetch(`${CLUBSTATS_API_URL}/api/youtube/channels/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channelId,
        lastLiveId: liveData.videoId,
        lastLiveTitle: liveData.title,
        lastLiveStarted: new Date().toISOString(),
        notifiedAt: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Error updating channel status:', error);
  }
}

// Fonction principale de vérification
async function checkAllChannels(client) {
  console.log('🔍 Vérification des lives YouTube...');
  
  const channels = await getActiveChannels();
  
  if (channels.length === 0) {
    console.log('ℹ️ Aucune chaîne YouTube à surveiller');
    return;
  }

  console.log(`📺 Surveillance de ${channels.length} chaîne(s)`);
  
  for (const channelData of channels) {
    const liveStatus = await checkChannelLive(channelData.channelId);
    
    if (liveStatus && liveStatus.isLive) {
      // Vérifier si on a déjà notifié pour ce live
      const shouldNotify = !channelData.lastLiveId || 
                          channelData.lastLiveId !== liveStatus.videoId ||
                          !channelData.notifiedAt ||
                          (new Date() - new Date(channelData.notifiedAt)) > 60 * 60 * 1000; // 1 heure
      
      if (shouldNotify) {
        console.log(`🔴 ${channelData.player.name} est EN LIVE !`);
        await sendLiveNotification(client, channelData, liveStatus);
      } else {
        console.log(`ℹ️ ${channelData.player.name} est toujours en live (déjà notifié)`);
      }
    }
  }
  
  console.log('✅ Vérification terminée');
}

// Démarrer la surveillance
function startYouTubeMonitoring(client) {
  if (!YOUTUBE_API_KEY) {
    console.error('❌ YOUTUBE_API_KEY non configurée !');
    return;
  }

  console.log('🎬 Démarrage de la surveillance YouTube...');
  console.log(`⏱️ Vérification toutes les ${YOUTUBE_CHECK_INTERVAL / 1000 / 60} minutes`);
  
  // Première vérification immédiate
  checkAllChannels(client);
  
  // Vérification régulière
  checkInterval = setInterval(() => {
    checkAllChannels(client);
  }, YOUTUBE_CHECK_INTERVAL);
}

// Arrêter la surveillance
function stopYouTubeMonitoring() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('⏹️ Surveillance YouTube arrêtée');
  }
}

module.exports = {
  startYouTubeMonitoring,
  stopYouTubeMonitoring,
  checkAllChannels
};
