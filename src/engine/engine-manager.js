import { Chess } from 'https://esm.sh/chess.js';

export class EngineManager {
  constructor() {
    this.worker = null;
    this.currentPath = null;
    this.ready = false;
    this.options = {};
    this.pendingEval = null;
    this.currentFen = null;
    this.resolveReady = null;
    this.rejectReady = null;
  }

  dispose() {
    if (this.pendingEval) {
      clearTimeout(this.pendingEval.timeoutId);
      try {
        this.pendingEval.resolve(null);
      } catch {}
      this.pendingEval = null;
    }
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {}
    }
    this.worker = null;
    this.currentPath = null;
    this.ready = false;
    this.currentFen = null;
    this.resolveReady = null;
    this.rejectReady = null;
  }

  async configure(config = {}) {
    this.options = config;
    if (!config.enabled || !config.path) {
      this.dispose();
      return;
    }
    if (this.worker && this.currentPath === config.path) {
      try {
        await this.waitUntilReady(2500).catch(() => {});
      } catch {}
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
    this.worker.onmessage = (event) => this.handleMessage(event.data);
    this.worker.onerror = (event) => {
      console.warn('Erreur moteur:', event.message || event);
      this.ready = false;
    };
    this.sendCommand('uci');

    try {
      await this.waitUntilReady(4000);
    } catch (err) {
      console.warn("Le moteur ne répond pas:", err?.message || err);
    }

    if (this.ready) {
      const multipv = Math.max(1, Math.min(5, Number(config.multipv) || 1));
      this.sendCommand(`setoption name MultiPV value ${multipv}`);
      if (config.threads) {
        this.sendCommand(`setoption name Threads value ${config.threads}`);
      }
    }
  }

  sendCommand(command) {
    if (!this.worker || !command) return;
    try {
      this.worker.postMessage(command);
    } catch (err) {
      console.warn('Commande moteur rejetée', command, err);
    }
  }

  handleMessage(message) {
    if (message == null) return;
    if (typeof message === 'string') {
      this.handleMessageString(message);
    } else if (typeof message === 'object') {
      if (message.type === 'info' && message.message) {
        this.handleInfo(String(message.message));
      } else if (message.type === 'bestmove' && message.message) {
        this.handleBestmove(String(message.message));
      } else if (typeof message.message === 'string') {
        this.handleMessageString(message.message);
      }
    }
  }

  handleMessageString(line) {
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

  handleInfo(line) {
    if (!this.pendingEval) return;
    const parsed = this.parseInfoLine(line);
    if (!parsed) return;
    this.pendingEval.lines.set(parsed.multipv, parsed);
  }

  handleBestmove(line) {
    if (!this.pendingEval) return;
    clearTimeout(this.pendingEval.timeoutId);
    const parts = String(line).trim().split(/\s+/);
    const bestmove = parts[1] || '';
    const lines = Array.from(this.pendingEval.lines.values())
      .sort((a, b) => a.multipv - b.multipv)
      .map((entry) => ({
        multipv: entry.multipv,
        score: entry.score,
        pvSan: entry.pvSan,
        pvUci: entry.pvUci,
      }));
    const payload = { bestmove, lines };
    try {
      this.pendingEval.resolve(lines.length ? payload : null);
    } catch {}
    this.pendingEval = null;
  }

  waitUntilReady(timeout = 3000) {
    if (this.ready) return Promise.resolve(true);
    return new Promise((resolve, reject) => {
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

  async evaluateFen(fen, options = {}) {
    if (!this.worker) return null;
    if (!this.ready) {
      try {
        await this.waitUntilReady(3000);
      } catch (err) {
        console.warn('Moteur indisponible:', err?.message || err);
        return null;
      }
    }

    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(null);
        return;
      }

      if (this.pendingEval) {
        clearTimeout(this.pendingEval.timeoutId);
        try {
          this.pendingEval.resolve(null);
        } catch {}
        this.pendingEval = null;
      }

      this.currentFen = fen;
      const evaluation = {
        resolve,
        lines: new Map(),
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

  buildGoCommand(options) {
    const parts = ['go'];
    if (options.movetime) {
      parts.push('movetime', Number(options.movetime));
    } else if (options.depth) {
      parts.push('depth', Number(options.depth));
    } else if (this.options.depth) {
      parts.push('depth', Number(this.options.depth));
    } else {
      parts.push('depth', 18);
    }
    if (options.nodes) {
      parts.push('nodes', Number(options.nodes));
    }
    if (options.multipv || this.options.multipv) {
      const v = Number(options.multipv || this.options.multipv);
      if (v > 1) parts.push('multipv', Math.max(1, Math.min(5, v)));
    }
    return parts.join(' ');
  }

  parseInfoLine(line) {
    const parts = String(line).trim().split(/\s+/);
    let multipv = 1;
    let scoreType = null;
    let scoreValue = null;
    const pvIndex = parts.indexOf('pv');
    for (let i = 0; i < parts.length; i++) {
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
    const score = scoreType ? { type: scoreType, value: scoreValue } : null;
    return { multipv, score, pvSan, pvUci };
  }

  convertPvToSan(pvMoves) {
    if (!pvMoves?.length || !this.currentFen) return pvMoves || [];
    const chess = new Chess();
    try {
      const ok = chess.load(this.currentFen);
      if (!ok) return pvMoves;
    } catch (err) {
      return pvMoves;
    }
    const out = [];
    for (const move of pvMoves) {
      if (!move) break;
      const from = move.slice(0, 2);
      const to = move.slice(2, 4);
      const promotion = move.length > 4 ? move.slice(4) : undefined;
      const played = chess.move({ from, to, promotion }, { sloppy: true });
      if (!played) break;
      out.push(played.san);
    }
    return out.length ? out : pvMoves;
  }
}
