#!/bin/bash

# Script de déploiement avec migration Prisma

echo "🚀 Déploiement du bot Discord avec migration..."
echo ""

cd ~/clubstats-pro/clubstats-pro/clubstats-discord-bot

echo "📝 Ajout des fichiers modifiés..."
git add prisma/schema.prisma
git add prisma/migrations/

echo "💾 Commit..."
git commit -m 'feat: Ajouter modele DiscordPlayerMapping et colonne pin'

echo "⬆️  Push vers GitHub..."
git push origin main

echo ""
echo "✅ Push terminé!"
echo ""
echo "⚠️  IMPORTANT: Sur Render, ajoutez ces variables d'environnement:"
echo ""
echo "ADMIN_ROLE_NAMES=Admin,Modérateur,Bureau"
echo ""
echo "📝 Vérifiez que le nom du rôle dans Discord correspond EXACTEMENT"
echo "   (sensible à la casse et aux accents)"
echo ""
echo "🔄 Après le déploiement, le bot va:"
echo "   1. Générer le client Prisma avec le nouveau modèle"
echo "   2. Les migrations seront appliquées automatiquement"
echo ""
echo "✨ Le bot redémarrera automatiquement dans 2-3 minutes"
