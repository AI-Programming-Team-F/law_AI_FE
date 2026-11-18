const paths = {
  home: <path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  arrow: <path d="M4 12h15M13 5l7 7-7 7" />,
  external: (
    <path d="M14 4h6v6M20 4l-9 9M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7v.1" />
    </>
  ),
  compare: <path d="M4 5h6v14H4zM14 5h6v14h-6z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  sort: <path d="M4 6h16M4 12h11M4 18h6" />,
  scale: <path d="M12 4v16M8 20h8M5 7h14M5 7l-3 6h6zM19 7l-3 6h6z" />,
  documents: <path d="M9 3h7l4 4v11H9zM16 3v4h4M5 7v14h11M12 11h5M12 14h5" />,
  bookmark: <path d="M6 4h12v17l-6-4.5L6 21z" />,
  bookmarkFilled: <path d="M6 4h12v17l-6-4.5L6 21z" fill="currentColor" />,
  tag: (
    <>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8" r="1.5" />
    </>
  ),
};

export default function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
