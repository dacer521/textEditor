const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");

contextBridge.exposeInMainWorld("ipcRender", {
    send: (channel, data) => {
        let validChannels = ["create-document", "openDocumentTriggered", "file-content-updated"]; // Add file-content-updated
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        let validChannels = ["document-created", "document-opened"];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (_, data) => func(data));
        }
    }
});

contextBridge.exposeInMainWorld("path", {
    parse: (filePath) => path.parse(filePath),
});