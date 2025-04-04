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
    
    const handleDocumentChange = (filePath, content = "") => {
        documentName.innerText = window.path.parse(filePath).base;
        
        // Enable editor and set content
        quill.enable();
        quill.setText(""); // Clear any existing content
        
        // Set content as text (for plain text files)
        if (content) {
            quill.setText(content);
        }
        
        // Focus the editor
        quill.focus();
    };

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

        window.ipcRender.receive("document-opened", ({ filePath, content }) => {
            handleDocumentChange(filePath, content);
        });
    }

    // Monitor text changes and save content
    quill.on('text-change', () => {
        if (window.ipcRender && documentName.innerText !== "no file selected") {
            // Get plain text content from Quill
            const content = quill.getText();
            window.ipcRender.send("file-content-updated", content);
        } else {
            console.error("No file is opened. Cannot save.");
        }
    });
});