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

function updateLogoPreview() {
  const bounds = getLogoBounds(QR_RENDER_SIZE);
  logoPreview.style.setProperty("--logo-width", `${bounds.width}px`);
  logoPreview.style.setProperty("--logo-height", `${bounds.height}px`);
  logoPreview.style.setProperty("--logo-padding", `${bounds.padding}px`);
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

  const { x, y, width, height, padding } = getLogoBounds(qrSize);
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const scale = Math.min(availableWidth / logoImage.naturalWidth, availableHeight / logoImage.naturalHeight);
  const imageWidth = logoImage.naturalWidth * scale;
  const imageHeight = logoImage.naturalHeight * scale;
  context.fillStyle = "#ffffff";
  context.fillRect(x + offset, y + offset, width, height);
  context.drawImage(
    logoImage,
    x + offset + (width - imageWidth) / 2,
    y + offset + (height - imageHeight) / 2,
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
  const paths = [];

  for (let row = 0; row < model.moduleCount; row += 1) {
    for (let column = 0; column < model.moduleCount; column += 1) {
      if (model.modules[row][column]) {
        paths.push(`M${column + quietZone} ${row + quietZone}h1v1h-1z`);
      }
    }
  }

  const { x, y, width, height, padding } = getLogoBounds(model.moduleCount);
  const logo = logoDataUrl
    ? `<rect x="${x + quietZone}" y="${y + quietZone}" width="${width}" height="${height}" fill="#fff"/><image href="${logoDataUrl}" x="${x + quietZone + padding}" y="${y + quietZone + padding}" width="${width - padding * 2}" height="${height - padding * 2}" preserveAspectRatio="xMidYMid meet"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path fill="#202322" d="${paths.join("")}"/>${logo}</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const href = URL.createObjectURL(blob);
  downloadFile(href, "qr-code.svg");
  setTimeout(() => URL.revokeObjectURL(href), 0);
});
