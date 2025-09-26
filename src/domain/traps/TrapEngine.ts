import { Trap, TrapMatch, TrapRecommendation, TrapSide } from './Trap';

interface TrieNode {
  children: Map<string, TrieNode>;
  ends: string[];
}

export interface TrapMatchOptions {
  readonly openingLabel?: string;
  readonly side?: TrapSide | null;
  readonly maxPlies?: number;
}

export interface TrapNearMatch {
  readonly startPly: number;
  readonly matchedPlies: number;
  readonly nextRequired: string | null;
}

export interface TrapMatchResult {
  readonly hits: readonly TrapMatch[];
  readonly near: readonly TrapNearMatch[];
}

const DEFAULT_MAX_PLIES = 30;

function normalizeToTokens(pgn: string): string[] {
  if (!pgn || typeof pgn !== 'string') {
    return [];
  }

  let sanitized = pgn
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/;.*/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\$\d+/g, ' ')
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/x/g, '')
    .replace(/[+#]/g, '')
    .replace(/=([QRNB])\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!sanitized) {
    return [];
  }

  return sanitized
    .split(' ')
    .map((token) => {
      if (token === '0-0') return 'O-O';
      if (token === '0-0-0') return 'O-O-O';
      return token;
    })
    .filter((token) =>
      /^O-O(-O)?$/.test(token) ||
      /^[KQRNB]?[a-h]?[1-8]?[a-h][1-8]$/.test(token) ||
      /^[a-h][1-8]$/.test(token) ||
      /^[KQRNB][a-h][1-8]$/.test(token),
    );
}

const sideAtPly = (startPly: number): TrapSide =>
  startPly % 2 === 0 ? 'white' : 'black';

function createNode(): TrieNode {
  return { children: new Map(), ends: [] };
}

export class TrapEngine {
  private readonly root: TrieNode;
  private readonly byId: Map<string, Trap>;

  constructor(traps: readonly Trap[] = []) {
    this.root = createNode();
    this.byId = new Map();

    if (traps.length) {
      this.register(traps);
    }
  }

  register(traps: readonly Trap[]): this {
    for (const trap of traps) {
      this.byId.set(trap.id, trap);
      let node = this.root;
      for (const token of trap.seq) {
        if (!node.children.has(token)) {
          node.children.set(token, createNode());
        }
        node = node.children.get(token)!;
      }
      node.ends.push(trap.id);
    }
    return this;
  }

  matchTokens(tokens: readonly string[], options: TrapMatchOptions = {}): TrapMatchResult {
    const { openingLabel = '', side = null, maxPlies = DEFAULT_MAX_PLIES } = options;
    const results: TrapMatch[] = [];
    const near: TrapNearMatch[] = [];

    const openingLower = openingLabel.toLowerCase();
    const upperBound = Math.min(tokens.length, maxPlies);

    for (let start = 0; start < upperBound; start += 1) {
      const sideToMove = sideAtPly(start);
      if (side && side !== sideToMove) continue;

      let node = this.root;
      let cursor = start;
      let progressed = 0;

      while (cursor < tokens.length && node.children.has(tokens[cursor]!)) {
        node = node.children.get(tokens[cursor]!)!;
        progressed += 1;

        if (node.ends.length) {
          for (const id of node.ends) {
            const trap = this.byId.get(id);
            if (!trap) continue;
            const tagOk =
              !trap.openingTags?.length ||
              trap.openingTags.some((tag) => openingLower.includes(tag.toLowerCase()));
            const sideOk = !side || trap.side === side;
            if (tagOk && sideOk) {
              results.push({
                id,
                name: trap.name,
                side: trap.side,
                startPly: start,
                length: trap.seq.length,
                matchedPlies: progressed,
                advice: trap.advice,
                openingTags: trap.openingTags ?? [],
                seq: trap.seq,
              });
            }
          }
        }

        cursor += 1;
      }

      if (progressed >= 3 && node.ends.length === 0) {
        const [nextRequired] = node.children.keys();
        near.push({
          startPly: start,
          matchedPlies: progressed,
          nextRequired: nextRequired ?? null,
        });
      }
    }

    results.sort((a, b) => b.matchedPlies - a.matchedPlies || a.startPly - b.startPly);
    const seen = new Set<string>();
    const unique: TrapMatch[] = [];

    for (const match of results) {
      if (seen.has(match.id)) continue;
      seen.add(match.id);
      unique.push(match);
    }

    return { hits: unique, near };
  }

  matchPgn(pgn: string, options: TrapMatchOptions = {}): TrapMatchResult {
    const tokens = normalizeToTokens(pgn);
    return this.matchTokens(tokens, options);
  }

  recommendByOpening(
    openingLabel: string,
    side: TrapSide,
    limit = 5,
  ): readonly TrapRecommendation[] {
    const lower = openingLabel.toLowerCase();
    const picks: TrapRecommendation[] = [];

    for (const trap of this.byId.values()) {
      if (side && trap.side !== side) continue;
      if (!trap.openingTags?.length) continue;
      if (trap.openingTags.some((tag) => lower.includes(tag.toLowerCase()))) {
        picks.push({
          id: trap.id,
          name: trap.name,
          side: trap.side,
          seq: trap.seq,
          advice: trap.advice,
        });
      }
    }

    picks.sort((a, b) => a.seq.length - b.seq.length);
    return picks.slice(0, Math.max(0, limit));
  }
}
