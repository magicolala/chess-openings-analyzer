// trap-pack-ultra.js
// Pack ultra de pièges additionnels. SAN normalisée: pas de 'x', ni '+/#', promotions retirées, roques 'O-O'.
// Idées: détection courte mais pertinente; tags d’ouverture pour recos contextuelles.

export const ULTRA_TRAPS = [
  // =================== BIRD / FROM / HOBBS / POLAR ===================
  {
    id: "bird-larsen-sneak",
    name: "Piège: Bird, appât h2-g3",
    side: "white",
    openingTags: ["Bird", "1.f4", "Larsen Attack"],
    // 1.f4 d5 2.Nf3 g6 3.g3 Bg7 4.Bg2 Nh6? 5.O-O O-O 6.d3 c5 7.e4 dxe4 8.dxe4 Qxd1? 9.Rxd1
    seq: [
      "f4",
      "d5",
      "Nf3",
      "g6",
      "g3",
      "Bg7",
      "Bg2",
      "Nh6",
      "O-O",
      "O-O",
      "d3",
      "c5",
      "e4",
      "de4",
      "de4",
      "Qd1",
      "Rd1",
    ],
    advice:
      "Punir les prises précoces au centre. Si noir temporise, bascule plan e4-d3-c3.",
  },

  {
    id: "bird-from-rapid-qh4",
    name: "Piège: From, enchaînement Qh4+",
    side: "black",
    openingTags: ["Bird", "From"],
    // 1.f4 e5 2.fe5 d6 3.Nf3 de5 4.Ne5 Qh4 5.g3 Qe4 6.Nf3 Nc6
    seq: [
      "f4",
      "e5",
      "fe5",
      "d6",
      "Nf3",
      "de5",
      "Ne5",
      "Qh4",
      "g3",
      "Qe4",
      "Nf3",
      "Nc6",
    ],
    advice: "…Qh4+ puis …Qe4. Si blanc connaît, reviens développement simple.",
  },

  {
    id: "bird-hobbs-e5-blast",
    name: "Piège: Hobbs vs Bird, ...e5!",
    side: "black",
    openingTags: ["Bird", "Hobbs"],
    // 1.f4 g5 2.fg5 h6 3.g6 e5 4.gxf7+ Kxf7 5.Nf3 e4
    seq: ["f4", "g5", "fg5", "h6", "g6", "e5", "gf7", "Kf7", "Nf3", "e4"],
    advice:
      "Ouvre les lignes sur le roi blanc. Si blanc reste solide, calme avec ...Nf6/…Bg7.",
  },

  {
    id: "bird-dutch-reverse-sting",
    name: "Piège: Bird style Leningrad inversé",
    side: "white",
    openingTags: ["Bird", "Leningrad"],
    // 1.f4 d5 2.Nf3 g6 3.g3 Bg7 4.Bg2 c5 5.O-O Nc6 6.d3 Nf6 7.c3 O-O 8.Qe1 Re8 9.e4 e5? 10.f5!
    seq: [
      "f4",
      "d5",
      "Nf3",
      "g6",
      "g3",
      "Bg7",
      "Bg2",
      "c5",
      "O-O",
      "Nc6",
      "d3",
      "Nf6",
      "c3",
      "O-O",
      "Qe1",
      "Re8",
      "e4",
      "e5",
      "f5",
    ],
    advice:
      "f5! enfonce la case e6/g6. Si noir tient, recycle en plan e4-d3-c4.",
  },

  // =================== VIENNE / KG / PONZIANI / PHILIDOR ===================
  {
    id: "vienna-frankenstein",
    name: "Piège: Viennoise Frankenstein–Dracula",
    side: "white",
    openingTags: ["Vienna", "Frankenstein-Dracula"],
    // 1.e4 e5 2.Nc3 Nf6 3.Bc4 Ne4 4.Qh5
    seq: ["e4", "e5", "Nc3", "Nf6", "Bc4", "Ne4", "Qh5"],
    advice: "Qh5 menace Qf7. Si noir connaît …Nd6, garde Bb3/Nb5 en poche.",
  },

  {
    id: "vienna-gambit-hamppe",
    name: "Piège: Viennoise, Hamppe–Allgaier",
    side: "white",
    openingTags: ["Vienna", "Gambit"],
    // 1.e4 e5 2.Nc3 Nc6 3.f4 ef4 4.Nf3 g5 5.h4 g4 6.Ng5
    seq: [
      "e4",
      "e5",
      "Nc3",
      "Nc6",
      "f4",
      "ef4",
      "Nf3",
      "g5",
      "h4",
      "g4",
      "Ng5",
    ],
    advice: "Tactiques furieuses sur f7/h7. Si noir précis, simplifie vite.",
  },

  {
    id: "kg-muzio",
    name: "Piège: Gambit du Roi, Muzio",
    side: "white",
    openingTags: ["Gambit du Roi", "King’s Gambit"],
    // 1.e4 e5 2.f4 ef4 3.Nf3 g5 4.Bc4 g4 5.O-O
    seq: ["e4", "e5", "f4", "ef4", "Nf3", "g5", "Bc4", "g4", "O-O"],
    advice: "Compensation monstrueuse pour la pièce. Marche surtout en rapide.",
  },

  {
    id: "damiano-refutation",
    name: "Piège: Damiano puni",
    side: "white",
    openingTags: ["e4 e5", "Damiano"],
    // 1.e4 e5 2.Nf3 f6?? 3.Ne5 fe5 4.Qh5 g6 5.Qe5
    seq: ["e4", "e5", "Nf3", "f6", "Ne5", "fe5", "Qh5", "g6", "Qe5"],
    advice: "Base: f6?? perd. Ne surjoue pas si noir trouve …Qe7.",
  },

  {
    id: "ponziani-qa4-sting",
    name: "Piège: Ponziani Qa4!",
    side: "white",
    openingTags: ["Ponziani"],
    // 1.e4 e5 2.Nf3 Nc6 3.c3 d5 4.Qa4 de4 5.Ne5
    seq: ["e4", "e5", "Nf3", "Nc6", "c3", "d5", "Qa4", "de4", "Ne5"],
    advice:
      "Qa4 punit …d5? rapide. Si noir joue …Bd7, reviens au plan central.",
  },

  {
    id: "philidor-legal-theme",
    name: "Piège: Philidor motif de Légal",
    side: "white",
    openingTags: ["Philidor"],
    // 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 Nf6 5.h3 Bh5 6.Ne5
    seq: [
      "e4",
      "e5",
      "Nf3",
      "d6",
      "Bc4",
      "Bg4",
      "Nc3",
      "Nf6",
      "h3",
      "Bh5",
      "Ne5",
    ],
    advice: "Si …Bxd1?? Qxf7+ puis mat. Classique du club.",
  },

  // =================== SCOTCH / QUATRE CAVALIERS ===================
  {
    id: "scotch-quick-qa5",
    name: "Piège: Écossaise …Qa5+",
    side: "black",
    openingTags: ["Écossaise", "Scotch"],
    // 1.e4 e5 2.Nf3 Nc6 3.d4 ed4 4.Nxd4 Qh4?! 5.Nc3 Bb4 6.Be3 Nf6 7.Nb5 O-O 8.a3 Ba5 9.b4 Qxe4?
    // Repérage court: …Qa5+ idées
    seq: ["e4", "e5", "Nf3", "Nc6", "d4", "ed4", "Nd4", "Qa5"],
    advice: "…Qa5+ pique c3/e4. Hors prep, préfère …Bc5/…Nf6.",
  },

  {
    id: "four-knights-bishop-pinch",
    name: "Piège: Quatre Cavaliers pince sur c2",
    side: "black",
    openingTags: ["Quatre Cavaliers", "Italienne"],
    // 1.e4 e5 2.Nf3 Nc6 3.Nc3 Nf6 4.Bc4 Nxe4 5.Nxe4 d5
    seq: ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6", "Bc4", "Ne4", "Ne4", "d5"],
    advice:
      "…d5 gagne des tempos si blanc joue automatique. Connais 6.Bd3 précis.",
  },

  // =================== SICILIENNE ===================
  {
    id: "sveshnikov-nd4-tactic",
    name: "Piège: Sveshnikov …Nd4!",
    side: "black",
    openingTags: ["Sicilienne", "Sveshnikov"],
    // 1.e4 c5 2.Nf3 Nc6 3.d4 cd4 4.Nxd4 Nf6 5.Nc3 e5 6.Ndb5 d6 7.Bg5 a6 8.Na3 b5 9.Nd5 Nd4!
    seq: [
      "e4",
      "c5",
      "Nf3",
      "Nc6",
      "d4",
      "cd4",
      "Nd4",
      "Nf6",
      "Nc3",
      "e5",
      "Nb5",
      "d6",
      "Bg5",
      "a6",
      "Na3",
      "b5",
      "Nd5",
      "Nd4",
    ],
    advice:
      "Bombes tactiques sur c2/e2. Connais les suites, sinon reste Classique.",
  },

  {
    id: "accelerated-qa5-idea",
    name: "Piège: Dragon Accéléré …Qa5",
    side: "black",
    openingTags: ["Sicilienne", "Dragon accéléré"],
    // 1.e4 c5 2.Nf3 Nc6 3.d4 cd4 4.Nxd4 g6 5.c4 Bg7 6.Be3 Nf6 7.Nc3 O-O 8.Be2 d6 9.O-O Bd7 10.f3 Qa5
    seq: [
      "e4",
      "c5",
      "Nf3",
      "Nc6",
      "d4",
      "cd4",
      "Nd4",
      "g6",
      "c4",
      "Bg7",
      "Be3",
      "Nf6",
      "Nc3",
      "O-O",
      "Be2",
      "d6",
      "O-O",
      "Bd7",
      "f3",
      "Qa5",
    ],
    advice:
      "…Qa5 met la pression sur c3/a2. Si blanc est propre, passe en Maroczy.",
  },

  {
    id: "alapin-qa4-shot",
    name: "Piège: Alapin Qa4+ idée",
    side: "white",
    openingTags: ["Sicilienne", "Alapin"],
    // 1.e4 c5 2.c3 d5 3.ed5 Qd5 4.d4 Nc6 5.Nf3 Bg4 6.Qa4
    seq: [
      "e4",
      "c5",
      "c3",
      "d5",
      "ed5",
      "Qd5",
      "d4",
      "Nc6",
      "Nf3",
      "Bg4",
      "Qa4",
    ],
    advice: "Qa4 cloue c6/f7. Si noir précis …Bxf3/Qe4+, joue solide.",
  },

  {
    id: "smith-morra-rapid",
    name: "Piège: Smith–Morra accéléré",
    side: "white",
    openingTags: ["Sicilienne", "Smith-Morra"],
    // 1.e4 c5 2.d4 cd4 3.c3 dc3 4.Nxc3 d6 5.Nf3 Nc6 6.Bc4 Nf6 7.O-O Bg4 8.Qb3
    seq: [
      "e4",
      "c5",
      "d4",
      "cd4",
      "c3",
      "dc3",
      "Nc3",
      "d6",
      "Nf3",
      "Nc6",
      "Bc4",
      "Nf6",
      "O-O",
      "Bg4",
      "Qb3",
    ],
    advice: "Qb3 tape b7/f7. Si noir joue …Na5!, reviens en schéma calme.",
  },

  // =================== FRANÇAISE ===================
  {
    id: "french-milner-barry",
    name: "Piège: Française, Milner–Barry",
    side: "white",
    openingTags: ["Française", "Avance"],
    // 1.e4 e6 2.d4 d5 3.e5 c5 4.c3 Nc6 5.Nf3 Qb6 6.Bd3 cd4 7.cd4 Bd7 8.O-O Nxd4?
    seq: [
      "e4",
      "e6",
      "d4",
      "d5",
      "e5",
      "c5",
      "c3",
      "Nc6",
      "Nf3",
      "Qb6",
      "Bd3",
      "cd4",
      "cd4",
      "Bd7",
      "O-O",
      "Nd4",
    ],
    advice:
      "Punir …Nxd4? avec Nxd4/Bxh7 tactiques. Si noir solide, reconvertis l’initiative.",
  },

  // =================== CARO-KANN ===================
  {
    id: "ck-fantasy-e5",
    name: "Piège: Caro–Kann Fantasy",
    side: "white",
    openingTags: ["Caro-Kann", "Fantasy"],
    // 1.e4 c6 2.d4 d5 3.f3 de4 4.fe4 e5 5.Nf3
    seq: ["e4", "c6", "d4", "d5", "f3", "de4", "fe4", "e5", "Nf3"],
    advice: "Si …Bg4? tôt, h3/Qe2 piquent. Sinon, roque et pression e5/d5.",
  },

  {
    id: "ck-two-knights-qd5",
    name: "Piège: Caro–Kann 2 Cavaliers …Qd5",
    side: "black",
    openingTags: ["Caro-Kann", "Two Knights"],
    // 1.e4 c6 2.Nc3 d5 3.Nf3 Bg4 4.h3 Bh5 5.ed5 cd5 6.Bb5+ Nc6 7.g4 Bg6 8.Ne5 Qd6?! 9.d4 O-O-O …Qd5 idées
    seq: [
      "e4",
      "c6",
      "Nc3",
      "d5",
      "Nf3",
      "Bg4",
      "h3",
      "Bh5",
      "ed5",
      "cd5",
      "Bb5",
      "Nc6",
      "g4",
      "Bg6",
      "Ne5",
      "Qd6",
      "d4",
      "O-O-O",
      "Qd5",
    ],
    advice: "…Qd5 tape e5/b5. Connais les renversements, sinon évite.",
  },

  // =================== SCANDINAVE / ENGLUND / PORTUGAISE ===================
  {
    id: "portuguese-gambit",
    name: "Piège: Scandinave Portugaise",
    side: "black",
    openingTags: ["Scandinave", "Portugaise"],
    // 1.e4 d5 2.ed5 Nf6 3.d4 Bg4 4.f3 Bf5 5.c4 e6 … tactiques rapides
    seq: ["e4", "d5", "ed5", "Nf6", "d4", "Bg4", "f3", "Bf5", "c4", "e6"],
    advice:
      "Développement express sur f5/Bb4+. Si blanc renvoie, transpose solide.",
  },

  {
    id: "englund-rapid-qb4",
    name: "Piège: Englund, …Qb4+",
    side: "black",
    openingTags: ["Englund", "1.d4 e5"],
    // 1.d4 e5 2.de5 Nc6 3.Nf3 Qe7 4.Bf4 Qb4
    seq: ["d4", "e5", "de5", "Nc6", "Nf3", "Qe7", "Bf4", "Qb4"],
    advice:
      "Sale mais efficace en rapide: b2/c3 en feu. Amène des pièces, pas la panique.",
  },

  // =================== QGD / SLAV / SEMI-SLAV / BUDAPEST ===================
  {
    id: "rubinstein-nd5-bomb",
    name: "Piège: Rubinstein Nd5!!",
    side: "white",
    openingTags: ["QGD", "Rubinstein"],
    seq: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "Bg5",
      "Nbd7",
      "e3",
      "Be7",
      "O-O",
      "O-O",
      "Ne4",
      "Bf4",
      "f5",
      "Nd5",
    ],
    advice:
      "…exd5?? enferme la dame après Bc7. Noir: évite …f5 sans préparation.",
  },

  {
    id: "cambridge-springs-qa5",
    name: "Piège: Cambridge Springs …Qa5",
    side: "black",
    openingTags: ["QGD", "Cambridge Springs"],
    // 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 Nbd7 5.e3 c6 6.Nf3 Qa5
    seq: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "Bg5",
      "Nbd7",
      "e3",
      "c6",
      "Nf3",
      "Qa5",
    ],
    advice: "…Qa5 cloue c3. Si blanc joue automatique, grenades sur Bb4/Qxg5.",
  },

  {
    id: "budapest-kieninger-core",
    name: "Piège: Budapest Kieninger (motif)",
    side: "black",
    openingTags: ["Budapest", "1.d4 Nf6 2.c4 e5"],
    // 1.d4 Nf6 2.c4 e5 3.de5 Ng4 4.Nf3 Nc6 5.Bf4 Bb4+ 6.Nbd2 Qe7
    seq: [
      "d4",
      "Nf6",
      "c4",
      "e5",
      "de5",
      "Ng4",
      "Nf3",
      "Nc6",
      "Bf4",
      "Bb4",
      "Nbd2",
      "Qe7",
    ],
    advice:
      "Idées …Nd3# si blanc traîne. Si blanc est propre, transpose simple.",
  },

  {
    id: "semi-slav-anti-moscow",
    name: "Piège: Semi-Slave Anti-Moscow",
    side: "black",
    openingTags: ["Semi-Slave", "Anti-Moscow"],
    // 1.d4 d5 2.c4 c6 3.Nc3 e6 4.Bg5 h6 5.Bh4 dxc4 6.e4
    seq: ["d4", "d5", "c4", "c6", "Nc3", "e6", "Bg5", "h6", "Bh4", "dc4", "e4"],
    advice: "Ligne ultra tranchante. Si tu ne connais pas, évite …dc4.",
  },

  // =================== NIMZO / QID / GRÜNFELD / KID / BENONI ===================
  {
    id: "nimzo-classic-qc2",
    name: "Piège: Nimzo Qc2, c7 en ligne de mire",
    side: "white",
    openingTags: ["Nimzo-Indienne"],
    seq: [
      "d4",
      "Nf6",
      "c4",
      "e6",
      "Nc3",
      "Bb4",
      "Qc2",
      "O-O",
      "a3",
      "Bc3",
      "Qc3",
    ],
    advice: "Qc2+a3, tactiques sur c7/e4. Noir: vise …d5 actif.",
  },

  {
    id: "qid-bb4-plus",
    name: "Piège: Ouest-Indienne ...Bb4+",
    side: "black",
    openingTags: ["Ouest-Indienne", "QID"],
    // 1.d4 Nf6 2.c4 e6 3.Nf3 b6 4.g3 Ba6 5.b3 Bb4+ 6.Bd2 Qe7
    seq: [
      "d4",
      "Nf6",
      "c4",
      "e6",
      "Nf3",
      "b6",
      "g3",
      "Ba6",
      "b3",
      "Bb4",
      "Bd2",
      "Qe7",
    ],
    advice: "…Bb4+ pose des clous embêtants. Ne surjoue pas si blanc vise Qa4.",
  },

  {
    id: "grunfeld-exchange-press",
    name: "Piège: Grünfeld Échange pression",
    side: "white",
    openingTags: ["Grünfeld"],
    seq: [
      "d4",
      "Nf6",
      "c4",
      "g6",
      "Nc3",
      "d5",
      "cd5",
      "Nd5",
      "e4",
      "Nc3",
      "bc3",
      "Bg7",
      "Nf3",
      "c5",
      "Rb1",
    ],
    advice: "Pression b-file. Sur …Qa5+, insère h3/Bg5.",
  },

  {
    id: "benoni-flick-knife",
    name: "Piège: Benoni Flick-Knife",
    side: "white",
    openingTags: ["Benoni"],
    // 1.d4 Nf6 2.c4 c5 3.d5 e6 4.Nc3 ed5 5.cd5 d6 6.e4 g6 7.f4 Bg7 8.Bb5+
    seq: [
      "d4",
      "Nf6",
      "c4",
      "c5",
      "d5",
      "e6",
      "Nc3",
      "ed5",
      "cd5",
      "d6",
      "e4",
      "g6",
      "f4",
      "Bg7",
      "Bb5",
    ],
    advice:
      "Bb5+ entend casser l’initiative noire. Marche bien si noir joue mécanique.",
  },

  // =================== CATALANE / RÉTI / ANGLAISE ===================
  {
    id: "catalan-open-qa4",
    name: "Piège: Catalane Ouverte Qa4+",
    side: "white",
    openingTags: ["Catalane"],
    // 1.d4 Nf6 2.c4 e6 3.g3 d5 4.Bg2 dc4 5.Qa4+ Nbd7 6.Qc4
    seq: [
      "d4",
      "Nf6",
      "c4",
      "e6",
      "g3",
      "d5",
      "Bg2",
      "dc4",
      "Qa4",
      "Nbd7",
      "Qc4",
    ],
    advice:
      "Qa4+ récupère c4 proprement. Si noir joue …Bd7??, tactiques en l’air.",
  },

  {
    id: "reti-early-c4-d5",
    name: "Piège: Réti, c4-d5!",
    side: "white",
    openingTags: ["Réti"],
    // 1.Nf3 d5 2.g3 Nf6 3.Bg2 c5 4.c4 d4? 5.b4!
    seq: ["Nf3", "d5", "g3", "Nf6", "Bg2", "c5", "c4", "d4", "b4"],
    advice:
      "b4! ouvre les lignes. Si noir précise …dxc4, bascule vers Qc2/Rd1.",
  },

  {
    id: "english-botvinnik-jab",
    name: "Piège: Anglaise Botvinnik, pointe",
    side: "white",
    openingTags: ["Anglaise", "Botvinnik"],
    // 1.c4 e5 2.Nc3 Nc6 3.g3 g6 4.Bg2 Bg7 5.d3 d6 6.Rb1 a5 7.a3
    seq: [
      "c4",
      "e5",
      "Nc3",
      "Nc6",
      "g3",
      "g6",
      "Bg2",
      "Bg7",
      "d3",
      "d6",
      "Rb1",
      "a5",
      "a3",
    ],
    advice:
      "Menaces b4-b5 pour casser c6. Si noir réagit …axb4, vise Rxb4/Be3.",
  },

  // =================== HOLLANDAISE / STAUNTON ===================
  {
    id: "staunton-gambit-sting",
    name: "Piège: Staunton vs Hollandaise",
    side: "white",
    openingTags: ["Hollandaise", "Staunton Gambit"],
    // 1.d4 f5 2.e4 fe4 3.Nc3 Nf6 4.Bg5 d5 5.f3 ef3 6.Nxf3
    seq: [
      "d4",
      "f5",
      "e4",
      "fe4",
      "Nc3",
      "Nf6",
      "Bg5",
      "d5",
      "f3",
      "ef3",
      "Nf3",
    ],
    advice: "Développement turbo. Sur …Bg4?, joue Qd2/O-O-O motifs tactiques.",
  },

  // =================== POLONAISE / SOKOLSKY / LARSEN ===================
  {
    id: "polish-early-qe2",
    name: "Piège: Polonaise, Qe2! sale",
    side: "white",
    openingTags: ["Polonaise", "1.b4"],
    // 1.b4 e5 2.Bb2 d6 3.e3 Nf6 4.c4 g6 5.Qe2 Bg7 6.Nf3 O-O 7.d4
    seq: [
      "b4",
      "e5",
      "Bb2",
      "d6",
      "e3",
      "Nf6",
      "c4",
      "g6",
      "Qe2",
      "Bg7",
      "Nf3",
      "O-O",
      "d4",
    ],
    advice: "Qe2 soutient e4/d4 et vise e5. Si noir surjoue, percées rapides.",
  },

  {
    id: "larsen-quick-center",
    name: "Piège: Larsen, centre éclair",
    side: "white",
    openingTags: ["Larsen", "1.b3"],
    // 1.b3 e5 2.Bb2 Nc6 3.e3 d5 4.Bb5 Bd6 5.f4 Qe7 6.Nf3
    seq: [
      "b3",
      "e5",
      "Bb2",
      "Nc6",
      "e3",
      "d5",
      "Bb5",
      "Bd6",
      "f4",
      "Qe7",
      "Nf3",
    ],
    advice: "Appuie e5/d4 et roque rapide. Piège les …exf4 précoces.",
  },

  // =================== RUY LOPEZ: MARSHALL / FISHING POLE ===================
  {
    id: "marshall-attack",
    name: "Piège: Marshall (Espagnole)",
    side: "black",
    openingTags: ["Espagnole", "Ruy Lopez", "Marshall"],
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5
    seq: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bb5",
      "a6",
      "Ba4",
      "Nf6",
      "O-O",
      "Be7",
      "Re1",
      "b5",
      "Bb3",
      "O-O",
      "c3",
      "d5",
    ],
    advice:
      "Compensation massive pour le pion. Si tu ne connais pas, évite …d5.",
  },

  {
    id: "fishing-pole",
    name: "Piège: Fishing Pole (Berlin vibe)",
    side: "black",
    openingTags: ["Espagnole", "Berlin"],
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6 4.O-O h5 5.Re1 Ng4 6.h3 Bc5 ... hxg4 idées
    seq: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bb5",
      "Nf6",
      "O-O",
      "h5",
      "Re1",
      "Ng4",
      "h3",
      "Bc5",
    ],
    advice:
      "h5–Ng4 pour coller hxg4/HQh4 idées. Gimmick de blitz, oui, mais meurtrier.",
  },
];

export function registerUltraTraps(engine) {
  engine.register(ULTRA_TRAPS);
}
