const { app, BrowserWindow, ipcMain, dialog, Notification, Menu, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");

// Log uncaught exceptions to help with debugging
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const isMac = process.platform === "darwin";

let mainWindow;
let openedFilePath;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadFile("index.html");

    // For development purposes
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    const fileMenu = {
        label: "File",
        submenu: [
            {
                label: "New File",
                accelerator: "CmdOrCtrl+N",
                click: () => {
                    if (mainWindow) mainWindow.webContents.send("create-document");
                },
            },
            {
                label: "Open File",
                accelerator: "CmdOrCtrl+O",
                click: () => {
                    if (mainWindow) mainWindow.webContents.send("openDocumentTriggered");
                },
            },
            {
                label: "Open Recent",
                role: "recentdocuments",
                submenu: [
                    {
                        label: "Clear Recent",
                        role: "clearrecentdocuments",
                    },
                ],
            },
            { type: "separator" },
            isMac ? { role: "close" } : { role: "quit" },
        ],
    };

    const editMenu = {
        label: "Edit",
        submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" },
            { role: "paste" },
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
                label: "Find",
                accelerator: "CmdOrCtrl+F",
                click: () => {
                    // Implement find functionality if needed
                }
            }
        ],
    };

    const viewMenu = {
        label: "View",
        submenu: [
            { role: "reload" },
            { role: "forceReload" },
            { type: "separator" },
            { role: "toggleDevTools" },
            { type: "separator" },
            { role: "resetZoom" },
            { role: "zoomIn" },
            { role: "zoomOut" },
            { type: "separator" },
            { role: "togglefullscreen" }
        ]
    };

    const menu = Menu.buildFromTemplate([fileMenu, editMenu, viewMenu]);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    createWindow();

    if (isMac) {
        const iconPath = path.join(__dirname, "images", "babyDragon.icns");
        if (fs.existsSync(iconPath)) {
            const appIcon = nativeImage.createFromPath(iconPath);
            if (!appIcon.isEmpty()) {
                app.dock.setIcon(appIcon);
            } else {
                console.error("Failed to load icon: Image is empty");
            }
        } else {
            console.error("Icon file not found:", iconPath);
        }
    }
});

const handleError = (message = "Something went wrong") => {
    new Notification({
        title: "Error",
        body: message,
    }).show();
};

const openFile = (filePath) => {
    fs.readFile(filePath, "utf-8", (error, content) => {
        if (error) {
            console.error("Error reading file:", error);
            handleError("Error reading file");
            return;
        }

        app.addRecentDocument(filePath);
        openedFilePath = filePath;
        mainWindow.webContents.send("document-opened", { filePath, content });
    });
};

app.on("open-file", (_, filePath) => {
    openFile(filePath);
});

app.on("window-all-closed", () => {
    if (!isMac) {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on("create-document", (event) => {
    dialog
        .showSaveDialog(mainWindow, {
            filters: [{ name: "text files", extensions: ["txt"] }],
        })
        .then(({ filePath }) => {
            if (!filePath) {
                // User canceled the operation
                return;
            }

            fs.writeFile(filePath, "", (error) => {
                if (error) {
                    handleError("Error creating file");
                    return;
                }
                openedFilePath = filePath;
                mainWindow.webContents.send("document-created", filePath);
            });
        })
        .catch((error) => {
            console.error("Dialog error:", error);
            handleError("Error creating document");
        });
});

ipcMain.on("openDocumentTriggered", () => {
    dialog
        .showOpenDialog({
            properties: ["openFile"],
            filters: [{ name: "text files", extensions: ["txt"] }],
        })
        .then(({ filePaths }) => {
            if (!filePaths || filePaths.length === 0) {
                console.error("No file selected.");
                return;
            }

            const filePath = filePaths[0];
            openedFilePath = filePath;

            openFile(filePath);
        })
        .catch((error) => {
            console.error("Dialog error:", error);
            handleError("Error opening file");
        });
});

ipcMain.on("file-content-updated", (_, textContent) => {
    if (!openedFilePath) {
        console.error("No file is currently opened or created. Cannot save.");
        return;
    }

    fs.writeFile(openedFilePath, textContent, (error) => {
        if (error) {
            handleError("Error saving file");
        }
    });
});