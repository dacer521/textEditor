let quill;

window.addEventListener("DOMContentLoaded", () => {
    console.log("[Renderer] DOMContentLoaded fired");

    const createDocumentButton = document.getElementById("createDocument");
    const openDocumentButton = document.getElementById("openDocument");
    const documentName = document.getElementById("documentName");

    quill = new Quill('#editor', {
        modules: {
            syntax: true,
            toolbar: '#toolbar-container'
        },
        placeholder: 'Please open or create a file to begin',
        theme: 'snow'
    });

    quill.disable();

    function handleDocumentChange(filePath, contentOrBuffer = "") {
        console.log("[Renderer] handleDocumentChange called", filePath);

        let fileName = filePath;
        if (window.path && typeof window.path.parse === "function") {
            fileName = window.path.parse(filePath).base;
        }
        documentName.innerText = fileName;
        quill.enable();
        quill.setText("");

        quill.root.innerHTML = contentOrBuffer ?? "";
        quill.focus();
    }

    createDocumentButton.addEventListener("click", () => {
        console.log("[Renderer] Create Document button clicked");
        if (window.ipcRender && typeof window.ipcRender.send === "function") {
            window.ipcRender.send("create-document");
        }
    });

    openDocumentButton.addEventListener("click", () => {
        console.log("[Renderer] Open Document button clicked");
        if (window.ipcRender && typeof window.ipcRender.send === "function") {
            window.ipcRender.send("openDocumentTriggered");
        }
    });

    if (window.ipcRender && typeof window.ipcRender.receive === "function") {
        window.ipcRender.receive("document-created", (filePath) => {
            console.log("[Renderer] Received document-created:", filePath);
            if (filePath) {
                handleDocumentChange(filePath);
            }
        });

        window.ipcRender.receive("document-opened", ({ filePath, content }) => {
            console.log("[Renderer] Received document-opened:", filePath);
            handleDocumentChange(filePath, content ?? "");
        });
    }

    quill.on('text-change', () => {
        if (window.ipcRender && typeof window.ipcRender.send === "function" && documentName.innerText !== "no file selected") {
            const html = quill.root.innerHTML;
            console.log("[Renderer] Sending file-content-updated");
            window.ipcRender.send("file-content-updated", html);
        }
    });

    console.log("[Renderer] Renderer setup complete");
});