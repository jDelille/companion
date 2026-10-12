"use client";

import {useEffect, useState} from "react";
import {explainHubError, type ActionFeedback} from "@/domain/hub-actions";
import styles from "./page.module.css";

type Settings = {enabled: boolean; configured: boolean; model: string | null; canEnable: boolean;
  siteVersion: number; configVersion: number; lastCheck: null | {at: string; model: string; mode: string}};
type Props = {busy: boolean; locked: boolean; feedback?: ActionFeedback;
  act: (operation: string, payload: Record<string, unknown>) => Promise<ActionFeedback | undefined>;
  retry?: () => Promise<ActionFeedback | undefined>};

export default function AiSettings({busy, locked, feedback, act, retry}: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [review, setReview] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hub", {method: "POST", cache: "no-store", headers: {"content-type": "application/json"},
      body: JSON.stringify({operation: "ai_settings", payload: {}, requestKey: null})})
      .then(async response => {const result = await response.json(); if (!response.ok) throw Error(result.error?.code || "CONNECTION_UNAVAILABLE"); return result;})
      .then(result => {if (!cancelled) {setSettings(result); setError("");}})
      .catch(problem => {if (!cancelled) {setSettings(null); setError(explainHubError(problem.message));}});
    return () => {cancelled = true;};
  }, [revision]);
  async function confirm() {
    if (!settings || busy || locked) return;
    const result = await act("enable_ai", {expectedSiteVersion: settings.siteVersion, expectedConfigVersion: settings.configVersion});
    if (result?.kind !== "uncertain") setReview(false);
    if (result?.kind === "success") setRevision(value => value + 1);
  }
  return <section className={styles.card} aria-label="AI drafting settings">
    <div className={styles.row}><h2>AI drafting</h2><button disabled={busy || locked} onClick={() => {setReview(false); setRevision(value => value + 1);}}>Refresh AI status</button></div>
    {error && <p role="alert">{error}</p>}
    {!settings && !error && <p role="status">Checking this school’s AI settings…</p>}
    {settings && <>
      <p>{settings.enabled ? "AI drafting is enabled." : "Template drafting is active."} {settings.model && `Model: ${settings.model}.`}</p>
      {settings.lastCheck && <p>Last successful synthetic draft: {new Date(settings.lastCheck.at).toLocaleString()} · {settings.lastCheck.model}. This records the last check, not a guarantee of current provider availability.</p>}
      {!settings.configured && <p>The running Odoo worker does not have a supported OpenAI configuration. Your administrator must load the supplied private provider key into that worker.</p>}
      {settings.canEnable ? !review ? <button disabled={busy || locked || !settings.configured} onClick={() => setReview(true)}>{settings.enabled ? "Review live AI check" : "Review AI activation"}</button>
        : <div className={styles.savedReceipt} role="group" aria-label="Review AI activation"><p>Generate one synthetic draft through this school’s Odoo worker using OpenAI. If it succeeds, enable AI assistance for new drafts at this school. Staff still reviews each reply before sending.</p>
          <button disabled={busy || locked} onClick={() => void confirm()}>Check and enable AI drafting</button>
          <button disabled={busy || locked} onClick={() => setReview(false)}>Cancel</button></div>
        : <p>A school owner can check and activate AI drafting.</p>}
    </>}
    {feedback && <div role={feedback.kind === "error" ? "alert" : "status"}><p>{feedback.text}</p>{feedback.refreshWarning && <p>{feedback.refreshWarning}</p>}
      {feedback.kind === "uncertain" && retry && <button disabled={busy} onClick={() => void retry().then(result => {if (result?.kind === "success") {setReview(false); setRevision(value => value + 1);}})}>Check original AI activation</button>}</div>}
  </section>;
}
