export type DirtyMediaSlots = Record<string, true>;

export function setMediaSlotDirty(current: DirtyMediaSlots, slotId: string, dirty: boolean): DirtyMediaSlots {
  if (dirty) return { ...current, [slotId]: true };
  const next = { ...current };
  delete next[slotId];
  return next;
}

export function hasUnsavedMedia(current: DirtyMediaSlots) {
  return Object.keys(current).length > 0;
}
