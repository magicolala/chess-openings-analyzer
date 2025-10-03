/// <reference lib="webworker" />

import { extractSanTokens } from '../utils/tokenizer';

export interface TokenizeRequestMessage {
  type: 'tokenize';
  payload: {
    pgn: string;
    limitPlies?: number;
  };
}

export interface TokenizeResponseMessage {
  type: 'tokenizeResult';
  payload: {
    tokens: string[];
  };
}

export type WorkerRequestMessage = TokenizeRequestMessage;

export type WorkerResponseMessage = TokenizeResponseMessage;

function handleTokenize(message: TokenizeRequestMessage): WorkerResponseMessage {
  const { pgn, limitPlies } = message.payload;
  const tokens = extractSanTokens(pgn);
  const limited = typeof limitPlies === 'number' ? tokens.slice(0, limitPlies) : tokens;
  return {
    type: 'tokenizeResult',
    payload: {
      tokens: limited,
    },
  };
}

function postResponse(message: WorkerResponseMessage): void {
  self.postMessage(message);
}

self.addEventListener('message', (event: MessageEvent<WorkerRequestMessage>) => {
  const data = event.data;
  if (!data) {
    return;
  }
  switch (data.type) {
    case 'tokenize': {
      const response = handleTokenize(data);
      postResponse(response);
      break;
    }
    default:
      console.warn('PGN worker received unknown message', data);
  }
});
