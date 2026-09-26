# apps

Een verzameling kleine, statische webapps — geen build tools, geen backend,
gewoon platte HTML/CSS/JS die je direct in de browser of via elke simpele
webserver kunt draaien. Alle apps zijn bereikbaar vanaf de **Project Hub**
(`html/index.html`).

## Pagina's

| Pagina | Pad | Omschrijving |
|---|---|---|
| **Project Hub** | `html/index.html` | Startpagina met kaarten die doorlinken naar alle onderstaande apps. |
| **QR Scanner** | `html/qr-code-scanner/index.html` | Scant QR-codes via de camera of via een geüploade afbeelding (met [`zxing-wasm`](https://github.com/Sec-ant/zxing-wasm)). Toont naast de gedecodeerde inhoud ook technische details: QR-versie/modulegrid, foutcorrectieniveau, redundantiepercentage, gebruikte databytes, codewoord-capaciteit, bezetting, geschatte encoderingsmodus, maskerpatroon, spiegeling en ECI. |
| **QR Code Generator** | `html/qr-code-generator/index.html` | Genereert een scanbare QR-code voor iedere URL, met instelbaar foutcorrectieniveau en een optioneel logo in het midden (modules die door het logo worden overlapt, worden automatisch volledig wit gemaakt). Ondersteunt export als PNG (instelbare resolutie: 512–4096 px) en als SVG. |
| **Number Match** | `html/number-match/index.html` | Een logicapuzzel: match paren cijfers die gelijk zijn of samen 10 vormen, ruim het bord op en klim door de levels. |
| **Doneren** | `html/donate/index.html` | Legt uit dat alle apps gratis blijven en donaties vrijwillig zijn, met keuze tussen doneren aan de maker (PayPal) of aan Stichting Alzheimer Nederland. Bereikbaar via de hart-knop in de header van elke pagina. |

## Taal­ondersteuning (NL/EN)

Alle pagina's zijn volledig beschikbaar in het **Nederlands** en **Engels**,
via een lichtgewicht, gedeeld vertaalsysteem zonder externe afhankelijkheden.

- **`html/i18n.js`** — de gedeelde vertaal-engine. Wordt door iedere pagina
  ingeladen en verzorgt:
  - **Taaldetectie**: eerst wordt gekeken of er al een taalvoorkeur is
    opgeslagen (`localStorage`, sleutel `preferred-language`); zo niet, dan
    wordt de brower­taal (`navigator.languages`) gebruikt. Is geen van beide
    Nederlands of Engels, dan is Engels de standaardtaal.
  - **Toepassen van teksten**: elementen met een `data-i18n="sleutel"`
    attribuut krijgen hun `textContent` ingevuld vanuit het vertaalwoordenboek
    van die pagina. `data-i18n-html` doet hetzelfde maar met `innerHTML`
    (voor teksten met opmaak), en `data-i18n-attr="attribuut:sleutel"` vult
    een specifiek HTML-attribuut (bv. `placeholder` of `alt`).
  - **Taalkeuzeknop**: een NL/EN-knoppenpaar wordt automatisch toegevoegd aan
    de `<header>` van de pagina, met de actieve taal gemarkeerd.
  - **Wisselen van taal**: een klik op de knop slaat de nieuwe voorkeur op in
    `localStorage` en herlaadt de pagina, zodat zowel statische teksten als
    dynamisch door JavaScript gegenereerde teksten (foutmeldingen,
    scanresultaten, spelteksten, ...) consistent in de gekozen taal
    verschijnen.
- **`translations.js`** (één per pagina, bv. `html/qr-code-scanner/translations.js`)
  — bevat het volledige NL/EN-woordenboek voor die specifieke pagina, als een
  geneste JavaScript-object (`window.<PAGE>_DICT`).
- **Dynamische teksten in JavaScript** (bv. `scripts.js` of `script.js` van
  een pagina) gebruiken de vertaalfunctie die `I18N.init()` teruggeeft:
  ```js
  window.APP_I18N = I18N.init(window.SCANNER_DICT);
  // ... later, in de paginalogica:
  window.APP_I18N.t('tech.labels.redundancy');
  ```
  Ontbrekende sleutels vallen automatisch terug op de Engelse tekst.

### Een pagina zelf van vertalingen voorzien

1. Voeg `<script src="../i18n.js"></script>` en een eigen
   `<script src="translations.js"></script>` toe aan de `<head>`/`<body>`.
2. Maak een `translations.js` met `window.<NAAM>_DICT = { en: {...}, nl: {...} }`.
3. Markeer statische teksten in de HTML met `data-i18n="sleutel.pad"`.
4. Roep `I18N.init(window.<NAAM>_DICT)` aan; gebruik de teruggegeven `t()`
   voor teksten die door JavaScript worden gegenereerd.
