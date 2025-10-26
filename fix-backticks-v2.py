#!/usr/bin/env python3
"""
Script de correction ROBUSTE pour les backticks - Version 2
Utilise le backup pour recréer le fichier proprement
"""

import re

def fix_backticks_v2():
    filepath = 'discord-bot-buttons.js'
    backup_path = filepath + '.backup'
    
    print('🔧 Script de correction V2 - Utilisation du backup')
    print('')
    
    try:
        # Utiliser le backup (fichier original avant correction)
        try:
            with open(backup_path, 'r', encoding='utf-8') as f:
                content = f.read()
            print('✅ Backup chargé')
        except FileNotFoundError:
            # Si pas de backup, lire le fichier actuel
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            print('✅ Fichier actuel chargé')
        
        # Chercher et remplacer le bloc problématique ENTIER
        # Pattern: tout le bloc de m.reply avec les backticks
        pattern = r"await m\.reply\(\s*`✅ \*\*Session créée avec succès !\*\*\\n\\n` \+\s*`🎯 Titre: \*\*\$\{title\}\*\*\\n` \+\s*`📅 Date: \$\{date\} à \$\{time\}\\n` \+\s*`📍 Lieu: \$\{location \|\| 'Non spécifié'\}\\n\\n` \+\s*`ID: `\$\{data\.session\.id\}`\\n\\n` \+\s*`Utilisez `!rappel` pour envoyer un rappel aux joueurs !`\s*\)"
        
        replacement = """await m.reply(
            '✅ **Session créée avec succès !**\\n\\n' +
            `🎯 Titre: **${title}**\\n` +
            `📅 Date: ${date} à ${time}\\n` +
            `📍 Lieu: ${location || 'Non spécifié'}\\n\\n` +
            'ID: `' + data.session.id + '`\\n\\n' +
            'Utilisez `!rappel` pour envoyer un rappel aux joueurs !'
          )"""
        
        if re.search(pattern, content, re.MULTILINE):
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
            print('✅ Bloc problématique remplacé (méthode pattern complet)')
        else:
            # Méthode alternative: remplacer ligne par ligne
            print('⚠️  Pattern complet non trouvé, utilisation méthode ligne par ligne...')
            
            # Ligne 1: Titre avec emoji
            content = re.sub(
                r"`✅ \*\*Session créée avec succès !\*\*\\n\\n` \+",
                "'✅ **Session créée avec succès !**\\\\n\\\\n' +",
                content
            )
            
            # Ligne avec ID
            content = re.sub(
                r"`ID: `\$\{data\.session\.id\}`\\n\\n` \+",
                "'ID: `' + data.session.id + '`\\\\n\\\\n' +",
                content
            )
            
            # Ligne avec !rappel
            content = re.sub(
                r"`Utilisez `!rappel` pour envoyer un rappel aux joueurs !`",
                "'Utilisez `!rappel` pour envoyer un rappel aux joueurs !'",
                content
            )
            
            print('✅ Corrections ligne par ligne appliquées')
        
        # Écrire le fichier
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print('✅ Fichier écrit avec succès')
        print('')
        print('🎉 Correction terminée !')
        print('')
        print('💡 Vérifiez le fichier, puis:')
        print('   git add discord-bot-buttons.js')
        print("   git commit -m 'fix: Corriger syntaxe dans creersession'")
        print('   git push origin main')
        
    except Exception as e:
        print(f'❌ Erreur: {e}')
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    fix_backticks_v2()
