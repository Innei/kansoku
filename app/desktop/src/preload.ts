import { contextBridge, ipcRenderer } from "electron";

// Only the packaged app:// page gets the privileged IPC surface (MessagePort
// kernel bridge, external API controls). In dev (ELECTRON_DEV=1) the window
// loads the Vite dev server over http://, which runs against its own
// standalone kernel — exposing these there would route traffic to the wrong
// kernel instance, so everything below stays gated on the app:// origin.
const isAppOrigin = location.protocol === "app:";

contextBridge.exposeInMainWorld("desktop", {
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
  ...(isAppOrigin
    ? {
        externalApi: {
          getState: () => ipcRenderer.invoke("desktop:external-api:get-state"),
          enable: () => ipcRenderer.invoke("desktop:external-api:enable"),
          disable: () => ipcRenderer.invoke("desktop:external-api:disable"),
          resetToken: () => ipcRenderer.invoke("desktop:external-api:reset-token"),
        },
      }
    : {}),
});

if (isAppOrigin) {
  contextBridge.exposeInMainWorld("__DESKTOP_RT__", true);

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data !== "desktop-rt-connect") return;
    const channel = new MessageChannel();
    ipcRenderer.postMessage("desktop-rt-connect", null, [channel.port2]);
    window.postMessage("desktop-rt-port", "*", [channel.port1]);
  });
}
