// 법안잇다 로고: 서로 걸린 사슬 고리 두 개 (왼쪽 남색, 오른쪽 파랑)
// 파란 고리를 두 조각으로 나눠, 위쪽 교차점은 남색 아래로·아래쪽 교차점은 남색 위로 지나가게 그립니다.
const NAVY = "#1f3a8a";
const BLUE = "#4a78f0";
const NAVY_LINK = "M16 22h14a10 10 0 0 1 0 20H16a10 10 0 0 1 0-20z";
const BLUE_BEHIND = "M34 22a10 10 0 0 0-10 10";
const BLUE_FRONT = "M24 32a10 10 0 0 0 10 10h14a10 10 0 0 0 0-20H34";

export function LogoMark({ size = 32 }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={Math.round((size * 46) / 58)}
      viewBox="3 9 58 46"
      fill="none"
      strokeWidth="6.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <g transform="rotate(-30 32 32)">
        <path d={BLUE_BEHIND} stroke={BLUE} />
        <path d={NAVY_LINK} stroke={NAVY} />
        <path d={BLUE_FRONT} stroke={BLUE} />
      </g>
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="logo">
      <LogoMark />
      <span className="logo-text">법안잇다</span>
    </span>
  );
}
