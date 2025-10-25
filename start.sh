#!/bin/bash

# 🚀 Script de démarrage rapide du bot Discord
# =============================================

clear

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🤖 ClubStats Discord Bot - Démarrage Rapide          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier si on est dans le bon dossier
if [ ! -f "discord-bot-complete.js" ]; then
    echo "❌ Erreur: Veuillez exécuter ce script depuis le dossier clubstats-discord-bot"
    exit 1
fi

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Le fichier .env n'existe pas encore."
    echo ""
    read -p "Voulez-vous créer un fichier .env maintenant ? (o/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        cp .env.complete.example .env
        echo "✅ Fichier .env créé depuis le template"
        echo ""
        echo "📝 Veuillez éditer le fichier .env avec vos configurations:"
        echo "   nano .env"
        echo ""
        echo "Ensuite, relancez ce script."
        exit 0
    else
        echo "❌ Configuration annulée"
        exit 1
    fi
fi

# Charger les variables d'environnement
source .env

# Vérifier les variables essentielles
MISSING_VARS=()

if [ -z "$DISCORD_BOT_TOKEN" ] || [ "$DISCORD_BOT_TOKEN" == "votre_token_discord_ici" ]; then
    MISSING_VARS+=("DISCORD_BOT_TOKEN")
fi

if [ -z "$DISCORD_API_KEY" ] || [ "$DISCORD_API_KEY" == "votre_cle_api_ici" ]; then
    MISSING_VARS+=("DISCORD_API_KEY")
fi

if [ -z "$API_URL" ]; then
    MISSING_VARS+=("API_URL")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Variables d'environnement manquantes:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   • $var"
    done
    echo ""
    echo "📝 Veuillez configurer ces variables dans le fichier .env"
    echo "   nano .env"
    exit 1
fi

echo "✅ Configuration chargée"
echo ""
echo "📋 Configuration actuelle:"
echo "   • API URL: $API_URL"
echo "   • Bot Token: ${DISCORD_BOT_TOKEN:0:20}..."
echo "   • API Key: ${DISCORD_API_KEY:0:20}..."
echo "   • Channel ID: ${DISCORD_CHANNEL_ID:-'Non configuré (rappels désactivés)'}"
echo ""

# Vérifier node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
    echo ""
fi

# Proposer un test de l'API
echo "🧪 Voulez-vous tester la connexion à l'API avant de démarrer ? (recommandé)"
read -p "   (o/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Oo]$ ]]; then
    if [ -f "test-sync.sh" ]; then
        chmod +x test-sync.sh
        ./test-sync.sh
        echo ""
        
        read -p "Continuer le démarrage du bot ? (o/n) " -n 1 -r
        echo ""
        
        if [[ ! $REPLY =~ ^[Oo]$ ]]; then
            echo "👋 Démarrage annulé"
            exit 0
        fi
    else
        echo "⚠️  Script de test introuvable"
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              🚀 Démarrage du bot Discord...               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "💡 Commandes utiles:"
echo "   • !aide       → Affiche l'aide"
echo "   • !sessions   → Liste les sessions"
echo "   • !rappel     → Envoie un rappel manuel"
echo ""
echo "🔄 Pour arrêter le bot: Ctrl+C"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Démarrer le bot
node discord-bot-complete.js

# Si le bot s'arrête
echo ""
echo "👋 Bot arrêté"
echo ""
