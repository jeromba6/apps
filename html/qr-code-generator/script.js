const form = document.querySelector("#qr-form");
const input = document.querySelector("#url-input");
const correctionLevel = document.querySelector("#correction-level");
const logoInput = document.querySelector("#logo-input");
const logoPreview = document.querySelector("#logo-preview");
const logoImage = document.querySelector("#logo-image");
const removeLogoButton = document.querySelector("#remove-logo-button");
const logoMargin = document.querySelector("#logo-margin");
const logoMarginValue = document.querySelector("#logo-margin-value");
const logoSize = document.querySelector("#logo-size");
const logoSizeValue = document.querySelector("#logo-size-value");
const error = document.querySelector("#url-error");
const result = document.querySelector("#result");
const resultUrl = document.querySelector("#result-url");
const qrContainer = document.querySelector("#qr-code");
const qrPanel = document.querySelector("#qr-panel");
const downloadButton = document.querySelector("#download-button");
const downloadSvgButton = document.querySelector("#download-svg-button");
const pngResolution = document.querySelector("#png-resolution");

let currentUrl = "";
let qrCode;
let moduleCount = 0;
let logoDataUrl = "";
let logoAspectRatio = 1;

const QR_RENDER_SIZE = 158;
const QR_DARK_COLOR = "#202322";
const QR_LIGHT_COLOR = "#ffffff";

function parseUrl(value) {
  const withProtocol = /^(https?:)?\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) {
    throw new Error("invalid URL");
  }

  return url.href;
}

function showQr(url, level) {
  qrContainer.replaceChildren();
  qrCode = new QRCode(qrContainer, {
    text: url,
    width: QR_RENDER_SIZE,
    height: QR_RENDER_SIZE,
    colorDark: QR_DARK_COLOR,
    colorLight: QR_LIGHT_COLOR,
    correctLevel: QRCode.CorrectLevel[level],
  });

  moduleCount = qrCode._oQRCode?.moduleCount || 0;
  qrPanel.style.setProperty("--qr-quiet", `${moduleCount ? QR_RENDER_SIZE / moduleCount : 0}px`);

  currentUrl = url;
  resultUrl.textContent = url;
  result.hidden = false;
  updateLogoPreview();
}

function clearLogo() {
  logoDataUrl = "";
  logoAspectRatio = 1;
  logoInput.value = "";
  logoImage.removeAttribute("src");
  logoPreview.hidden = true;
  removeLogoButton.hidden = true;
  logoMargin.disabled = true;
  logoSize.disabled = true;
  correctionLevel.disabled = false;
}

function getLogoBounds(size) {
  const longestSide = size * (Number(logoSize.value) / 100);
  const width = logoAspectRatio >= 1 ? longestSide : longestSide * logoAspectRatio;
  const height = logoAspectRatio >= 1 ? longestSide / logoAspectRatio : longestSide;
  const padding = Math.min(width, height) * (Number(logoMargin.value) / 100);

  return {
    width,
    height,
    padding,
    x: (size - width) / 2,
    y: (size - height) / 2,
  };
}

// Breidt de logo-uitsparing uit tot de volledige modules die de logo-afbeelding
// (deels) overlappen, zodat er nooit een module half zichtbaar/half wit blijft.
function getSnappedLogoBounds(size) {
  const raw = getLogoBounds(size);

  if (!moduleCount) {
    return { ...raw, snappedX: raw.x, snappedY: raw.y, snappedWidth: raw.width, snappedHeight: raw.height };
  }

  const tile = size / moduleCount;
  const colStart = Math.max(0, Math.floor(raw.x / tile));
  const colEnd = Math.min(moduleCount, Math.ceil((raw.x + raw.width) / tile));
  const rowStart = Math.max(0, Math.floor(raw.y / tile));
  const rowEnd = Math.min(moduleCount, Math.ceil((raw.y + raw.height) / tile));

  return {
    ...raw,
    colStart,
    colEnd,
    rowStart,
    rowEnd,
    snappedX: colStart * tile,
    snappedY: rowStart * tile,
    snappedWidth: (colEnd - colStart) * tile,
    snappedHeight: (rowEnd - rowStart) * tile,
  };
}

function updateLogoPreview() {
  const bounds = getSnappedLogoBounds(QR_RENDER_SIZE);
  const imageWidth = bounds.width - bounds.padding * 2;
  const imageHeight = bounds.height - bounds.padding * 2;

  logoPreview.style.setProperty("--logo-width", `${bounds.snappedWidth}px`);
  logoPreview.style.setProperty("--logo-height", `${bounds.snappedHeight}px`);
  logoPreview.style.setProperty("--logo-padding-x", `${(bounds.snappedWidth - imageWidth) / 2}px`);
  logoPreview.style.setProperty("--logo-padding-y", `${(bounds.snappedHeight - imageHeight) / 2}px`);
}


logoMargin.addEventListener("input", () => {
  logoMarginValue.value = `${logoMargin.value}%`;
  updateLogoPreview();
});

logoSize.addEventListener("input", () => {
  logoSizeValue.value = `${logoSize.value}%`;
  updateLogoPreview();
});

