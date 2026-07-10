import { contextBridge, ipcRenderer } from "electron";
import { CREDENTIALS_CHANNELS } from "./credentialsChannels.js";

const desktopApi: Record<string, unknown> = {
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
};

// Only the packaged app:// page gets the MessagePort kernel bridge and the
// credentials IPC. In dev (ELECTRON_DEV=1) the window loads the Vite dev
// server over http://, which runs against its own standalone kernel —
// exposing these there would route traffic (including secrets) to the
// embedded kernel instead, leaving two kernels with divergent state.
if (location.protocol === "app:") {
  contextBridge.exposeInMainWorld("__DESKTOP_RT__", true);

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data !== "desktop-rt-connect") return;
    const channel = new MessageChannel();
    ipcRenderer.postMessage("desktop-rt-connect", null, [channel.port2]);
    window.postMessage("desktop-rt-port", "*", [channel.port1]);
  });

  desktopApi.credentials = {
    get: () => ipcRenderer.invoke(CREDENTIALS_CHANNELS.get),
    set: (creds: unknown) => ipcRenderer.invoke(CREDENTIALS_CHANNELS.set, creds),
    clear: () => ipcRenderer.invoke(CREDENTIALS_CHANNELS.clear),
    test: (creds: unknown) => ipcRenderer.invoke(CREDENTIALS_CHANNELS.test, creds),
  };
}

contextBridge.exposeInMainWorld("desktop", desktopApi);
