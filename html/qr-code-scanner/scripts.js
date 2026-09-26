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
        const { t } = window.APP_I18N;
        const unknown = t('tech.unknown');

        const moduleGrid = info.moduleGrid ? t('tech.modules', { count: `${info.moduleGrid} x ${info.moduleGrid}` }) : unknown;
        addTechRow(t('tech.labels.versionGrid'), `${info.version ?? unknown} (${moduleGrid})`);
        addTechRow(t('tech.labels.ecLevel'), info.ecLevel || unknown);
        addTechRow(
            t('tech.labels.redundancy'),
            info.redundancyPercent !== null ? `${info.redundancyPercent.toFixed(1)}%` : unknown
        );
        addTechRow(t('tech.labels.dataBytes'), t('tech.bytes', { count: info.dataBytes }));
        addTechRow(
            t('tech.labels.capacity'),
            info.capacityBytes !== null ? t('tech.bytes', { count: info.capacityBytes }) : unknown
        );
        addTechRow(
            t('tech.labels.usage'),
            info.usagePercent !== null ? t('tech.percentUsed', { percent: info.usagePercent.toFixed(1) }) : unknown
        );
        const encodingLabel = t(`encoding.${info.encodingMode}`);
        addTechRow(
            t('tech.labels.encodingMode'),
            info.encodingModeEstimated ? `${encodingLabel} ${t('tech.estimated')}` : encodingLabel
        );
        addTechRow(t('tech.labels.maskPattern'), info.maskPattern !== null ? `${info.maskPattern}` : unknown);
        addTechRow(t('tech.labels.mirrored'), info.isMirrored ? t('tech.yes') : t('tech.no'));
        addTechRow(t('tech.labels.eci'), info.hasECI ? t('tech.yes') : t('tech.no'));

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
            alert(window.APP_I18N.t('scanner.cameraError'));
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
                showUploadError(window.APP_I18N.t('upload.noQr'));
            }
        } catch (err) {
            console.error('Failed to decode uploaded image', err);
            showUploadError(window.APP_I18N.t('upload.readError'));
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
            copyBtn.textContent = window.APP_I18N.t('result.copiedButton');
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });
});
