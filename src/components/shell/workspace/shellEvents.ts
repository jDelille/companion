// Messages between the top bar and the rest of the page, sent as window events.
// The top bar can't call into the member page or the Do For Me rail directly,
// so it announces what it wants and they listen.

import type { MemberAction } from "@/domain/member-presentation";

// Open one of the member page's windows (Book, Message, Edit, Payment)
export const MEMBER_ACTION_EVENT = "dojang:member-action";
export type MemberActionDetail = { memberId: string; action: MemberAction };

// Switch the member page to one of its tabs (e.g. Family)
export const MEMBER_TAB_EVENT = "dojang:member-tab";
export type MemberTabDetail = { memberId: string; tab: string };

// Send a question to the Do For Me agent, as if typed in "Ask the agent"
export const ASK_AGENT_EVENT = "dojang:ask-agent";
export type AskAgentDetail = { text: string };

// Already used by the member page's "Do For Me" button: opens the rail for that member
export const DO_FOR_ME_EVENT = "dojang:do-for-me";

export function sendShellEvent(name: string, detail: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
