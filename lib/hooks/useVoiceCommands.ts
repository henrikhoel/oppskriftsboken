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

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  // Holder alltid siste onCommand i en ref, slik at recognition-instansen
  // (som lever på tvers av re-renders) aldri kaller en foreldet closure.
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

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
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult?.[0]?.transcript ?? "";
      const command = matchCommand(transcript);
      if (command) onCommandRef.current(command);
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

  return { isSupported, isInsecureContext, isListening, permissionDenied, start, stop };
}
