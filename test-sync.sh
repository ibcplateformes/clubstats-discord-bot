#!/bin/bash

echo "🧪 TEST DE SYNCHRONISATION DISCORD → API"
echo "========================================"
echo ""

# Configuration
API_URL="https://clubstats-pro.onrender.com"
API_KEY="27795d09e04cd6576d8eb58b42825e94739a90deece6603b52fa491e2cbedf68"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Configuration:"
echo "   API URL: $API_URL"
echo "   API KEY: ${API_KEY:0:20}..."
echo ""

# Test 1: Vérifier que l'API est accessible
echo "1️⃣  Test de connexion à l'API..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/discord/sessions" -H "x-api-key: $API_KEY")

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "   ${GREEN}✅ API accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "   ${RED}❌ API non accessible (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

echo ""

# Test 2: Récupérer les sessions actives
echo "2️⃣  Récupération des sessions actives..."
SESSIONS=$(curl -s "$API_URL/api/discord/sessions" -H "x-api-key: $API_KEY")
SESSION_COUNT=$(echo "$SESSIONS" | jq -r '.sessions | length' 2>/dev/null || echo "0")

echo "   📊 $SESSION_COUNT session(s) active(s)"

if [ "$SESSION_COUNT" -gt "0" ]; then
    echo "$SESSIONS" | jq -r '.sessions[] | "      • \(.title) - \(.date)"'
    
    # Extraire le premier sessionId pour les tests
    SESSION_ID=$(echo "$SESSIONS" | jq -r '.sessions[0].id')
    echo ""
    echo "   🎯 Session de test: $SESSION_ID"
else
    echo -e "   ${YELLOW}⚠️  Aucune session active - les tests de vote seront simulés${NC}"
    SESSION_ID="test_session_id"
fi

echo ""

# Test 3: Synchroniser un vote de test
echo "3️⃣  Test de synchronisation de vote..."

VOTE_DATA=$(cat <<EOF
{
  "sessionId": "$SESSION_ID",
  "discordId": "999999999999999999",
  "discordUsername": "TestUser_$(date +%s)",
  "response": "present"
}
EOF
)

echo "   📤 Envoi du vote de test..."
RESPONSE=$(curl -s -X POST "$API_URL/api/discord/sync-vote" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "$VOTE_DATA")

echo "$RESPONSE" | jq . 2>/dev/null

SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$SUCCESS" == "true" ]; then
    echo -e "   ${GREEN}✅ Vote synchronisé avec succès${NC}"
    ACTION=$(echo "$RESPONSE" | jq -r '.action')
    MAPPED=$(echo "$RESPONSE" | jq -r '.mapped')
    echo "      • Action: $ACTION"
    echo "      • Mappé: $MAPPED"
else
    echo -e "   ${RED}❌ Échec de la synchronisation${NC}"
    echo "$RESPONSE" | jq -r '.error' 2>/dev/null
fi

echo ""
echo "========================================"
echo "🏁 Tests terminés"
echo ""

# Résumé
echo "📝 Résumé:"
echo "   • API accessible: ✅"
echo "   • Sessions récupérées: $SESSION_COUNT"
if [ "$SUCCESS" == "true" ]; then
    echo "   • Synchronisation: ✅"
else
    echo "   • Synchronisation: ❌"
fi

echo ""
echo "💡 Prochaines étapes:"
echo "   1. Configurer le fichier .env du bot Discord"
echo "   2. Lancer le bot avec: npm start"
echo "   3. Tester avec !rappel dans Discord"
echo "   4. Réagir avec ✅/❌/🟡 sur le message"
