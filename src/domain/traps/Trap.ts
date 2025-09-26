export type TrapSide = 'white' | 'black';

export interface Trap {
  readonly id: string;
  readonly name: string;
  readonly side: TrapSide;
  readonly openingTags?: readonly string[];
  readonly seq: readonly string[];
  readonly advice: string;
}

export interface TrapMatch {
  readonly id: string;
  readonly name: string;
  readonly side: TrapSide;
  readonly startPly: number;
  readonly length: number;
  readonly matchedPlies: number;
  readonly advice: string;
  readonly openingTags: readonly string[];
  readonly seq: readonly string[];
}

export interface TrapRecommendation {
  readonly id: string;
  readonly name: string;
  readonly side: TrapSide;
  readonly seq: readonly string[];
  readonly advice: string;
}
