// Kiosk settings in one place, so they're easy to swap once the real values exist

// PROVISIONAL: synthetic placeholder. Nothing in the contract or mock data has a school name yet.
export const SCHOOL_NAME = "Dojang Downtown";

export type SecondaryActionId = "classes" | "events" | "testing" | "schedule" | "staff";

export type SecondaryAction = {
  id: SecondaryActionId;
  label: string;
  available: boolean;
};

// Secondary buttons on the Welcome screen (K01). None of these are built yet,
// so they're all unavailable and shouldn't look tappable.
export const SECONDARY_ACTIONS: SecondaryAction[] = [
  { id: "classes", label: "Classes", available: false },
  { id: "events", label: "Events", available: false },
  { id: "testing", label: "Testing", available: false },
  { id: "schedule", label: "Schedule", available: false },
  { id: "staff", label: "Staff", available: false },
];

// PROVISIONAL: not agreed yet. How long the kiosk waits with no input before
// clearing everything and going back to Welcome (K07). Change it here only.
export const IDLE_TIMEOUT_SECONDS = 60;
