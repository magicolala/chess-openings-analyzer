// trap-engine.js
// Moteur de détection de pièges : trie SAN + recos par famille d’ouverture.

function normalizeToTokens(pgn) {
  if (!pgn || typeof pgn !== "string") return [];
  let s = pgn
    .replace(/\{[^}]*\}/g, " ")
    .replace(/;.*/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\$\d+/g, " ")
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, " ")
    .replace(/\d+\.(\.\.)?/g, " ")
    .replace(/x/g, "")
    .replace(/[+#]/g, "")
    .replace(/=([QRNB])\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return [];
  return s
    .split(" ")
    .map((tok) => (tok === "0-0" ? "O-O" : tok === "0-0-0" ? "O-O-O" : tok))
    .filter(
      (tok) =>
        /^O-O(-O)?$/.test(tok) ||
        /^[KQRNB]?[a-h]?[1-8]?[a-h][1-8]$/.test(tok) ||
        /^[a-h][1-8]$/.test(tok) ||
        /^[KQRNB][a-h][1-8]$/.test(tok)
    );
}

// Petit util pour savoir le camp au demi-coup i (0 = trait aux Blancs)
const sideAtPly = (startPly) => (startPly % 2 === 0 ? "white" : "black");

// ---------------- TRAP PACK (échantillon costaud) ----------------
/**
 * Schéma:
 *  id: string
 *  name: string (commence par "Piège:")
 *  side: 'white' | 'black'  (camp qui place le piège)
 *  openingTags: ['Italienne','Deux Cavaliers','Ruy Lopez', 'Najdorf', ...]
 *  seq: string[]  // SAN normalisés sans x,+,#, promotions nettoyées, O-O
 *  advice: string // court, affichable en UI
 */
export const TRAP_PACK = [
  // Italienne / Deux Cavaliers
  {
    id: "fried-liver",
    name: "Piège: Fried Liver",
    side: "white",
    openingTags: ["Italienne", "Deux Cavaliers"],
    seq: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5", "Nxd5"],
    advice: "…Na5 ou …Nd4, pas …Nxd5?? ou tu te fais cuisiner sur f7.",
  },
  {
    id: "traxler",
    name: "Piège: Traxler (Wilkes-Barre)",
    side: "black",
    openingTags: ["Deux Cavaliers"],
    seq: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "Bc5"],
    advice: "…Bc5 invite Bxf7+ tactiques; connais les réfutations sinon évite.",
  },
  {
    id: "legall",
    name: "Piège: Mat de Légal (motif)",
    side: "white",
    openingTags: ["Italienne", "Giuoco", "Philidor"],
    seq: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "d6",
      "Nc3",
      "Bg4",
      "h3",
      "Bh5",
      "Nxe5",
    ],
    advice:
      "Si …Bxd1?? Qxf7+ puis mat. Ne sur-utilise pas, bon niveau = vaccinés.",
  },

  // Ruy Lopez
  {
    id: "open-spanish-tactic",
    name: "Piège: Espagnole ouverte",
    side: "black",
    openingTags: ["Ruy Lopez", "Espagnole"],
    seq: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Nxe4"],
    advice:
      "…Nxe4 force des complications; connais d’abord …Be7 lignes calmes.",
  },
  {
    id: "noah-ark",
    name: "Piège: Espagnole motif “Arche de Noé”",
    side: "black",
    openingTags: ["Ruy Lopez", "Espagnole"],
    seq: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bb5",
      "a6",
      "Ba4",
      "b5",
      "Bb3",
      "Na5",
      "c3",
      "Nxb3",
      "Qxb3",
      "d6",
      "d4",
    ],
    advice: "…exd4 c4-c5 piège le fou blanc sur b3 si mal géré.",
  },

  // Sicilienne
  {
    id: "najdorf-poisoned",
    name: "Piège: Najdorf Poisoned Pawn",
    side: "black",
    openingTags: ["Najdorf", "Sicilienne"],
    seq: [
      "e4",
      "c5",
      "Nf3",
      "d6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "a6",
      "Bg5",
      "e6",
      "f4",
      "Qb6",
    ],
    advice: "…Qb6 vise b2. Si tu n’as pas les reférences, n’y va pas en blitz.",
  },
  {
    id: "rossolimo-b4",
    name: "Piège: Rossolimo b4-b5",
    side: "white",
    openingTags: ["Rossolimo", "Moscou", "Sicilienne"],
    seq: [
      "e4",
      "c5",
      "Nf3",
      "Nc6",
      "Bb5",
      "g6",
      "O-O",
      "Bg7",
      "Re1",
      "e5",
      "b4",
    ],
    advice: "b4-b5 casse la structure si …axb5? motifs tactiques sur e5/c6.",
  },
  {
    id: "morra-tactics",
    name: "Piège: Smith-Morra motifs",
    side: "white",
    openingTags: ["Smith-Morra", "Sicilienne"],
    seq: ["e4", "c5", "d4", "cxd4", "c3", "dxc3", "Nxc3"],
    advice:
      "Développement turbo; vise e5/f7. Si noir rend le pion tôt, adapte.",
  },

  // Française
  {
    id: "winawer-poisoned",
    name: "Piège: Winawer Poisoned Pawn",
    side: "white",
    openingTags: ["Française", "Winawer"],
    seq: [
      "e4",
      "e6",
      "d4",
      "d5",
      "Nc3",
      "Bb4",
      "e5",
      "c5",
      "a3",
      "Bxc3+",
      "bxc3",
      "Ne7",
      "Qg4",
    ],
    advice: "Qg4 gratte g7/b7. Connais les files ouvertes pour punir …Qc7?.",
  },

  // Caro-Kann
  {
    id: "ck-advance-bishop-trap",
    name: "Piège: Caro-Kann Avance, fou piégé",
    side: "white",
    openingTags: ["Caro-Kann"],
    seq: ["e4", "c6", "d4", "d5", "e5", "Bf5", "g4", "Be4", "f3"],
    advice: "Plan g4-f3 pour enfermer le fou. Ne force pas si …h5 précis.",
  },

  // Scandinave
  {
    id: "scandi-d5-push",
    name: "Piège: Scandinave poussé d5",
    side: "white",
    openingTags: ["Scandinave"],
    seq: [
      "e4",
      "d5",
      "exd5",
      "Qxd5",
      "Nc3",
      "Qa5",
      "d4",
      "Bd7",
      "Nf3",
      "Nc6",
      "d5",
    ],
    advice: "Gain de temps sur la dame noire. Surveille …Nb4 idées.",
  },

  // QGD / Cambridge / Elephant
  {
    id: "elephant-trap",
    name: "Piège: Elephant Trap (QGD)",
    side: "black",
    openingTags: ["QGD", "Cambridge Springs"],
    seq: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "Bg5",
      "Nbd7",
      "cxd5",
      "exd5",
      "Nxd5",
    ],
    advice: "…Nxd5! et si Bxd8?? Bb4+ gagne la dame. Classique de club.",
  },

  // Slav / Semi-Slav
  {
    id: "slav-qb3",
    name: "Piège: Slav Qb3 sur b7",
    side: "white",
    openingTags: ["Slave"],
    seq: [
      "d4",
      "d5",
      "c4",
      "c6",
      "cxd5",
      "cxd5",
      "Nc3",
      "Nc6",
      "Bf4",
      "Nf6",
      "e3",
      "Bf5",
      "Qb3",
    ],
    advice: "Appât b7. Si …Qb6 égalise, bascule en plan e4 rapide.",
  },

  // QGA
  {
    id: "qga-central",
    name: "Piège: QGA central crush",
    side: "white",
    openingTags: ["QGA"],
    seq: ["d4", "d5", "c4", "dxc4", "e4", "e5", "Nf3", "exd4", "Bxc4"],
    advice: "Centre qui explose vite. Évite si noir rend le pion proprement.",
  },

  // Nimzo / Ouest-Indienne
  {
    id: "nimzo-qc2-tactics",
    name: "Piège: Nimzo Qc2 tactiques",
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
      "Bxc3+",
      "Qxc3",
    ],
    advice: "Tactiques sur e4/c7. Ne dors pas sur …d5 rapide.",
  },

  // Grünfeld / KID
  {
    id: "grunfeld-exchange",
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
      "cxd5",
      "Nxd5",
      "e4",
      "Nxc3",
      "bxc3",
      "Bg7",
      "Nf3",
      "c5",
      "Rb1",
    ],
    advice: "Pression diagonale et b-file. Prévois h3-Bg5 si …Qa5+.",
  },
  {
    id: "kid-saemisch-d5",
    name: "Piège: KID Sämisch d5!",
    side: "white",
    openingTags: ["KID", "Est-Indienne"],
    seq: [
      "d4",
      "Nf6",
      "c4",
      "g6",
      "Nc3",
      "Bg7",
      "e4",
      "d6",
      "f3",
      "O-O",
      "Be3",
      "e5",
      "Nge2",
      "Nc6",
      "d5",
    ],
    advice: "d5 au bon timing punit …Nc6-e5 superficiel.",
  },

  // Benoni / Benko
  {
    id: "benko-accept",
    name: "Piège: Benko accepté, initiative",
    side: "black",
    openingTags: ["Benko", "Volga"],
    seq: ["d4", "Nf6", "c4", "c5", "d5", "b5", "cxb5", "a6"],
    advice: "Compensation d’initiative. Ne tilte pas si blanc rend …bxa6 vite.",
  },

  // London / Jobava / Trompowsky
  {
    id: "london-anti-qb6",
    name: "Piège: Londres anti-…Qb6",
    side: "white",
    openingTags: ["London", "Londres"],
    seq: ["d4", "Nf6", "Bf4", "c5", "d5", "Qb6", "Nc3"],
    advice: "Tactiques sur b2/d5. Évite si …Qxb2!? précis.",
  },
  {
    id: "jobava-nb5-idea",
    name: "Piège: Jobava Nb5!",
    side: "white",
    openingTags: ["Jobava", "London"],
    seq: ["d4", "Nf6", "Nc3", "Bf4", "d5", "Nb5", "Qa5+", "Nc3", "e5"],
    advice: "Mélange d’idées rapides sur c7/e5; calcul obligatoire.",
  },
  {
    id: "tromp-qb6",
    name: "Piège: Trompowsky anti-…Qb6",
    side: "white",
    openingTags: ["Trompowsky"],
    seq: ["d4", "Nf6", "Bg5", "c5", "d5", "Qb6", "Nc3"],
    advice: "Motif semblable à Londres. Retiens les tactiques b2/c5.",
  },

  // Hollandaise
  {
    id: "dutch-leningrad-e-file",
    name: "Piège: Leningrad, e-file",
    side: "white",
    openingTags: ["Hollandaise", "Leningrad"],
    seq: [
      "d4",
      "f5",
      "c4",
      "Nf6",
      "g3",
      "e6",
      "Bg2",
      "Be7",
      "Nf3",
      "O-O",
      "O-O",
      "d6",
      "Nc3",
      "Qe8",
      "Re1",
    ],
    advice: "Cloue la tour e. Attention aux embuscades sur h2/h7.",
  },

  // Divers faciles
  {
    id: "blackburne-shilling",
    name: "Piège: Blackburne–Shilling",
    side: "black",
    openingTags: ["e4 e5"],
    seq: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nd4", "Nxe5", "Qg5", "Bxf7+"],
    advice: "…Nd4?! amorce un guet-apens. Forts: ne tombe pas amoureux de ça.",
  },
  {
    id: "scholars-mate",
    name: "Piège: Mat du berger",
    side: "white",
    openingTags: ["e4 e5", "Débutant"],
    seq: ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7"],
    advice: "C’est sale mais pédagogique. À éviter au-delà de 800.",
  },
];

