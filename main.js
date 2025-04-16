const { app, BrowserWindow, ipcMain, dialog, Notification, Menu, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const { renderAsync } = require('docx-preview');
const { Document, Packer, Paragraph, TextRun } = require("docx");
const htmlToDocx = require("html-to-docx");
const docx2html = require("docx2html");

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

function readDocx(filePath) {
    return fs.promises.readFile(filePath);
}


function saveDocx(htmlContent, filePath) {
    // Wrap the HTML in a complete document structure
    const wrappedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Document</title>
      <style>
        /* Optional: include any inline styles if needed */
        body {
          font-family: Arial, sans-serif;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
    `;
    
    return htmlToDocx(wrappedHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
    }).then(buffer => {
        console.log("DOCX conversion successful, writing file...");
        return fs.promises.writeFile(filePath, buffer);
    }).catch(error => {
        console.error("Error converting HTML to DOCX:", error);
        throw error;
    });
}


const openFile = (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    app.addRecentDocument(filePath);
    openedFilePath = filePath;

    if (ext === ".docx") {
        readDocx(filePath)
            .then(buffer => {
                mainWindow.webContents.send("document-opened", { filePath, buffer: buffer.toString("base64") });
            })
            .catch(err => {
                console.error("Error reading .docx:", err);
                handleError("Error reading .docx file");
            });
    } else {
        fs.readFile(filePath, "utf-8", (error, content) => {
            if (error) {
                console.error("Error reading file:", error);
                handleError("Error reading file");
                return;
            }
            mainWindow.webContents.send("document-opened", { filePath, content });
        });
    }
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
            filters: [{ name: "Text or Word Documents", extensions: ["docx", "txt"] }],
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
            filters: [{ name: "Text or Word Documents", extensions: ["docx", "txt"] }],
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

    const ext = path.extname(openedFilePath).toLowerCase();
    if (ext === ".docx") {
        saveDocx(textContent, openedFilePath)
          .catch(() => handleError("Error saving .docx file"));
    } else {
        fs.writeFile(openedFilePath, textContent, (error) => {
            if (error) {
                handleError("Error saving file");
            }
        });
    }
});

