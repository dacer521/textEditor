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
            const arrayBuffer = Uint8Array.from(atob(contentOrBuffer), c => c.charCodeAt(0)).buffer;
        
            const container = document.createElement("div");
            container.style.display = "none";
            document.body.appendChild(container);
        
            window.docxPreview.renderAsync(arrayBuffer, container).then(() => {
                const html = container.innerHTML;
                container.remove();
        
                quill.setContents([]);
                quill.clipboard.dangerouslyPasteHTML(html);
                quill.enable();
                quill.focus();
            }).catch(err => console.error("DOCX render error:", err));
        
            return;
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