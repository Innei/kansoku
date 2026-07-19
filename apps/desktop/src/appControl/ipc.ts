import { app, ipcMain } from 'electron';

export function registerAppControlIpc(): void {
  ipcMain.handle('desktop:app:relaunch', () => {
    app.relaunch();
    app.quit();
  });
}
