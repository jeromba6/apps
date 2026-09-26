/**
 * qr-technical.js
 *
 * Berekent technische/laag-niveau eigenschappen van een gescande QR-code
 * (versie, foutcorrectie/redundantie, databytes, capaciteit, maskerpatroon, ...)
 *
 * De ruwe data (Reed-Solomon blokgrootten per versie/foutcorrectieniveau) komt
 * uit de officiële ISO/IEC 18004 QR-codespecificatie. Deze tabel wordt door
 * vrijwel elke QR-encoder/decoder gebruikt (o.a. het MIT-gelicenseerde
 * kazuhikoarase/qrcode-generator project) en bevat puur numerieke,
 * niet-auteursrechtelijk beschermde specificatiegegevens.
 *
 * Elke rij = 1 QR-versie (1 t/m 40). Elke rij bevat 4 sub-arrays voor de
 * foutcorrectieniveaus L, M, Q, H (in die volgorde). Elk sub-array bestaat uit
 * groepjes van 3 getallen: [aantalBlokken, totaalCodewoordsPerBlok, dataCodewoordsPerBlok],
 * eventueel gevolgd door een tweede groepje van 3 als een versie/niveau twee
 * blokgroottes gebruikt.
 */
const RS_BLOCK_TABLE = [[[1,26,19],[1,26,16],[1,26,13],[1,26,9]],[[1,44,34],[1,44,28],[1,44,22],[1,44,16]],[[1,70,55],[1,70,44],[2,35,17],[2,35,13]],[[1,100,80],[2,50,32],[2,50,24],[4,25,9]],[[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12]],[[2,86,68],[4,43,27],[4,43,19],[4,43,15]],[[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14]],[[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15]],[[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13]],[[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16]],[[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13]],[[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15]],[[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12]],[[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13]],[[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13]],[[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16]],[[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15]],[[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15]],[[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14]],[[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16]],[[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17]],[[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13]],[[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16]],[[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17]],[[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16]],[[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17]],[[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16]],[[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16]],[[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16]],[[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16]],[[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16]],[[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16]],[[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16]],[[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17]],[[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16]],[[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16]],[[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16]],[[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16]],[[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16]],[[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]]];

const EC_LEVEL_INDEX = { L: 0, M: 1, Q: 2, H: 3 };

// QR alfanumerieke tekenset zoals gedefinieerd in ISO/IEC 18004.
const ALPHANUMERIC_CHARS = /^[0-9A-Z $%*+\-./:]*$/;
const NUMERIC_CHARS = /^[0-9]*$/;

/**
 * Somt de totaal- en datacodewoorden op voor een gegeven QR-versie (1-40) en
 * foutcorrectieniveau (L/M/Q/H).
 */
function getBlockTotals(version, ecLevel) {
    const idx = EC_LEVEL_INDEX[ecLevel];
    if (idx === undefined) return null;
    const row = RS_BLOCK_TABLE[version - 1];
    if (!row) return null;
    const groups = row[idx];

    let totalCodewords = 0;
    let dataCodewords = 0;
    for (let i = 0; i < groups.length; i += 3) {
        const count = groups[i];
        const total = groups[i + 1];
        const data = groups[i + 2];
        totalCodewords += count * total;
        dataCodewords += count * data;
    }
    return { totalCodewords, dataCodewords };
}

/**
 * Schat de encoderingsmodus op basis van de inhoud (heuristiek).
 * De daadwerkelijke mode-indicator-bits van de originele encoder worden niet
 * door de decoder blootgesteld, dus dit is een educated guess op basis van de
 * standaard QR-encoderregels (kleinste passende modus).
 */
function guessEncodingMode(text) {
    if (text.length === 0) return { mode: 'Byte', estimated: true };
    if (NUMERIC_CHARS.test(text)) return { mode: 'Numeriek', estimated: true };
    if (ALPHANUMERIC_CHARS.test(text)) return { mode: 'Alfanumeriek', estimated: true };
    return { mode: 'Byte', estimated: true };
}

/**
 * Bouwt een object met technische informatie over een gescande QR-code op
 * basis van een zxing-wasm ReadResult.
 *
 * @param {object} readResult - Resultaat van zxing-wasm's readBarcodes().
 * @returns {object|null} Technische info, of null als versie/niveau onbekend zijn.
 */
export function getQrTechnicalInfo(readResult) {
    const versionRaw = readResult.version; // bv. "7"
    const version = parseInt(versionRaw, 10);
    const ecLevel = (readResult.ecLevel || '').toUpperCase();

    let extra = {};
    try {
        extra = readResult.extra ? JSON.parse(readResult.extra) : {};
    } catch (e) {
        extra = {};
    }

    const dataBytes = readResult.bytes ? readResult.bytes.length : (readResult.text || '').length;
    const modules = Number.isFinite(version) ? version * 4 + 17 : null;
    const totals = Number.isFinite(version) ? getBlockTotals(version, ecLevel) : null;
    const encoding = guessEncodingMode(readResult.text || '');

    let redundancyPercent = null;
    let capacityBytes = null;
    let usagePercent = null;
    if (totals) {
        redundancyPercent = ((totals.totalCodewords - totals.dataCodewords) / totals.totalCodewords) * 100;
        capacityBytes = totals.dataCodewords;
        usagePercent = (dataBytes / capacityBytes) * 100;
    }

    return {
        version: Number.isFinite(version) ? version : versionRaw || 'onbekend',
        moduleGrid: modules ? `${modules} x ${modules}` : 'onbekend',
        ecLevel: ecLevel || 'onbekend',
        redundancyPercent,
        dataBytes,
        capacityBytes,
        usagePercent,
        totalCodewords: totals ? totals.totalCodewords : null,
        maskPattern: extra.DataMask !== undefined ? extra.DataMask : null,
        encodingMode: encoding.mode,
        encodingModeEstimated: encoding.estimated,
        isMirrored: !!readResult.isMirrored,
        isInverted: !!readResult.isInverted,
        hasECI: !!readResult.hasECI,
        symbologyIdentifier: readResult.symbologyIdentifier || null,
    };
}
