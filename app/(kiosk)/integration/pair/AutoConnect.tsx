"use client";
import { useEffect, useRef } from "react";

// Submits the pairing form once, when the page was opened with a key in its link
// (/integration/pair?key=…). The form still posts to the same pairing route, so the
// server checks the key exactly as when it is typed.
export default function AutoConnect({ formId }: { formId: string }) {
  const submitted = useRef(false);
  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    const form = document.getElementById(formId);
    if (form instanceof HTMLFormElement) form.requestSubmit();
  }, [formId]);
  return null;
}
