export type Risk = "low" | "medium" | "high";

export type Suggestion = {
  id: string;
  title: string;                                  // "Call Parker trial"
  explanation: string;                            // the evidence, in one line
  actionLabel: string;                            // "Prepare call"
  capability: string;                             // "crm.lead.prepare_follow_up"
  risk: Risk;
  preview: { label: string; value: string }[];    // what will happen, field by field
};

export type Receipt = {
  id: string;
  summary: string;   // "Send waiver reminder"
  actor: string;     // "Jamie · via Companion"
  at: string;        // "2:14 PM"
};