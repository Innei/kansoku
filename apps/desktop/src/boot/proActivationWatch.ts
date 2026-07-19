export interface ProActivationWatchDeps {
  hasEncBundle(): boolean;
  isProPresent(): boolean;
  getBundleKey(): string | undefined;
  relaunch(): void;
  intervalMs?: number;
}

export function startProActivationWatch(deps: ProActivationWatchDeps): () => void {
  if (!deps.hasEncBundle() || deps.isProPresent()) return () => {};
  // Only an absent→present key transition during this run triggers a relaunch.
  // A key that was already stored at boot while pro still failed to load means
  // the key cannot decrypt this build — relaunching then would loop forever.
  if (deps.getBundleKey()) return () => {};
  const timer = setInterval(() => {
    if (!deps.getBundleKey()) return;
    clearInterval(timer);
    deps.relaunch();
  }, deps.intervalMs ?? 10_000);
  timer.unref?.();
  return () => clearInterval(timer);
}
