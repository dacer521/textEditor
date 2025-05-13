const { app, BrowserWindow, ipcMain, dialog, Notification, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const sanitizeHtml = require("sanitize-html");
const htmlToDocx = require("html-to-docx");
const mammoth = require("mammoth");

const isMac = process.platform === "darwin";

let mainWindow;
let openedFilePath;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    mainWindow.loadFile("index.html");

    const menu = Menu.buildFromTemplate([
        {
            label: "File",
            submenu: [
                {
                    label: "New File",
                    accelerator: "CmdOrCtrl+N",
                    click: () => mainWindow?.webContents.send("create-document"),
                },
                {
                    label: "Open File",
                    accelerator: "CmdOrCtrl+O",
                    click: () => mainWindow?.webContents.send("openDocumentTriggered"),
                },
                { type: "separator" },
                isMac ? { role: "close" } : { role: "quit" },
            ],
        },
        {
            label: "Edit",
            submenu: [
                { role: "undo" }, { role: "redo" },
                { type: "separator" },
                { role: "cut" }, { role: "copy" }, { role: "paste" },
                { role: "selectAll" },
            ],
        },
    ]);

    Menu.setApplicationMenu(menu);

    mainWindow.on("closed", () => {
        mainWindow = null;
        openedFilePath = null;
    });
}

app.whenReady().then(createWindow);

app.on("before-quit", () => {
    if (process.platform === "win32") app.exit(0);
});

const handleError = (message) => {
    new Notification({ title: "Error", body: message }).show();
};

function readDocx(filePath) {
    return mammoth.convertToHtml({ path: filePath })
        .then(result => result.value)
        .catch(error => { throw error; });
}

function saveDocx(htmlContent, filePath) {
    const cleanHtml = sanitizeHtml(htmlContent, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "u", "span"]),
        allowedAttributes: { '*': ['style', 'class'], 'img': ['src', 'width', 'height'] },
        allowedStyles: { '*': { color: [/^.*$/i], 'background-color': [/^.*$/i] } }
    });

    const wrappedHtml = `<html><body>${cleanHtml}</body></html>`;

    return htmlToDocx(wrappedHtml).then(buffer => {
        return fs.promises.writeFile(filePath, buffer);
    });
}

function openFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    app.addRecentDocument(filePath);

    if (ext === ".docx") {
        readDocx(filePath)
            .then(htmlContent => {
                mainWindow.webContents.send("document-opened", { filePath, content: htmlContent });
            })
            .catch(() => handleError("Error reading .docx file"));
    } else {
        fs.readFile(filePath, "utf-8", (error, content) => {
            if (error) return handleError("Error reading file");
            mainWindow.webContents.send("document-opened", { filePath, content });
        });
    }
}

app.on("open-file", (_, filePath) => openFile(filePath));

app.on("window-all-closed", () => {
    if (!isMac) app.quit();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on("create-document", () => {
    dialog.showSaveDialog(mainWindow, {
        filters: [{ name: "Text or Word Documents", extensions: ["docx", "txt"] }],
    }).then(({ filePath }) => {
        if (!filePath) return;
        fs.writeFile(filePath, "", (error) => {
            if (error) return handleError("Error creating file");
            openedFilePath = filePath;
            mainWindow.webContents.send("document-created", filePath);
        });
    });
});

ipcMain.on("openDocumentTriggered", () => {
    dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Text or Word Documents", extensions: ["docx", "txt"] }],
    }).then(({ filePaths }) => {
        if (!filePaths?.length) return;
        openedFilePath = filePaths[0];
        openFile(openedFilePath);
    });
});

ipcMain.on("file-content-updated", (_, textContent) => {
    if (!openedFilePath) return;
    const ext = path.extname(openedFilePath).toLowerCase();
    if (ext === ".docx") {
        saveDocx(textContent, openedFilePath).catch(() => handleError("Error saving .docx file"));
    } else {
        fs.writeFile(openedFilePath, textContent, (error) => {
            if (error) handleError("Error saving file");
        });
    }
});
