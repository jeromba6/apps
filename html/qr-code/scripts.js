document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-btn');
    const stopBtn = document.getElementById('stop-btn');
    const resultContainer = document.getElementById('result-container');
    const resultContent = document.getElementById('result-content');
    const copyBtn = document.getElementById('copy-btn');
    const scanAnimation = document.querySelector('.scan-animation');
    const placeholderIcon = document.querySelector('.placeholder-icon');

    // Initialize Html5Qrcode
    const html5QrCode = new Html5Qrcode("reader");

    const visitBtn = document.getElementById('visit-btn');

    const isValidUrl = (string) => {
        try {
            const url = new URL(string);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            return false;
        }
    };

    const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        console.log(`Code matched = ${decodedText}`, decodedResult);
        
        // Update UI
        resultContent.textContent = decodedText;
        resultContainer.classList.remove('hidden');

        // URL detection
        if (isValidUrl(decodedText)) {
            visitBtn.href = decodedText;
            visitBtn.classList.remove('hidden');
        } else {
            visitBtn.classList.add('hidden');
        }
        
        // Optional: Vibrate on success (mobile)
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }

        // Optional: Stop scanning after a successful scan
        stopScanning();
    };

    const config = { 
        fps: 15, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    const startScanning = () => {
        placeholderIcon.classList.add('hidden');
        scanAnimation.style.display = 'block';
        
        html5QrCode.start(
            { facingMode: "environment" }, // Use back camera
            config,
            qrCodeSuccessCallback
        ).then(() => {
            scanBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
        }).catch((err) => {
            console.error("Failed to start scanning", err);
            placeholderIcon.classList.remove('hidden');
            scanAnimation.style.display = 'none';
            alert("Could not access camera. Please ensure you've granted permissions.");
        });
    };

    const stopScanning = () => {
        html5QrCode.stop().then(() => {
            scanBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
            scanAnimation.style.display = 'none';
            placeholderIcon.classList.remove('hidden');
            console.log("Scanner stopped.");
        }).catch((err) => {
            console.error("Failed to stop scanning", err);
        });
    };

    // Event Listeners
    scanBtn.addEventListener('click', startScanning);
    stopBtn.addEventListener('click', stopScanning);

    copyBtn.addEventListener('click', () => {
        const text = resultContent.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('btn-primary');
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('btn-primary');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });
});
