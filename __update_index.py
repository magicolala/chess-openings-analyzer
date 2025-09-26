from pathlib import Path

path = Path(''index.html'')
text = path.read_text(encoding='utf-8')

old_import = """  <script type=\"module\">
    import { adviseFromLichess, mapSpeed, pickLichessBucket } from './lichess-explorer.js';
    import { registerEcoOpenings } from './eco-pack-xl.js';
    import { TrapEngine, TRAP_PACK } from './trap-engine.js';
"""
new_import = """  <script type=\"module\">
    import { Chess } from 'chess.js';
    window.Chess = Chess;
  </script>

  <script type=\"module\">
    import { adviseFromLichessPgn } from './lichess-explorer.js';
    import { registerEcoOpenings } from './eco-pack-xl.js';
    import { TrapEngine, TRAP_PACK } from './trap-engine.js';
"""
if old_import not in text:
    raise SystemExit('Import block not found')
text = text.replace(old_import, new_import, 1)

func_kw = "    async function enrichWithLichessSuggestions(openingsObject, playerElo, chesscomStats) {"
func_start = text.index(func_kw)
comment_start = text.rfind('\n', 0, func_start - 1) + 1
if comment_start <= 0:
    comment_start = func_start
else:
    prefix_line = text[comment_start:func_start]
    if not prefix_line.strip().startswith('//'):
        comment_start = func_start

open_brace = text.index('{', func_start)
depth = 0
close_index = None
for i in range(open_brace, len(text)):
    ch = text[i]
    if ch == '{':
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0:
            close_index = i
            break
if close_index is None:
    raise SystemExit('Could not locate function end')
end = close_index + 1
while end < len(text) and text[end] in '\r\n':
    end += 1

new_function = """    // Enrichit un bloc d'ouvertures avec suggestions Lichess
    async function enrichWithLichessSuggestions(openingsObject, playerElo, chesscomStats) {
      const entries = Object.entries(openingsObject)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8);

      const speed = pickSpeedFromChesscom(chesscomStats);

      for (const [name, stats] of entries) {
        const samplePgn = stats._samplePgn;
        if (!samplePgn) continue;

        try {
          const out = await adviseFromLichessPgn({
            pgn: samplePgn,
            playerRating: playerElo,
            speed,
            top: 5,
            limitPlies: 20,
          });
          stats._lichess = out;
        } catch (e) {
          console.warn('Explorer fail for', name, e.url || '', e.status || '', e.body || '');
        }
      }
    }

"""
text = text[:comment_start] + new_function + text[end:]

old_tokens = """          const tokens = normalizeToTokens(game.pgn).slice(0, 12);
          const openingName = getOpeningName(tokens);
          const targetOpenings = youAreWhite ? whiteOpenings : blackOpenings;

          if (!targetOpenings[openingName]) {
            targetOpenings[openingName] = { count: 0, wins: 0, draws: 0, losses: 0, _sampleTokens: tokens, traps: [] };
          } else if (!targetOpenings[openingName]._sampleTokens && tokens?.length) {
            targetOpenings[openingName]._sampleTokens = tokens;
          }

          const bucket = targetOpenings[openingName];
"""
new_tokens = """          const pgn = game.pgn;
          const tokens = normalizeToTokens(pgn).slice(0, 12);
          const openingName = getOpeningName(tokens);
          const targetOpenings = youAreWhite ? whiteOpenings : blackOpenings;

          if (!targetOpenings[openingName]) {
            targetOpenings[openingName] = {
              count: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              _sampleTokens: tokens,
              _samplePgn: pgn,
              traps: []
            };
          }

          const bucket = targetOpenings[openingName];
          if (!bucket._samplePgn && pgn) bucket._samplePgn = pgn;
          if (!bucket._sampleTokens && tokens?.length) bucket._sampleTokens = tokens;
"""
if old_tokens not in text:
    raise SystemExit('Token block not found')
text = text.replace(old_tokens, new_tokens, 1)

if 'adviseFromLichess(' in text:
    text = text.replace('adviseFromLichess(', 'adviseFromLichessPgn(', 1)

if 'trapEngine.matchPgn(game.pgn' in text:
    text = text.replace('trapEngine.matchPgn(game.pgn', 'trapEngine.matchPgn(pgn', 1)

path.write_text(text, encoding='utf-8')
