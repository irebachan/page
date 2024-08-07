async function generateGrid() {
    const fileInput = document.getElementById('fileInput');
    const bindingSelect = document.getElementById('bindingSelect');
    const canvas = document.getElementById('pdfCanvas');
    const resultImage = document.getElementById('resultImage');
    const binding = bindingSelect.value;

    if (fileInput.files.length === 0) {
        alert("PDFファイルを選択してください。");
        return;
    }

    const file = fileInput.files[0];
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    const pageCount = pdf.numPages;
    const rows = 4;
    const cols = 4;

    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;

    canvas.width = cols * pageWidth;
    canvas.height = rows * pageHeight;
    const context = canvas.getContext('2d');
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const pagePositions = [];
    if (binding === "right") {
        for (let row = 0; row < rows; row++) {
            for (let col = cols - 1; col >= 0; col--) {
                pagePositions.push({ col, row });
            }
        }
    } else {
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                pagePositions.push({ col, row });
            }
        }
    }

    for (let i = 0; i < Math.min(pageCount, rows * cols); i++) {
        const page = await pdf.getPage(i + 1);
        const viewport = page.getViewport({ scale: 1 });
        const { col, row } = pagePositions[i];

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
            transform: [1, 0, 0, 1, col * pageWidth, row * pageHeight]  // Translate each page to its position
        };

        await page.render(renderContext).promise;
    }

    resultImage.src = canvas.toDataURL();
    canvas.style.display = "none";
    resultImage.style.display = "block";
}
