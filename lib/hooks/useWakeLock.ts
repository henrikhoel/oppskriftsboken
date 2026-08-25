"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Wrapper rundt Screen Wake Lock API. Holder skjermen våken mens Cook Mode
 * er aktiv, med graceful fallback dersom nettleseren ikke støtter API-et
 * (Safari på eldre iOS, enkelte nettlesere) – da rapporteres bare
 * `isSupported: false` og resten av appen fungerer som normalt.
 *
 * Wake Lock krever, akkurat som talestyring (se useVoiceCommands.ts), en
 * sikker kontekst (https eller localhost) – `navigator.wakeLock` finnes
 * rett og slett ikke i en usikker kontekst, f.eks. ved testing via en
 * vanlig http://<LAN-IP>-adresse. Da er `isSupported` false selv om
 * nettleseren for øvrig støtter API-et, og skjermlås-varselet under
 * Cook Mode vises – IKKE en feil i koden, det virker av seg selv når
 * siden er publisert over https. `isInsecureContext` skiller dette
 * tilfellet fra "nettleseren støtter det virkelig ikke", slik at UI-et
 * kan vise en presis forklaring i stedet for et generisk varsel.
 */
export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isInsecureContext, setIsInsecureContext] = useState(false);

  useEffect(() => {
    const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
    setIsSupported(supported);
    setIsInsecureContext(!supported && typeof window !== "undefined" && window.isSecureContext === false);
  }, []);

  const request = useCallback(async () => {
    // Sjekkes direkte her (ikke via `isSupported`-state) slik at det første
    // kallet fra en mount-effekt med tomme dependencies ikke risikerer å
    // fange en foreldet closure-verdi av isSupported fra før den rakk å bli
    // satt til true.
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      sentinelRef.current = await navigator.wakeLock.request("screen");
      setIsActive(true);
      sentinelRef.current.addEventListener("release", () => setIsActive(false));
    } catch {
      // Kan feile f.eks. hvis fanen ikke er synlig – ikke kritisk, appen
      // fungerer helt fint uten wake lock.
      setIsActive(false);
    }
  }, []);

  const release = useCallback(async () => {
    try {
      await sentinelRef.current?.release();
    } catch {
      // ignorer
    }
    sentinelRef.current = null;
    setIsActive(false);
  }, []);

  // Ta wake locken på nytt hvis fanen blir synlig igjen mens Cook Mode
  // fortsatt er ment å være aktiv (mobiler slipper den automatisk ved
  // skjermlås/fane-bytte).
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible" && sentinelRef.current === null && isActive) {
        request();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isActive, request]);

  useEffect(() => {
    return () => {
      sentinelRef.current?.release().catch(() => {});
    };
  }, []);

  return { isSupported, isInsecureContext, isActive, request, release };
}
