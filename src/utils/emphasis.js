// 비교 문장의 강조 표시를 나눕니다. ==핵심== 은 형광 표시, **강조** 는 굵은 글씨입니다.
// 표시가 없거나 짝이 맞지 않으면 글자 그대로 둡니다.
export function parseEmphasis(text) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(/==(.+?)==|\*\*(.+?)\*\*/g)) {
    if (match.index > last) parts.push({ type: "text", text: text.slice(last, match.index) });
    parts.push(match[1] !== undefined
      ? { type: "key", text: match[1] }
      : { type: "strong", text: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}
