/**
 * Trygg, delt ID-generering for klientsidig kode (React key-er, lokale
 * slot-/rad-identifikatorer o.l. – IKKE ment for ekte kryptografiske formål).
 *
 * BAKGRUNN (26.08.2026 – funnet via feilmelding på mobil): `crypto.randomUUID`
 * finnes KUN i "secure contexts" i nettlesere (HTTPS, eller localhost) – se
 * https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID. Under
 * utvikling testes appen ofte over LAN via IP-adresse (f.eks.
 * "http://192.168.10.185" fra allowedDevOrigins i next.config.ts) – vanlig
 * http://, ikke https://, og DERMED ikke en secure context. Safari (spesielt
 * mobil-Safari) håndhever dette strengt og lar `crypto.randomUUID` være
 * `undefined` i så fall, som ga et hardt krasj ("crypto.randomUUID is not a
 * function") midt i addExistingSlot (lib/kitchen-intelligence/meal-session.ts)
 * da en meny skulle lagres – Chrome/desktop er ofte mer overbærende her,
 * derav at feilen kun viste seg på mobil. (Selve produksjonssiden vil kjøre
 * over ekte https://, der dette ikke er et problem – men koden bør uansett
 * IKKE stole blindt på at `crypto.randomUUID` finnes, siden nettopp
 * dev-over-LAN-scenarioet er en reell, forventet del av arbeidsflyten her.)
 *
 * Denne funksjonen var tidligere duplisert (identisk fallback-logikk) i
 * lib/admin-form-types.ts (makeKey) og lib/hooks/useMealSession.ts
 * (generateMealId) – begge er nå tynne wrappere rundt denne ene, og
 * lib/kitchen-intelligence/meal-session.ts (addExistingSlot/addSuggestedSlot)
 * og lib/utils/shopping-list.ts (mergeIngredientsIntoList) – som kalte
 * crypto.randomUUID() DIREKTE uten fallback og dermed var de faktiske
 * krasjstedene – bruker den nå også.
 */
export function generateId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}
