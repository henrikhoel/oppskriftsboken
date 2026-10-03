/**
 * Håndtegnede, avhengighetsfrie SVG-ikoner. Holder bundlen liten (ingen
 * ikonbibliotek) og gir full kontroll på strek-vekt så de matcher den
 * redaksjonelle, rolige stilen resten av UI-et har.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function HeartIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base} fill={filled ? "currentColor" : "none"} {...props}>
      <path d="M12 20.5s-7.5-4.6-10-9.3C.5 7.8 2 4.5 5.3 4c2-.3 3.9.6 5 2.3l1.7 2.6 1.7-2.6c1.1-1.7 3-2.6 5-2.3 3.3.5 4.8 3.8 3.3 7.2-2.5 4.7-10 9.3-10 9.3Z" />
    </svg>
  );
}

/** Chili – brukt av "Sterk mat" (1-3 chili, admin-satt styrkegrad, se
 * components/admin/RecipeForm.tsx og RecipeHero.tsx), lagt til 03.10.2026
 * som erstatning for den tidligere AI-genererte smaksprofilen. Samme
 * `filled`-mønster som HeartIcon over – fylt chili for "aktiv/valgt" grad,
 * kun omriss for en ledig/ufylt.
 *
 * Tre runder før denne satt: (1) frihåndstegnet pod så ikke ut som chili
 * i det hele tatt, (2) en tapret pod + tynn enkelt-strek-stilk manglet
 * synlig stilk, (3) pod+stilk som to omtrent like store, avrundede
 * klumper med en tynn hals mellom så ut som et beinknokkel ("ser ut som
 * bein", Henrik, med et rent referanse-ikon ved siden av – et betalt
 * lager-ikon som ikke kan kopieres inn direkte, men god å style etter).
 *
 * Geometrien her er derfor bygget rundt ÉN tydelig asymmetri i stedet:
 * en SMAL hals rett ved stilken (samme bredde som selve stilken, så
 * overgangen blir en jevn avsmalning i stedet for en synlig skjøt), en
 * buk som sveller ut en liten bit nedenfor halsen, og en spiss tupp.
 * Samme senterlinje+normalvektor-teknikk som før (kurvet senterlinje,
 * konturen bygget fra normalvektorer langs den, i stedet for frihånds-
 * gjettede koordinater), men med en ikke-monoton radiusfunksjon (smal →
 * bred → smal) for buken, fremfor den rett avtagende fra forrige runde.
 * Verifisert med Playwright-skjermbilder i de faktiske bruksstørrelsene
 * (28px i RecipeForm.tsx, 16px i RecipeHero.tsx), ikke bare i stort
 * format, siden det er der Henrik faktisk vurderer den. */
export function ChiliIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base} fill={filled ? "currentColor" : "none"} {...props}>
      <path d="M15.13,5.47 L14.71,5.35 L14.27,5.21 L13.81,5.07 L13.32,4.94 L12.8,4.82 L12.25,4.75 L11.68,4.73 L11.1,4.77 L10.52,4.88 L9.96,5.08 L9.43,5.36 L8.94,5.72 L8.48,6.14 L8.06,6.61 L7.68,7.11 L7.33,7.66 L7.02,8.23 L6.76,8.84 L6.53,9.46 L6.34,10.11 L6.18,10.78 L6.06,11.46 L5.98,12.15 L5.93,12.86 L5.9,13.58 L5.91,14.31 L5.93,15.05 L5.99,15.81 L6.06,16.58 L6.16,17.37 L6.27,18.18 L6.4,19.02 L6.6,18.98 L6.49,18.15 L6.45,17.35 L6.48,16.57 L6.55,15.82 L6.69,15.11 L6.86,14.44 L7.08,13.8 L7.34,13.2 L7.63,12.65 L7.94,12.13 L8.27,11.66 L8.61,11.22 L8.97,10.83 L9.33,10.47 L9.69,10.14 L10.04,9.84 L10.39,9.57 L10.73,9.32 L11.06,9.09 L11.38,8.88 L11.67,8.67 L11.95,8.44 L12.2,8.19 L12.44,7.92 L12.69,7.64 L12.95,7.36 L13.23,7.1 L13.53,6.87 L13.85,6.68 L14.19,6.55 L14.53,6.5 L14.87,6.53 Z" />
      <path d="M15.24,5.85 L15.45,5.45 L15.66,5.06 L15.87,4.68 L16.08,4.31 L16.28,3.95 L16.48,3.6 L16.67,3.26 L16.84,2.94 L17.01,2.62 L17.17,2.33 L17.31,2.04 L17.44,1.77 L16.76,1.43 L16.62,1.68 L16.47,1.94 L16.3,2.22 L16.12,2.52 L15.92,2.83 L15.72,3.15 L15.51,3.49 L15.29,3.84 L15.06,4.2 L14.83,4.58 L14.6,4.96 L14.36,5.35 Z" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** "Grip"-håndtak for dra-for-å-endre-rekkefølge (f.eks.
 * IngredientGroupsEditor.tsx sine ingrediensrader) – seks små, faste
 * prikker (IKKE strek, i unntak fra resten av ikonsettets rene strek-stil,
 * se filheaderen over) er den mest universelt gjenkjente
 * dra-håndtak-formen, og treffer derfor bedre enn f.eks. tre horisontale
 * streker (som lettere leses som en meny-knapp). */
