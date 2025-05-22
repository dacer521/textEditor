const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ipcRender", {
  send: (channel, data) => {
    const validChannels = ["create-document", "openDocumentTriggered", "file-content-updated"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ["document-created", "document-opened"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => func(data));
    }
  },
});

// manually mock minimal path.parse
contextBridge.exposeInMainWorld("path", {
  parse: (filePath) => {
    const parts = filePath.split(/[\/\\]/);
    const base = parts[parts.length - 1];
    return { base };
  },
  normalize: (filePath) => filePath.replace(/\\/g, "/")
});

// this is safe
contextBridge.exposeInMainWorld("Buffer", require("buffer").Buffer);