export function Scene({
  name,
  label,
  showCaption = true,
}: {
  name: "morning" | "evening" | "emptyInbox";
  label: string;
  showCaption?: boolean;
}) {
  return (
    <figure className="flex items-center gap-3 text-muted" aria-label={label}>
      <svg viewBox="0 0 72 40" className="h-10 w-[4.5rem] shrink-0" aria-hidden>
        {name === "morning" ? (
          <>
            <path d="M8 28h56" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
            <circle cx="36" cy="16" r="8" fill="var(--companion)" opacity="0.9" />
            <path
              d="M36 4v4M36 24v4M22 16h4M46 16h4M25 8l2.5 2.5M44.5 21.5 47 24M25 24l2.5-2.5M44.5 8 47 10.5"
              stroke="var(--companion)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </>
        ) : null}
        {name === "evening" ? (
          <>
            <path
              d="M8 30c10-8 20-8 30 0 10-8 20-8 26 0"
              stroke="currentColor"
              strokeWidth="1.3"
              fill="none"
              opacity="0.4"
            />
            <circle cx="48" cy="14" r="8" fill="var(--companion)" />
            <circle cx="52" cy="12" r="6" fill="var(--paper)" />
          </>
        ) : null}
        {name === "emptyInbox" ? (
          <>
            <rect
              x="12"
              y="10"
              width="48"
              height="22"
              rx="8"
              fill="var(--paper-raised)"
              stroke="currentColor"
              strokeWidth="1.3"
              opacity="0.7"
            />
            <path
              d="M20 18h32M24 24h16"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity="0.35"
            />
          </>
        ) : null}
      </svg>
      {showCaption ? <figcaption className="type-caption">{label}</figcaption> : null}
    </figure>
  );
}
