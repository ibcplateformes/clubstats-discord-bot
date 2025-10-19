# ClubStats Discord Bot

Bot Discord pour envoyer des rappels automatiques de vote pour les sessions.

## Déploiement sur Railway

Ce bot est conçu pour tourner 24/7 sur Railway.app

## Variables d'environnement requises

- `DATABASE_URL` - URL de connexion PostgreSQL
- `DISCORD_BOT_TOKEN` - Token du bot Discord
- `DISCORD_CHANNEL_ID` - ID du canal Discord pour les rappels
- `NEXT_PUBLIC_BASE_URL` - URL de l'application web

## Rappels automatiques

Le bot envoie des rappels 3 fois par jour (heure de Paris) :
- 10h00
- 14h00
- 18h00
