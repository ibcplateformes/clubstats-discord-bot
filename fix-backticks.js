#!/usr/bin/env node

/**
 * Script de correction automatique pour les backticks imbriqués
 * Corrige la ligne 735 dans discord-bot-buttons.js
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'discord-bot-buttons.js');

console.log('🔧 Script de correction des backticks imbriqués');
console.log('📁 Fichier:', filePath);
console.log('');

try {
  // Lire le fichier
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('✅ Fichier lu avec succès');

  // Sauvegarder une copie de backup
  const backupPath = filePath + '.backup';
  fs.writeFileSync(backupPath, content);
  console.log('💾 Backup créé:', backupPath);

  // Pattern à rechercher (la ligne incorrecte)
  const incorrectPattern1 = /`ID: `\$\{data\.session\.id\}`\\n\\n` \+/g;
  const incorrectPattern2 = /`Utilisez `!rappel` pour envoyer un rappel aux joueurs !`/g;

  // Vérifier si le problème existe
  if (content.match(incorrectPattern1) || content.match(incorrectPattern2)) {
    console.log('🔍 Problème détecté ! Correction en cours...');

    // Corriger le pattern 1: ID
    content = content.replace(
      incorrectPattern1,
      "'ID: `' + data.session.id + '`\\n\\n' +"
    );

    // Corriger le pattern 2: Utilisez !rappel
    content = content.replace(
      incorrectPattern2,
      "'Utilisez `!rappel` pour envoyer un rappel aux joueurs !'"
    );

    // Corriger aussi la première ligne de ce bloc
    content = content.replace(
      /`✅ \*\*Session créée avec succès !\*\*\\n\\n` \+/g,
      "'✅ **Session créée avec succès !**\\n\\n' +"
    );

    // Écrire le fichier corrigé
    fs.writeFileSync(filePath, content);
    console.log('✅ Corrections appliquées avec succès !');
    console.log('');
    console.log('📝 Résumé des corrections:');
    console.log('  - Ligne avec ID: backticks échappés');
    console.log('  - Ligne avec !rappel: backticks échappés');
    console.log('  - Ligne de titre: backticks remplacés par guillemets simples');
    console.log('');
    console.log('🎉 Fichier corrigé ! Vous pouvez maintenant commit et push.');
  } else {
    console.log('ℹ️  Aucun problème détecté ou déjà corrigé.');
  }

  console.log('');
  console.log('💡 Commandes suivantes:');
  console.log('   git add discord-bot-buttons.js');
  console.log('   git commit -m "fix: Corriger backticks imbriqués dans !creersession"');
  console.log('   git push origin main');

} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}
