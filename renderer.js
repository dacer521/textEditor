let quill;

window.addEventListener("DOMContentLoaded", () => {
    const createDocumentButton = document.getElementById("createDocument");
    const openDocumentButton = document.getElementById("openDocument");
    const documentName = document.getElementById("documentName");
    
    // Initialize Quill
    quill = new Quill('#editor', {
        modules: {
            syntax: true,
            toolbar: '#toolbar-container'
        },
        placeholder: 'Please open or create a file to begin',
        theme: 'snow'
    });
    
    // Disable editor initially
    quill.disable();
    
    function handleDocumentChange(filePath, contentOrBuffer = "") {
        documentName.innerText = window.path.parse(filePath).base;
        quill.enable();
        quill.setText(""); // Clear old content
    
        const ext = window.path.parse(filePath).ext.toLowerCase();
    
        if (ext === ".docx") {
            const binaryString = atob(contentOrBuffer);
            const length = binaryString.length;
            const byteArray = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                byteArray[i] = binaryString.charCodeAt(i);
            }
            const arrayBuffer = byteArray.buffer;
        
            // Render with docx-preview
            const container = quill.root;
            container.innerHTML = ""; // Clear previous content
        
            window.docxPreview.renderAsync(arrayBuffer, container).then(() => {
                quill.enable();
            }).catch((err) => {
                console.error("docx-preview error:", err);
            });
        } else {
            quill.root.innerHTML = contentOrBuffer;
            quill.focus();
        }
    }
    
    // Make sure the rest of your event listeners remain the same:
    createDocumentButton.addEventListener("click", () => {
        if (window.ipcRender) {
            window.ipcRender.send("create-document");
        } else {
            console.error("window.ipcRender is undefined");
        }
    });

    openDocumentButton.addEventListener("click", () => {
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

        window.ipcRender.receive("document-opened", ({ filePath, content, buffer }) => {
            handleDocumentChange(filePath, content || buffer);
        });
    }

    // Monitor text changes and save content
    quill.on('text-change', () => {
        if (window.ipcRender && documentName.innerText !== "no file selected") {
            const html = quill.root.innerHTML;
            console.log("Saving HTML content:", html);
            window.ipcRender.send("file-content-updated", html);    
        } else {
            console.error("No file is opened. Cannot save.");
        }
    });
    
});