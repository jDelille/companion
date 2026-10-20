// sample events for the demo kiosk. read-only, no signup yet (real events need the backend)
export type DemoEvent = {
  id: string;
  title: string;
  when: string; // already formatted for display
  note: string;
};

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: "e1",
    title: "Belt Testing",
    when: "Sat, Nov 7 · 10:00 AM",
    note: "All ranks welcome",
  },
  {
    id: "e2",
    title: "Parents' Night Out",
    when: "Fri, Nov 13 · 6:00 PM",
    note: "Ages 5-12",
  },
  {
    id: "e3",
    title: "Sparring Workshop",
    when: "Sat, Nov 21 · 1:00 PM",
    note: "Gear required",
  },
];
