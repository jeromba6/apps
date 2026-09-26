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

let currentUrl = "";
let qrCode;
let moduleCount = 0;
let logoDataUrl = "";
let logoAspectRatio = 1;

const QR_RENDER_SIZE = 158;

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
    colorDark: "#202322",
    colorLight: "#ffffff",
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
  context.fillStyle = "#ffffff";
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
  const canvas = qrContainer.querySelector("canvas");
  if (!canvas || !moduleCount) return;

  const quietZone = Math.ceil(canvas.width / moduleCount);
  const image = document.createElement("canvas");
  image.width = canvas.width + quietZone * 2;
  image.height = canvas.height + quietZone * 2;

  const context = image.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, image.width, image.height);
  context.drawImage(canvas, quietZone, quietZone);
  drawLogo(context, canvas.width, quietZone);

  downloadFile(image.toDataURL("image/png"), "qr-code.png");
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
