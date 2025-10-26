#!/bin/bash

# Script de correction manuelle rapide

echo "🔄 Restauration du backup..."
cp discord-bot-buttons.js.backup discord-bot-buttons.js

echo "✅ Backup restauré"
echo ""
echo "📝 Maintenant, éditez le fichier manuellement:"
echo "   nano discord-bot-buttons.js"
echo ""
echo "🔍 Cherchez la ligne ~735 avec:"
echo "   Ctrl+W puis tapez: Session créée avec succès"
echo ""
echo "❌ Remplacez le bloc:"
echo "await m.reply("
echo '  `✅ **Session créée avec succès !**\n\n` +'
echo '  `🎯 Titre: **${title}**\n` +'
echo '  `📅 Date: ${date} à ${time}\n` +'
echo '  `📍 Lieu: ${location || '"'"'Non spécifié'"'"'}\n\n` +'
echo '  `ID: `${data.session.id}`\n\n` +'
echo '  `Utilisez `!rappel` pour envoyer un rappel aux joueurs !`'
echo ");"
echo ""
echo "✅ Par:"
echo "await m.reply("
echo "  '✅ **Session créée avec succès !**\\n\\n' +"
echo '  `🎯 Titre: **${title}**\n` +'
echo '  `📅 Date: ${date} à ${time}\n` +'
echo '  `📍 Lieu: ${location || '"'"'Non spécifié'"'"'}\n\n` +'
echo "  'ID: \`' + data.session.id + '\`\\n\\n' +"
echo "  'Utilisez \`!rappel\` pour envoyer un rappel aux joueurs !'"
echo ");"
echo ""
echo "💾 Sauvegardez avec Ctrl+X, Y, Enter"
