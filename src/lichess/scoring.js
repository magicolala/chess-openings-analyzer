function sumMasterMove(move) {
  return (move.white || 0) + (move.draws || 0) + (move.black || 0);
}

export function scoreMoves(data, sideToMove = "white", { minExpectedScore = 0 } = {}) {
  if (!data || !Array.isArray(data.moves)) return [];
  return data.moves
    .map((m) => {
      const W = m.white || 0;
      const D = m.draws || 0;
      const B = m.black || 0;
      const total = W + D + B;
      const wins = sideToMove === "white" ? W : B;
      const expectedScore = total ? (wins + 0.5 * D) / total : 0;
      return {
        san: m.san,
        uci: m.uci,
        total,
        sideExpectedScore: expectedScore,
        raw: m,
      };
    })
    .filter((entry) => entry.sideExpectedScore >= minExpectedScore)
    .sort((a, b) => b.sideExpectedScore - a.sideExpectedScore || b.total - a.total);
}

export function computeGmMajority(mastersData, {
  gmMode = "top1",
  gmTopK = 1,
  coverageThreshold = 0.7,
  minMasterGames = 50,
} = {}) {
  if (!mastersData || !Array.isArray(mastersData.moves)) {
    return { considered: false, reason: "noData" };
  }
  const sorted = [...mastersData.moves].sort((a, b) => sumMasterMove(b) - sumMasterMove(a));
  const total = sorted.reduce((acc, move) => acc + sumMasterMove(move), 0);
  if (total < minMasterGames) {
    return { considered: false, reason: "lowVolume", total };
  }

  const picked = [];
  if (gmMode === "coverage") {
    const target = Math.max(0.01, Math.min(1, coverageThreshold));
    let acc = 0;
    for (const move of sorted) {
      const volume = sumMasterMove(move);
      acc += volume;
      picked.push({ move, coverage: acc / total });
      if (acc / total >= target) break;
    }
  } else if (gmMode === "topK") {
    const limit = Math.max(1, gmTopK | 0);
    for (let i = 0; i < Math.min(limit, sorted.length); i++) {
      const move = sorted[i];
      picked.push({ move, coverage: sumMasterMove(move) / total });
    }
  } else if (sorted.length) {
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

export function evaluateMoveAgainstGm(mastersData, playedUci, config) {
  const evaluation = computeGmMajority(mastersData, config);
  if (!evaluation.considered) {
    return { ...evaluation, inBook: null };
  }
  const inBook = evaluation.majoritySet.has(playedUci);
  return {
    ...evaluation,
    inBook,
  };
}
