export type DockScrollState = {
  y: number;
  travel: number;
  direction: -1 | 0 | 1;
  collapsed: boolean;
};

export function expandedDock(y = 0): DockScrollState {
  return { y, travel: 0, direction: 0, collapsed: false };
}

// Collapse on the first downward movement; require upward travel to avoid jitter.
export function advanceDock(
  state: DockScrollState,
  y: number,
): DockScrollState {
  y = Math.max(0, y);
  if (y === 0) return expandedDock(y);
  const delta = y - state.y;
  if (!delta) return state;
  const direction = delta > 0 ? 1 : -1;
  const travel =
    direction === state.direction
      ? state.travel + Math.abs(delta)
      : Math.abs(delta);
  const collapsed =
    direction === 1
      ? true
      : direction === -1 && travel >= 20
        ? false
        : state.collapsed;
  return { y, direction, travel, collapsed };
}
