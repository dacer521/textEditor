const { app, BrowserWindow, ipcMain, dialog, Notification, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

const isMac = process.platform === "darwin"; // macOS check

let mainWindow;
let openedFilePath;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        titleBarStyle: "hiddenInset",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadFile("index.html");

    const fileMenu = {
        label: "File",
        submenu: [
            {
                label: "Add New File",
                click: () => ipcMain.emit("openDocumentTriggered"),
            },
            {
                label: "Create New File",
                click: () => ipcMain.emit("create-document"),
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
            isMac ? { role: "close" } : { role: "quit" }, // Use 'close' on macOS, 'quit' otherwise
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
        ],
    };

    const menu = Menu.buildFromTemplate([fileMenu, editMenu]);
    Menu.setApplicationMenu(menu);
}
const handleError = () => {
    new Notification({
        title: "Error text",
        body: "Something went wrong",
    }).show();
};

app.whenReady().then(createWindow);

const openFile = (filePath) => {
    fs.readFile(filePath, "utf-8", (error, content) => {
        if (error) {
            console.error("Error reading file:", error);
            handleError();
            return;
        }

        app.addRecentDocument(filePath);
        openedFilePath = filePath;
        mainWindow.webContents.send("document-opened", { filePath, content });
    });
}


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
                handleError();
                return;
            }

            fs.writeFile(filePath, "", (error) => {
                if (error) {
                    handleError();
                    return;
                }
                openedFilePath = filePath;
                mainWindow.webContents.send("document-created", filePath);
            });
        })
        .catch((err) => {
            handleError();
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

            console.log("File path:", filePath);

            openFile(filePath);
        })
        .catch((error) => {
            console.error("Dialog error:", error);
        });
});

ipcMain.on("file-content-updated", (_, textAreaContent) => {
    if (!openedFilePath) {
        console.error("No file is currently opened or created. Cannot save.");
        return;
    }

    fs.writeFile(openedFilePath, textAreaContent, (error) => {
        if (error) {
            handleError();
        }
    });
});