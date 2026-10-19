import type { CommandEnvelope, CheckInPayload } from "../../contracts/kiosk-attendance";

type Command = CommandEnvelope<CheckInPayload>;
export type QueueContext = { scope: string; key: string; expiresAt: number };
type Entry = { id: string; scope: string; expiresAt: number; iv: number[]; ciphertext: number[]; review: boolean };
export type QueueStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
export const QUEUE_STORAGE_KEY = "dojang:attendance-outbox:v1";
const TTL = 15 * 60 * 1000;
const idPattern = /^[1-9][0-9]{0,9}$/;
const keyPattern = /^[A-Za-z0-9][A-Za-z0-9_.:-]{15,127}$/;

export function validQueuedCommand(value: unknown): value is Command {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Record<string, unknown>;
  const p = c.payload as Record<string, unknown> | undefined;
  return !Object.keys(c).some(k => !["idempotencyKey", "correlationId", "expectedVersion", "payload"].includes(k)) &&
    typeof c.idempotencyKey === "string" && keyPattern.test(c.idempotencyKey) &&
    typeof c.correlationId === "string" && keyPattern.test(c.correlationId) &&
    !!p && typeof p === "object" && !Array.isArray(p) && Object.keys(p).length === 2 &&
    [p.memberId, p.sessionId].every(id => typeof id === "string" && idPattern.test(id) && Number(id) <= 2147483647) &&
    (c.expectedVersion === undefined || (Number.isSafeInteger(c.expectedVersion) && Number(c.expectedVersion) >= 0));
}

/** Encrypted, bounded test-device outbox. It stores no names or credentials.
 * The decryption key is supplied only to a currently authenticated device and
 * kept in memory, never alongside the ciphertext. Server policy still decides.
 */
export class AttendanceOutbox {
  constructor(private storage: QueueStorage, private crypt: Crypto, private now: () => number = Date.now) {}
  private read(): { entries: Entry[]; notices: number } {
    try {
      const raw = this.storage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return { entries: [], notices: 0 };
      if (raw.length > 200000) throw new Error("Queue too large");
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 50 || !Number.isSafeInteger(data.notices) || data.notices < 0) throw new Error("Invalid queue");
      for (const e of data.entries) {
        if (!/^[a-f0-9]{64}$/.test(e.id) || !/^[a-f0-9]{64}$/.test(e.scope) || !Number.isSafeInteger(e.expiresAt) || typeof e.review !== "boolean" || !Array.isArray(e.iv) || e.iv.length !== 12 || !Array.isArray(e.ciphertext) || e.ciphertext.length > 4096 || e.ciphertext.length < 16 || [...e.iv, ...e.ciphertext].some((v: unknown) => !Number.isInteger(v) || Number(v) < 0 || Number(v) > 255)) throw new Error("Invalid entry");
      }
      const active = data.entries.filter((e: Entry) => e.expiresAt > this.now());
      const state = {entries: active, notices: Math.min(999, data.notices + data.entries.length - active.length)};
      if (active.length !== data.entries.length) this.write(state);
      return state;
    } catch {
      const state = {entries: [], notices: 1};
      this.write(state);
      return state;
    }
  }
  private write(state: {entries: Entry[]; notices: number}) {
    this.storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({version: 1, ...state}));
  }
  private contextValid(c: QueueContext) {
    return /^[a-f0-9]{64}$/.test(c.scope) && /^[a-f0-9]{64}$/.test(c.key) && Number.isSafeInteger(c.expiresAt) && c.expiresAt > this.now();
  }
  private async cryptoKey(context: QueueContext) {
    const bytes = new Uint8Array(context.key.match(/../g)!.map(hex => parseInt(hex, 16)));
    return this.crypt.subtle.importKey("raw", bytes, {name: "AES-GCM"}, false, ["encrypt", "decrypt"]);
  }
  private async commandId(command: Command) {
    const digest = await this.crypt.subtle.digest("SHA-256", new TextEncoder().encode(command.idempotencyKey));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  }
  async enqueue(command: Command, context: QueueContext): Promise<boolean> {
    if (!validQueuedCommand(command) || !this.contextValid(context)) return false;
    const state = this.read();
    const id = await this.commandId(command);
    // SAME_KEY_PAYLOAD_CHECK
    const existing = state.entries.find(e => e.id === id && e.scope === context.scope);
    if (existing) {
      try {
        const clear = await this.crypt.subtle.decrypt({name: "AES-GCM", iv: new Uint8Array(existing.iv)}, await this.cryptoKey(context), new Uint8Array(existing.ciphertext));
        const saved = JSON.parse(new TextDecoder().decode(clear));
        return validQueuedCommand(saved) && saved.payload.memberId === command.payload.memberId && saved.payload.sessionId === command.payload.sessionId && saved.expectedVersion === command.expectedVersion;
      } catch { return false; }
    }
    if (state.entries.length >= 50) return false;
    const iv = this.crypt.getRandomValues(new Uint8Array(12));
    const ciphertext = await this.crypt.subtle.encrypt({name: "AES-GCM", iv}, await this.cryptoKey(context), new TextEncoder().encode(JSON.stringify(command)));
    state.entries.push({id, scope: context.scope, expiresAt: Math.min(context.expiresAt, this.now() + TTL), iv: Array.from(iv), ciphertext: Array.from(new Uint8Array(ciphertext)), review: false});
    this.write(state);
    return true;
  }
  async pending(context: QueueContext): Promise<Array<{entryId: string; command: Command}>> {
    if (!this.contextValid(context)) return [];
    const state = this.read();
    const result: Array<{entryId: string; command: Command}> = [];
    const key = await this.cryptoKey(context);
    for (const entry of state.entries) {
      if (entry.scope !== context.scope || entry.review) continue;
      try {
        const decoded = await this.crypt.subtle.decrypt({name: "AES-GCM", iv: new Uint8Array(entry.iv)}, key, new Uint8Array(entry.ciphertext));
        const command: unknown = JSON.parse(new TextDecoder().decode(decoded));
        if (!validQueuedCommand(command) || await this.commandId(command) !== entry.id) throw new Error("Invalid queued command");
        result.push({entryId: entry.id, command});
      } catch { entry.review = true; }
    }
    this.write(state);
    return result;
  }
  async acknowledge(command: Command, context: QueueContext) {
    const state = this.read(), id = await this.commandId(command);
    state.entries = state.entries.filter(e => !(e.id === id && e.scope === context.scope));
    this.write(state);
  }
  review(entryId: string, context: QueueContext) {
    const state = this.read();
    const entry = state.entries.find(e => e.id === entryId && e.scope === context.scope);
    if (entry) entry.review = true;
    this.write(state);
  }
  summary(context?: QueueContext) {
    const state = this.read();
    return {pending: state.entries.filter(e => !e.review && (!context || e.scope === context.scope)).length,
      review: state.notices + state.entries.filter(e => e.review || (!!context && e.scope !== context.scope)).length};
  }
}
