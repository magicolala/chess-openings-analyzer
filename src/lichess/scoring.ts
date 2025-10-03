import { ExplorerResponse, GmMajorityConfig, GmMajorityEvaluation, MastersResponse, ScoredMove } from './types';

function sumMasterMove(move: { white?: number; draws?: number; black?: number }): number {
  return (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
}

export function scoreMoves(data: ExplorerResponse | null | undefined, sideToMove: 'white' | 'black' = 'white', { minExpectedScore = 0 } = {}): ScoredMove[] {
  if (!data || !Array.isArray(data.moves)) {
    return [];
  }
  return data.moves
    .map((move) => {
      const white = move.white ?? 0;
      const draws = move.draws ?? 0;
      const black = move.black ?? 0;
      const total = white + draws + black;
      const wins = sideToMove === 'white' ? white : black;
      const expectedScore = total > 0 ? (wins + 0.5 * draws) / total : 0;
      return {
        ...move,
        total,
        expectedScore,
        sideExpectedScore: expectedScore,
      } satisfies ScoredMove;
    })
    .filter((entry) => entry.sideExpectedScore >= minExpectedScore)
    .sort((a, b) => b.sideExpectedScore - a.sideExpectedScore || b.total - a.total);
}

export function computeGmMajority(mastersData: MastersResponse | null | undefined, { gmMode = 'top1', gmTopK = 1, coverageThreshold = 0.7, minMasterGames = 50 }: GmMajorityConfig = {}): GmMajorityEvaluation {
  if (!mastersData || !Array.isArray(mastersData.moves)) {
    return { considered: false, reason: 'noData' };
  }
  const sorted = [...mastersData.moves].sort((a, b) => sumMasterMove(b) - sumMasterMove(a));
  const total = sorted.reduce((acc, move) => acc + sumMasterMove(move), 0);
  if (total < minMasterGames) {
    return { considered: false, reason: 'lowVolume', total };
  }

  const picked: Array<{ move: MastersResponse['moves'][number]; coverage: number }> = [];
  if (gmMode === 'coverage') {
    const target = Math.max(0.01, Math.min(1, coverageThreshold));
    let acc = 0;
    for (const move of sorted) {
      const volume = sumMasterMove(move);
      acc += volume;
      picked.push({ move, coverage: acc / total });
      if (acc / total >= target) {
        break;
      }
    }
  } else if (gmMode === 'topK') {
    const limit = Math.max(1, gmTopK | 0);
    for (let i = 0; i < Math.min(limit, sorted.length); i += 1) {
      const move = sorted[i];
      picked.push({ move, coverage: sumMasterMove(move) / total });
    }
  } else if (sorted.length > 0) {
    picked.push({ move: sorted[0], coverage: sumMasterMove(sorted[0]) / total });
  }

  const majoritySet = new Set(picked.map((entry) => entry.move.uci));
  const coverage = picked.reduce((acc, entry) => acc + sumMasterMove(entry.move), 0) / total;
  return {
    considered: true,
    total,
    coverage,
    majoritySet,
    pickedMoves: picked.map((entry) => ({
      uci: entry.move.uci,
      san: entry.move.san,
      volume: sumMasterMove(entry.move),
      coverage: entry.coverage,
    })),
    topMove: sorted[0]
      ? {
          uci: sorted[0].uci,
          san: sorted[0].san,
          volume: sumMasterMove(sorted[0]),
          coverage: sumMasterMove(sorted[0]) / total,
        }
      : null,
  };
}

export function evaluateMoveAgainstGm(mastersData: MastersResponse | null | undefined, playedUci: string, config?: GmMajorityConfig): GmMajorityEvaluation {
  const evaluation = computeGmMajority(mastersData, config);
  if (!evaluation.considered || !evaluation.majoritySet) {
    return { ...evaluation, inBook: null };
  }
  const inBook = evaluation.majoritySet.has(playedUci);
  return {
    ...evaluation,
    inBook,
  };
}
