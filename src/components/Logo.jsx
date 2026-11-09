import { useId } from "react";

// 법안잇다 로고: 대각선으로 누운 사슬 고리 두 개가 서로 걸린 모양. 두 법안을 잇는다는 뜻입니다.
// 위쪽 교차점은 왼쪽 고리가, 아래쪽 교차점은 오른쪽 고리가 위로 지나가도록
// 아래에 깔리는 고리에 틈(mask)을 냅니다. 가운데에서 나란히 지나는 두 줄도
// 같은 폭의 틈이 생기도록 두 고리 간격을 맞췄습니다. 색은 index.css의 --logo-a(왼쪽), --logo-b(오른쪽).
const LINK_A =
  "M40.2 33.88L24.78 52.26A18 18 0 0 1-2.8 29.12L12.62 10.74A18 18 0 0 1 40.2 33.88Z";
const LINK_B =
  "M66.8 34.88L51.38 53.26A18 18 0 0 1 23.8 30.12L39.22 11.74A18 18 0 0 1 66.8 34.88Z";
// 고리 축에 수직인 선으로 나눈 위쪽·아래쪽 절반
const UPPER_HALF = "62.6,57.7 88.4,27.1 27.1,-24.4 1.4,6.3";
const LOWER_HALF = "62.6,57.7 36.9,88.4 -24.4,36.9 1.4,6.3";
const STROKE = 11.5;
const GAP = 3;
const BOX = { x: -13.5, y: -2, width: 91, height: 68 };

export function LogoMark({ size = 32 }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const cut = (link, half, name) => (
    <mask id={`${id}-${name}`} maskUnits="userSpaceOnUse" {...BOX}>
      <rect {...BOX} fill="#fff" />
      <clipPath id={`${id}-${name}-half`}>
        <polygon points={half} />
      </clipPath>
      <path
        d={link}
        stroke="#000"
        strokeWidth={STROKE + GAP * 2}
        clipPath={`url(#${id}-${name}-half)`}
      />
    </mask>
  );

  return (
    <svg
      className="logo-mark"
      width={size}
      height={Math.round((size * BOX.height) / BOX.width)}
      viewBox={`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`}
      fill="none"
      strokeWidth={STROKE}
      aria-hidden="true"
    >
      <defs>
        {cut(LINK_B, LOWER_HALF, "a")}
        {cut(LINK_A, UPPER_HALF, "b")}
      </defs>
      <path d={LINK_A} stroke="var(--logo-a)" mask={`url(#${id}-a)`} />
      <path d={LINK_B} stroke="var(--logo-b)" mask={`url(#${id}-b)`} />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="logo">
      <LogoMark size={40} />
      <span className="logo-text">법안잇다</span>
    </span>
  );
}
