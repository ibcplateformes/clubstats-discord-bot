#!/bin/bash

# Script de correction COMPLET - Toutes les erreurs de backticks

cd ~/clubstats-pro/clubstats-pro/clubstats-discord-bot

echo "🔧 Correction de TOUTES les erreurs de backticks..."

# Créer un backup final
cp discord-bot-buttons.js discord-bot-buttons.js.backup_complete

# Appliquer TOUTES les corrections en une seule commande sed
sed -i '' \
  -e 's/`✅ Session `${sessionId}` fermée !`/'\''✅ Session `'\'' + sessionId + '\''` fermée!'\''/g' \
  -e 's/`✅ Session `${sessionId}` ouverte !`/'\''✅ Session `'\'' + sessionId + '\''` ouverte!'\''/g' \
  -e 's/`✅ Session `${sessionId}` supprimée !`/'\''✅ Session `'\'' + sessionId + '\''` supprimée!'\''/g' \
  -e 's/`Le joueur peut récupérer son code avec `!moncode``/'\''Le joueur peut récupérer son code avec `!moncode`'\''/g' \
  -e 's/``\${PREFIX}\([^`]*\)`/`\${PREFIX}\1`/g' \
  discord-bot-buttons.js

echo "✅ Toutes les corrections appliquées!"
echo ""
echo "📊 Vérification des backticks restants..."
grep -n '``' discord-bot-buttons.js || echo "✅ Aucun double backtick trouvé"

echo ""
echo "💾 Commit et push..."
git add discord-bot-buttons.js
git commit -m 'fix: Corriger tous les backticks (complet)'
git push origin main

echo ""
echo "🎉 Terminé!"
