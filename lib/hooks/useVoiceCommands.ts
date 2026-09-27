"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n/types";

export type VoiceCommand = "next" | "previous" | "repeat" | "markDone";

/** Nøkkelord per kommando, på begge språk – uavhengig av hvilket språk
 * `recognition.lang` faktisk står i, slik at appen er tolerant for at
 * gjenkjenningen likevel transkriberer noe forståelig. Rekkefølgen spiller
 * ingen rolle; `includes()` brukes så "si det litt rundt" (f.eks. "kan du
 * gå til neste steg") også trigges. */
const COMMAND_KEYWORDS: Record<VoiceCommand, string[]> = {
  next: ["neste", "next"],
  previous: ["tilbake", "forrige", "back", "previous"],
  repeat: ["gjenta", "les opp", "repeat", "read"],
  markDone: ["ferdig", "merk", "huk av", "done", "check off", "mark"],
};

function matchCommand(transcript: string): VoiceCommand | null {
  const normalized = transcript.toLowerCase().trim();
  for (const [command, keywords] of Object.entries(COMMAND_KEYWORDS) as [VoiceCommand, string[]][]) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return command;
  }
  return null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

/**
 * Talestyring for Cook Mode via nettleserens innebygde Web Speech API –
 * ingen ekstern tjeneste eller nytt npm-avhengighet. Lytter kontinuerlig
 * etter et lite, fast sett med kommandoord (se COMMAND_KEYWORDS over) i
 * stedet for fri tale/NLU, som holder treffsikkerheten grei selv i et
 * kjøkken med bakgrunnsstøy.
 *
 * Nettleseren krever et eksplisitt brukertrykk før den starter å lytte
 * (personvern) – appen kan ikke skru dette på av seg selv. Spesielt på
 * iOS/Safari stopper gjenkjenningen seg selv etter en stille periode selv
 * i "continuous"-modus; onend starter den derfor automatisk på nytt så
 * lenge brukeren ikke selv har trykket "av".
 *
 * `interimResults` (23.09.2026 – Henrik testet stemmestyringen for en
 * kollega: den virket, men "reagerer litt sakte, så man kan ende med å si
 * det flere ganger fordi man ikke tror den reagerer"). Årsaken var todelt:
 * 1) `interimResults` sto til `false`, så nettleseren ventet på en LITEN
 *    PAUSE i talen før den i det hele tatt rapporterte et resultat –
 *    kommandoen "trigget" altså ikke før man var ferdig å snakke OG en
 *    kort stillhet hadde gått. Nå matches kommandoordet allerede i det
 *    (foreløpige) resultatet så snart ordet er formet, uten å vente på at
 *    hele frasen skal bli "endelig".
 * 2) Det fantes ingen synlig bekreftelse på at et ord faktisk ble hørt –
 *    kun den statiske "Lytter …"-teksten, uansett om noe ble gjenkjent
 *    eller ikke. `lastCommand` under gir UI-et (se CookMode.tsx/
 *    MultiCookMode.tsx) noe konkret å vise et par sekunder når et ord
 *    faktisk trigger en kommando, akkurat som "✓ Timer startet"-mønsteret
 *    for timer-knappen i CookMode.tsx.
 * `handledResultIndexesRef` hindrer at samme talesegment (som Web Speech
 * API kan sende flere ganger med voksende tekst mens man snakker, siden
 * `interimResults` nå er på) trigger kommandoen på nytt for hvert lille
 * tillegg – kun FØRSTE gang et gitt segment inneholder et kjent ord.
 */
export function useVoiceCommands({
  lang,
  onCommand,
}: {
  lang: Lang;
  onCommand: (command: VoiceCommand) => void;
}) {
  const [isSupported, setIsSupported] = useState(false);
  // Sant når nettleseren typisk STØTTER Web Speech API, men konstruktøren
  // likevel ikke finnes fordi siden kjører i en usikker kontekst (vanlig
  // http://, ikke https:// eller localhost) – f.eks. når man tester dev-
  // serveren fra telefonen via Mac-ens LAN-IP (samme situasjon som
  // allowedDevOrigins-saken i next.config.ts). Skilt fra isSupported=false
  // slik at UI-et kan vise en forklarende melding ("virker når siden er på
  // https") i stedet for å late som funksjonen rett og slett ikke finnes.
  const [isInsecureContext, setIsInsecureContext] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  // Siste gjenkjente kommando, kun til øyeblikkelig UI-bekreftelse ("✓
  // Hørte: neste") – null'es ut igjen automatisk et lite stykke ned.
  // IKKE ment å leses for selve kommando-logikken (den går via
  // onCommand-callbacken som før); dette er ren tilbakemelding til øyet.
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  // Holder alltid siste onCommand i en ref, slik at recognition-instansen
  // (som lever på tvers av re-renders) aldri kaller en foreldet closure.
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  // Hvilke resultat-indekser i inneværende lytteøkt som allerede har
  // trigget en kommando – nullstilles for hver `recognition.onstart`
  // (dvs. både ved manuell start og ved automatiske restarter fra onend).
  const handledResultIndexesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!lastCommand) return;
    const timeout = setTimeout(() => setLastCommand(null), 2000);
    return () => clearTimeout(timeout);
  }, [lastCommand]);

  useEffect(() => {
    const ctor = getSpeechRecognitionCtor();
    setIsSupported(!!ctor);
    setIsInsecureContext(!ctor && typeof window !== "undefined" && window.isSecureContext === false);
  }, []);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return;

    shouldListenRef.current = true;
    setPermissionDenied(false);

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang === "en" ? "en-US" : "nb-NO";
    recognition.continuous = true;
    // Se doc-kommentaren over funksjonen (23.09.2026) – på for raskere
    // respons: kommandoord matches allerede i det foreløpige resultatet,
    // uten å vente på en pause i talen.
    recognition.interimResults = true;

    recognition.onstart = () => {
      handledResultIndexesRef.current = new Set();
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (handledResultIndexesRef.current.has(i)) continue;
        const transcript = event.results[i]?.[0]?.transcript ?? "";
        const command = matchCommand(transcript);
        if (command) {
          handledResultIndexesRef.current.add(i);
          setLastCommand(command);
          onCommandRef.current(command);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        // Mikrofontilgang avslått – ikke prøv å starte på nytt automatisk.
        shouldListenRef.current = false;
        setPermissionDenied(true);
        setIsListening(false);
      }
      // Andre feil ("no-speech", "audio-capture" osv.) er ikke fatale –
      // onend under tar seg av å starte på nytt.
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          // Skjer typisk hvis den alt er i gang – trygt å ignorere.
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [lang]);

  // Skru av og rydd opp hvis komponenten som bruker hooken (Cook Mode)
  // avmonteres mens vi fortsatt lytter.
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  return { isSupported, isInsecureContext, isListening, permissionDenied, lastCommand, start, stop };
}
