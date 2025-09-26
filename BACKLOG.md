# Product Backlog

## Mode "Moi vs Adversaire" + Préparation automatique Lichess + Engine local

### Objectif
- Proposer deux parcours d'analyse: adversaire et moi.

### Parcours utilisateur
1. **Sélecteur d'analyse**
   - Toggle initial: analyser un adversaire ou m'analyser moi.
   - Champ pseudo avec auto-détection de plateforme.
   - Options pour cadence, plage Elo, profondeur moteur si engine activé.
2. **Mode "Adversaire"**
   - Profil d'ouvertures (top 10 lignes, fréquences, performances, pièges, bucket Elo).
   - Préparation recommandée par ouverture via Lichess Explorer, 3 à 5 suites classées par score et popularité, badge piège si TrapEngine.
   - Détection des sorties de théorie GM via base Masters selon paramètres (top move, couverture, volume minimal).
   - Recommandations de coups hors théorie (priorité book, fallback moteur local Stockfish avec MultiPV).
   - Feuille de préparation imprimable avec arbres, points clés, pièges, repères "sortie GM", export JSON/Markdown/PDF.
3. **Mode "Moi"**
   - Diagnostic des débuts personnels par rapport aux meilleures réponses Lichess.
   - Plan d'amélioration avec suggestions de coups et idées.

### Règles et logique
- Sources de données: Lichess Explorer (pool global), Lichess Masters, buckets Elo définis, cadences.
- Détection sortie GM via ensemble majoritaire configurable (top1/topK/couverture) et volume minimal.
- Recommandation de coup selon théorie ou hors théorie avec fallback moteur local configurable.
- Intégration optionnelle d'un moteur local (chemin, profondeur, threads, Syzygy, worker dédié, timeouts).
- TrapEngine pour détecter pièges (<=8 demi-coups) et ajouter badges/conseils.

### UI/UX
- Header avec toggle, pseudo, cadence, Elo, options moteur.
- Cartes d'ouverture avec stats, pièges, détails de coups recommandés, ruban "Out of book" si sortie GM.
- Feuille de prépa sous forme d'arbre avec export.

### Configurations
- Paramètres `gmMode`, `minMasterGames`, `ratingBucketOffset`, `engine`, `speedDefault`.

### Critères d'acceptation
- Sélection du mode dès l'accueil.
- Mode adversaire: top 3 ouvertures avec suites recommandées, badges pièges, détection sortie GM, coup proposé (moteur si activé).
- Mode moi: top 3 ouvertures avec suggestions "X → Y (+score)" et lignes d'entraînement.
- Export feuille de prépa en JSON/Markdown/PDF.

### Mesures de succès
- Temps de génération < 3 s pour 3 ouvertures.
- ≥ 90% positions traitées par FEN sans erreurs 400.
- Taux de clic sur "Coups recommandés" > 50% chez utilisateurs récurrents.

### Notes techniques
- Parser PGN avec `chess.js`, requêtes par FEN prioritairement.
- Ne pas envoyer SAN nettoyée à Lichess.
- Regrouper les requêtes par positions uniques.
- Gestion des erreurs réseau et fallback moteur.

