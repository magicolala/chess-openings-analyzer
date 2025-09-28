import type { Move } from 'chess.js';

declare module 'chess.js' {
  interface MoveConfig {
    strict?: boolean;
    sloppy?: boolean;
  }

  interface Chess {
    move(
      move: string | { from: string; to: string; promotion?: string } | null,
      options?: MoveConfig,
    ): Move;
  }
}

