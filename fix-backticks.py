#!/usr/bin/env python3
"""
Script de correction automatique pour les backticks imbriqués dans discord-bot-buttons.js
"""

import re
import shutil

def fix_backticks():
    filepath = 'discord-bot-buttons.js'
    
    print('🔧 Script de correction des backticks imbriqués')
    print(f'📁 Fichier: {filepath}')
    print('')
    
    try:
        # Lire le fichier
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print('✅ Fichier lu avec succès')
        
        # Sauvegarder une copie de backup
        backup_path = filepath + '.backup'
        shutil.copy2(filepath, backup_path)
        print(f'💾 Backup créé: {backup_path}')
        
        # Pattern 1: Corriger la ligne avec backticks imbriqués pour l'ID
        pattern1 = r"`ID: `\$\{data\.session\.id\}`\\n\\n` \+"
        replacement1 = "'ID: `' + data.session.id + '`\\n\\n' +"
        
        if re.search(pattern1, content):
            content = re.sub(pattern1, replacement1, content)
            print('✅ Correction 1: Ligne ID corrigée')
        
        # Pattern 2: Corriger la ligne avec backticks pour !rappel  
        pattern2 = r"`Utilisez `!rappel` pour envoyer un rappel aux joueurs !`"
        replacement2 = "'Utilisez `!rappel` pour envoyer un rappel aux joueurs !'"
        
        if re.search(pattern2, content):
            content = re.sub(pattern2, replacement2, content)
            print('✅ Correction 2: Ligne !rappel corrigée')
        
        # Pattern 3: Corriger la première ligne du bloc
        pattern3 = r"`✅ \*\*Session créée avec succès !\*\*\\n\\n` \+"
        replacement3 = "'✅ **Session créée avec succès !**\\n\\n' +"
        
        if re.search(pattern3, content):
            content = re.sub(pattern3, replacement3, content)
            print('✅ Correction 3: Ligne titre corrigée')
        
        # Écrire le fichier corrigé
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print('✅ Corrections appliquées avec succès !')
        print('')
        print('📝 Résumé des corrections:')
        print('  - Backticks imbriqués remplacés par concaténation')
        print('  - Template strings converties en strings simples là où nécessaire')
        print('')
        print('🎉 Fichier corrigé ! Vous pouvez maintenant commit et push.')
        print('')
        print('💡 Commandes suivantes:')
        print('   git add discord-bot-buttons.js')
        print('   git commit -m "fix: Corriger backticks imbriqués dans !creersession"')
        print('   git push origin main')
        
    except Exception as e:
        print(f'❌ Erreur: {e}')
        return False
    
    return True

if __name__ == '__main__':
    fix_backticks()
