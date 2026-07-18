import * as updater from "./updater";
import * as appWindow from "./appWindow";
import * as quickStart from "./quickStart";
import electron, {
  MenuItem,
  BrowserWindow,
  KeyboardEvent,
  MenuItemConstructorOptions,
} from "electron";

const Menu = electron.Menu;
const isDarwin = process.platform === "darwin";
let appMenu: electron.Menu | null = null;
const separatorMenuItem: MenuItemConstructorOptions = {
  type: "separator",
};

const aboutTadMenuItem = () => {
  return {
    label: "关于 Tad",
    role: "about",
  };
};

const checkForUpdateMenuItem = () => {
  return {
    label: "检查更新",
    click: updater.checkForUpdates,
  };
};

export const createMenu = () => {
  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "新建 Tad 窗口",
      accelerator: "CmdOrCtrl+N",
      click: (item: MenuItem, focusedWindow: BrowserWindow | undefined) => {
        appWindow.newWindow(focusedWindow);
      },
    },

    {
      label: "打开文件...",
      accelerator: "CmdOrCtrl+O",
      click: (item: MenuItem, focusedWindow: BrowserWindow | undefined) => {
        appWindow.openDialog("openFile", focusedWindow);
      },
    },
    {
      label: "打开目录...",
      accelerator: "CmdOrCtrl+O",
      click: (item: MenuItem, focusedWindow: BrowserWindow | undefined) => {
        appWindow.openDialog("openDirectory", focusedWindow);
      },
    },

    separatorMenuItem,
    {
      label: "另存为...",
      accelerator: "Shift+CmdOrCtrl+S",
      click: (
        item: MenuItem,
        focusedWindow: BrowserWindow | undefined,
        event: KeyboardEvent
      ) => {
        appWindow.saveAsDialog();
      },
    },
    {
      label: "导出...",
      click: (
        item: MenuItem,
        focusedWindow: BrowserWindow | undefined,
        event: KeyboardEvent
      ) => {
        if (focusedWindow) {
          appWindow.beginExport(focusedWindow);
        }
      },
    },

    /*
    {
      label: "Export Filtered CSV...",
      click: (
        item: MenuItem,
        focusedWindow: BrowserWindow | undefined,
        event: KeyboardEvent
      ) => {
        if (focusedWindow) {
          appWindow.exportFiltered(focusedWindow);
        }
      },
    },
*/
  ];

  if (!isDarwin) {
    fileSubmenu.push(separatorMenuItem);
    fileSubmenu.push({
      role: "quit",
    });
  }

  const editSubmenu: MenuItemConstructorOptions[] = [
    { label: "剪切", accelerator: "CmdOrCtrl+X", role: "cut" },
    { label: "复制", accelerator: "CmdOrCtrl+C", role: "copy" },
    { label: "粘贴", accelerator: "CmdOrCtrl+V", role: "paste" },
  ];
  const viewSubmenu: MenuItemConstructorOptions[] = [
    { label: "重置缩放", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
    { label: "放大", accelerator: "CmdOrCtrl+Plus", role: "zoomIn" },
    { label: "缩小", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
  ];
  const debugSubmenu: MenuItemConstructorOptions[] = [
    {
      role: "toggleDevTools",
    },
    {
      label: "显示隐藏列",
      type: "checkbox",
      click: (
        item: MenuItem,
        focusedWindow: BrowserWindow | undefined,
        event: KeyboardEvent
      ) => {
        console.log("show hidden...: ", item);
        focusedWindow?.webContents.send("set-show-hidden-cols", item.checked);
      },
    },
  ];
  let helpSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "快速入门指南",
      click: (
        item: MenuItem,
        focusedWindow: BrowserWindow | undefined,
        event: KeyboardEvent
      ) => {
        quickStart.showQuickStart();
      },
    },
    {
      label: "发送反馈 / 报告问题",
      click: (
        item: MenuItem,
        focusedWindow: BrowserWindow | undefined,
        event: KeyboardEvent
      ) => {
        electron.shell.openExternal("mailto:tad-feedback@tadviewer.com");
      },
    },
  ];
  const template: MenuItemConstructorOptions[] = [
    {
      label: "文件",
      submenu: fileSubmenu,
    },
    {
      label: "编辑",
      submenu: editSubmenu,
    },
    {
      label: "视图",
      submenu: viewSubmenu,
    },
  ];

  if (process.env.NODE_ENV === "development") {
    template.push({
      label: "调试",
      submenu: debugSubmenu as any,
    });
  }

  template.push({
    label: "帮助",
    submenu: helpSubmenu,
  });

  if (isDarwin) {
    template.unshift({
      label: "Tad",
      // ignored on Mac OS; comes from plist
      submenu: [
        aboutTadMenuItem(),
        separatorMenuItem,
        checkForUpdateMenuItem(),
        separatorMenuItem,
        {
          role: "quit",
        },
      ] as any,
    });
  }

  let oldMenu = appMenu;
  appMenu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(appMenu);
};
