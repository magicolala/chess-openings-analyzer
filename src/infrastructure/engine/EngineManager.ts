import { Chess } from 'chess.js';

export interface EngineLine {
  multipv: number;
  score: { type: string; value: number } | null;
  pvSan: string[];
  pvUci: string[];
}

export interface EngineEvaluationResult {
  bestmove: string;
  lines: EngineLine[];
}

export interface EngineEvaluateOptions {
  depth?: number;
  movetime?: number;
  nodes?: number;
  multipv?: number;
  timeoutMs?: number;
}

export interface EngineConfig extends EngineEvaluateOptions {
  enabled?: boolean;
  path?: string;
  threads?: number;
}

export interface IEngineService {
  configure(config: EngineConfig): Promise<void>;
  dispose(): void;
  evaluateFen(fen: string, options?: EngineEvaluateOptions): Promise<EngineEvaluationResult | null>;
}

interface PendingEvaluation {
  resolve: (value: EngineEvaluationResult | null) => void;
  lines: Map<number, EngineLine>;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

export class EngineManager implements IEngineService {
  private worker: Worker | null = null;
  private currentPath: string | null = null;
  private ready = false;
  private options: EngineConfig = {};
  private pendingEval: PendingEvaluation | null = null;
  private currentFen: string | null = null;
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((err: unknown) => void) | null = null;

  dispose(): void {
    if (this.pendingEval) {
      if (this.pendingEval.timeoutId) {
        clearTimeout(this.pendingEval.timeoutId);
      }
      try {
        this.pendingEval.resolve(null);
      } catch {
        // Ignore resolution errors
      }
      this.pendingEval = null;
    }

    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Ignore termination errors
      }
    }

