// eco-pack-xl.js
// Pack XL d’ouvertures ECO + répertoire de pièges courants.
// Format: séquences SAN tokenisées (sans 'x', '+', '#', '=Q', roques 'O-O').
// Intégration :
//   import { registerEcoOpenings, ECO_PACK_XL, ECO_TRAPS } from './eco-pack-xl.js';
//   registerEcoOpenings(ECO_OPENINGS); // injecte tout (ou choisis ECO_PACK_XL/ECO_TRAPS séparément)

export const ECO_PACK_XL = [
    // ——— ESPAGNOLE (Ruy Lopez) ———
    [['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3'], 'Espagnole Fermée, Chigorin'],
    [['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6','c3','O-O','h3','Na5'], 'Espagnole, Breyer'],
    [['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','Bb7','d3','d6'], 'Espagnole, Arkhangelsk'],
    [['e4','e5','Nf3','Nc6','Bb5','Nf6'], 'Espagnole, Berlin (début)'],
    [['e4','e5','Nf3','Nc6','Bb5','Nxe4'], 'Espagnole Ouverte'],
    [['e4','e5','Nf3','Nc6','Bb5','d6'], 'Espagnole, Steinitz'],
    [['e4','e5','Nf3','Nc6','Bb5','f5'], 'Espagnole, Schliemann (Jaenisch)'],
    [['e4','e5','Nf3','Nc6','Bb5','Bc5'], 'Espagnole, Défense Classique'],
    [['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','b5','Bb3','Na5'], 'Espagnole, Neo-Arkhangelsk idées'],
  
    // ——— ITALIENNE / DEUX CAVALIERS ———
    [['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d3','d6'], 'Italienne, Giuoco Pianissimo'],
    [['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','d6'], 'Italienne tranquille'],
    [['e4','e5','Nf3','Nc6','Bc4','Bc5','b4'], 'Gambit Evans'],
    [['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','d5','exd5','Na5'], 'Deux Cavaliers, ligne principale'],
    [['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','Bc5'], 'Deux Cavaliers, Traxler (Wilkes-Barre)'],
    [['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','d5','exd5','Nd4'], 'Deux Cavaliers, anti-Fried-Liver'],
  
    // ——— VIENNE / GAMBITS ROYAUX ———
    [['e4','e5','Nc3','Nf6','f4'], 'Viennoise, Gambit'],
    [['e4','e5','f4','exf4','Nf3','g5','h4'], 'Gambit du Roi, Kieseritzky'],
    [['e4','e5','f4','d5'], 'Gambit du Roi refusé, Falkbeer'],
  
    // ——— PETROFF / PHILIDOR ———
    [['e4','e5','Nf3','Nf6','Nxe5','d6','Nf3','Nxe4'], 'Petrov, principale'],
    [['e4','e5','Nf3','d6','d4','Nf6','Nc3','Nbd7'], 'Philidor, Hanham'],
  
    // ——— SICILIENNE ———
    [['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6'], 'Sicilienne Najdorf'],
    [['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','g6'], 'Sicilienne Dragon'],
    [['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','Nf6','Nc3','e5'], 'Sicilienne Sveshnikov'],
    [['e4','c5','Nf3','e6','d4','cxd4','Nxd4','Nc6'], 'Sicilienne Taimanov'],
    [['e4','c5','Nf3','e6','d4','cxd4','Nxd4','a6'], 'Sicilienne Kan'],
    [['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nc6','Be2','e6'], 'Sicilienne Scheveningen (setup)'],
    [['e4','c5','Nf3','Nc6','Bb5'], 'Sicilienne Rossolimo/Moscou'],
    [['e4','c5','Nc3','Nc6','f4'], 'Sicilienne Grand Prix'],
    [['e4','c5','d4','cxd4','c3'], 'Sicilienne Smith-Morra'],
    [['e4','c5','Nf3','Nc6','d4','cxd4','Nxd4','g6'], 'Sicilienne Dragon accélérée'],
    [['e4','c5','c3','d5'], 'Sicilienne Alapin, ...d5'],
  
    // ——— FRANÇAISE ———
    [['e4','e6','d4','d5','Nc3','Bb4'], 'Française Winawer'],
    [['e4','e6','d4','d5','Nd2'], 'Française Tarrasch'],
    [['e4','e6','d4','d5','Nf3','dxe4'], 'Française Rubinstein'],
    [['e4','e6','d4','d5','e5','c5','c3','Nc6'], 'Française Avance'],
    [['e4','e6','d4','d5','exd5','exd5'], 'Française Échange'],
    [['e4','e6','d4','d5','Nc3','Nf6'], 'Française Classique'],
  
    // ——— CARO-KANN ———
    [['e4','c6','d4','d5','e5','Bf5','Nf3','e6'], 'Caro-Kann Avance'],
    [['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Bf5'], 'Caro-Kann Classique'],
    [['e4','c6','d4','d5','exd5','cxd5','c4'], 'Caro-Kann Panov-Botvinnik'],
    [['e4','c6','d4','d5','Nd2'], 'Caro-Kann 2 Cavaliers (Nd2)'],
    [['e4','c6','d4','d5','cxd5','cxd5'], 'Caro-Kann Échange'],
  
    // ——— AUTRES vs 1.e4 ———
    [['e4','d5','exd5','Qxd5','Nc3','Qa5'], 'Scandinave ...Qa5'],
    [['e4','d5','exd5','Qxd5','Nc3','Qd6'], 'Scandinave ...Qd6'],
    [['e4','d6','d4','Nf6','Nc3','g6'], 'Pirc'],
    [['e4','g6','d4','Bg7','Nc3','d6'], 'Moderne (transpo Pirc)'],
    [['e4','Nf6','e5','Nd5','d4','d6','Nf3'], 'Alekhine Moderne'],
    [['e4','e5','d4','exd4','Qxd4','Nc6','Qe3'], 'Centre Game (variante sûre)'],
  
    // ——— d4 d5 / QGD / SLAV / SEMI-SLAV ———
    [['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3','O-O'], 'QGD Orthodoxe'],
    [['d4','d5','c4','e6','Nc3','Nf6','Bg5','Nbd7'], 'QGD Cambridge Springs setup'],
    [['d4','d5','c4','e6','Nc3','c5'], 'QGD Tarrasch'],
    [['d4','d5','c4','c6','Nc3','Nf6','Nf3','e6'], 'Semi-Slave'],
    [['d4','d5','c4','c6','Nc3','Nf6','e3','Bf5'], 'Slave Chebanenko idées'],
    [['d4','d5','c4','c6','cxd5','cxd5','Nc3','Nc6','Bf4'], 'Slave Échange avec Bf4'],
    [['d4','d5','c4','e6','Nc3','Be7','cxd5','exd5','Bf4'], 'QGD Échange, Carlsbad'],
  
    // ——— QGA ———
    [['d4','d5','c4','dxc4','Nf3','Nf6','e3','e6','Bxc4','c5'], 'QGA Classique'],
    [['d4','d5','c4','dxc4','e4'], 'QGA, Gambit central'],
  
    // ——— NIMZO / OUEST-INDIENNE / KID / GRÜNFELD / BENONI / BENKO ———
    [['d4','Nf6','c4','e6','Nc3','Bb4','Qc2'], 'Nimzo-Indienne, Capablanca'],
    [['d4','Nf6','c4','e6','Nc3','Bb4','e3','O-O','Bd3','d5'], 'Nimzo-Indienne, Rubinstein'],
    [['d4','Nf6','c4','e6','Nc3','Bb4','a3','Bxc3+','bxc3'], 'Nimzo-Indienne, Sämisch'],
    [['d4','Nf6','c4','e6','Nf3','b6','g3','Bb7','Bg2','Be7','O-O','O-O'], 'Ouest-Indienne Principale'],
    [['d4','Nf6','c4','g6','Nc3','d5','cxd5','Nxd5'], 'Grünfeld, Échange'],
    [['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','Be2','O-O','Nf3','e5'], 'KID, Classique'],
    [['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3'], 'KID, Sämisch'],
    [['d4','Nf6','c4','c5','d5','e6','Nc3','exd5','cxd5','d6'], 'Benoni Moderne'],
    [['d4','Nf6','c4','c5','d5','b5'], 'Benko/Volga Gambit'],
  
    // ——— SYSTÈMES d4 sans c4 ———
    [['d4','Nf6','Bf4','g6','e3','Bg7','Nf3','O-O','h3'], 'Système de Londres'],
    [['d4','Nf6','Nf3','e3','Bd3','O-O','O-O','b3','Bb2'], 'Colle-Zukertort'],
    [['d4','Nf6','Nc3','Bf4','d5','Nb5'], 'Jobava-London'],
    [['d4','Nf6','Bg5'], 'Trompowsky'],
    [['d4','Nf6','Nf3','e6','Bg5'], 'Torre'],
    [['d4','d5','Nc3','Nf6','e4'], 'Gambit Blackmar-Diemer'],
    [['d4','Nf6','c4','e6','g3','d5','Bg2','Be7','Nf3','O-O','O-O'], 'Catalane Fermée'],
    [['d4','Nf6','c4','e6','g3','d5','Bg2','Be7','Nf3','O-O','O-O','dxc4','Qc2'], 'Catalane Ouverte (reprise)'],
  
    // ——— HOLLANDAISE ———
    [['d4','f5','c4','Nf6','g3','g6','Bg2','Bg7','Nf3','O-O'], 'Hollandaise Leningrad'],
    [['d4','f5','g3','Nf6','Bg2','e6','Nf3','Be7','O-O','O-O','c4','d6'], 'Hollandaise Classique'],
    [['d4','f5','c4','e6','Nc3','Nf6','g3','d5'], 'Hollandaise Stonewall'],
  
    // ——— ANGLAISE / RÉTI ———
    [['c4','e5','Nc3','Nc6','g3','g6','Bg2','Bg7'], 'Anglaise Quatre Cavaliers, fianchetto'],
    [['c4','c5','Nc3','Nc6','g3','g6','Bg2','Bg7','Nf3','Nf6','O-O','O-O','d4'], 'Anglaise Symétrique, plan Botvinnik'],
    [['c4','e5','g3','Nf6','Bg2','d5'], 'Anglaise, Sicilienne inversée'],
    [['Nf3','d5','g3','Nf6','Bg2','c6','O-O','Bf5'], 'Réti, set-up Caro inversé'],
    [['Nf3','d5','c4','e6','g3','Nf6','Bg2','Be7','O-O','O-O'], 'Réti en transpo QGD'],
  ];
  
  export const ECO_TRAPS = [
    // ——— Pièges e4 e5 / Italienne / Deux Cavaliers ———
    [['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','d5','exd5','Nxd5'], 'Piège: Fried Liver alert (les Noirs doivent jouer ...Na5 ou ...Nd4)'],
    [['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','Bc5'], 'Piège: Traxler (Wilkes-Barre) tactiques sauvages'],
    [['e4','e5','Nf3','Nc6','Bc4','d6','Nc3','Bg4','h3','Bh5','Nxe5'], 'Piège: Mat de Légal thématique si ...Bxd1?? Qxf7# suit'],
    [['e4','e5','Nf3','Nc6','Bc4','Bc5','b4','Bxb4','c3','Ba5','d4'], 'Piège: Evans Gambit initiative violente'],
  
    // ——— Ruy Lopez ———
    [['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','d6','d4'], 'Piège: Ruy Lopez, menaces sur e5 et fourchettes rapides'],
    [['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Nxe4'], 'Piège: Ruy Lopez Ouverte, tactiques sur e5/d4'],
    [['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','b5','Bb3','Na5','c3','Nxb3','Qxb3','d6','d4'], 'Piège: Noé (Noah’s Ark) motifs de piège de pions sur c3/d4'],
  
    // ——— Sicilienne ———
    [['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6','Bg5','e6','f4','Be7','Qf3','Qc7','O-O-O','Nbd7'], 'Piège: Najdorf Poisoned Pawn idées tactiques'],
    [['e4','c5','Nf3','Nc6','Bb5','g6','O-O','Bg7','Re1','e5','b4'], 'Piège: Rossolimo, sacrifices b4/b5 surcadenassage'],
    [['e4','c5','d4','cxd4','c3','dxc3','Nxc3'], 'Piège: Smith-Morra, tactiques rapides sur e5/f7'],
  
    // ——— Française ———
    [['e4','e6','d4','d5','Nc3','Bb4','e5','c5','a3','Bxc3+','bxc3','Ne7','Qg4'], 'Piège: Winawer Poisoned Pawn (Qg4)'],
    [['e4','e6','d4','d5','Nd2','c5','exd5','exd5','Ngf3','Nc6','Bb5'], 'Piège: Tarrasch, pressions précoces c5/d4'],
  
    // ——— Caro-Kann ———
    [['e4','c6','d4','d5','e5','Bf5','g4','Be4','f3'], 'Piège: Caro-Kann Avance, rafales g4-f3 piègent le Fou'],
    [['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Bf5','Ng3','Bg6','h4','h6','Nf3'], 'Piège: Harass du Fou g6 après h4-h5'],
  
    // ——— Scandinave ———
    [['e4','d5','exd5','Qxd5','Nc3','Qa5','d4','Bd7','Nf3','Nc6','d5'], 'Piège: Scandinave, poussée d5 gagnant du temps'],
  
    // ——— Pirc / Moderne / Alekhine ———
    [['e4','d6','d4','Nf6','Nc3','g6','f4','Bg7','Nf3','O-O','Bd3','Na6','O-O','c5'], 'Piège: Pirc ruptures thématiques e5/d5'],
    [['e4','Nf6','e5','Nd5','d4','d6','Nf3','Bg4','Be2','Nc6','c4'], 'Piège: Alekhine, surcharges centrales'],
  
    // ——— QGD / Cambridge / Elephant Trap ———
    [['d4','d5','c4','e6','Nc3','Nf6','Bg5','Nbd7','cxd5','exd5','Nxd5','Nxd5','Bxd8'], 'Piège: Cambridge Springs/Elephant Trap motif (…Nxd5! punition)'],
    [['d4','d5','c4','e6','Nc3','Nf6','Bg5','Nbd7','e3','c6','Nf3','Qa5'], 'Piège: Cambridge Springs, tactiques Qa5'],
    [['d4','d5','c4','e6','Nc3','Nf6','cxd5','exd5','Bg5','Be7','e3','O-O','Bd3','Nbd7','Qc2','Re8','Nf3'], 'Piège: QGD Orthodoxe, clouages sur f6'],
  
    // ——— Slav / Semi-Slav / Noteboom ———
    [['d4','d5','c4','c6','Nc3','e6','Nf3','Nf6','e3','Nbd5','Bd3','dxc4'], 'Piège: Semi-Slav, thème Noteboom'],
    [['d4','d5','c4','c6','cxd5','cxd5','Nc3','Nc6','Bf4','Nf6','e3','Bf5','Qb3'], 'Piège: Slav Échange, appât sur b7'],
  
    // ——— QGA ———
    [['d4','d5','c4','dxc4','e4','e5','Nf3','exd4','Bxc4'], 'Piège: QGA, central crush si ...e5? mal géré'],
  
    // ——— Nimzo / Ouest-Indienne ———
    [['d4','Nf6','c4','e6','Nc3','Bb4','Qc2','O-O','a3','Bxc3+','Qxc3','b6','Bg5'], 'Piège: Nimzo Qc2, tactiques sur e4/c7'],
    [['d4','Nf6','c4','e6','Nf3','b6','g3','Bb7','Bg2','Bb4+','Bd2','Be7'], 'Piège: Ouest-Indienne, thèmes sur e4/d5'],
  
    // ——— Grünfeld / KID ———
    [['d4','Nf6','c4','g6','Nc3','d5','cxd5','Nxd5','e4','Nxc3','bxc3','Bg7','Nf3','c5','Rb1'], 'Piège: Grünfeld Échange, pression long diag'],
    [['d4','Nf6','c4','g6','Nc3','Bg7','e4','d6','f3','O-O','Be3','e5','Nge2','Nc6','d5'], 'Piège: KID Sämisch, poussée d5'],
  
    // ——— Benoni / Benko ———
    [['d4','Nf6','c4','c5','d5','e6','Nc3','exd5','cxd5','d6','e4','g6','f4'], 'Piège: Benoni moderne, ruptures e5-f5'],
    [['d4','Nf6','c4','c5','d5','b5','cxb5','a6'], 'Piège: Benko, matériel contre initiative'],
  
    // ——— London / Colle / Jobava / Trompowsky ———
    [['d4','Nf6','Bf4','c5','d5','Qb6','Nc3'], 'Piège: Londres anti-...Qb6, piège sur b2/d5'],
    [['d4','Nf6','Nc3','Bf4','d5','Nb5','Qa5+','Nc3','e5'], 'Piège: Jobava, sauts tactiques Nb5'],
    [['d4','Nf6','Bg5','c5','d5','Qb6','Nc3'], 'Piège: Trompowsky, affaiblissements sur b6'],
  
    // ——— Hollandaise ———
    [['d4','f5','c4','Nf6','g3','e6','Bg2','Be7','Nf3','O-O','O-O','d6','Nc3','Qe8','Re1'], 'Piège: Leningrad, tactiques sur e-file'],
    [['d4','f5','g3','Nf6','Bg2','e6','Nf3','Be7','O-O','O-O','c4','d6','Nc3','Qe8','Re1','Qh5'], 'Piège: Classique, attaque sur h2/h7 qui se retourne'],
  
    // ——— Anglaise / Réti ———
    [['c4','e5','Nc3','Nc6','g3','g6','Bg2','Bg7','d3','d6','Rb1','a5'], 'Piège: Anglaise, contre-attaques sur b-file'],
    [['Nf3','d5','g3','Nf6','Bg2','c6','O-O','Bf5','d3','Nbd7','Nbd2','e5'], 'Piège: Réti, thèmes e4/c4'],
  
    // ——— Divers pièges rapides “pub quiz” ———
    [['e4','e5','Qh5','Nc6','Bc4','Nf6','Qxf7'], 'Piège: Mat du Berger (pour mémoire)'],
    [['e4','e5','Nf3','Nc6','Bc4','Nd4','Nxe5','Qg5','Bxf7+'], 'Piège: Blackburne-Shilling, punition sur ...Nd4?!'],
    [['e4','c5','Qh5','Nc6','Qxc5'], 'Piège: “patzer” anti-sicilienne, attention ...e5!'],
  ];
  
  /**
   * Injecte les packs XL + Traps dans la Map d’ouvertures (clé: 'e4 e5 Nf3 ...' -> valeur: nom).
   * @param {Map<string,string>} openingsMap
   * @param {Object} options
   * @param {boolean} [options.includeTraps=true] Inclut les pièges taggés.
   * @param {boolean} [options.onlyTraps=false] Injecte uniquement les pièges.
   */
  export function registerEcoOpenings(openingsMap, options = {}) {
    const { includeTraps = true, onlyTraps = false } = options;
    const put = (arr) => {
      for (const [seq, name] of arr) openingsMap.set(seq.join(' '), name);
    };
    if (!onlyTraps) put(ECO_PACK_XL);
    if (includeTraps) put(ECO_TRAPS);
  }
  