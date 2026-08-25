/**
 * Minimale typedefinisjoner for Web Speech API (SpeechRecognition) – dette
 * er et reelt, implementert nettleser-API (Chrome, Safari/iOS 14.5+), men
 * ikke en del av TypeScripts standard DOM-lib ennå. Kun feltene/metodene
 * lib/hooks/useVoiceCommands.ts faktisk bruker er typet her – ikke ment
 * som en fullstendig spec-typing av API-et.
 */

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionResultItem;
  length: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}
