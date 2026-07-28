/**
 * DermaRoute logo — hexagon routing mark + Hanken Grotesk wordmark.
 * Matches the brand guide (design-system BRAND.md): "Derma" in the theme
 * foreground, "Route" in brand orange. Live SVG + text (scalable, theme-aware).
 * Keeps the {width,height,className} API; size is driven by `height`.
 */
export default function BrandLogo({
  height = 40,
  className = "",
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  const markH = Math.round(height * 0.92);
  const fontSize = Math.round(height * 0.56);
  return (
    <span
      className={`inline-flex items-center ${className}`}
      style={{ gap: Math.round(height * 0.22) }}
      aria-label="DermaRoute"
    >
      <svg height={markH} viewBox="0 0 40 50" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="drMarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8724A" />
            <stop offset="100%" stopColor="#C5573A" />
          </linearGradient>
        </defs>
        <path
          d="M10.5 7 L29.5 7 L39 25 L29.5 43 L10.5 43 L1 25 Z"
          fill="url(#drMarkGrad)"
          stroke="url(#drMarkGrad)"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="16" r="2.2" fill="none" stroke="#fff" strokeWidth="1.6" />
        <circle cx="13.5" cy="30" r="2.2" fill="none" stroke="#fff" strokeWidth="1.6" />
        <circle cx="26.5" cy="30" r="2.2" fill="none" stroke="#fff" strokeWidth="1.6" />
        <path d="M20 18.2V23M20 23L13.5 27.8M20 23L26.5 27.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M11.5 17C9 19.5 8.5 23 9.8 26.5" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M28.5 17C31 19.5 31.5 23 30.2 26.5" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-hanken), ui-sans-serif, system-ui, sans-serif",
          fontWeight: 800,
          fontSize,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "var(--foreground)" }}>Derma</span>
        <span style={{ color: "#E8724A" }}>Route</span>
      </span>
    </span>
  );
}
