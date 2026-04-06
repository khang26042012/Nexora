let webControlLock = false;

export function setWebControlLock(active: boolean): void {
  webControlLock = active;
}

export function isWebControlLocked(): boolean {
  return webControlLock;
}
