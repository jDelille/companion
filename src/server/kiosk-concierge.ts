import type { ConciergeReply } from "../domain/kiosk/concierge";
import { authorized, fail, type GatewayConfig } from "./odoo-gateway";

// Connected help is read-only. Schedules come from the existing scoped Odoo
// sessions route; unsupported writes must never return a simulated receipt.
export function connectedReply(question: string): ConciergeReply {
  const text = question.toLowerCase();
  const has = (words: string[]) => words.some(word => text.includes(word));
  if (has(["owe", "balance", "bill", "pay", "invoice", "refund", "card", "contract", "waiver", "medical", "injury", "rank", "belt", "password"])) {
    return {kind: "privateHandoff", title: "Let's keep that private", lines: [
      "Account, payment and personal details aren't shown on this shared screen.",
      "Please speak with the front desk privately.",
    ]};
  }
  if (/\b(check|sign)\b.*\bin\b/.test(text) || has(["check-in", "checkin"])) {
    return {kind: "goTo", target: "checkIn", title: "Let's get you checked in", lines: ["Choose your class and confirm your name in Check In."]};
  }
  if (has(["try", "trial", "first class", "free class", "guest"])) {
    return {kind: "answer", title: "Trying a class", lines: ["Please speak with the front desk to arrange a trial and check availability.", "This kiosk has not sent a trial request or reserved a place."]};
  }
  if (has(["staff", "help me", "someone", "instructor", "front desk"])) {
    return {kind: "answer", title: "Help from staff", lines: ["Please go to the front desk for help.", "This kiosk cannot notify staff yet."]};
  }
  if (has(["join", "member", "sign up", "price", "cost"])) {
    return {kind: "answer", title: "Joining the school", lines: ["The front desk can explain membership options, prices and how to join."]};
  }
  if (has(["restroom", "bathroom", "toilet", "changing", "locker"])) {
    return {kind: "answer", title: "Restrooms and changing rooms", lines: ["Please ask the front desk for directions. This school's facility directions have not been configured here."]};
  }
  if (has(["access", "wheelchair", "step", "hearing", "quiet"])) {
    return {kind: "answer", title: "Accessibility help", lines: ["Please ask a staff member for help with your access needs. This school's accessibility details have not been configured here."]};
  }
  if (has(["class", "schedule", "today", "tonight", "time"])) {
    return {kind: "schedule", title: "Today's classes"};
  }
  return {kind: "notUnderstood"};
}

export async function conciergeQuestion(request: Request, config: GatewayConfig): Promise<Response> {
  if (request.headers.get("origin") !== config.origin || !authorized(config, "kiosk", request.headers.get("cookie") || "")) {
    return fail("FORBIDDEN", undefined, 403);
  }
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) throw Error("JSON required");
    const reader = request.body?.getReader();
    if (!reader) throw Error("Body required");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {await reader.cancel(); throw Error("Body limit");}
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString());
    if (!body || Array.isArray(body) || Object.keys(body).some(k => !["question", "correlationId"].includes(k)) ||
        typeof body.question !== "string" || !body.question.trim() || body.question.length > 200 ||
        typeof body.correlationId !== "string" || !/^[A-Za-z0-9_.:-]{1,128}$/.test(body.correlationId)) throw Error("Invalid question");
    return Response.json(connectedReply(body.question), {headers: {"cache-control": "private, no-store", vary: "Cookie"}});
  } catch {return fail("INVALID_COMMAND", undefined, 400);}
}
