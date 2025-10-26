#!/usr/bin/env python3
"""
Script de correction COMPLET pour TOUS les backticks imbriqués
"""

import re

def fix_all_backticks():
    filepath = 'discord-bot-buttons.js'
    
    print('🔧 Correction COMPLÈTE de tous les backticks imbriqués')
    print('')
    
    try:
        # Lire le fichier
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print('✅ Fichier lu')
        
        # Sauvegarder un backup
        backup_path = filepath + '.backup2'
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'💾 Backup créé: {backup_path}')
        
        corrections = 0
        
        # Pattern 1: Session `${sessionId}` fermée/ouverte/supprimée
        patterns = [
            (r"`✅ Session `\$\{sessionId\}` fermée !`", "'✅ Session `' + sessionId + '` fermée !'"),
            (r"`✅ Session `\$\{sessionId\}` ouverte !`", "'✅ Session `' + sessionId + '` ouverte !'"),
            (r"`✅ Session `\$\{sessionId\}` supprimée !`", "'✅ Session `' + sessionId + '` supprimée !'"),
            
            # Pattern pour créer session (déjà corrigé mais on refait au cas où)
            (r"`✅ \*\*Session créée avec succès !\*\*\\n\\n` \+", "'✅ **Session créée avec succès !**\\\\n\\\\n' +"),
            (r"`ID: `\$\{data\.session\.id\}`\\n\\n` \+", "'ID: `' + data.session.id + '`\\\\n\\\\n' +"),
            (r"`Utilisez `!rappel` pour envoyer un rappel aux joueurs !`", "'Utilisez `!rappel` pour envoyer un rappel aux joueurs !'"),
            
            # Autres patterns potentiels
            (r"`\$\{mention\} peut maintenant utiliser `!moncode` pour récupérer son PIN !`", 
             "`${mention} peut maintenant utiliser \\`!moncode\\` pour récupérer son PIN !`"),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                corrections += 1
                print(f'✅ Correction appliquée: {pattern[:50]}...')
        
        # Écrire le fichier
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print('')
        print(f'✅ {corrections} correction(s) appliquée(s) avec succès !')
        print('')
        print('🎉 Fichier corrigé !')
        print('')
        print('💡 Commandes suivantes:')
        print('   git add discord-bot-buttons.js')
        print("   git commit -m 'fix: Corriger TOUS les backticks imbriqués'")
        print('   git push origin main')
        
    except Exception as e:
        print(f'❌ Erreur: {e}')
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    fix_all_backticks()