export function GripIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// Lagt til 26.09.2026 for CopyTitlesButton.tsx (admin -> "Alle
// oppskrifter" -> "Kopier titler").
export function CopyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function ShoppingBagIcon(props: IconProps) {
  // Byttet ut 26.08.2026 (Henrik: "det ser ut som en lås nå") – forrige
  // versjon hadde et handtak-buer som stakk opp over hele bredden av en
  // rett firkant, akkurat som bøylen på en hengelås. Denne varianten (samme
  // form som brukes bredt for "handlekurv" ellers på nettet) har ISTEDET en
  // vinklet toppkant og et handtak tegnet SOM en bue INNI posen, under selve
  // åpningslinjen – ingenting stikker opp over silhuetten, så den kan ikke
  // leses som en lås.
  return (
    <svg {...base} {...props}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m3 11 9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16" />
      <path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m1 0-.8 12.2A2 2 0 0 1 16.2 21H7.8a2 2 0 0 1-2-1.8L5 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h16M7 12h10M10 19h4" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5c1.7.3 3 1.8 3 3.5s-1.3 3.2-3 3.5" />
      <path d="M18.5 14.5c2 .6 3.5 2.6 3.5 5.5" />
    </svg>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.9 19a9 9 0 1 1 14.2 0" />
      <path d="M12 13 15.5 8" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

/** Brukes for "pause tidtaker" i CookMode.tsx (se cookMode.pauseTimerAria) –
 * PlayIcon over dekker "gjenoppta" i samme UI. */
export function PauseIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <rect x="7" y="5" width="4" height="14" rx="1" />
      <rect x="13" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function LockKeyholeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

// (27.09.2026) Lagt til for "Logg inn / min konto"-inngangen i Header.tsx –
// se filheaderen der. Enkel hode+skuldre-silhuett, samme strekvekt/stil
// som resten av ikonene i denne filen.
export function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m4 17 5-5 3 3 4-5 4 5" />
    </svg>
  );
}

export function StarIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base} fill={filled ? "currentColor" : "none"} {...props}>
      <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7L12 3Z" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17.2" r="0.2" fill="currentColor" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h2.6l1.2-2h8.4l1.2 2H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

export function MicOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5a3 3 0 0 1 6 0v6c0 .4-.05.78-.15 1.14M15 14A3 3 0 0 1 9 11V5" />
      <path d="M5 11a7 7 0 0 0 10.5 6.1M19 11a7 7 0 0 1-1.2 3.9M12 18v3M3 3l18 18" />
    </svg>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M11 3c.3 2.4 1 4.1 2 5.1S15.5 9.6 18 10c-2.5.4-4 1-5 2S11.3 14.6 11 17c-.3-2.4-1-4.1-2-5S6.5 10.4 4 10c2.5-.4 4-1 5-2S10.7 5.4 11 3Z" />
      <path d="M18 14.5c.16 1 .5 1.7.9 2.1.4.4 1.1.7 2.1.9-1 .16-1.7.5-2.1.9-.4.4-.74 1.1-.9 2.1-.16-1-.5-1.7-.9-2.1-.4-.4-1.1-.74-2.1-.9 1-.16 1.7-.5 2.1-.9.4-.4.74-1.1.9-2.1Z" />
    </svg>
  );
}

/** Generisk telefon-ikon (ingen butikk-logo – unngår varemerkede
 * App Store/Google Play-merker) brukt av AppDownloadIconButton.tsx. */
export function SmartphoneIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M11 18.2h2" />
    </svg>
  );
}

/** Spørsmålstegn-i-sirkel – brukt for "Hvordan gjør jeg det?"-biblioteket
 * (nav.guides, se BottomNav.tsx/Header.tsx og
 * app/hvordan-gjor-jeg-det/*). Egen, rolig strektegning i samme stil som
 * resten av settet, ingen ekstern ikonpakke. */
export function HelpCircleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.3c.3-1.4 1.5-2.3 2.9-2.2 1.5.1 2.6 1.1 2.6 2.4 0 1.5-1.3 1.9-2.2 2.6-.5.4-.7.9-.7 1.6" />
      <path d="M12 17.2v.05" />
    </svg>
  );
}

/** Blad – brukt for "I sesong" (nav.season, se Header.tsx og app/sesong/*).
 * Egen, rolig strektegning i samme stil som resten av settet. */
export function LeafIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 20c-1-6.5 2-13 12-15 1.5 9-3.5 14.5-12 15Z" />
      <path d="M7 19c2-3 4.5-6.5 10-12.5" />
    </svg>
  );
}

/** Liten diskret pil-ut-av-boks – kun brukt til eksterne kildelenker (se
 * IngredientDetail.tsx), aldri i navigasjonen. */
export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6h9v9" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

/** Del-ikon (boks med pil ut/opp) – brukt av ShareButton.tsx på
 * oppskriftssiden (26.09.2026, Henrik: "jeg vil at man skal kunne dele
 * lenken til oppskriften via snarveien på telefonen ... en liten knapp ved
 * siden av hjertet"). Samme gjenkjennelige "del"-form som iOS/Android sine
 * egne del-ikoner (boks + pil ut av toppen), tegnet i settets vanlige
 * håndtegnede strek-stil i stedet for en importert ikonpakke. */
export function ShareIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="M16 6.5 12 2.5 8 6.5" />
      <path d="M12 2.5v13" />
    </svg>
  );
}
