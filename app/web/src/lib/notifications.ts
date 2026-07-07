import type { CommentLevel, Notice } from "../../../shared/types";

export type NotifyEnvelope =
  | { type: "comment"; live: boolean; symbol: string; level: CommentLevel; text: string }
  | { type: "notice"; live: boolean; notice: Notice };

export interface NotifyContext {
  hidden: boolean;
  permission: NotificationPermission | "unsupported";
}

export interface NotifyContent {
  title: string;
  body: string;
}

export function decideNotification(env: NotifyEnvelope, ctx: NotifyContext): NotifyContent | null {
  if (!env.live) return null;
  if (ctx.permission !== "granted") return null;
  if (!ctx.hidden) return null;
  if (env.type === "comment") {
    if (env.level !== "alert") return null;
    return { title: `${env.symbol} 盘中警报`, body: env.text };
  }
  return { title: env.notice.title, body: env.notice.body };
}

let permissionRequested = false;

export function requestNotificationPermissionOnce(): void {
  if (permissionRequested) return;
  permissionRequested = true;
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "default") void Notification.requestPermission();
}

export function notify(content: NotifyContent): void {
  if (typeof Notification === "undefined") return;
  const n = new Notification(content.title, { body: content.body });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

export function currentNotifyContext(): NotifyContext {
  return {
    hidden: document.hidden || document.visibilityState !== "visible",
    permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  };
}

export function maybeNotify(env: NotifyEnvelope): void {
  const content = decideNotification(env, currentNotifyContext());
  if (content) notify(content);
}