// ---------------- TRIE ----------------
class TrieNode {
  constructor() {
    this.children = new Map();
    this.ends = [];
  }
}

export class TrapEngine {
  constructor() {
    this.root = new TrieNode();
    this.byId = new Map();
  }

  register(traps) {
    for (const t of traps) {
      this.byId.set(t.id, t);
      let node = this.root;
      for (const tok of t.seq) {
        if (!node.children.has(tok)) node.children.set(tok, new TrieNode());
        node = node.children.get(tok);
      }
      node.ends.push(t.id);
    }
  }

  // Match sur tokens; retourne exacts + “near”
  matchTokens(tokens, { openingLabel = "", side = null, maxPlies = 30 } = {}) {
    const results = [];
    const near = [];

    const openingLower = String(openingLabel || "").toLowerCase();

    for (let i = 0; i < Math.min(tokens.length, maxPlies); i++) {
      // Filtre côté au trait au start
      const sideToMove = sideAtPly(i);
      if (side && side !== sideToMove) continue;

      let node = this.root;
      let j = i;
      let progressed = 0;
      // Parcours tant que ça matche
      while (j < tokens.length && node.children.has(tokens[j])) {
        node = node.children.get(tokens[j]);
        progressed++;
        // Si fin d’un ou plusieurs pièges
        if (node.ends.length) {
          for (const id of node.ends) {
            const trap = this.byId.get(id);
            // Bonus: filtre par tags d’ouverture si fournis
            const tagOk =
              !trap.openingTags?.length ||
              trap.openingTags.some((tag) =>
                openingLower.includes(tag.toLowerCase())
              );
            // Et par côté si demandé
            const sideOk = !side || trap.side === side;
            if (tagOk && sideOk) {
              results.push({
                id,
                name: trap.name,
                side: trap.side,
                startPly: i,
                length: trap.seq.length,
                matchedPlies: progressed,
                advice: trap.advice,
                openingTags: trap.openingTags || [],
              });
            }
          }
        }
        j++;
      }
      // Near-miss s’il y a un progrès significatif mais pas fin
      if (progressed >= 3 && !node.ends.length) {
        near.push({
          startPly: i,
          matchedPlies: progressed,
          nextRequired: [...node.children.keys()][0] || null,
        });
      }
    }

    // Dédupliquer les results par id plus long d’abord
    results.sort(
      (a, b) => b.matchedPlies - a.matchedPlies || a.startPly - b.startPly
    );
    const seen = new Set();
    const uniq = [];
    for (const r of results) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      uniq.push(r);
    }
    return { hits: uniq, near };
  }

  matchPgn(pgn, { openingLabel = "", side = null, maxPlies = 30 } = {}) {
    const tokens = normalizeToTokens(pgn);
    return this.matchTokens(tokens, { openingLabel, side, maxPlies });
  }

  // Recommandations par label d’ouverture et côté
  recommendByOpening(openingLabel, side, limit = 5) {
    const l = String(openingLabel || "").toLowerCase();
    const picks = [];
    for (const t of this.byId.values()) {
      if (side && t.side !== side) continue;
      if (!t.openingTags?.length) continue;
      if (t.openingTags.some((tag) => l.includes(tag.toLowerCase()))) {
        picks.push({
          id: t.id,
          name: t.name,
          side: t.side,
          seq: t.seq,
          advice: t.advice,
        });
      }
    }
    // Un tri simple: pièges plus courts d’abord (plus faciles à placer)
    picks.sort((a, b) => a.seq.length - b.seq.length);
    return picks.slice(0, limit);
  }
}
