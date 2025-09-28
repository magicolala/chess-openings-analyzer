// trap-engine.js
// Moteur de détection de pièges : trie SAN + recos par famille d’ouverture.

import { normalizeToTokens } from "./src/utils/pgn.js";
// Voir src/traps/trap-pack.js pour la liste principale de pièges.

// Petit util pour savoir le camp au demi-coup i (0 = trait aux Blancs)
const sideAtPly = (startPly) => (startPly % 2 === 0 ? "white" : "black");

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
                seq: trap.seq,
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
