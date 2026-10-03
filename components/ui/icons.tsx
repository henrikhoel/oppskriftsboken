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
 * kun omriss for en ledig/ufylt. Fylt farge er IKKE currentColor-arv fra
 * gull-aksenten her – se --color-chili i app/globals.css og bruken av
 * `text-chili` på kallstedene; chilien skal lyse rød når den er valgt.
 *
 * Ni runder før denne satt (hver med et referanse-ikon fra Henrik – de
 * fleste betalte/ukjent-lisensierte lager-ikoner, ikke kopiert direkte
 * inn, bare brukt som stilreferanse) landet til slutt på en form Henrik
 * var fornøyd med BORTSETT FRA stilken (for rett/planke-aktig, flat spiss
 * i enden – se git-historikken for components/ui/icons.tsx for detaljene
 * runde for runde om det trengs). Denne runden (10.) fikk vi endelig et
 * referanse-ikon UTEN lisensusikkerhet – Henrik: "DENNE har jeg tegnet
 * selv med ChatGPT" – og podens form og proporsjoner er derfor for
 * første gang modellert direkte og tett etter selve referansebildet i
 * stedet for en abstrakt "senterlinje som så fornuftig ut": brede,
 * avrundede skuldre rett under stilken (podens radiusfunksjon rampes
 * raskt opp fra ~0 i stedet for å starte i full bredde, så skulderen blir
 * rund i stedet for et flatt, kantete "dolk"-tverrsnitt – det var
 * problemet i første forsøk denne runden), bred buk som holder bredden
 * gjennom det meste av lengden, og skarp avsmalning først helt mot
 * slutten. Stilken er nå tykk og kort (ikke en tynn, avlang hals som i
 * runde 4 sin fugl-effekt) som krummer ut og hekter tilbake, med samme
 * halvsirkel-avrundede tupp-kapp som runde 9 innførte. Luft mellom stilk
 * og pod (runde 5) beholdt. Verifisert med Playwright-skjermbilder i de
 * faktiske bruksstørrelsene (28px i RecipeForm.tsx, 16px i
 * RecipeHero.tsx), ikke bare i stort format. */
export function ChiliIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base} fill={filled ? "currentColor" : "none"} {...props}>
      <path d="M16.25,7.54 L15.78,7.46 L14.88,7.12 L13.99,6.79 L13.53,6.76 L13.42,6.95 L13.3,7.15 L13.18,7.35 L13.06,7.57 L12.94,7.8 L12.81,8.03 L12.68,8.28 L12.55,8.53 L12.4,8.79 L12.25,9.06 L12.09,9.34 L11.92,9.62 L11.74,9.91 L11.55,10.21 L11.35,10.51 L11.13,10.82 L10.9,11.13 L10.65,11.45 L10.39,11.77 L10.11,12.1 L9.82,12.44 L9.54,12.8 L9.28,13.2 L9.01,13.62 L8.75,14.06 L8.49,14.53 L8.22,15.01 L7.94,15.52 L7.65,16.03 L7.34,16.56 L7.02,17.1 L6.68,17.65 L6.31,18.2 L5.92,18.75 L5.5,19.29 L5.05,19.83 L4.57,20.37 L4.05,20.89 L3.5,21.39 L2.91,21.88 L3.09,22.12 L3.71,21.66 L4.33,21.23 L4.95,20.82 L5.56,20.45 L6.18,20.09 L6.79,19.75 L7.4,19.43 L8,19.12 L8.59,18.82 L9.17,18.53 L9.74,18.24 L10.29,17.95 L10.83,17.66 L11.34,17.37 L11.83,17.07 L12.3,16.76 L12.73,16.45 L13.14,16.12 L13.51,15.78 L13.85,15.42 L14.16,15.07 L14.48,14.72 L14.78,14.39 L15.08,14.07 L15.36,13.76 L15.65,13.45 L15.92,13.16 L16.18,12.87 L16.44,12.6 L16.68,12.33 L16.92,12.06 L17.15,11.81 L17.36,11.56 L17.57,11.32 L17.77,11.09 L17.95,10.86 L18.12,10.65 L18.28,10.43 L18.43,10.23 L18.57,10.03 L18.35,9.62 L17.69,8.94 L17.01,8.26 L16.75,7.86 Z" />
      <path d="M17.11,8.39 L17.64,7.93 L18.12,7.45 L18.55,6.96 L18.92,6.45 L19.25,5.93 L19.51,5.4 L19.72,4.86 L19.87,4.31 L19.96,3.76 L19.97,3.2 L19.91,2.65 L19.77,2.11 L19.54,1.6 L19.24,1.13 L18.87,0.71 L18.43,0.35 L18.1,0.17 L17.73,0.1 L17.36,0.15 L17.02,0.31 L16.75,0.57 L16.57,0.9 L16.5,1.27 L16.55,1.64 L16.71,1.98 L16.97,2.25 L17.12,2.41 L17.22,2.56 L17.29,2.71 L17.33,2.87 L17.35,3.04 L17.35,3.22 L17.31,3.43 L17.25,3.66 L17.15,3.92 L17.02,4.19 L16.84,4.48 L16.62,4.78 L16.35,5.09 L16.04,5.4 L15.69,5.71 L15.29,6.01 Z" />
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
