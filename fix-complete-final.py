#!/usr/bin/env python3
"""
CORRECTION COMPLÈTE ET DÉFINITIVE - Tous les backticks imbriqués
Ce script trouve et corrige TOUS les problèmes de backticks dans le fichier
"""

import re
import sys

def fix_all_backticks_complete():
    filepath = 'discord-bot-buttons.js'
    
    print('=' * 70)
    print('🔧 CORRECTION COMPLÈTE DE TOUS LES BACKTICKS')
    print('=' * 70)
    print()
    
    try:
        # Lire le fichier
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print('✅ Fichier chargé:', filepath)
        original_content = content
        
        # Créer un backup complet
        backup_path = filepath + '.backup_complete'
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('💾 Backup créé:', backup_path)
        print()
        
        corrections_count = 0
        
        # ============================================
        # CORRECTION 1: Doubles backticks
        # ============================================
        print('🔍 Recherche de doubles backticks ``...')
        pattern = r'``'
        matches = re.findall(pattern, content)
        if matches:
            content = content.replace('``', '`')
            corrections_count += len(matches)
            print(f'   ✅ {len(matches)} double(s) backtick(s) corrigé(s)')
        else:
            print('   ℹ️  Aucun double backtick trouvé')
        
        # ============================================
        # CORRECTION 2: Session `${sessionId}` fermée/ouverte/supprimée
        # ============================================
        print('🔍 Correction des messages de session...')
        session_patterns = [
            (r"`✅ Session `\$\{sessionId\}` fermée !`", 
             "'✅ Session `' + sessionId + '` fermée !'"),
            (r"`✅ Session `\$\{sessionId\}` ouverte !`", 
             "'✅ Session `' + sessionId + '` ouverte !'"),
            (r"`✅ Session `\$\{sessionId\}` supprimée !`", 
             "'✅ Session `' + sessionId + '` supprimée !'"),
        ]
        
        for pattern, replacement in session_patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                corrections_count += 1
                print(f'   ✅ Corrigé: {pattern[:50]}...')
        
        # ============================================
        # CORRECTION 3: Créer session
        # ============================================
        print('🔍 Correction de !creersession...')
        creersession_patterns = [
            (r"`✅ \*\*Session créée avec succès !\*\*\\n\\n` \+", 
             "'✅ **Session créée avec succès !**\\\\n\\\\n' +"),
            (r"`ID: `\$\{data\.session\.id\}`\\n\\n` \+", 
             "'ID: `' + data.session.id + '`\\\\n\\\\n' +"),
            (r"`Utilisez `!rappel` pour envoyer un rappel aux joueurs !`", 
             "'Utilisez `!rappel` pour envoyer un rappel aux joueurs !'"),
        ]
        
        for pattern, replacement in creersession_patterns:
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                corrections_count += 1
                print(f'   ✅ Corrigé: {pattern[:50]}...')
        
        # ============================================
        # CORRECTION 4: Générer PIN
        # ============================================
        print('🔍 Correction de !genererpin...')
        if re.search(r"`Le joueur peut récupérer son code avec `!moncode``", content):
            content = re.sub(
                r"`Le joueur peut récupérer son code avec `!moncode``",
                "'Le joueur peut récupérer son code avec `!moncode`'",
                content
            )
            corrections_count += 1
            print('   ✅ Corrigé: !moncode dans genererpin')
        
        # ============================================
        # CORRECTION 5: Lier utilisateur
        # ============================================
        print('🔍 Correction de !lier...')
        if re.search(r"`\$\{mention\} peut maintenant utiliser `!moncode` pour récupérer son PIN !`", content):
            content = re.sub(
                r"`\$\{mention\} peut maintenant utiliser `!moncode` pour récupérer son PIN !`",
                "`${mention} peut maintenant utiliser \\`!moncode\\` pour récupérer son PIN !`",
                content
            )
            corrections_count += 1
            print('   ✅ Corrigé: ${mention} dans lier')
        
        # ============================================
        # CORRECTION 6: Recherche universelle de backticks imbriqués
        # ============================================
        print('🔍 Recherche de tous les autres backticks imbriqués...')
        
        # Chercher les lignes avec des backticks problématiques
        lines = content.split('\n')
        problematic_lines = []
        
        for i, line in enumerate(lines, 1):
            # Ignorer les commentaires
            if line.strip().startswith('//') or line.strip().startswith('*'):
                continue
            
            # Chercher `...`...` (backtick fermant suivi d'autres caractères puis backtick)
            if re.search(r'`[^`]*`[^`\n]*`', line) and '${' in line:
                problematic_lines.append((i, line.strip()[:80]))
        
        if problematic_lines:
            print(f'   ⚠️  {len(problematic_lines)} ligne(s) potentiellement problématique(s):')
            for line_num, line_text in problematic_lines[:5]:
                print(f'      Ligne {line_num}: {line_text}')
        else:
            print('   ✅ Aucune autre ligne problématique détectée')
        
        # ============================================
        # VÉRIFICATION FINALE
        # ============================================
        print()
        print('🔍 Vérification finale...')
        
        # Chercher les doubles backticks restants
        remaining_doubles = content.count('``')
        if remaining_doubles > 0:
            print(f'   ⚠️  {remaining_doubles} double(s) backtick(s) restant(s)')
        else:
            print('   ✅ Aucun double backtick restant')
        
        # ============================================
        # SAUVEGARDER
        # ============================================
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print()
            print('=' * 70)
            print(f'✅ {corrections_count} CORRECTION(S) APPLIQUÉE(S) AVEC SUCCÈS !')
            print('=' * 70)
            print()
            print('📝 Fichier corrigé:', filepath)
            print('💾 Backup disponible:', backup_path)
            print()
            print('🚀 Étapes suivantes:')
            print('   1. Vérifiez le fichier visuellement')
            print('   2. git add discord-bot-buttons.js')
            print("   3. git commit -m 'fix: Correction complete backticks'")
            print('   4. git push origin main')
            print()
            return True
        else:
            print()
            print('ℹ️  Aucune correction nécessaire - le fichier est déjà correct')
            return True
            
    except Exception as e:
        print()
        print('❌ ERREUR:', str(e))
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = fix_all_backticks_complete()
    sys.exit(0 if success else 1)
