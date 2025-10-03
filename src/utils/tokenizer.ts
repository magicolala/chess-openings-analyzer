const SAN_MOVE_REGEX = /^(\d+\.{1,3})|\$\d+|\{|\}|\(.*?\)|\+|#|!!|!\?|\?!|\?\?|!|\?/g;

export function sanitizeSanToken(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }
  if (/^\d+\./.test(trimmed)) {
    return null;
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('(')) {
    return null;
  }
  if (trimmed.startsWith('$')) {
    return null;
  }
  const cleaned = trimmed.replace(SAN_MOVE_REGEX, '').replace(/\+|#/g, '').trim();
  if (!cleaned) {
    return null;
  }
  return cleaned;
}

export function sanitizeSanSequence(tokens: string[]): string[] {
  return tokens
    .map((token) => sanitizeSanToken(token))
    .filter((token): token is string => Boolean(token));
}

export function tokenizePgn(pgn: string): string[] {
  return pgn
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function extractSanTokens(pgn: string): string[] {
  return sanitizeSanSequence(tokenizePgn(pgn));
}
