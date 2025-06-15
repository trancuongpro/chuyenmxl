// --- Lấy các phần tử từ DOM ---
const fileInput = document.getElementById('fileInput');
const sheetContainer = document.getElementById('sheetMusicContainer');
const downloadContainer = document.getElementById('downloadContainer');
const downloadBtn = document.getElementById('downloadBtn');
const errorDisplay = document.getElementById('errorDisplay');
const outputTextarea = document.getElementById('output'); // Vẫn giữ để lưu trữ mã

// --- Khởi tạo đối tượng OpenSheetMusicDisplay (OSMD) ---
const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(sheetContainer, {
    backend: "svg",
    drawFromMeasureNumber: 1,
    drawUpToMeasureNumber: Number.MAX_SAFE_INTEGER,
    autoResize: true // Tự động thay đổi kích thước khi cửa sổ thay đổi
});

let musicXmlContent = '';
let originalFileName = '';

// --- Hàm xử lý chính khi người dùng chọn file ---
fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) { return; }

    resetUI(); // Xóa bản nhạc cũ và thông báo lỗi

    originalFileName = file.name.replace(/\.(mxl|musicxml|xml)$/i, '');
    
    // Nếu là file MXL (file nén), giải nén nó trước
    if (file.name.toLowerCase().endsWith('.mxl')) {
        handleMxlFile(file);
    } 
    // Nếu là file MusicXML hoặc XML, đọc trực tiếp
    else {
        handleXmlFile(file);
    }
});

// --- Hàm reset giao diện ---
function resetUI() {
    errorDisplay.style.display = 'none';
    errorDisplay.textContent = '';
    sheetContainer.innerHTML = '';
    downloadContainer.style.display = 'none';
    musicXmlContent = '';
}

// --- Hàm xử lý file XML/MusicXML ---
function handleXmlFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        musicXmlContent = e.target.result;
        renderSheetMusic(musicXmlContent);
    };
    reader.readAsText(file);
}

// --- Hàm xử lý file MXL ---
function handleMxlFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        JSZip.loadAsync(e.target.result)
            .then(function(zip) {
                let musicXmlFile = null;
                zip.forEach((relativePath, zipEntry) => {
                    const entryName = zipEntry.name.toLowerCase();
                    if (!zipEntry.dir && (entryName.endsWith('.musicxml') || entryName.endsWith('.xml'))) {
                       musicXmlFile = zipEntry;
                    }
                });
                if (musicXmlFile) {
                    return musicXmlFile.async('string');
                } else {
                    throw new Error('Không tìm thấy file .musicxml hoặc .xml bên trong file .mxl này.');
                }
            })
            .then(function(content) {
                musicXmlContent = content;
                renderSheetMusic(content);
            })
            .catch(function(err) {
                displayError(err.message);
            });
    };
    reader.readAsArrayBuffer(file);
}

// --- Hàm hiển thị bản nhạc bằng OSMD ---
function renderSheetMusic(xmlString) {
    osmd.load(xmlString)
        .then(() => {
            osmd.render(); // Vẽ bản nhạc
            outputTextarea.value = xmlString; // Lưu mã vào textarea ẩn
            downloadContainer.style.display = 'block'; // Hiển thị nút tải về
        })
        .catch((err) => {
            displayError("Lỗi khi hiển thị bản nhạc. File có thể không phải là MusicXML hợp lệ.");
            console.error(err);
        });
}

// --- Hàm hiển thị lỗi ---
function displayError(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
    sheetContainer.innerHTML = ''; // Dọn dẹp vùng hiển thị nhạc
}

// --- Xử lý sự kiện click nút Download (giữ nguyên) ---
downloadBtn.addEventListener('click', function() {
    if (!musicXmlContent) return;

    const selectedExtension = document.querySelector('input[name="extension"]:checked').value;
    const blob = new Blob([musicXmlContent], { type: 'application/vnd.recordare.musicxml+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${originalFileName}${selectedExtension}`; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});