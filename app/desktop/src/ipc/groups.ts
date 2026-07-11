export const IPC_GROUPS = [
  "charts",
  "chat",
  "symbols",
  "annotations",
  "positions",
  "overview",
  "settings",
  "credentials",
  "health",
] as const;

export type IpcGroup = (typeof IPC_GROUPS)[number];
