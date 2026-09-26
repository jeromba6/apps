import { readBarcodes } from 'https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.4/dist/es/reader/index.js';
import { getQrTechnicalInfo } from './qr-technical.js';

document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resultContainer = document.getElementById('result-container');
    const resultContent = document.getElementById('result-content');
    const copyBtn = document.getElementById('copy-btn');
    const scanAnimation = document.querySelector('.scan-animation');
    const placeholderIcon = document.querySelector('.placeholder-icon');
    const readerEl = document.getElementById('reader');
    const visitBtn = document.getElementById('visit-btn');
    const techInfo = document.getElementById('tech-info');
    const techInfoGrid = document.getElementById('tech-info-grid');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadInput = document.getElementById('upload-input');
    const uploadError = document.getElementById('upload-error');

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.muted = true;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let mediaStream = null;
    let scanTimer = null;
    let scanning = false;

    const isValidUrl = (string) => {
        try {
            const url = new URL(string);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            return false;
        }
    };

    const addTechRow = (label, value) => {
        const item = document.createElement('div');
        item.className = 'tech-info-item';
        const labelEl = document.createElement('span');
        labelEl.className = 'label';
        labelEl.textContent = label;
        const valueEl = document.createElement('span');
        valueEl.className = 'value';
        valueEl.textContent = value;
        item.appendChild(labelEl);
        item.appendChild(valueEl);
        techInfoGrid.appendChild(item);
    };

    const renderTechnicalInfo = (readResult) => {
        techInfoGrid.innerHTML = '';
        const info = getQrTechnicalInfo(readResult);

        addTechRow('Versie / grid', `${info.version} (${info.moduleGrid} modules)`);
        addTechRow('Foutcorrectieniveau', info.ecLevel);
        addTechRow(
            'Redundantie',
            info.redundancyPercent !== null ? `${info.redundancyPercent.toFixed(1)}%` : 'onbekend'
        );
        addTechRow('Databytes gebruikt', `${info.dataBytes} bytes`);
        addTechRow(
            'Codewoord-capaciteit',
            info.capacityBytes !== null ? `${info.capacityBytes} bytes` : 'onbekend'
        );
        addTechRow(
            'Bezetting',
            info.usagePercent !== null ? `${info.usagePercent.toFixed(1)}% gebruikt` : 'onbekend'
        );
        addTechRow(
            'Encoderingsmodus',
            info.encodingModeEstimated ? `${info.encodingMode} (geschat)` : info.encodingMode
        );
        addTechRow('Maskerpatroon', info.maskPattern !== null ? `${info.maskPattern}` : 'onbekend');
        addTechRow('Gespiegeld', info.isMirrored ? 'ja' : 'nee');
        addTechRow('ECI aanwezig', info.hasECI ? 'ja' : 'nee');

        techInfo.hidden = false;
    };

    const handleDecodedResult = (readResult) => {
        const decodedText = readResult.text;
        console.log(`Code matched = ${decodedText}`, readResult);

        uploadError.hidden = true;
        resultContent.textContent = decodedText;
        resultContainer.hidden = false;

        if (isValidUrl(decodedText)) {
            visitBtn.href = decodedText;
            visitBtn.hidden = false;
        } else {
            visitBtn.hidden = true;
        }

        renderTechnicalInfo(readResult);

        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        stopScanning();
    };

    const scanFrame = async () => {
        if (!scanning || video.readyState < video.HAVE_ENOUGH_DATA) {
            return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
            const results = await readBarcodes(imageData, {
                formats: ['QRCode'],
                maxNumberOfSymbols: 1,
                tryHarder: true,
            });
            if (scanning && results.length > 0 && results[0].isValid) {
                handleDecodedResult(results[0]);
                return;
            }
        } catch (err) {
            console.error('Decode error', err);
        }

        if (scanning) {
            scanTimer = setTimeout(scanFrame, 200);
        }
    };

    const startScanning = async () => {
        placeholderIcon.hidden = true;
        scanAnimation.style.display = 'block';

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            video.srcObject = mediaStream;
            readerEl.appendChild(video);
            await video.play();

            scanning = true;
            scanBtn.hidden = true;
            stopBtn.hidden = false;
            scanFrame();
        } catch (err) {
            console.error('Failed to start scanning', err);
            placeholderIcon.hidden = false;
            scanAnimation.style.display = 'none';
            alert("Could not access camera. Please ensure you've granted permissions.");
        }
    };

    const stopScanning = () => {
        scanning = false;
        if (scanTimer) {
            clearTimeout(scanTimer);
            scanTimer = null;
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            mediaStream = null;
        }
        if (video.parentNode) {
            video.parentNode.removeChild(video);
        }
        scanBtn.hidden = false;
        stopBtn.hidden = true;
        scanAnimation.style.display = 'none';
        placeholderIcon.hidden = false;
        console.log('Scanner stopped.');
    };

    const showUploadError = (message) => {
        resultContainer.hidden = true;
        techInfo.hidden = true;
        uploadError.textContent = message;
        uploadError.hidden = false;
    };

    const decodeUploadedFile = async (file) => {
        if (!file) return;
        if (scanning) {
            stopScanning();
        }
        uploadError.hidden = true;

        try {
            const results = await readBarcodes(file, {
                formats: ['QRCode'],
                maxNumberOfSymbols: 1,
                tryHarder: true,
            });
            if (results.length > 0 && results[0].isValid) {
                handleDecodedResult(results[0]);
            } else {
                showUploadError('Geen geldige QR-code gevonden in deze afbeelding.');
            }
        } catch (err) {
            console.error('Failed to decode uploaded image', err);
            showUploadError('Kon deze afbeelding niet lezen. Probeer een andere QR-afbeelding.');
        }
    };

    scanBtn.addEventListener('click', startScanning);
    stopBtn.addEventListener('click', stopScanning);

    uploadBtn.addEventListener('click', () => uploadInput.click());

    uploadInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        decodeUploadedFile(file);
        // Reset zodat dezelfde afbeelding opnieuw geselecteerd kan worden.
        uploadInput.value = '';
    });

    copyBtn.addEventListener('click', () => {
        const text = resultContent.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });
});
