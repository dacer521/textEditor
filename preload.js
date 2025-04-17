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
  renderAsync: async (arrayBuffer) => {
    return renderAsync(arrayBuffer, undefined, {
      inWrapper: false,
      ignoreWidth: true,
      ignoreHeight: true,
      ignoreFonts: false,
      useBase64URL: false,
      breakPages: false,
      experimental: false,
      trimXmlDeclaration: true,
    });
  }
});