/**
 * updater.js
 *
 * Based on code snippet from electron-builder docs found here:
 * https://github.com/electron-userland/electron-builder/blob/master/docs/encapsulated%20manual%20update%20via%20menu.js
 */
import { dialog, BrowserWindow, MenuItem } from "electron";
import { autoUpdater } from "electron-updater";

let updater: MenuItem | null;
autoUpdater.autoDownload = false;
autoUpdater.on("error", (event, error) => {
  dialog.showErrorBox(
    "错误：",
    error == null ? "未知错误" : (error.stack || error).toString()
  );
});
autoUpdater.on("update-available", () => {
  const buttonIndex = dialog.showMessageBoxSync({
    type: "info",
    title: "发现更新",
    message: "Tad 有新版本可用，是否立即更新？",
    buttons: ["是", "否"],
  });
  if (buttonIndex === 0) {
    autoUpdater.downloadUpdate();
  } else {
    updater!.enabled = true;
    updater = null;
  }
});
autoUpdater.on("update-not-available", () => {
  dialog.showMessageBox({
    title: "无更新",
    message: "当前版本已是最新。",
  });
  updater!.enabled = true;
  updater = null;
});
autoUpdater.on("update-downloaded", () => {
  dialog.showMessageBoxSync({
    title: "安装更新",
    message: "更新已下载，即将更新...",
  });
  autoUpdater.quitAndInstall();
});

// export this to MenuItem click callback
export function checkForUpdates(
  menuItem: MenuItem,
  focusedWindow: BrowserWindow
) {
  console.log("updater.checkForUpdates");
  updater = menuItem;
  updater.enabled = false;
  autoUpdater.checkForUpdates();
}
