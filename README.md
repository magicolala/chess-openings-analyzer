# Chess Openings Analyzer

Une application web pour analyser les ouvertures d'échecs et préparer rapidement ses parties en exploitant les bases de données Chess.com et Lichess.

## Fonctionnalités

* Analyse des ouvertures à partir de parties au format PGN.
* Identification des pièges d'ouverture.
* Exploration des codes ECO.
* Intégration avec l'explorateur d'ouvertures de Lichess.

## Fonctionnement général

### 1. Collecte des parties Chess.com

Après avoir indiqué un pseudo Chess.com, l'application télécharge les parties publiques du joueur (via l'API officielle) et extrait les coups joués. Les statistiques sont segmentées par cadence (bullet, blitz, rapide, etc.) et par couleur pour mettre en avant les lignes réellement utilisées par le joueur.

### 2. Détection des ouvertures

Les coups sont rapprochés du pack ECO (`eco-pack-xl.js`) pour identifier l'ouverture et ses principales ramifications. L'application évalue aussi la présence de pièges répertoriés dans `trap-pack-ultra.js` afin de signaler les lignes dangereuses.

### 3. Analyse Lichess Explorer

Lorsque vous sélectionnez des lignes dans l'interface, l'application appelle l'API Explorer de Lichess (`lichess-explorer.js`). Les requêtes sont envoyées avec le décalage Elo choisi pour aligner les statistiques sur votre niveau cible. Les réponses fournissent :

* les pourcentages de résultats (gains, nulles, défaites) sur la base de données Lichess (classée par cadence et niveau) ;
* les recommandations des grands maîtres (modes Top 1, Top K ou couverture minimale) pour identifier les coups théoriques majeurs ;
* des propositions d'amélioration si la ligne personnelle diffère des coups forts.

## Comment utiliser

Ouvrez le fichier `index.html` dans votre navigateur web.

### Astuces d'interface

Chaque champ de saisie possède désormais un infobulle qui rappelle son rôle. Positionnez le curseur sur le `?` pour afficher un résumé.

## Fichiers de données

* `eco-pack-xl.js`: Contient la base de données des ouvertures ECO.
* `trap-pack-ultra.js`: Contient la base de données des pièges d'ouverture.
* `lichess-explorer.js`: Gère les appels API vers Lichess Explorer et le post-traitement des réponses.

## Développement

Un linter ESLint est fourni pour garantir une base de code homogène.

```bash
npm ci
npm run lint       # vérifie le code
npm run lint:fix   # corrige automatiquement les problèmes simples
```
