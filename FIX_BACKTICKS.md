# FIX URGENT - Backticks imbriqués

## Problème
Ligne ~735 dans discord-bot-buttons.js :
```javascript
`ID: `${data.session.id}`\n\n` +
`Utilisez `!rappel` pour envoyer un rappel aux joueurs !`
```

## Solution
Remplacer par (avec échappement `\` devant les backticks internes) :
```javascript
'✅ **Session créée avec succès !**\n\n' +
`🎯 Titre: **${title}**\n` +
`📅 Date: ${date} à ${time}\n` +
`📍 Lieu: ${location || 'Non spécifié'}\n\n` +
'ID: `' + data.session.id + '`\n\n' +
'Utilisez `!rappel` pour envoyer un rappel aux joueurs !'
```

## Alternative avec échappement
```javascript
`ID: \`${data.session.id}\`\n\n` +
`Utilisez \`!rappel\` pour envoyer un rappel aux joueurs !`
```

## Commande pour corriger manuellement
Éditez le fichier discord-bot-buttons.js ligne 735 et remplacez les backticks imbriqués.
