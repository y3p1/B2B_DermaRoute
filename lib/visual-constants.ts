export const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const HERO_GRADIENT_BG = [
  "radial-gradient(60rem 40rem at 15% -10%, oklch(0.95 0.04 160 / 0.9), transparent 60%)",
  "radial-gradient(50rem 35rem at 110% 15%, oklch(0.96 0.03 40 / 0.7), transparent 55%)",
  "radial-gradient(45rem 30rem at 50% 115%, oklch(0.94 0.04 160 / 0.55), transparent 60%)",
  "oklch(0.985 0.005 160)",
].join(", ");

export const CARD_CHROME =
  "ring-1 ring-slate-900/5 shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_-4px_rgb(15_23_42/0.06)]";
