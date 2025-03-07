window.addEventListener("DOMContentLoaded", () => {
    const createDocumentButton = document.getElementById("createDocument");
    const openDocumentButton = document.getElementById("openDocument");
    const documentName = document.getElementById("documentName");
    const fileTextArea = document.getElementById("fileTextArea");

    const handleDocumentChange = (filePath, content = "") => {
        documentName.innerText = window.path.parse(filePath).base;
        fileTextArea.removeAttribute("disabled");
        fileTextArea.value = content;
        fileTextArea.focus();
    };

    createDocumentButton.addEventListener("click", () => {
        if (window.ipcRender) {
            window.ipcRender.send("create-document");
        } else {
            console.error("window.ipcRender is undefined");
        }
    });

    openDocumentButton.addEventListener("click", () => {  // Fix: Corrected the button reference
        if (window.ipcRender) {
            window.ipcRender.send("openDocumentTriggered");
        } else {
            console.error("window.ipcRender is undefined");
        }
    });

    if (window.ipcRender) {
        window.ipcRender.receive("document-created", (filePath) => {
            if (filePath && window.path) {
                handleDocumentChange(filePath);
            } else {
                console.error("window.path is undefined or filePath is invalid.");
            }
        });

        window.ipcRender.receive("document-opened", ({ filePath, content }) => { // Fix: Corrected event structure
            handleDocumentChange(filePath, content);
        });
    }

    fileTextArea.addEventListener("input", (e) => {
        if (window.ipcRender && documentName.innerText !== "no file selected") {
            window.ipcRender.send("file-content-updated", e.target.value);
        } else {
            console.error("No file is opened. Cannot save.");
        }
    });
});