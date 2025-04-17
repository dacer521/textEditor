// preload.js
const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");
const { renderAsync } = require("docx-preview");


// Expose only the necessary APIs
contextBridge.exposeInMainWorld("ipcRender", {
  send: (channel, data) => {
    let validChannels = ["create-document", "openDocumentTriggered", "file-content-updated"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ["document-created", "document-opened"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => func(data));
    }
  },
});

contextBridge.exposeInMainWorld("path", {
  parse: (filePath) => path.parse(filePath),
  normalize: (filePath) => path.normalize(filePath),
});
contextBridge.exposeInMainWorld("docxPreview", {
  renderAsync: (arrayBuffer, container) => {
    return renderAsync(arrayBuffer, container);
  }
});