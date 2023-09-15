export function getBlockCharacter(ratio: number) {
  if (ratio > 0.9) return "█";
  if (ratio > 0.7) return "▇";
  if (ratio > 0.5) return "▆";
  if (ratio > 0.4) return "▅";
  if (ratio > 0.3) return "▃";
  if (ratio > 0.2) return "▂";
  if (ratio > 0.1) return "▁";
  return " ";
}
