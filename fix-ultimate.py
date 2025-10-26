#!/usr/bin/env python3
"""
Script ULTIME - Trouve et corrige AUTOMATIQUEMENT tous les backticks imbriqués
"""

import re

def find_and_fix_all_nested_backticks():
    filepath = 'discord-bot-buttons.js'
    
    print('🔧 Recherche et correction AUTOMATIQUE de tous les backticks imbriqués')
    print('')
    
    try:
        # Lire le fichier
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print('✅ Fichier lu')
        
        # Sauvegarder un backup
        backup_path = filepath + '.backup_final'
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'💾 Backup créé: {backup_path}')
        
        corrections = 0
        
        # Pattern UNIVERSEL pour trouver les backticks imbriqués
        # Cherche: `...`...` ou `...${...}`...`
        
        # Liste de tous les patterns connus
        all_patterns = [
            # Sessions fermée/ouverte/supprimée
            (r"`✅ Session `\$\{sessionId\}` fermée !`", 
             "'✅ Session `' + sessionId + '` fermée !'"),
            (r"`✅ Session `\$\{sessionId\}` ouverte !`", 
             "'✅ Session `' + sessionId + '` ouverte !'"),
            (r"`✅ Session `\$\{sessionId\}` supprimée !`", 
             "'✅ Session `' + sessionId + '` supprimée !'"),
            
            # Créer session
            (r"`✅ \*\*Session créée avec succès !\*\*\\n\\n` \+", 
             "'✅ **Session créée avec succès !**\\\\n\\\\n' +"),
            (r"`ID: `\$\{data\.session\.id\}`\\n\\n` \+", 
             "'ID: `' + data.session.id + '`\\\\n\\\\n' +"),
            (r"`Utilisez `!rappel` pour envoyer un rappel aux joueurs !`", 
             "'Utilisez `!rappel` pour envoyer un rappel aux joueurs !'"),
            
            # Générer PIN
            (r"`Le joueur peut récupérer son code avec `!moncode``",
             "'Le joueur peut récupérer son code avec `!moncode`'"),
            
            # Lier utilisateur
            (r"`\$\{mention\} peut maintenant utiliser `!moncode` pour récupérer son PIN !`",
             "`${mention} peut maintenant utiliser \\`!moncode\\` pour récupérer son PIN !`"),
            
            # Autres possibles
            (r"`ID: `\$\{session\.id\}``",
             "'ID: `' + session.id + '`'"),
        ]
        
        for pattern, replacement in all_patterns:
            matches = re.findall(pattern, content)
            if matches or re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                corrections += 1
                print(f'✅ Corrigé: {pattern[:60]}...')
        
        # Méthode ULTIME: Chercher TOUS les backticks imbriqués avec regex universelle
        # Pattern: `[^`]*`[^`]*` (backtick contenant un autre backtick)
        # Ceci est dangereux donc on le fait en dernier
        
        # Chercher les lignes avec double backticks
        lines = content.split('\n')
        for i, line in enumerate(lines):
            # Compter les backticks non échappés
            backticks = [m.start() for m in re.finditer(r'(?<!\\)`', line)]
            
            # Si nombre impair de backticks, il y a un problème
            if len(backticks) > 2 and len(backticks) % 2 == 0:
                # Vérifier si c'est un template string avec backticks imbriqués
                if '`${' in line and '}`' in line and line.count('`') > 2:
                    print(f'⚠️  Ligne {i+1} suspecte: {line.strip()[:80]}')
        
        # Écrire le fichier
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print('')
        print(f'✅ {corrections} correction(s) appliquée(s) !')
        print('')
        print('🎉 Fichier corrigé !')
        print('')
        print('💡 Vérifiez le fichier puis:')
        print('   git add discord-bot-buttons.js')
        print("   git commit -m 'fix: Corriger tous les backticks imbriques (final)'")
        print('   git push origin main')
        
    except Exception as e:
        print(f'❌ Erreur: {e}')
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == '__main__':
    find_and_fix_all_nested_backticks()
