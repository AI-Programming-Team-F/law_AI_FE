// 국회 원문(SUMMARY)을 화면용 줄로 나눕니다. 글자는 바꾸지 않고 줄 구분만 정리합니다.
// 원문 형태: "제안이유 및 주요내용\n\n  첫 문단…\n  둘째 문단…"
// - 줄마다 앞뒤 공백(문단 들여쓰기 두 칸)을 지웁니다.
// - 원문의 빈 줄(여러 개면 하나로)은 바로 다음 줄의 gapBefore로 남겨 한 줄 간격을 둡니다.
export function originalParagraphs(text) {
  if (!text) return [];
  const result = [];
  let gap = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      gap = result.length > 0;
      continue;
    }
    result.push({ text: line, gapBefore: gap });
    gap = false;
  }
  return result;
}
