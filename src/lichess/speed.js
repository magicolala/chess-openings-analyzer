export function mapSpeed(chesscomCategory) {
  switch ((chesscomCategory || "").toLowerCase()) {
    case "bullet":
      return "bullet";
    case "blitz":
      return "blitz";
    case "rapid":
      return "rapid";
    case "daily":
    case "correspondence":
      return "correspondence";
    default:
      return "blitz";
  }
}
