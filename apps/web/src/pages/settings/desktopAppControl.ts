export interface DesktopAppControlBridge {
  relaunch(): Promise<void>;
}

export function getDesktopAppControlBridge(
  win: unknown = typeof window === 'undefined' ? undefined : window,
): DesktopAppControlBridge | null {
  return (
    (win as { desktop?: { appControl?: DesktopAppControlBridge } } | undefined)?.desktop
      ?.appControl ?? null
  );
}