    this.worker = null;
    this.currentPath = null;
    this.ready = false;
    this.currentFen = null;
    this.resolveReady = null;
    this.rejectReady = null;
  }

  async configure(config: EngineConfig = {}): Promise<void> {
    this.options = config;
    if (!config.enabled || !config.path) {
      this.dispose();
      return;
    }

    if (this.worker && this.currentPath === config.path) {
      try {
        await this.waitUntilReady(2500).catch(() => undefined);
      } catch {
        // Ignore readiness errors
      }
      return;
    }

    this.dispose();

    try {
      this.worker = new Worker(config.path);
    } catch (err) {
      console.warn("Impossible d'initialiser le moteur local:", err);
      this.worker = null;
      return;
    }

    this.currentPath = config.path;
    this.ready = false;

    this.worker.onmessage = (event: MessageEvent) => this.handleMessage(event.data);
    this.worker.onerror = (event: ErrorEvent | string) => {
      const message = typeof event === 'string' ? event : event.message;
      console.warn('Erreur moteur:', message || event);
      this.ready = false;
    };

    this.sendCommand('uci');

    try {
      await this.waitUntilReady(4000);
    } catch (err) {
      console.warn("Le moteur ne répond pas:", err instanceof Error ? err.message : err);
    }

    if (this.ready) {
      const multipv = Math.max(1, Math.min(5, Number(config.multipv) || 1));
      this.sendCommand(`setoption name MultiPV value ${multipv}`);
      if (config.threads) {
        this.sendCommand(`setoption name Threads value ${config.threads}`);
      }
    }
  }

  async evaluateFen(fen: string, options: EngineEvaluateOptions = {}): Promise<EngineEvaluationResult | null> {
    if (!this.worker) return null;
    if (!this.ready) {
      try {
        await this.waitUntilReady(3000);
      } catch (err) {
        console.warn('Moteur indisponible:', err instanceof Error ? err.message : err);
        return null;
      }
    }

    return new Promise<EngineEvaluationResult | null>((resolve) => {
      if (!this.worker) {
        resolve(null);
        return;
      }

      if (this.pendingEval) {
        if (this.pendingEval.timeoutId) {
          clearTimeout(this.pendingEval.timeoutId);
        }
        try {
          this.pendingEval.resolve(null);
        } catch {
          // Ignore resolution errors
        }
        this.pendingEval = null;
      }

      this.currentFen = fen;
      const evaluation: PendingEvaluation = {
        resolve,
        lines: new Map<number, EngineLine>(),
        timeoutId: null,
      };
      this.pendingEval = evaluation;

      this.sendCommand('stop');
      this.sendCommand('ucinewgame');
      this.sendCommand(`position fen ${fen}`);

      const goCommand = this.buildGoCommand(options || this.options || {});
      this.sendCommand(goCommand);

      const timeoutMs = options.timeoutMs || 6000;
      evaluation.timeoutId = setTimeout(() => {
        this.sendCommand('stop');
        if (this.pendingEval === evaluation) {
          this.pendingEval = null;
          resolve(null);
        }
      }, timeoutMs);
    });
  }

  private sendCommand(command: string): void {
    if (!this.worker || !command) return;
    try {
      this.worker.postMessage(command);
    } catch (err) {
      console.warn('Commande moteur rejetée', command, err);
    }
  }

  private handleMessage(message: unknown): void {
    if (message == null) return;
    if (typeof message === 'string') {
      this.handleMessageString(message);
    } else if (typeof message === 'object' && message) {
      const typed = message as { type?: string; message?: unknown };
      if (typed.type === 'info' && typeof typed.message === 'string') {
        this.handleInfo(String(typed.message));
      } else if (typed.type === 'bestmove' && typeof typed.message === 'string') {
        this.handleBestmove(String(typed.message));
      } else if (typeof typed.message === 'string') {
        this.handleMessageString(typed.message);
      }
    }
  }

  private handleMessageString(line: string): void {
    const text = String(line || '').trim();
    if (!text) return;
    if (text === 'uciok') {
      this.sendCommand('isready');
      return;
    }
    if (text === 'readyok') {
      this.ready = true;
      if (this.resolveReady) {
        this.resolveReady();
        this.resolveReady = null;
        this.rejectReady = null;
      }
      return;
    }
    if (text.startsWith('info ')) {
      this.handleInfo(text);
      return;
    }
    if (text.startsWith('bestmove')) {
      this.handleBestmove(text);
    }
  }

  private handleInfo(line: string): void {
    if (!this.pendingEval) return;
    const parsed = this.parseInfoLine(line);
    if (!parsed) return;
    this.pendingEval.lines.set(parsed.multipv, parsed);
  }

  private handleBestmove(line: string): void {
    if (!this.pendingEval) return;
    const evaluation = this.pendingEval;
    if (evaluation.timeoutId) {
      clearTimeout(evaluation.timeoutId);
    }
    const parts = String(line).trim().split(/\s+/);
    const bestmove = parts[1] || '';
    const lines = Array.from(evaluation.lines.values())
      .sort((a, b) => a.multipv - b.multipv)
      .map((entry) => ({
        multipv: entry.multipv,
        score: entry.score,
        pvSan: entry.pvSan,
        pvUci: entry.pvUci,
      }));
    const payload: EngineEvaluationResult = { bestmove, lines };
    try {
      evaluation.resolve(lines.length ? payload : null);
    } catch {
      // Ignore resolution errors
    }
    this.pendingEval = null;
  }

  private waitUntilReady(timeout = 3000): Promise<boolean> {
    if (this.ready) return Promise.resolve(true);
    return new Promise<boolean>((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Moteur non initialisé'));
        return;
      }
      const timer = setTimeout(() => {
        this.resolveReady = null;
        this.rejectReady = null;
        reject(new Error('Timeout moteur'));
      }, timeout);
      this.resolveReady = () => {
        clearTimeout(timer);
        resolve(true);
      };
      this.rejectReady = (err) => {
        clearTimeout(timer);
        reject(err);
      };
      this.sendCommand('isready');
    });
  }

  private buildGoCommand(options: EngineEvaluateOptions): string {
    const parts = ['go'];
    if (options.movetime) {
      parts.push('movetime', Number(options.movetime).toString());
    } else if (options.depth) {
      parts.push('depth', Number(options.depth).toString());
    } else if (this.options.depth) {
      parts.push('depth', Number(this.options.depth).toString());
    } else {
      parts.push('depth', '18');
    }
    if (options.nodes) {
      parts.push('nodes', Number(options.nodes).toString());
    }
    const multipv = options.multipv ?? this.options.multipv;
    if (multipv && multipv > 1) {
      parts.push('multipv', Math.max(1, Math.min(5, multipv)).toString());
    }
    return parts.join(' ');
  }

  private parseInfoLine(line: string): EngineLine | null {
    const parts = String(line).trim().split(/\s+/);
    let multipv = 1;
    let scoreType: string | null = null;
    let scoreValue: number | null = null;
    const pvIndex = parts.indexOf('pv');
    for (let i = 0; i < parts.length; i += 1) {
      const token = parts[i];
      if (token === 'multipv' && i + 1 < parts.length) {
        const value = Number(parts[i + 1]);
        if (Number.isFinite(value)) multipv = value;
      }
      if (token === 'score' && i + 2 < parts.length) {
        scoreType = parts[i + 1];
        scoreValue = Number(parts[i + 2]);
      }
    }
    const pvUci = pvIndex >= 0 ? parts.slice(pvIndex + 1) : [];
    const pvSan = this.convertPvToSan(pvUci);
    if (!pvSan.length && !pvUci.length) return null;
    const score =
      scoreType !== null && scoreValue !== null
        ? { type: scoreType, value: scoreValue }
        : null;
    return { multipv, score, pvSan, pvUci };
  }

  private convertPvToSan(pvMoves: string[]): string[] {
    if (!pvMoves?.length || !this.currentFen) return pvMoves || [];
    const chess = new Chess();
    try {
      const ok = chess.load(this.currentFen) as unknown as boolean;
      if (!ok) return pvMoves;
    } catch {
      return pvMoves;
    }
    const out: string[] = [];
    for (const move of pvMoves) {
      if (!move) break;
      const from = move.slice(0, 2);
      const to = move.slice(2, 4);
      const promotion = move.length > 4 ? (move.slice(4) as string | undefined) : undefined;
      const played = (chess as any).move({ from, to, promotion }, { sloppy: true });
      if (!played) break;
      out.push(played.san);
    }
    return out.length ? out : pvMoves;
  }
}
