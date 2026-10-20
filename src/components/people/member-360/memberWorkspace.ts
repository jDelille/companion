"use client";

import { useEffect, useState } from "react";

// The parts of the Hub's member_workspace read that Member 360's header and
// Overview use: the member's course (shown as their program) and recent activity.
// Read with the staff member's own Odoo sign-in. One request per member page:
// the header and the Overview share it.

export type MemberWorkspace = {
  courses: { id: string; name: string }[];
  timeline: { id: string; action: string; actor: string; at: string }[];
  bookings: { id: string; title: string; startsAt: string }[]; // upcoming registrations
};

const requests = new Map<string, Promise<MemberWorkspace | null>>();

function readWorkspace(memberId: string): Promise<MemberWorkspace | null> {
  const waiting = requests.get(memberId);
  if (waiting) return waiting;
  const request = fetch("/api/hub", {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation: "member_workspace", payload: { memberId }, requestKey: null }),
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const value = await response.json();
      if (value.member?.id !== memberId) return null;
      return {
        courses: Array.isArray(value.courses) ? value.courses : [],
        timeline: Array.isArray(value.timeline) ? value.timeline : [],
        bookings: Array.isArray(value.bookings) ? value.bookings : [],
      };
    })
    .catch(() => null)
    .finally(() => {
      // Read again next time the page opens, so it's never stale for long
      setTimeout(() => requests.delete(memberId), 5000);
    });
  requests.set(memberId, request);
  return request;
}

// null while loading, when signed out, or with sample data (enabled = false)
export function useMemberWorkspace(memberId: string, enabled: boolean): MemberWorkspace | null {
  const [workspace, setWorkspace] = useState<MemberWorkspace | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    readWorkspace(memberId).then((value) => {
      if (current) setWorkspace(value);
    });
    return () => {
      current = false;
    };
  }, [memberId, enabled]);
  return workspace;
}
