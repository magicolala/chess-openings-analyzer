import { LichessSpeed } from './types';

export function mapSpeed(chesscomCategory: string | null | undefined): LichessSpeed {
  switch ((chesscomCategory ?? '').toLowerCase()) {
    case 'bullet':
      return 'bullet';
    case 'rapid':
      return 'rapid';
    case 'daily':
    case 'correspondence':
      return 'correspondence';
    case 'classical':
      return 'classical';
    case 'blitz':
    default:
      return 'blitz';
  }
}
