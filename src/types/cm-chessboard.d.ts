declare module 'cm-chessboard' {
  export type ChessboardOrientation = 'white' | 'black';

  export interface ChessboardStyleConfig {
    cssClass?: string;
    showCoordinates?: boolean;
    moveMarker?: boolean;
    borderType?: 'none' | 'frame' | 'thin' | 'thick';
  }

  export interface ChessboardConfig {
    position?: string;
    orientation?: ChessboardOrientation;
    animationDuration?: number;
    assetsUrl?: string;
    style?: ChessboardStyleConfig;
  }

  export class Chessboard {
    constructor(element: HTMLElement, config?: ChessboardConfig);
    setPosition(fen: string, animated?: boolean): void;
    setOrientation(orientation: ChessboardOrientation): void;
    destroy(): void;
  }
}