logoImage.addEventListener("load", () => {
  logoAspectRatio = logoImage.naturalWidth / logoImage.naturalHeight;
  updateLogoPreview();
  logoPreview.hidden = false;
  removeLogoButton.hidden = false;
  logoMargin.disabled = false;
  logoSize.disabled = false;
  correctionLevel.value = "H";
  correctionLevel.disabled = true;
  if (currentUrl) showQr(currentUrl, "H");
  error.textContent = "";
});

logoInput.addEventListener("change", () => {
  const [file] = logoInput.files;
  if (!file) return;

  if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
    clearLogo();
    error.textContent = "Kies een PNG-, JPG-, WebP- of SVG-logo.";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    clearLogo();
    error.textContent = "Kies een logo van maximaal 2 MB.";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    logoDataUrl = reader.result;
    logoImage.src = logoDataUrl;
  });
  reader.readAsDataURL(file);
});

removeLogoButton.addEventListener("click", clearLogo);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  error.textContent = "";

  try {
    showQr(parseUrl(input.value.trim()), logoDataUrl ? "H" : correctionLevel.value);
  } catch {
    result.hidden = true;
    error.textContent = "Vul een geldige URL in, bijvoorbeeld https://jouwwebsite.nl.";
    input.focus();
  }
});

function downloadFile(href, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = href;
  link.click();
}

function drawLogo(context, qrSize, offset) {
  if (!logoDataUrl) return;

  const bounds = getSnappedLogoBounds(qrSize);
  const availableWidth = bounds.width - bounds.padding * 2;
  const availableHeight = bounds.height - bounds.padding * 2;
  const scale = Math.min(availableWidth / logoImage.naturalWidth, availableHeight / logoImage.naturalHeight);
  const imageWidth = logoImage.naturalWidth * scale;
  const imageHeight = logoImage.naturalHeight * scale;
  context.fillStyle = QR_LIGHT_COLOR;
  context.fillRect(bounds.snappedX + offset, bounds.snappedY + offset, bounds.snappedWidth, bounds.snappedHeight);
  context.drawImage(
    logoImage,
    bounds.x + offset + (bounds.width - imageWidth) / 2,
    bounds.y + offset + (bounds.height - imageHeight) / 2,
    imageWidth,
    imageHeight,
  );
}

downloadButton.addEventListener("click", () => {
  const model = qrCode?._oQRCode;
  if (!model?.modules || !moduleCount) return;

  // Render rechtstreeks vanuit de module-data op de gekozen resolutie, zodat
  // het resultaat altijd scherp is (geen opschaal-vervaging van de kleine
  // preview-canvas).
  const targetSize = Math.round(Number(pngResolution.value)) || 1024;
  const quietZoneModules = 1;
  const totalModules = moduleCount + quietZoneModules * 2;
  const tile = targetSize / totalModules;

  const image = document.createElement("canvas");
  image.width = Math.round(totalModules * tile);
  image.height = image.width;

  const context = image.getContext("2d");
  context.fillStyle = QR_LIGHT_COLOR;
  context.fillRect(0, 0, image.width, image.height);
  context.fillStyle = QR_DARK_COLOR;

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (!model.modules[row][column]) continue;
      const x0 = Math.round((column + quietZoneModules) * tile);
      const x1 = Math.round((column + quietZoneModules + 1) * tile);
      const y0 = Math.round((row + quietZoneModules) * tile);
      const y1 = Math.round((row + quietZoneModules + 1) * tile);
      context.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }

  drawLogo(context, moduleCount * tile, quietZoneModules * tile);

  downloadFile(image.toDataURL("image/png"), `qr-code-${image.width}x${image.height}.png`);
});

downloadSvgButton.addEventListener("click", () => {
  const model = qrCode?._oQRCode;
  if (!model?.modules || !model.moduleCount) return;

  const quietZone = 1;
  const size = model.moduleCount + quietZone * 2;
  const bounds = getSnappedLogoBounds(model.moduleCount);
  const paths = [];

  for (let row = 0; row < model.moduleCount; row += 1) {
    for (let column = 0; column < model.moduleCount; column += 1) {
      const underLogo =
        logoDataUrl &&
        column >= bounds.colStart &&
        column < bounds.colEnd &&
        row >= bounds.rowStart &&
        row < bounds.rowEnd;
      if (model.modules[row][column] && !underLogo) {
        paths.push(`M${column + quietZone} ${row + quietZone}h1v1h-1z`);
      }
    }
  }

  const logo = logoDataUrl
    ? `<rect x="${bounds.snappedX + quietZone}" y="${bounds.snappedY + quietZone}" width="${bounds.snappedWidth}" height="${bounds.snappedHeight}" fill="#fff"/><image href="${logoDataUrl}" x="${bounds.x + quietZone + bounds.padding}" y="${bounds.y + quietZone + bounds.padding}" width="${bounds.width - bounds.padding * 2}" height="${bounds.height - bounds.padding * 2}" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path fill="#202322" d="${paths.join("")}"/>${logo}</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const href = URL.createObjectURL(blob);
  downloadFile(href, "qr-code.svg");
  setTimeout(() => URL.revokeObjectURL(href), 0);
});
