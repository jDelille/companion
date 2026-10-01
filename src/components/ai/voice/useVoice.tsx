"use client";

import { useState } from "react";

type Recognition = {
  lang: string;
  onstart: () => void;
  onend: () => void;
  onresult: (e: { results: { transcript: string }[][] }) => void;
  onerror: (e: { error: string }) => void;
  start: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

const useVoice = (onResult: (spoken: string) => void) => {
  const [listening, setListening] = useState(false);

  const start = () => {
    const w = window as SpeechWindow;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input works in Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (e) => onResult(e.results[0][0].transcript);
    recognition.onerror = (e) => {
      console.warn("Voice input error:", e.error);
      if (e.error === "not-allowed") alert("Microphone access is blocked for this site.");
      else if (e.error === "network") alert("Voice input couldn't reach the speech service. Check your connection.");
      else if (e.error === "no-speech") alert("Didn't hear anything — try again.");
    };

    recognition.start();
  };

  return { listening, start };
};

export default useVoice;
