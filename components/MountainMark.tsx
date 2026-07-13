export function MountainMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
      role="img"
    >
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M6 23L13 12L17.5 18.5L20 15L26 23H6Z"
        fill="var(--on-primary)"
        opacity="0.95"
      />
      <path d="M13 12L15.4 15.7L11.3 15.7L13 12Z" fill="var(--primary)" opacity="0.55" />
      <circle cx="22.5" cy="9.5" r="2.5" fill="var(--accent)" />
    </svg>
  );
}
