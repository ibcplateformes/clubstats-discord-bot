#!/usr/bin/env python3
"""
Correction FINALE - Ligne 1025 et toutes les commandes admin
"""

import re

filepath = 'discord-bot-buttons.js'

print('🔧 Correction ligne 1025 et section aide admin')
print()

try:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print('✅ Fichier lu')
    
    # Backup
    with open(filepath + '.backup_1025', 'w', encoding='utf-8') as f:
        f.write(content)
    print('💾 Backup créé')
    
    # Pattern pour la section aide admin complète
    # Chercher et remplacer le bloc value des commandes admin
    old_pattern = r"value:\s+`\$\{PREFIX\}clear"
    
    if re.search(old_pattern, content):
        # Remplacer toute la section value des commandes admin
        content = re.sub(
            r"(value:\s+)`\$\{PREFIX\}clear \[nombre\]` - Supprimer X messages \(max 100\)\\n` \+\s+" +
            r"`\$\{PREFIX\}clearall` - Nettoyer TOUT le canal\\n` \+\s+" +
            r"`\$\{PREFIX\}creersession` - Créer une session de vote\\n` \+\s+" +
            r"`\$\{PREFIX\}fermer \[id\]` - Fermer une session\\n` \+\s+" +
            r"`\$\{PREFIX\}ouvrir \[id\]` - Ouvrir une session\\n` \+\s+" +
            r"`\$\{PREFIX\}supprimer \[id\]` - Supprimer une session\\n` \+",
            r"\1" +
            r"`\\`${PREFIX}clear [nombre]\\` - Supprimer X messages (max 100)\\n` +\n          " +
            r"`\\`${PREFIX}clearall\\` - Nettoyer TOUT le canal\\n` +\n          " +
            r"`\\`${PREFIX}creersession\\` - Créer une session de vote\\n` +\n          " +
            r"`\\`${PREFIX}fermer [id]\\` - Fermer une session\\n` +\n          " +
            r"`\\`${PREFIX}ouvrir [id]\\` - Ouvrir une session\\n` +\n          " +
            r"`\\`${PREFIX}supprimer [id]\\` - Supprimer une session\\n` +",
            content,
            flags=re.MULTILINE
        )
        print('✅ Section aide admin corrigée')
    else:
        print('⚠️  Pattern non trouvé, correction manuelle requise')
    
    # Écrire
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('✅ Fichier sauvegardé')
    print()
    print('🎉 Correction appliquée!')
    print()
    print('Commandes:')
    print('  git add discord-bot-buttons.js')
    print("  git commit -m 'fix: Corriger aide admin ligne 1025'")
    print('  git push origin main')
    
except Exception as e:
    print(f'❌ Erreur: {e}')
    import traceback
    traceback.print_exc()
