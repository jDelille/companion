// Kiosk settings in one place, so they're easy to swap once the real values exist

// PROVISIONAL: synthetic placeholder. Nothing in the contract or mock data has a school name yet.
export const SCHOOL_NAME = "Dojang Downtown";

export type SecondaryActionId =
  | "classes"
  | "events"
  | "testing"
  | "schedule"
  | "staff";

export type SecondaryAction = {
  id: SecondaryActionId;
  label: string;
  prominence: "card" | "text"; // card under Check In, or a muted text link below
  shown: boolean; // on the Welcome screen at all
  available: boolean; // actually works when tapped
};

// Secondary buttons on the Welcome screen (K01). WelcomeScreen renders straight from this list.
// None of these are built yet, so they're all unavailable and shouldn't look tappable.
export const SECONDARY_ACTIONS: SecondaryAction[] = [
  {
    id: "classes",
    label: "Classes",
    prominence: "card",
    shown: true,
    available: false,
  },
  {
    id: "events",
    label: "Events",
    prominence: "card",
    shown: true,
    available: false,
  },
  // Hidden until they exist: the handoff (K01) says Testing / Schedule / Staff only "where enabled".
  // Classes and Events don't have that qualifier, so they stay as disabled cards.
  {
    id: "testing",
    label: "Testing",
    prominence: "text",
    shown: false,
    available: false,
  },
  {
    id: "schedule",
    label: "Schedule",
    prominence: "text",
    shown: false,
    available: false,
  },
  // Hidden: a Staff entry on a public screen points at a feature that doesn't exist,
  // and its security rules haven't been designed. Tracked here, not shown.
  {
    id: "staff",
    label: "Staff",
    prominence: "text",
    shown: false,
    available: false,
  },
];

// PROVISIONAL: not agreed yet. How long the kiosk waits with no input before
// clearing everything and going back to Welcome (K07). Change it here only.
export const IDLE_TIMEOUT_SECONDS = 60;

// PROVISIONAL: not agreed yet. How long a check-in request may take before the
// kiosk gives up and shows "not confirmed". A timed-out request may still have
// succeeded on the server, which is why the retry resends the same idempotency key.
export const CHECK_IN_TIMEOUT_SECONDS = 15;
