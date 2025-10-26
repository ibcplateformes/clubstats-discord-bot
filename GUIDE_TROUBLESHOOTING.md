# 🔧 GUIDE: Résoudre les problèmes de commandes admin

## Problème 1: `!moncode` ne marche pas
**Erreur:** `Cannot read properties of undefined (reading 'findUnique')`

### Solution:
Le modèle `DiscordPlayerMapping` manquait dans le schema Prisma.

✅ **C'est maintenant corrigé** - Push et déployez !

---

## Problème 2: Commandes admin ne marchent pas
**Symptôme:** Message "❌ Cette commande est réservée aux admins."

### Causes possibles:

#### 1. Le nom du rôle ne correspond pas
Le bot cherche un rôle nommé **EXACTEMENT** comme dans `ADMIN_ROLE_NAMES`.

**Vérifiez sur Discord:**
1. Allez dans: Paramètres du serveur → Rôles
2. Notez le nom EXACT de votre rôle (sensible à la casse!)
   - Exemple: `Admin` ≠ `admin` ≠ `ADMIN`
   - Exemple: `Modérateur` ≠ `Moderateur`

**Sur Render:**
1. Allez dans: Dashboard → clubstats-discord-bot → Environment
2. Modifiez `ADMIN_ROLE_NAMES` avec le nom EXACT
   - Si un seul rôle: `Admin`
   - Si plusieurs rôles: `Admin,Modérateur,Bureau`

#### 2. Vous n'avez pas le rôle
**Vérifiez:**
1. Clic droit sur votre nom dans Discord
2. Vérifiez que vous avez bien le rôle admin

#### 3. Le bot ne peut pas lire les rôles
**Permissions du bot:**
Le bot a besoin de la permission `Read Message History` et `View Channels`.

---

## 🧪 Test rapide

Une fois déployé, testez avec:

```
!aide
```

Si vous êtes admin, vous devriez voir la section "🔧 Commandes Admin" dans le message d'aide.

Si vous ne la voyez PAS, alors le bot ne vous reconnaît pas comme admin.

---

## 📝 Commandes de débogage

### Voir votre rôle exact
```
!debug roles
```
(Cette commande n'existe pas encore, mais on peut l'ajouter si besoin)

### Vérifier la variable d'environnement
Sur Render, vérifiez que `ADMIN_ROLE_NAMES` est bien définie.

---

## ✅ Checklist finale

- [ ] Schema Prisma mis à jour avec `DiscordPlayerMapping`
- [ ] Migration créée
- [ ] Push sur GitHub
- [ ] `ADMIN_ROLE_NAMES` définie sur Render avec le bon nom de rôle
- [ ] Vous avez le rôle admin sur Discord
- [ ] Bot redémarré

Une fois tout ça fait, `!moncode` et les commandes admin devraient marcher ! 🎉
