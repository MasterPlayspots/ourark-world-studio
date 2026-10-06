<!-- GENERIERT von scripts/architecture-index.mjs — nicht von Hand bearbeiten. Neu erzeugen: npm run docs:architecture -->
# Dateiregister — jede Datei, Byte für Byte

Basis: Commit `bd4850c` plus Arbeitsbaum. Ablageregel und Deutung: [README.md](README.md).

535 Dateien, 16.360.314 Bytes gesamt. Davon Drittanbieter unter vendor/ 14.613.655 Bytes, übrige Dateien 1.746.659 Bytes.
Der SHA-256 ist der Fingerabdruck des exakten Byte-Inhalts. Stimmt er zwischen zwei Ständen überein, ist die Datei Byte für Byte gleich.

## Übersicht nach Rolle

| Rolle | Dateien | Bytes |
|---|---:|---:|
| Projekt | 12 | 240.654 |
| Deployment-Konfiguration | 1 | 3.503 |
| Implementierter Formatvertrag | 3 | 10.082 |
| Entwurfs-Vertrag (nicht implementiert) | 3 | 9.364 |
| Layereditor / geteilte Styles | 7 | 101.765 |
| Globus | 6 | 49.053 |
| Drittanbieter (CesiumJS 1.138.0) | 326 | 12.367.580 |
| Kart und Gelände | 10 | 115.634 |
| Map Studio | 8 | 103.850 |
| Runtime (Begehmodus) | 30 | 184.996 |
| World Studio | 7 | 130.733 |
| Datenimport | 3 | 35.392 |
| Welt-Vorlagen (geteilt) | 7 | 30.105 |
| Drittanbieter (Three.js 0.180.0) | 7 | 2.246.075 |
| Dokumentation | 11 | 95.492 |
| Edge-Worker (Auslieferung) | 9 | 50.709 |
| Einstiegsbeispiel | 2 | 2.604 |
| Werkzeug | 13 | 75.998 |
| Rust-Simulationskern | 3 | 18.107 |
| Node-Test | 49 | 307.777 |
| Browsertest | 18 | 180.841 |

## Alle Dateien

| Datei | Bytes | Zeilen | Rolle | SHA-256 | Byte-identisch mit |
|---|---:|---:|---|---|---|
| `.gitattributes` | 186 | 12 | Projekt | `09f3aa134188fbd935b39f1b14c27dcd752f221319954c046178fb15b484a22b` |  |
| `.github/workflows/verify.yml` | 3.503 | 84 | Deployment-Konfiguration | `f5d64a6e39465506bc7d3b6c5f055419280d49a3431e3b0a867033f6a683249e` |  |
| `.gitignore` | 190 | 18 | Projekt | `29e8caa51c247d3ce1ddc1619d4bd89adc8b4ce3f37b0f9c2b4c6314c59b5a4d` |  |
| `.nvmrc` | 3 | 1 | Projekt | `68ca3fba3b7e864770cb61aeb306d4bd4354b68ab4dd38450860c5d823e42a53` |  |
| `CONTRIBUTING.md` | 9.113 | 111 | Projekt | `e639f3d60d3fb2a17864d99e0d94b0337d14cd7fc6968f8aee994f137560887a` |  |
| `LICENSE` | 1.069 | 21 | Projekt | `946978d5f4a89e607d97827a9f38641a8896e6c71e6426a2bd201032ca0790ec` |  |
| `LICENSE_SCOPE.md` | 1.419 | 15 | Projekt | `9222dc91b6fab5b0afd99654cc5784f0161a88987c6fceec178c4b7c79678c4a` |  |
| `PUBLIC_SOURCE.json` | 217.939 | 5388 | Projekt | `93ba71cb94374973f933414777f103934c4561e02d0b1abe674d94f52c3491f8` |  |
| `README.md` | 6.775 | 85 | Projekt | `10ed202882d135bbe4b4937646dcc1e524193ad783056efba0bf3da6a412de02` |  |
| `THIRD_PARTY_NOTICES.md` | 2.034 | 22 | Projekt | `ecfa3a3bb8cebe9218506c7da8e9cc42b756ed8c883dc474082d53431363e873` |  |
| `contracts/map-project-v1.md` | 4.703 | 60 | Implementierter Formatvertrag | `2b885594c1c919fadad32539d16bf378a1a55e65a4bd7ffa6d5b316603d6ae9e` |  |
| `contracts/net-protocol-v1.md` | 3.902 | 49 | Implementierter Formatvertrag | `ba5fc413137dc35a38d28f20260b72425e33c1a713767ef60e5d9a6bad3a4fa4` |  |
| `contracts/runtime-extensions.d.ts` | 3.050 | 79 | Entwurfs-Vertrag (nicht implementiert) | `3cf57173745f1e9b8ecc59130ff7eba3dc1bfeced5fd1450c91a210c89667519` |  |
| `contracts/sim-state-v1.md` | 1.477 | 25 | Implementierter Formatvertrag | `c6a38a5dd79dba701951ab70f4944808cede48204d7971be603ba33a5550cd86` |  |
| `contracts/world-package-v2.d.ts` | 2.599 | 49 | Entwurfs-Vertrag (nicht implementiert) | `f080dd5d2bfbd5ab6687759e1738849699adc22da023c4ba1f7c9e43de3569df` |  |
| `dist/app.js` | 18.653 | 73 | Layereditor / geteilte Styles | `09f7cd8ec57f306fe3942a85c5dd51f9fa7b48fab24b9198491c7c4e1a88602a` |  |
| `dist/assets/starter-motion.svg` | 366 | — | Layereditor / geteilte Styles | `531ae1081a008c20989e9db6dad2b8c243629810bc95f93579a111a901ecc1b5` |  |
| `dist/glass.css` | 1.763 | 22 | Layereditor / geteilte Styles | `4ed18bccbb7ae2011e6b3ffce103f349eafdb33bf6dc4b996fa89fc0f8c71b20` |  |
| `dist/globe/car.js` | 4.568 | 78 | Globus | `376721bfb01124a53e5718bf057499efd859c9510b5db58cec60b8ed40e36b22` |  |
| `dist/globe/globe.css` | 3.073 | 31 | Globus | `6efc467d28317ae95c39dd129e483470cb76299eeb0cb3d2a25d61f9bad85345` |  |
| `dist/globe/index.html` | 1.362 | 7 | Globus | `3cd966097d863e087f686893d8c41baa6f3d9be2b78317ac0354391811a2e971` |  |
| `dist/globe/integration.html` | 4.078 | 51 | Globus | `a9cb9190863fdbb78d6cfdc4c4faac6a81fc4eadb1085bed52df97465b0b97aa` |  |
| `dist/globe/main.js` | 29.273 | 392 | Globus | `763075c136d4fb4fefa7fffacb846211730ce712e700e4b28b55e46e0f791706` |  |
| `dist/globe/surface.js` | 6.699 | 107 | Globus | `65df7043e69dfa4f40d74f3ecee0855f9865faa808c5ea36c5b90544fcff6706` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_0.json` | 67.428 | 1 | Drittanbieter (CesiumJS 1.138.0) | `eacde1b661c07ae81779214f2ee1c840dd24ea56cdba38735d9f63bb51d3f534` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_1.json` | 67.313 | 1 | Drittanbieter (CesiumJS 1.138.0) | `687cb449340f43ed67ccdb59e009c76642ec4a7dda63504c537f6c8b03371632` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_10.json` | 65.984 | 1 | Drittanbieter (CesiumJS 1.138.0) | `3337da09252e812c2609fe17966824d9387600b16b5faeca3b279121ce951a55` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_11.json` | 65.007 | 1 | Drittanbieter (CesiumJS 1.138.0) | `1213a76851024f19bedb1f1177099cc867876c9477214ce25c4aca5922ae0c59` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_12.json` | 64.663 | 1 | Drittanbieter (CesiumJS 1.138.0) | `ecea15bed860ca0dd962e427ddc929c356c8de4f5ea0599dd4a4d117c9ba5fdc` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_13.json` | 65.854 | 1 | Drittanbieter (CesiumJS 1.138.0) | `a7f459cda58803d906bb3e63d98f250c9211c16e99a964b39cab1af20c3c54a7` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_14.json` | 65.547 | 1 | Drittanbieter (CesiumJS 1.138.0) | `051627ca694ce9a0585eea402b11a7e74b70c4a941863ee731e1537da77354b8` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_15.json` | 65.709 | 1 | Drittanbieter (CesiumJS 1.138.0) | `ef41a0fb36667716e1aac3ed84c1e92fc0b80697a11434a08dfec80c10fa3b38` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_16.json` | 66.030 | 1 | Drittanbieter (CesiumJS 1.138.0) | `17c2ec764a2b2d4a93558009e1eb02912757999f3dedea775c961d689bec6155` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_17.json` | 65.622 | 1 | Drittanbieter (CesiumJS 1.138.0) | `95bbcd68070cff4725867054f6da18e6d79d1e7876efd116f046f6d99b6ffec7` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_18.json` | 65.310 | 1 | Drittanbieter (CesiumJS 1.138.0) | `19ec8e50b7a8604bcd93bf20850f033e153242663107f372e3af09194f903497` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_19.json` | 65.537 | 1 | Drittanbieter (CesiumJS 1.138.0) | `9d33b633af09f381d2aeabf1c08a80b327fea00105145310f706a7a2f3f3b395` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_2.json` | 67.802 | 1 | Drittanbieter (CesiumJS 1.138.0) | `79e5007d0f7d284035286ff31e7959f1d8c5654261ffb5a01ec298fc7ecfdaf2` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_20.json` | 65.328 | 1 | Drittanbieter (CesiumJS 1.138.0) | `d4a6ee787228e9ca38799199a6d69aaaf1a2401d0bad5f9b3ff30c30a6e35685` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_21.json` | 64.843 | 1 | Drittanbieter (CesiumJS 1.138.0) | `deab5998d0e85929227c82fd4267f179940b77ac9fe3d9da51ee222745658773` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_22.json` | 64.977 | 1 | Drittanbieter (CesiumJS 1.138.0) | `cbc988d6f44052aae9bea4d437b74f97a9a11d1370137cf3944d7a3dfdb00c28` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_23.json` | 66.084 | 1 | Drittanbieter (CesiumJS 1.138.0) | `fe1cbcb3177839ba821ae202184f4862a17321525556c06e3c000ab02d449645` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_24.json` | 64.894 | 1 | Drittanbieter (CesiumJS 1.138.0) | `336a61b2b5c63a31b169f19c95dfa4607874f2a2cdca3f5f6b995a2526e8090f` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_25.json` | 64.953 | 1 | Drittanbieter (CesiumJS 1.138.0) | `7b9d89953db4bb5d4d51b287cbf01b2c1c0a4d1d2fcf3696b4682f77cb9a12c5` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_26.json` | 65.311 | 1 | Drittanbieter (CesiumJS 1.138.0) | `03c47eff883b79a9863011ba286dea815320f274049ec9f71649c9a45b52db95` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_27.json` | 27.595 | 1 | Drittanbieter (CesiumJS 1.138.0) | `d9d755dd689d6af3d117c82e5e07c2f9986e43fe966cd3520d4a8e28201d7c6e` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_3.json` | 66.400 | 1 | Drittanbieter (CesiumJS 1.138.0) | `2c9ad7c9ca22e45f93354a078be51e63579cc67d960df3fb9cddd237a0fa7d05` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_4.json` | 65.900 | 1 | Drittanbieter (CesiumJS 1.138.0) | `2019a8459a5795b4203d58cedc5ab54e0ab17c66084198106da4755ccd89321e` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_5.json` | 65.378 | 1 | Drittanbieter (CesiumJS 1.138.0) | `b5cd2ed128bb530e920633cee2f9131687dc46673116fa482a59916945ab5e5e` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_6.json` | 65.596 | 1 | Drittanbieter (CesiumJS 1.138.0) | `775adc76b9497c0abfb6a71ec77149abf1f160aeb6dd1380056391916dc9d3c6` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_7.json` | 67.099 | 1 | Drittanbieter (CesiumJS 1.138.0) | `f3e330690aad3c977a66f3bb98952bcedd3c73886502e9477df9fe27855dd0cd` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_8.json` | 66.931 | 1 | Drittanbieter (CesiumJS 1.138.0) | `5da58dafb2a105234978e29f659dbb75ca716222cdf35dae975a9f380fa97fb6` |  |
| `dist/globe/vendor/cesium/Assets/IAU2006_XYS/IAU2006_XYS_9.json` | 66.857 | 1 | Drittanbieter (CesiumJS 1.138.0) | `36dc6631c6018fc9cd3df3f649b74308bb5c6a3303ac7b59067c4b4fe1e564c0` |  |
| `dist/globe/vendor/cesium/Assets/Images/bing_maps_credit.png` | 18.831 | — | Drittanbieter (CesiumJS 1.138.0) | `e5c3467a2532a0986ca0f90189e9bdae3222d3f1580d2e8c0261fb2bc2b4417f` |  |
| `dist/globe/vendor/cesium/Assets/Images/cesium_credit.png` | 4.242 | — | Drittanbieter (CesiumJS 1.138.0) | `20dadec44d030ec7de6193b0ee98329a896c4dcb4ed8f7a26d4781127b6fa989` |  |
| `dist/globe/vendor/cesium/Assets/Images/google_earth_credit.png` | 7.703 | — | Drittanbieter (CesiumJS 1.138.0) | `d4c3719a707ca487d847d7c8ea8ffc590f1297f987e95d1acf88d433b92c1c3f` |  |
| `dist/globe/vendor/cesium/Assets/Images/ion-credit.png` | 6.028 | — | Drittanbieter (CesiumJS 1.138.0) | `721870c1417e20d25e2d1b834e80c66908418e459dcf76c95bf2997dc0733289` |  |
| `dist/globe/vendor/cesium/Assets/Textures/LensFlare/DirtMask.jpg` | 113.718 | — | Drittanbieter (CesiumJS 1.138.0) | `3d06a15d04154f027e0b2b110c7c9952329b385682c327cdeb71e0e3c720f3d4` |  |
| `dist/globe/vendor/cesium/Assets/Textures/LensFlare/StarBurst.jpg` | 195.728 | — | Drittanbieter (CesiumJS 1.138.0) | `c42ecef9345e34549fb9528e25cac8f38c9f8c43f73d812c2ccaf5909ab249a5` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/0/0/0.jpg` | 12.067 | — | Drittanbieter (CesiumJS 1.138.0) | `919864197d2f27a165420331d47458614a056c36dcdf306ce89ed2248bd0041d` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/0/1/0.jpg` | 14.055 | — | Drittanbieter (CesiumJS 1.138.0) | `f336509772ab57ee14e15c72579dd9fb0297c779c853d4c65db04bef78305b48` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/1/0/0.jpg` | 7.278 | — | Drittanbieter (CesiumJS 1.138.0) | `3f40b94a0adb4efe212899374d3dd2bc7abe0491ce3a30d89f4392f498a328cf` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/1/0/1.jpg` | 11.399 | — | Drittanbieter (CesiumJS 1.138.0) | `76393f9322c791564a9dc9529822637fdcc8b63418be502f4ef0ab9ca2708664` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/1/1/0.jpg` | 10.652 | — | Drittanbieter (CesiumJS 1.138.0) | `cec03089c65ac612ef0655739fd1c66e068a98739aec325ba8743aca7338e6f1` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/1/1/1.jpg` | 13.142 | — | Drittanbieter (CesiumJS 1.138.0) | `b1b860b99fd3fdc1a91eb09576563efd5cc91d95f4e869fb436a35c4ff8994c6` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/1/2/0.jpg` | 9.643 | — | Drittanbieter (CesiumJS 1.138.0) | `7c59ff20319379afea17d029fca11ea497fd16a4f9da574137948b0631c71c63` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/1/2/1.jpg` | 15.312 | — | Drittanbieter (CesiumJS 1.138.0) | `ed0209ef589d9cc34a26663f8c9ecdd63de705482692290328cfd2fff984451d` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/1/3/0.jpg` | 10.532 | — | Drittanbieter (CesiumJS 1.138.0) | `d7fa5cd581a7b1d004d6dfcf329a09cd51859dd503f864a85756a35a456a0030` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/1/3/1.jpg` | 13.262 | — | Drittanbieter (CesiumJS 1.138.0) | `8637acf2981f7209ec449a5812c855650a7eeeca5bd8a9d328310bb2a5295b39` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/0/0.jpg` | 8.157 | — | Drittanbieter (CesiumJS 1.138.0) | `d12e2e52ae4d2e0c23ec15de8a1e006ccae0d3142b286578670cb4a8fd3f2311` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/0/1.jpg` | 9.307 | — | Drittanbieter (CesiumJS 1.138.0) | `87a7ea00d62fe0517680cb58953e46faf9b325b9ce8e982c5a68b7e6c6c46822` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/0/2.jpg` | 7.891 | — | Drittanbieter (CesiumJS 1.138.0) | `eecc7078cc54ec05f96cdf472519d5f159797015afaad23c2e56bed2fb79b481` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/0/3.jpg` | 10.341 | — | Drittanbieter (CesiumJS 1.138.0) | `3d4dc525adaed0c3ddf5e5047bd1b348f2df473449c50b6b8175d5d073e7d88b` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/1/0.jpg` | 7.852 | — | Drittanbieter (CesiumJS 1.138.0) | `e586e2884f6fe3a78291776b5bd4b190ffa0c9129c146ef78c7918e570e40e07` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/1/1.jpg` | 6.850 | — | Drittanbieter (CesiumJS 1.138.0) | `bd0b39a8e734b137e8017cb02f1bae541452bea034be5bc7e2bf8a6cb8a220ae` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/1/2.jpg` | 11.581 | — | Drittanbieter (CesiumJS 1.138.0) | `af8eb0a43423d28c7cb3a92553967205d9e3ced5738bd75f773d653fa5849c90` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/1/3.jpg` | 15.862 | — | Drittanbieter (CesiumJS 1.138.0) | `48450e09b99e3283945bda85be1513a5ed28a4b1e58cd0b299c295d16c25935c` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/2/0.jpg` | 10.657 | — | Drittanbieter (CesiumJS 1.138.0) | `4615813c56a8ee304d78d3768c489a4e00a5c4542f2d937b6be7db7c12b42b28` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/2/1.jpg` | 12.456 | — | Drittanbieter (CesiumJS 1.138.0) | `66df8171de54015866691a00fd03ad8c5c11dc75466a70d11a43b2020eb63dba` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/2/2.jpg` | 12.262 | — | Drittanbieter (CesiumJS 1.138.0) | `669649edf6e1e0e66ee03224a792d5fb09e8aef7a7a187697a3c10f9a7904c5c` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/2/3.jpg` | 14.940 | — | Drittanbieter (CesiumJS 1.138.0) | `21585c5a2551120948ec5d0f04a533805b2ba63b7a5b961ad722fca25cf6299f` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/3/0.jpg` | 9.531 | — | Drittanbieter (CesiumJS 1.138.0) | `640f7fd8fd3e5923ef1b021476f13c1e6919f339b17e539b9e20fe6bc16240f7` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/3/1.jpg` | 10.234 | — | Drittanbieter (CesiumJS 1.138.0) | `e418706ca6c844a67aa71e448ef97e703d5c3a9e3791db255366dad49b4adeb9` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/3/2.jpg` | 11.678 | — | Drittanbieter (CesiumJS 1.138.0) | `79d04283b385d193bbf5bd84d40744c8f5bc8d6f52dfab8d965b647fdb61d72f` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/3/3.jpg` | 10.754 | — | Drittanbieter (CesiumJS 1.138.0) | `4e693d36407dab81266071edbca5915872284532498dfa29472cc71b2810482d` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/4/0.jpg` | 8.474 | — | Drittanbieter (CesiumJS 1.138.0) | `46e6a0608fc8261bbeaad8fffa995ee3c85fddebb3b463f3e391634ea8a2a9ec` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/4/1.jpg` | 12.265 | — | Drittanbieter (CesiumJS 1.138.0) | `0f341c2ace1b0b1803aa22c09c2ab8fde4c3a1a7cb013a963e750997deb6b1c2` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/4/2.jpg` | 16.477 | — | Drittanbieter (CesiumJS 1.138.0) | `13a22c18a223ba4d8c2689793a5dff83e4e50b3790ddcb2a32ac5a97b8e1e0c8` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/4/3.jpg` | 11.888 | — | Drittanbieter (CesiumJS 1.138.0) | `93c5f45d481111b4cd2d38792cfb049e5176be566b622028e0704151c0c23aaf` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/5/0.jpg` | 7.540 | — | Drittanbieter (CesiumJS 1.138.0) | `7fbb096ff03dd162ae965a6c7e1c47e29599e7f3f1031ce59fb07ff669ca3995` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/5/1.jpg` | 10.274 | — | Drittanbieter (CesiumJS 1.138.0) | `70b04e7e362cb4c80d8c7cce1a9401ef9c7606bb2c4b9de011dea58d79b8b4e6` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/5/2.jpg` | 16.112 | — | Drittanbieter (CesiumJS 1.138.0) | `8d03e07689c97fff91497250f1cbeb19fbe5331f38bd91b38a44bb69745bb29b` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/5/3.jpg` | 11.877 | — | Drittanbieter (CesiumJS 1.138.0) | `17b46ab558da6e9fa715a8ab365109bd808d897c53a9f5401da55dd6b9566a7a` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/6/0.jpg` | 6.636 | — | Drittanbieter (CesiumJS 1.138.0) | `e25e95c8a6dcb21f6668541c925ee670c42fdc0c0d409c520bf29542a2b3fc52` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/6/1.jpg` | 11.564 | — | Drittanbieter (CesiumJS 1.138.0) | `0a57813b25a70cf86a09bb251018e488b87e795cd2dbcaee7f8a9e80e7c449bf` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/6/2.jpg` | 16.411 | — | Drittanbieter (CesiumJS 1.138.0) | `f0e9d28b216838c7c30375bb50a7c285203d4bad20eb581c2ee0b2468da20f8a` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/6/3.jpg` | 12.756 | — | Drittanbieter (CesiumJS 1.138.0) | `c2a663dcf812d9a7034d48707a33a2f341d22a99aa277f69b0e06f064de26fab` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/7/0.jpg` | 9.032 | — | Drittanbieter (CesiumJS 1.138.0) | `65c1f1b10a04387f2f64b3c4bc111803ddbf32dd2708f02eabca048e88e8edf3` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/7/1.jpg` | 12.957 | — | Drittanbieter (CesiumJS 1.138.0) | `11ac8ae6af861b966d25ed660549d2a9ce164cb9e327a247655e949f967fbc2b` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/7/2.jpg` | 11.362 | — | Drittanbieter (CesiumJS 1.138.0) | `59ca5b5264df0421c42cc9d3e6369d91ff9f5f387fc8fd578c25b113cae52b78` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/2/7/3.jpg` | 11.859 | — | Drittanbieter (CesiumJS 1.138.0) | `7064a9817de3f19fbfc66c36d575fdd10a8d976a93f655b7b1bee591b07314b7` |  |
| `dist/globe/vendor/cesium/Assets/Textures/NaturalEarthII/tilemapresource.xml` | 780 | — | Drittanbieter (CesiumJS 1.138.0) | `23f2983b716914e8fb3f011c62d975e67b3ad72c17c92657cd956315d6694529` |  |
| `dist/globe/vendor/cesium/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg` | 118.775 | — | Drittanbieter (CesiumJS 1.138.0) | `7eb5dfe95bebe58aaeff1a29f1e435e2e9985c7007d32397f63f1aa798062435` |  |
| `dist/globe/vendor/cesium/Assets/Textures/SkyBox/tycho2t3_80_my.jpg` | 152.501 | — | Drittanbieter (CesiumJS 1.138.0) | `ee944d55d7abe7799f54768f59d6a3da6b802fabd50d20d3ceb898e888b6ca7a` |  |
| `dist/globe/vendor/cesium/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg` | 167.980 | — | Drittanbieter (CesiumJS 1.138.0) | `958b3d7779bf39e93dbb3373379a696c1b1d5660535d2ff963ab3c7f86d8042e` |  |
| `dist/globe/vendor/cesium/Assets/Textures/SkyBox/tycho2t3_80_px.jpg` | 122.746 | — | Drittanbieter (CesiumJS 1.138.0) | `075509b5c76a3db76baf219c71d1156c90bd87a201e4402e80d4fb1f16b526da` |  |
| `dist/globe/vendor/cesium/Assets/Textures/SkyBox/tycho2t3_80_py.jpg` | 152.999 | — | Drittanbieter (CesiumJS 1.138.0) | `62404c604baff09b6293e79d83a6c851428452a07568aca2f4b69cfd67c8a25a` |  |
| `dist/globe/vendor/cesium/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg` | 152.537 | — | Drittanbieter (CesiumJS 1.138.0) | `8a367b21469de9c3d41dec0a9b1aaf80472b5945e7f6827fb3a403707333e13b` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/airfield.png` | 1.188 | — | Drittanbieter (CesiumJS 1.138.0) | `9607228765a05a29c5feb0ded034ee7f2aa2e9641faf512fb122fba03e443b29` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/airport.png` | 1.554 | — | Drittanbieter (CesiumJS 1.138.0) | `fbdde1b757753fbf54811a7733e78d43af43ffee204fa8169b295a3610e889fa` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/alcohol-shop.png` | 1.293 | — | Drittanbieter (CesiumJS 1.138.0) | `920cc1449428757a73aee044d07e72a9c5e17535feb5754cfc43b4a1e6652cf6` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/america-football.png` | 2.595 | — | Drittanbieter (CesiumJS 1.138.0) | `ed7a66dc97a71fb689cb1b5c1f5d2832644152668be8d011aee23310e34bbd3b` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/art-gallery.png` | 3.159 | — | Drittanbieter (CesiumJS 1.138.0) | `b57e75127fe217af9fc0b9cfc67f53b3db7aa72b06b30ce443be89c0764b2b4a` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/bakery.png` | 2.714 | — | Drittanbieter (CesiumJS 1.138.0) | `7f8fa5241c76569cee88f34bd21afc54d1cdcbffe8a1633fe91df23b28a3486a` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/bank.png` | 936 | — | Drittanbieter (CesiumJS 1.138.0) | `fcb114b2229e1c2b01a21032958c49f405ef04e106b27cf91512852944b610d4` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/bar.png` | 1.435 | — | Drittanbieter (CesiumJS 1.138.0) | `be2709f48516f1b4203d3f10a9a24159e7761d91fe8f2276f860259d0ea73851` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/baseball.png` | 1.838 | — | Drittanbieter (CesiumJS 1.138.0) | `24db293dfeabe9e77c3e1cd2f5ca26b61b8919961cf3415880d017be1aa0d3b3` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/basketball.png` | 1.318 | — | Drittanbieter (CesiumJS 1.138.0) | `96bae0a41bccd20ccd8b496376df9415364dfc008b8eb6aaddff68371b5d0e96` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/beer.png` | 1.403 | — | Drittanbieter (CesiumJS 1.138.0) | `8ad8f0c1414f5574103cb7e0d14c136292e847583ef06154c27f7765b6208474` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/bicycle.png` | 3.989 | — | Drittanbieter (CesiumJS 1.138.0) | `d998b6e08bbcaa658ae6679e7197349518cf4cfd610ec1f69c8643a4f007186d` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/building.png` | 1.765 | — | Drittanbieter (CesiumJS 1.138.0) | `d4375df9fc15b0eeb0b54680e27423a2d6d60ad17f515f99236510dbc246c6af` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/bus.png` | 998 | — | Drittanbieter (CesiumJS 1.138.0) | `834a867a10afd8078f3ddee6d4231bf136b46c603afe31f6c089dfb55e47a9de` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/cafe.png` | 1.518 | — | Drittanbieter (CesiumJS 1.138.0) | `07ff7a0dd1da1496aeff569291ae3add49ede31dd35674858bf5fcf9d21d5728` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/camera.png` | 1.976 | — | Drittanbieter (CesiumJS 1.138.0) | `c6dfe806ebed73bd168fbace390d6402a64c54bb7cdccd17ba5813d4469f90d6` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/campsite.png` | 2.411 | — | Drittanbieter (CesiumJS 1.138.0) | `e3ed13ecf426166fded98e86057423ca2333ce3c3795a0efa5f8c3b8063475cb` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/car.png` | 1.498 | — | Drittanbieter (CesiumJS 1.138.0) | `189c871c1ed9a60000276fcc375b368f06d0a72b2c1de1032ba1caddbc04f8f6` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/cemetery.png` | 967 | — | Drittanbieter (CesiumJS 1.138.0) | `d066f21dea8cb8e667326b5c7399bc55c293881cc8b731acdc621b804a508d79` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/cesium.png` | 3.610 | — | Drittanbieter (CesiumJS 1.138.0) | `d5857cc955c248b95c0c12f2c533629e9c83f324b89eb56aa1b12a68a1f64256` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/chemist.png` | 1.603 | — | Drittanbieter (CesiumJS 1.138.0) | `d4852a72e3baaa9efd61293963db89a72d4d0c910aec0419e92af630a1cd6390` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/cinema.png` | 1.492 | — | Drittanbieter (CesiumJS 1.138.0) | `eba78ccef08d317d931b796b5630db396a4c6647f8d4b57764357e5e24d2599b` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/circle-stroked.png` | 2.126 | — | Drittanbieter (CesiumJS 1.138.0) | `4a609e3399a2fad31b9e75bfdd17c4cc95e5b2f260f1d902aa1cb5b040c66523` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/circle.png` | 1.459 | — | Drittanbieter (CesiumJS 1.138.0) | `05b7a313a6d4e47d7e13591f06dae1c4fc706146632fc7d9758d59f687d84ea9` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/city.png` | 788 | — | Drittanbieter (CesiumJS 1.138.0) | `92539b16e075cb79b26daffffbff2bafaf1f09c91d5cda5b6a9ef8cbb4327341` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/clothing-store.png` | 2.037 | — | Drittanbieter (CesiumJS 1.138.0) | `34a527cd4f0d4ae5759e98921dbfe23699b4708288985f85b64ff75353b3ca97` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/college.png` | 2.502 | — | Drittanbieter (CesiumJS 1.138.0) | `26a9bd248ba058414c36f7d140ff148c513b72170432b892c3ec5ce0f12bd146` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/commercial.png` | 1.002 | — | Drittanbieter (CesiumJS 1.138.0) | `0deb24e319298a2d2890e76b44c4120c29ec89f6daf73cc2151bf28dbd960946` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/cricket.png` | 1.677 | — | Drittanbieter (CesiumJS 1.138.0) | `07cc9f8540e7574d426cdd05fdab1bb71cdbe3b22c59f88ce6c9f20929d8ecaf` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/cross.png` | 1.888 | — | Drittanbieter (CesiumJS 1.138.0) | `fb878dd32c44ca83370a944d766b0e992ee5a01accb54d81b19867beef03a2d0` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/dam.png` | 1.703 | — | Drittanbieter (CesiumJS 1.138.0) | `2ab3ed160681f8894b76e6640de3c103caedb65f14e4565dcf123ed413502345` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/danger.png` | 2.429 | — | Drittanbieter (CesiumJS 1.138.0) | `c268ee6d675c9db3562f44aaa7b46bca2815124f520365d3f517ccf3430e9e43` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/disability.png` | 3.437 | — | Drittanbieter (CesiumJS 1.138.0) | `b2293d6411ae95ed7113bb6b7de19b5863164a697212d9642ddddef23634da45` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/dog-park.png` | 3.146 | — | Drittanbieter (CesiumJS 1.138.0) | `6b3b662c50623e31e69e44b6ab80aad116a9cbe406814acc60920e7bb8b46c31` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/embassy.png` | 1.680 | — | Drittanbieter (CesiumJS 1.138.0) | `83c902b90a4f5de175631f7b91ec2b1c3f461e0395f34507cb007572e1550137` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/emergency-telephone.png` | 1.533 | — | Drittanbieter (CesiumJS 1.138.0) | `2b374c00679109719202b61c5f1ca4b108ba859318e4a12d27d9d65081491b5c` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/entrance.png` | 1.307 | — | Drittanbieter (CesiumJS 1.138.0) | `ee93d08539b460126b32691e71781e26585003390dbab05ff9037d2b41722edc` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/farm.png` | 1.686 | — | Drittanbieter (CesiumJS 1.138.0) | `a1ea51ae83cb6db984bda6f451de81b232cf1c193176142cb44f0664692f0772` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/fast-food.png` | 2.019 | — | Drittanbieter (CesiumJS 1.138.0) | `24d42a6409ff1f518c776997ef7b07ecb76c4cf446248551f22814d8bbf4e99b` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/ferry.png` | 2.879 | — | Drittanbieter (CesiumJS 1.138.0) | `97fcf2915ffe3ef62e8ee5a05672ae6dbdabd24d6aa1b4cb709302487ee06b2a` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/fire-station.png` | 2.228 | — | Drittanbieter (CesiumJS 1.138.0) | `9e17c8f458a6e7a525eace12875c4f16acd4e6750a19271448bd0e926da860b2` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/fuel.png` | 1.741 | — | Drittanbieter (CesiumJS 1.138.0) | `9e59bcba3f758998a6a55bf15174727e779207abf5a4f324c2cf5593fbac983a` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/garden.png` | 2.057 | — | Drittanbieter (CesiumJS 1.138.0) | `9c860cde4e54fbec8709b243052f37700e0d64fb9aa61f33818b0fe838b7a8ae` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/gift.png` | 1.606 | — | Drittanbieter (CesiumJS 1.138.0) | `4814551df01639c36c1333de3a99fb9b5a9d758dab186fc7132579d984ebcf96` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/golf.png` | 1.999 | — | Drittanbieter (CesiumJS 1.138.0) | `9e447b620baddad979776dc4fa4634f6cc96c0e00682282e008f2041c6f98e57` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/grocery.png` | 1.425 | — | Drittanbieter (CesiumJS 1.138.0) | `6970b52af4509ab118d1d898a959bf631ae21e457803214fa9fab337770e8ca5` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/hairdresser.png` | 3.301 | — | Drittanbieter (CesiumJS 1.138.0) | `ea92df398c4ced256fa144958d3a8b7d60ece46c226dcb8832868ffb1df7f7d5` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/harbor.png` | 2.048 | — | Drittanbieter (CesiumJS 1.138.0) | `506545526fcfa6655206d840da1392b14d8a53ed63bb40ba907c1e503834fd90` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/heart.png` | 1.745 | — | Drittanbieter (CesiumJS 1.138.0) | `f648f8d38ae47696c6596c106c6ef4b3984cfbbab2a83a82b911f5be7621067f` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/heliport.png` | 2.059 | — | Drittanbieter (CesiumJS 1.138.0) | `4c5ec82bae0ef3ed3b38bd8089ce0ae64b4a9a2de6202855b22c736281f65440` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/hospital.png` | 909 | — | Drittanbieter (CesiumJS 1.138.0) | `0ba68595b4d670a16c953894b2c1a0c342c072a2003cec4dbe630aa10efa1568` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/ice-cream.png` | 1.602 | — | Drittanbieter (CesiumJS 1.138.0) | `9ee2b16f1ae408f624d79cdbde704284579238c9daadda5938382abe1c4d543e` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/industrial.png` | 1.092 | — | Drittanbieter (CesiumJS 1.138.0) | `4bc573a1d392c228c94d8a397a830cbb7093cb969469eda44019634e3885d5a1` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/land-use.png` | 1.773 | — | Drittanbieter (CesiumJS 1.138.0) | `261d7de6098521628cc6c6bfa02a47d17931fe521cc8e47dc56bc5d83aa28443` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/laundry.png` | 2.407 | — | Drittanbieter (CesiumJS 1.138.0) | `303c0bd8319b88b139997cabfba201eccb5afd1f7d5401eabd90c2c66ca2a43b` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/library.png` | 1.355 | — | Drittanbieter (CesiumJS 1.138.0) | `511b7f8d3b1a2ea2205d8466b5d5129855a12af6cf1f5baba2f4b8a4dd5e562c` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/lighthouse.png` | 1.944 | — | Drittanbieter (CesiumJS 1.138.0) | `dbccce865f1789f5326566145401366fa94913b6462672c5f252be803014c714` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/lodging.png` | 1.362 | — | Drittanbieter (CesiumJS 1.138.0) | `02c1d81ef957255d27cb5fce70ef4f3bee79f4f8ec3b222f559f4375ef7ea6ac` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/logging.png` | 1.378 | — | Drittanbieter (CesiumJS 1.138.0) | `056e8893c58ba30f5a0d9905194b0e60e4f31d9c1a59b5711d53647e4749528c` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/london-underground.png` | 2.979 | — | Drittanbieter (CesiumJS 1.138.0) | `f8a41f09994d53d27335bbc70aab29a3d042583bb6b4520afaaffd0dd3f8e2fa` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/marker-stroked.png` | 3.414 | — | Drittanbieter (CesiumJS 1.138.0) | `e21d955606f5911a981e4674ba1a491b68bdf37c7ed698be2bc210d7e86c9bc1` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/marker.png` | 2.448 | — | Drittanbieter (CesiumJS 1.138.0) | `f8fcf45e3b3355ed9fba1050a26380927732300b54d8bb00b80fecf7bdcfc7d7` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/minefield.png` | 1.907 | — | Drittanbieter (CesiumJS 1.138.0) | `aa1634ca37adee2849fba655285fed160763f53b7c5163f2753609c506312d64` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/mobilephone.png` | 1.474 | — | Drittanbieter (CesiumJS 1.138.0) | `07e26f366da18b3fdeb53b6f29ff5bacdab5513758bbd6217ac41ebe5fdc104e` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/monument.png` | 1.376 | — | Drittanbieter (CesiumJS 1.138.0) | `707a32e0c3b943941c396b18d6caa08fb0620a0ed07d84496ffad42cdb2d57e6` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/museum.png` | 2.578 | — | Drittanbieter (CesiumJS 1.138.0) | `384ccd2fe0977c7b7a51635c6a16e81f6c906a355635ccda2ff33d897c16bd93` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/music.png` | 1.371 | — | Drittanbieter (CesiumJS 1.138.0) | `c6bd30e02b950aeb2f5da711011d9b0bd5dbec687adc39a2f8f27025c8fb8508` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/oil-well.png` | 3.357 | — | Drittanbieter (CesiumJS 1.138.0) | `f0c99b3662e9f1abe63a387c1da5cadd5336b155650d3daf678a8f18401c2fd5` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/park.png` | 2.059 | — | Drittanbieter (CesiumJS 1.138.0) | `b5ee53a16dd03e32630218a2453065f3f6435ec9246028fa08785eb1d52ef54a` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/park2.png` | 2.284 | — | Drittanbieter (CesiumJS 1.138.0) | `7fd262afad32b6d2aabeb0839b746468671e131b234a6265b40cb284a4003c4f` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/parking-garage.png` | 1.563 | — | Drittanbieter (CesiumJS 1.138.0) | `251d73325620f24a16357f542967dc0112dce10679b27db3e7f489fd05ab9ded` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/parking.png` | 1.250 | — | Drittanbieter (CesiumJS 1.138.0) | `3e62ecf1573c7b13d7be9cc28ffe9576e6e30963fb5d1df6dace01acd72dd447` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/pharmacy.png` | 2.258 | — | Drittanbieter (CesiumJS 1.138.0) | `d382d9b8a06ac3a089b35a8137848c74fd41bf465b5d4b1a975ecebe4a992163` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/pitch.png` | 3.288 | — | Drittanbieter (CesiumJS 1.138.0) | `abe872e09e244eab94237c254926b866dc1685a999833d95f443ac013fc976f3` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/place-of-worship.png` | 1.111 | — | Drittanbieter (CesiumJS 1.138.0) | `03755fe12b0b412835dc807fde64973e6316df623d6a6e81ca052d750d85d344` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/playground.png` | 3.856 | — | Drittanbieter (CesiumJS 1.138.0) | `0fac0aa78869da09e39e88632af82177d98723dd38141e81ab6b09a29129a7d8` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/police.png` | 2.194 | — | Drittanbieter (CesiumJS 1.138.0) | `51592091904f75f4a25e37f87b326dc576bfacac9317aa6dfae2d0e0a8f117ba` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/polling-place.png` | 1.772 | — | Drittanbieter (CesiumJS 1.138.0) | `0c4c8a5d1bbc1cc0f137cc1a357d418a442ad0bd3074a32819e9704fcbb265be` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/post.png` | 1.273 | — | Drittanbieter (CesiumJS 1.138.0) | `cff1c2c20e77dece1eecf3dfb0fe10f139309ac78a2523bc9f01b4279e98e291` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/prison.png` | 1.371 | — | Drittanbieter (CesiumJS 1.138.0) | `64636c8abe45f5cb8c3dc9ab73111683c4aa345691a5f17c327f909c774c0a0e` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/rail-above.png` | 2.071 | — | Drittanbieter (CesiumJS 1.138.0) | `1b4555bb2169307c5ee1bc8afbd9ad97cfb36121e87e6413ae6ae137fb501109` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/rail-light.png` | 2.816 | — | Drittanbieter (CesiumJS 1.138.0) | `e989ebe529a979dd7600f5a6c8039c32972bf424b70558baf134f779901f1703` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/rail-metro.png` | 2.249 | — | Drittanbieter (CesiumJS 1.138.0) | `b89c202b5fdea739ce812932a22a3a15ab921a1aa2ceb0d801d4913f763095a5` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/rail-underground.png` | 1.996 | — | Drittanbieter (CesiumJS 1.138.0) | `2be6c183a1b8604551a8c88d6437e826680da8b5fc75237b5e7108f38f347e11` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/rail.png` | 2.073 | — | Drittanbieter (CesiumJS 1.138.0) | `4965beb812449d4abc1cdb9e30a3d1a5f7c18999571794e38eb92c8ad98cb048` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/religious-christian.png` | 948 | — | Drittanbieter (CesiumJS 1.138.0) | `a74c5e18bacf1469c22e6ff84736a63187b0c21048799885acabd5fac25d5cc0` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/religious-jewish.png` | 2.384 | — | Drittanbieter (CesiumJS 1.138.0) | `fe5d53b2f1cc5e80a2e2fb6b9163ca27748c2a031ea2df4d0c614ffd338adba1` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/religious-muslim.png` | 3.925 | — | Drittanbieter (CesiumJS 1.138.0) | `5b06c277d3638ee79172fb4ff89d84f1e475a1b25434953f19cb343e2b7c9fd1` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/restaurant.png` | 2.499 | — | Drittanbieter (CesiumJS 1.138.0) | `85031df6b2174e72ec76dc0de6f4e54ab348426c7f738b11d8b7eb22bb72722e` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/roadblock.png` | 1.312 | — | Drittanbieter (CesiumJS 1.138.0) | `d455530701e372698538f32a4d71029897e297e6124fb68550e5f323fee40bb0` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/rocket.png` | 1.653 | — | Drittanbieter (CesiumJS 1.138.0) | `a167e92802b80e5bc5f78bea77d051007524782979a1b89eab9288d1e80ff5db` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/school.png` | 3.838 | — | Drittanbieter (CesiumJS 1.138.0) | `1cc6087b652577de5e60525b5daa20c07cc126b526fd461f04381ae586a7025d` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/scooter.png` | 2.942 | — | Drittanbieter (CesiumJS 1.138.0) | `4aa704ae97edb9bc514c0fc0ebe7adf2aa3f515ba3a15c6c17c25e17c8c1b8d6` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/shop.png` | 1.544 | — | Drittanbieter (CesiumJS 1.138.0) | `1742dceb33d3ecd6dc66e5f5f1e637c65da7f4d92b066a2379dcb7e7e642ffc0` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/skiing.png` | 3.345 | — | Drittanbieter (CesiumJS 1.138.0) | `576d29be1492b2973ffbaf688c7e8b8044f350c29317ad29060e3db29c3dc751` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/slaughterhouse.png` | 2.270 | — | Drittanbieter (CesiumJS 1.138.0) | `69a20fc6dff36897cf3152a525d36752799d5805bf5f01ae5bcdeaa55abdd84c` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/soccer.png` | 2.420 | — | Drittanbieter (CesiumJS 1.138.0) | `34308b14fe61df1608ddae5a8cd42e246487f11368f91867cb80e43590bfd4a0` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/square-stroked.png` | 650 | — | Drittanbieter (CesiumJS 1.138.0) | `2b48882145df7a64dcfa5f94789875a3818eb5976494198a72dcfbd2ecc2984c` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/square.png` | 582 | — | Drittanbieter (CesiumJS 1.138.0) | `68ba096d343037fed0dd1271ef8cc0bad600a134ec6082ff613f1a340f3c0ed8` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/star-stroked.png` | 3.460 | — | Drittanbieter (CesiumJS 1.138.0) | `41f15812c35881118eee7b8eb3487538f2617ef8523f22ca738e2901e5752469` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/star.png` | 2.703 | — | Drittanbieter (CesiumJS 1.138.0) | `58e516f3e338a1784198a5d3c05a486d41b55dca4122bf5c40986a9e0528460a` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/suitcase.png` | 1.129 | — | Drittanbieter (CesiumJS 1.138.0) | `066e75d3303b4edf97086acd70e6e9aebf1165faf9c40adbf58f6585bc04552c` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/swimming.png` | 2.106 | — | Drittanbieter (CesiumJS 1.138.0) | `3e7e12dc1197399ee43900a77444e7d8cfeba04732a7547f5b13d0e99fe70b63` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/telephone.png` | 1.702 | — | Drittanbieter (CesiumJS 1.138.0) | `3d6da688ab5735a1137207e041fb0023dbb1d6d40e328c63664c8a2c737c5391` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/tennis.png` | 1.658 | — | Drittanbieter (CesiumJS 1.138.0) | `7138863b8e10b5e78f5f0a02cf78b5f1f8912a97da433fe2df2c60f3b18ed556` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/theatre.png` | 3.233 | — | Drittanbieter (CesiumJS 1.138.0) | `cb45d9d94385e3d164fddceb40c00cd6f3654de4fd44df0fa9d539ce1f68fecd` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/toilets.png` | 2.917 | — | Drittanbieter (CesiumJS 1.138.0) | `e08a3ff947299d4f110fd7fd4ff30719d433d95cd52337341915f0e06c2f2f74` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/town-hall.png` | 2.005 | — | Drittanbieter (CesiumJS 1.138.0) | `33b7f1bcd10f771f821de464367d785c20545075142bf341b250e5822124795e` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/town.png` | 1.125 | — | Drittanbieter (CesiumJS 1.138.0) | `1402be94a92ac7884d0e0b0344db84f1b74170ed7012b7d95982e072b38eab59` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/triangle-stroked.png` | 2.837 | — | Drittanbieter (CesiumJS 1.138.0) | `880ea63998f0cbe79730df17e22d2b6f87941a535408b06d5ef62df4b3d6fdba` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/triangle.png` | 2.137 | — | Drittanbieter (CesiumJS 1.138.0) | `6ccfb06da43d5969424510d418e75b18c9c06fbbac2c6531105ccee98d26c551` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/village.png` | 2.145 | — | Drittanbieter (CesiumJS 1.138.0) | `3e73ebd0f5c2bfa83764a1fd74a4e4de855e43a38acc9b75aaf423a8a63342d2` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/warehouse.png` | 1.908 | — | Drittanbieter (CesiumJS 1.138.0) | `90fe8a1799906e59ed8fe7e0b35ca2ec66a39a592c3a8e5c8fe8f93a06eef387` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/waste-basket.png` | 1.917 | — | Drittanbieter (CesiumJS 1.138.0) | `5ef33ea09aaf66f1f429efb735cd0b2fcc7b8372305f9acdc2d27f621b8fb889` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/water.png` | 2.411 | — | Drittanbieter (CesiumJS 1.138.0) | `a1b40fc3d50e119865ed8b98fccee6b0d2d1da2133731074d3df8f1f5f5b38c9` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/wetland.png` | 2.151 | — | Drittanbieter (CesiumJS 1.138.0) | `bdbb392ad5fd31edcc9973f72e1ebc03911204d98c2e786b07bb4adae65ca7b2` |  |
| `dist/globe/vendor/cesium/Assets/Textures/maki/zoo.png` | 2.681 | — | Drittanbieter (CesiumJS 1.138.0) | `3c8d46e2412476547805180fb62d0c5fc23d7cbd65c71a6738ecb668effbcdcb` |  |
| `dist/globe/vendor/cesium/Assets/Textures/moonSmall.jpg` | 18.196 | — | Drittanbieter (CesiumJS 1.138.0) | `380fa69424e1cd2268816e346dc56393bd1c809b8e0cb078e705ec469a5847db` |  |
| `dist/globe/vendor/cesium/Assets/Textures/pin.svg` | 348 | — | Drittanbieter (CesiumJS 1.138.0) | `0d80bf787ae3b97d010f50195605d541501c08740994fb0b403f76449c007019` |  |
| `dist/globe/vendor/cesium/Assets/Textures/waterNormals.jpg` | 294.196 | — | Drittanbieter (CesiumJS 1.138.0) | `9ab17625d9a2b0541c14a1b24ae8e3e192b40882cc77729c46b5de5648a991a8` |  |
| `dist/globe/vendor/cesium/Assets/Textures/waterNormalsSmall.jpg` | 34.121 | — | Drittanbieter (CesiumJS 1.138.0) | `ef35a21e3cbff36032d118ff1df951ad88c023c39562c44f5b2d46f308e98858` |  |
| `dist/globe/vendor/cesium/Assets/approximateTerrainHeights.json` | 299.471 | 1 | Drittanbieter (CesiumJS 1.138.0) | `36466e2dc84f6c173b609ffc704bc021cd9fdb33c287570bf57e4f566b58e6a6` |  |
| `dist/globe/vendor/cesium/Cesium.js` | 5.726.887 | 16530 | Drittanbieter (CesiumJS 1.138.0) | `fb0f46e6da69e00a8f2b66b09821984971a4f22b8acd7b8b30d96cd5bb3a8463` |  |
| `dist/globe/vendor/cesium/LICENSE.md` | 60.928 | 1125 | Drittanbieter (CesiumJS 1.138.0) | `5cf5c218c0b18b9e02e228bc045ff1afd55babc2dc811bd219e1a535c4c0ebdc` |  |
| `dist/globe/vendor/cesium/ThirdParty/Workers/package.json` | 19 | 1 | Drittanbieter (CesiumJS 1.138.0) | `fa6944a20ca5e6fbaf98fd202eb8c7004d5b4ab786e36b9ed02ee31dbe196c9f` |  |
| `dist/globe/vendor/cesium/ThirdParty/Workers/zip-web-worker.js` | 18.493 | 1 | Drittanbieter (CesiumJS 1.138.0) | `3abc0938e439c3ae5e32b52c41c4fafe10dbcf59cdc2e3bbfd3fabec1a24dc76` |  |
| `dist/globe/vendor/cesium/ThirdParty/basis_transcoder.wasm` | 500.839 | — | Drittanbieter (CesiumJS 1.138.0) | `96849a2719b431008533806199ad4e513ef5a5f632b87e452fb1eea961d5730e` |  |
| `dist/globe/vendor/cesium/ThirdParty/draco_decoder.wasm` | 285.948 | — | Drittanbieter (CesiumJS 1.138.0) | `2516a4e43526d71787bf2f678f951329f7f858f8f15f42d4bc9e370b31a0da3a` |  |
| `dist/globe/vendor/cesium/ThirdParty/google-earth-dbroot-parser.js` | 218.747 | 1 | Drittanbieter (CesiumJS 1.138.0) | `cced3e7fdc467edf0722347e7913fdb9680a9e4f32d52b622c01a9970e9a0fc8` |  |
| `dist/globe/vendor/cesium/ThirdParty/wasm_splats_bg.wasm` | 26.522 | — | Drittanbieter (CesiumJS 1.138.0) | `530cb068ddd94b7267db1e1690ebdfcd94c552b2886d79398438841c42a1a14d` |  |
| `dist/globe/vendor/cesium/ThirdParty/zip-module.wasm` | 50.264 | — | Drittanbieter (CesiumJS 1.138.0) | `d5f896af3951ccf51c8ac79e2871eab92a55b891efeadc67d4057277cb87a154` |  |
| `dist/globe/vendor/cesium/Widgets/CesiumWidget/CesiumWidget.css` | 2.265 | 119 | Drittanbieter (CesiumJS 1.138.0) | `d177d8ab518dda483c404ece734142a51ba2389f2114d259f207b177c0840234` |  |
| `dist/globe/vendor/cesium/Widgets/CesiumWidget/lighter.css` | 307 | 14 | Drittanbieter (CesiumJS 1.138.0) | `e5cae7e3497064bc3cd16c11a65e259fc55bbdcbce344f76f978e6b0e0b78190` |  |
| `dist/globe/vendor/cesium/Workers/chunk-3CDICLGN.js` | 3.381 | 26 | Drittanbieter (CesiumJS 1.138.0) | `d7d5ccbab427c264180f10e353e4ad6088fa29ac3600cbde42ba1cf03ee5ca3f` |  |
| `dist/globe/vendor/cesium/Workers/chunk-3XRQCEHV.js` | 8.890 | 26 | Drittanbieter (CesiumJS 1.138.0) | `0730f38cdb2ce1b11617525b6e0e8409c53aee66dadd5f1c93ee081ea0736d8a` |  |
| `dist/globe/vendor/cesium/Workers/chunk-4FSR22QQ.js` | 12.020 | 26 | Drittanbieter (CesiumJS 1.138.0) | `55a730ceefefe124a004dd370cb2236f3d2c2df628c00ff75e2ada5f50cbdd52` |  |
| `dist/globe/vendor/cesium/Workers/chunk-4JSGO3Z7.js` | 125.458 | 63 | Drittanbieter (CesiumJS 1.138.0) | `8d379d4defeb1930e1d8c2ed94f1c3294e2a82507623e2ebc89400d1cdd9859d` |  |
| `dist/globe/vendor/cesium/Workers/chunk-4TAASUQ2.js` | 1.775 | 26 | Drittanbieter (CesiumJS 1.138.0) | `d14480e125a70bc8d4e6f75f2bd1b0b37b1eaa160a78ae23c31fdf30342e1065` |  |
| `dist/globe/vendor/cesium/Workers/chunk-4U4JDPPY.js` | 3.759 | 26 | Drittanbieter (CesiumJS 1.138.0) | `205e21eb7161676150046802dbdd9317045a07c533a57064f2c09bd80044d4b8` |  |
| `dist/globe/vendor/cesium/Workers/chunk-54IT5KT4.js` | 3.943 | 26 | Drittanbieter (CesiumJS 1.138.0) | `ae4d65a07380613f02326da937d437bcd867aaffd2fb39392728d18791173e74` |  |
| `dist/globe/vendor/cesium/Workers/chunk-5K4QFLQS.js` | 10.761 | 26 | Drittanbieter (CesiumJS 1.138.0) | `5994386562614c89a924f16c1b8cefde7b1450e3bbdad7fae53056e556fc0bc5` |  |
| `dist/globe/vendor/cesium/Workers/chunk-7H3BQ3FX.js` | 1.351 | 26 | Drittanbieter (CesiumJS 1.138.0) | `fcd38bd426a730b6722ec1b82b20c5001ee9907a398180960b1225f74fc15ae0` |  |
| `dist/globe/vendor/cesium/Workers/chunk-7ZLWTKSF.js` | 1.275 | 26 | Drittanbieter (CesiumJS 1.138.0) | `531eec9c2a964f7281b15b1412a323b9100011505815e821972f907b2f7e3e6d` |  |
| `dist/globe/vendor/cesium/Workers/chunk-A4PR3MVA.js` | 7.545 | 26 | Drittanbieter (CesiumJS 1.138.0) | `725761d82ed6f86aa329d0f39cd435847943a4b91f9536423a583f4e261361fa` |  |
| `dist/globe/vendor/cesium/Workers/chunk-AJHV7FGT.js` | 8.096 | 26 | Drittanbieter (CesiumJS 1.138.0) | `a46bfdf83d74e01612f8805a51606823c4f8bbe262b0b9f7428cddd2a787eda1` |  |
| `dist/globe/vendor/cesium/Workers/chunk-ATZCLKEP.js` | 2.070 | 26 | Drittanbieter (CesiumJS 1.138.0) | `effe023f4709be87db5c700ef0eb97500c4d0fc09513913ad236d29386a4634d` |  |
| `dist/globe/vendor/cesium/Workers/chunk-BUKMP3AW.js` | 1.649 | 28 | Drittanbieter (CesiumJS 1.138.0) | `1f8f96a71713c5568cdf7c417736385a00bed588b9cde4defcd8822f81aad6ba` |  |
| `dist/globe/vendor/cesium/Workers/chunk-D5QCMU6T.js` | 3.077 | 26 | Drittanbieter (CesiumJS 1.138.0) | `84823a2e212f1766a4d0318f0c97ca770650ff44455d4b8b43e0723548f22a36` |  |
| `dist/globe/vendor/cesium/Workers/chunk-DISRVBHE.js` | 4.891 | 26 | Drittanbieter (CesiumJS 1.138.0) | `8d6a67b15b4e00ae0e3f3bb8e25b79409aa0db46411e4e756ad7a46edadbb0f1` |  |
| `dist/globe/vendor/cesium/Workers/chunk-DZRNINSJ.js` | 3.320 | 26 | Drittanbieter (CesiumJS 1.138.0) | `d53468d0f49c3b17ffc68b41beecff93e937832bb3943fa499ad89ba848af624` |  |
| `dist/globe/vendor/cesium/Workers/chunk-E6GK7MVP.js` | 14.254 | 26 | Drittanbieter (CesiumJS 1.138.0) | `020b7a203a8dd5ac1deeddc4d772747dcebc02c7d8a8dc3e58ec6af639d971ac` |  |
| `dist/globe/vendor/cesium/Workers/chunk-EKCJJ3N6.js` | 2.262 | 26 | Drittanbieter (CesiumJS 1.138.0) | `07db79dedf3e468bcc7134f730cd3adcc08be905d2f25901d9945ae6f3a6421e` |  |
| `dist/globe/vendor/cesium/Workers/chunk-EOGEW5R4.js` | 5.570 | 26 | Drittanbieter (CesiumJS 1.138.0) | `0fd7bd547493ca666fd01ea55a973376c376ef630c82d322ba131a405cb570e6` |  |
| `dist/globe/vendor/cesium/Workers/chunk-FWQONNTL.js` | 2.907 | 26 | Drittanbieter (CesiumJS 1.138.0) | `039261e8c8ef69e3e6a378a0420f5d97e68309882f0e94bcb3c66fb41b73cd55` |  |
| `dist/globe/vendor/cesium/Workers/chunk-FYNDPPUD.js` | 20.747 | 26 | Drittanbieter (CesiumJS 1.138.0) | `ab8a4b2d0c222c675a0b403e9d4c1663fea2b3daad02a7e7b5ec8936ade80488` |  |
| `dist/globe/vendor/cesium/Workers/chunk-GQG3G4OP.js` | 925 | 26 | Drittanbieter (CesiumJS 1.138.0) | `a3f287b41946f9ae93c36cb6edaf24649a9e25daafe811964fd1fdef0ff66939` |  |
| `dist/globe/vendor/cesium/Workers/chunk-H7AFCEEW.js` | 909 | 26 | Drittanbieter (CesiumJS 1.138.0) | `308beb8dc9ee67a2ac4bb603b20bb23016aac0c9510fddd4fa2e3bcf37020fd7` |  |
| `dist/globe/vendor/cesium/Workers/chunk-HYYEAYYI.js` | 5.614 | 26 | Drittanbieter (CesiumJS 1.138.0) | `5afd2b51ee798b53342897b5761961b12d321cbc4d15e2520c9a5dd434e01a44` |  |
| `dist/globe/vendor/cesium/Workers/chunk-JKEOJFWC.js` | 15.908 | 26 | Drittanbieter (CesiumJS 1.138.0) | `46b0e39147620f1f5fe5911221536fc781cc97d238cdd587b94c2ebdfd0d154e` |  |
| `dist/globe/vendor/cesium/Workers/chunk-KCM7BPUF.js` | 6.127 | 26 | Drittanbieter (CesiumJS 1.138.0) | `f0c1547d095119a095a33a90065e5ff1e1918a443c48f0dfebab2b70f40f22dc` |  |
| `dist/globe/vendor/cesium/Workers/chunk-KFTRXUKD.js` | 142.186 | 29 | Drittanbieter (CesiumJS 1.138.0) | `470aef16e6db991198f333eead6091d67894f4968c71c09619a3b242cadb2f46` |  |
| `dist/globe/vendor/cesium/Workers/chunk-KUQFR7AR.js` | 2.666 | 26 | Drittanbieter (CesiumJS 1.138.0) | `053406d107cc3885d0d9892eae03267ca4d9cf89ff5985ffeb55004c24dc1dd1` |  |
| `dist/globe/vendor/cesium/Workers/chunk-LN5LAAB6.js` | 4.212 | 26 | Drittanbieter (CesiumJS 1.138.0) | `f8fc157de7f7d0b91159e656992a1e33b2375c1a1372d9d107cbb3e91ff42356` |  |
| `dist/globe/vendor/cesium/Workers/chunk-MPA4R2GB.js` | 7.207 | 26 | Drittanbieter (CesiumJS 1.138.0) | `640039e07d51dea0fb441a256825b92c418be70729d6187c8f47cb06ed7bc673` |  |
| `dist/globe/vendor/cesium/Workers/chunk-O2APGLZT.js` | 3.182 | 26 | Drittanbieter (CesiumJS 1.138.0) | `546c448e27d0a4c33f70af0c7eb491cb0c4f17665ca3df407123911cb78091cb` |  |
| `dist/globe/vendor/cesium/Workers/chunk-OBYHY7FI.js` | 5.098 | 26 | Drittanbieter (CesiumJS 1.138.0) | `219bc1fe83b3f167aa6ca41a7ed0c3e565ed5290dab5a85e4fdca4ba1c3ae3c6` |  |
| `dist/globe/vendor/cesium/Workers/chunk-ORULHQGP.js` | 1.380 | 26 | Drittanbieter (CesiumJS 1.138.0) | `54a57c215b9af6009be6db48f66fc12a32b872e4eeb3d0809375213088c1ac55` |  |
| `dist/globe/vendor/cesium/Workers/chunk-OXROQHTA.js` | 11.429 | 26 | Drittanbieter (CesiumJS 1.138.0) | `a83974e4ea149999004c97f13e09a7de978efd58b23882f736824938a59f8f09` |  |
| `dist/globe/vendor/cesium/Workers/chunk-OXTEQVCI.js` | 4.601 | 26 | Drittanbieter (CesiumJS 1.138.0) | `3da993cfb876ed0fa6c44f34a6e95711ff0e4c8083d9d648db12842f3613be3e` |  |
| `dist/globe/vendor/cesium/Workers/chunk-PCPQUQVR.js` | 1.748 | 26 | Drittanbieter (CesiumJS 1.138.0) | `4e717353552a646bd0d9ddb4a59934ac935e5ce64e349c5772cdb96cef21be61` |  |
| `dist/globe/vendor/cesium/Workers/chunk-PEBY7VTV.js` | 58.499 | 26 | Drittanbieter (CesiumJS 1.138.0) | `4eaa1029ca5bd3bb775a09604996610a0343e7b299459ee911481ad18546fe08` |  |
| `dist/globe/vendor/cesium/Workers/chunk-PFZE4BTU.js` | 7.241 | 26 | Drittanbieter (CesiumJS 1.138.0) | `9ac00844453c50f9d97a36e3c5a67e9f66a69317c752aac6add44676b333b30a` |  |
| `dist/globe/vendor/cesium/Workers/chunk-PRVWLZSS.js` | 916 | 26 | Drittanbieter (CesiumJS 1.138.0) | `f072e03c32d3612eedcdcd8c969a4289383b790de16bcfd1d8141e77e627310b` |  |
| `dist/globe/vendor/cesium/Workers/chunk-PSBBGQNG.js` | 5.669 | 26 | Drittanbieter (CesiumJS 1.138.0) | `9a5957e92913140b86414e3fd8fd93f1656b6e1b4913b6f611138160e295a4a1` |  |
| `dist/globe/vendor/cesium/Workers/chunk-QK7VO4IK.js` | 2.198 | 26 | Drittanbieter (CesiumJS 1.138.0) | `af5e29f0f0d21766bc262c012df3c1f8dc1d498a731c8835397a5b395873abd6` |  |
| `dist/globe/vendor/cesium/Workers/chunk-SLSOQFAE.js` | 14.561 | 26 | Drittanbieter (CesiumJS 1.138.0) | `ea551eb715374f0c955e383aa796d89a553b45a89c628f7f4aa75a081e749371` |  |
| `dist/globe/vendor/cesium/Workers/chunk-TJPKIFSX.js` | 11.813 | 26 | Drittanbieter (CesiumJS 1.138.0) | `432b0785aff3639072e4a6408b0e577566b176246136aae89b19b3a9ebd10eb8` |  |
| `dist/globe/vendor/cesium/Workers/chunk-TODZU3UG.js` | 21.220 | 28 | Drittanbieter (CesiumJS 1.138.0) | `8e1d8577695521ccb79af64cf55e314ee9771c76d2bad5312fd6a0210eae65bb` |  |
| `dist/globe/vendor/cesium/Workers/chunk-UA3N5FHD.js` | 1.073 | 26 | Drittanbieter (CesiumJS 1.138.0) | `22a47c73107465880b2cad473bac099d754003285591e9291e078fe7483113a5` |  |
| `dist/globe/vendor/cesium/Workers/chunk-UGLK7TQB.js` | 4.788 | 26 | Drittanbieter (CesiumJS 1.138.0) | `cda50cd033250694bee0aa4cadaceef4ec509d0b500833b1701438f64a7469e8` |  |
| `dist/globe/vendor/cesium/Workers/chunk-V62DYOIH.js` | 28.070 | 29 | Drittanbieter (CesiumJS 1.138.0) | `48ab10ac7e87a9b1b9fb91b149ae359754086469493143785e8139eb6d481296` |  |
| `dist/globe/vendor/cesium/Workers/chunk-VIWNLE3Z.js` | 2.936 | 27 | Drittanbieter (CesiumJS 1.138.0) | `a80f416f566edc5ac36b75df9455c5d19b72bf25d903527545583217c428fc47` |  |
| `dist/globe/vendor/cesium/Workers/chunk-VPTIX6XL.js` | 31.692 | 26 | Drittanbieter (CesiumJS 1.138.0) | `408d3d2898fcbdd34e75978f7f0183303cb691513545e14635a44681dac8d902` |  |
| `dist/globe/vendor/cesium/Workers/chunk-VSVKNUZB.js` | 16.832 | 26 | Drittanbieter (CesiumJS 1.138.0) | `5b85b490e8872cebc0730c42d19b801224e098fc92d69ac7ab8843f9c58c1825` |  |
| `dist/globe/vendor/cesium/Workers/chunk-WLZ7SXSS.js` | 10.016 | 26 | Drittanbieter (CesiumJS 1.138.0) | `fd9d4d64ebf5644445b23fc6664deec498e2e534e69e03ec75401b96be9ed77f` |  |
| `dist/globe/vendor/cesium/Workers/chunk-WV2SHQ7E.js` | 21.092 | 26 | Drittanbieter (CesiumJS 1.138.0) | `11720137cb68ec8847e961faaa146abdaac256ae00fb279100338ff144f302c6` |  |
| `dist/globe/vendor/cesium/Workers/chunk-X4HNF2DH.js` | 12.774 | 26 | Drittanbieter (CesiumJS 1.138.0) | `c5d2fe76cf892d97c6e7245cade41d95d866112d1ad602c44bf56e0c96c017f5` |  |
| `dist/globe/vendor/cesium/Workers/chunk-XUZLSSMZ.js` | 5.986 | 26 | Drittanbieter (CesiumJS 1.138.0) | `6fb2b09d2adbb9a89729653bc2b4a101af246916f1893f699af8ddc454711087` |  |
| `dist/globe/vendor/cesium/Workers/chunk-YQTAAITT.js` | 1.235 | 27 | Drittanbieter (CesiumJS 1.138.0) | `ac41026d9c574fa649ce337bdbe39c886b529c937260698beb9c595b705b3c73` |  |
| `dist/globe/vendor/cesium/Workers/chunk-Z7UZ2XGJ.js` | 2.440 | 26 | Drittanbieter (CesiumJS 1.138.0) | `15015a794c2006d95b1a2e677fe8acd59c3f7447282a946772f74091cd4872d1` |  |
| `dist/globe/vendor/cesium/Workers/combineGeometry.js` | 1.671 | 26 | Drittanbieter (CesiumJS 1.138.0) | `3d34164c1df39c8db2d8c69577431c696a50f48bdc34ead82d807a6007584c4d` |  |
| `dist/globe/vendor/cesium/Workers/createBoxGeometry.js` | 1.444 | 26 | Drittanbieter (CesiumJS 1.138.0) | `8efaa97944eca3044dfa4fc0ec73873f06776113055825cd2d728b48a7630a94` |  |
| `dist/globe/vendor/cesium/Workers/createBoxOutlineGeometry.js` | 3.981 | 26 | Drittanbieter (CesiumJS 1.138.0) | `d64177b136214905667fd09babd40b33f70e551857636f469c4def457c5c54f4` |  |
| `dist/globe/vendor/cesium/Workers/createCircleGeometry.js` | 3.799 | 26 | Drittanbieter (CesiumJS 1.138.0) | `f23b3a84c711bb9d6b927ee98c80df51de7480f8ef7b590b5910207a06802856` |  |
| `dist/globe/vendor/cesium/Workers/createCircleOutlineGeometry.js` | 2.856 | 26 | Drittanbieter (CesiumJS 1.138.0) | `bf9c308edec81f21b76f9c72500231f8a6aa89c36a1f7c067227f9cbe3d89903` |  |
| `dist/globe/vendor/cesium/Workers/createCoplanarPolygonGeometry.js` | 6.901 | 26 | Drittanbieter (CesiumJS 1.138.0) | `51582fed9b6e4b2c5f7dbe0dc025addede2dc48366260cecc4b7da384ed85721` |  |
| `dist/globe/vendor/cesium/Workers/createCoplanarPolygonOutlineGeometry.js` | 3.582 | 26 | Drittanbieter (CesiumJS 1.138.0) | `79638727452de75866f53c8367d5b84702819976e148df131d0bbff0ea95a73f` |  |
| `dist/globe/vendor/cesium/Workers/createCorridorGeometry.js` | 15.298 | 26 | Drittanbieter (CesiumJS 1.138.0) | `5975e81645c21e1e41c58a9e03d5f8377b576983eea5937040e9fdb50f276aac` |  |
| `dist/globe/vendor/cesium/Workers/createCorridorOutlineGeometry.js` | 7.550 | 26 | Drittanbieter (CesiumJS 1.138.0) | `c04a2c7b6030f3e245f38a251f0fb460360d06fc57b2667b01d38e7a237fc9c7` |  |
| `dist/globe/vendor/cesium/Workers/createCylinderGeometry.js` | 1.500 | 26 | Drittanbieter (CesiumJS 1.138.0) | `b9e24c7064c8e6e25fb0b261a4101cce2d50959c2f54d03066d685d26b3ce7f4` |  |
| `dist/globe/vendor/cesium/Workers/createCylinderOutlineGeometry.js` | 3.907 | 26 | Drittanbieter (CesiumJS 1.138.0) | `0239a4d03d3206bd6824fb049f19bc589e63a3478fce95ba478fe7e639de76ce` |  |
| `dist/globe/vendor/cesium/Workers/createEllipseGeometry.js` | 1.751 | 26 | Drittanbieter (CesiumJS 1.138.0) | `e0b9983d1517450406903d460bc4fe82854e5249bd37795d8a15df2edafe1d97` |  |
| `dist/globe/vendor/cesium/Workers/createEllipseOutlineGeometry.js` | 1.555 | 26 | Drittanbieter (CesiumJS 1.138.0) | `0a50162f59625c89c6e2381630ba99ba80f271848d17065166bf6dd2e6838821` |  |
| `dist/globe/vendor/cesium/Workers/createEllipsoidGeometry.js` | 1.472 | 26 | Drittanbieter (CesiumJS 1.138.0) | `4add1464c3207499c1ccee0b6e40546759229d4cbfe1c4ed06c055185d4f57e0` |  |
| `dist/globe/vendor/cesium/Workers/createEllipsoidOutlineGeometry.js` | 1.453 | 26 | Drittanbieter (CesiumJS 1.138.0) | `1c7d9cdd4525813748a3fd237f3adc4b47032f009e16d51dd4c346c6e87a1750` |  |
| `dist/globe/vendor/cesium/Workers/createFrustumGeometry.js` | 1.444 | 26 | Drittanbieter (CesiumJS 1.138.0) | `9675f9ed191348c8b5a8116d5536287bcde8b4502b5dd5fd700bf6e2cc7fa7f5` |  |
| `dist/globe/vendor/cesium/Workers/createFrustumOutlineGeometry.js` | 3.603 | 26 | Drittanbieter (CesiumJS 1.138.0) | `9c46e2b527c8df80661a0f05cc2ab2931fce70b4e2252bfede8b4c25a9378b1f` |  |
| `dist/globe/vendor/cesium/Workers/createGeometry.js` | 6.366 | 26 | Drittanbieter (CesiumJS 1.138.0) | `2a124b0a82de02740783f52550e60517c42ef99b48753ba645875a1fbb2aaa7b` |  |
| `dist/globe/vendor/cesium/Workers/createGroundPolylineGeometry.js` | 16.738 | 26 | Drittanbieter (CesiumJS 1.138.0) | `b243679dbbf7a655b2bc85e033f3c844e093900ee69ed67fb3a7b00e9f6e77d4` |  |
| `dist/globe/vendor/cesium/Workers/createPlaneGeometry.js` | 3.216 | 26 | Drittanbieter (CesiumJS 1.138.0) | `84536041a6f82fc7fa505fca62c6fb155498a61d413bc2b37d6ddc49376abf3e` |  |
| `dist/globe/vendor/cesium/Workers/createPlaneOutlineGeometry.js` | 2.123 | 26 | Drittanbieter (CesiumJS 1.138.0) | `8ae8d6f167e836fd0a0a525b0837ee3213f67ecd25572152aa9aa9741586f358` |  |
| `dist/globe/vendor/cesium/Workers/createPolygonGeometry.js` | 18.690 | 26 | Drittanbieter (CesiumJS 1.138.0) | `0a1fee27028a451b2bfbfd4d795ebfa8f90949133984baf05741181f3ebb76ea` |  |
| `dist/globe/vendor/cesium/Workers/createPolygonOutlineGeometry.js` | 7.757 | 26 | Drittanbieter (CesiumJS 1.138.0) | `65a361ef0589dbe46afce6833ae7f19a750d0c75def3a3abcdc6997723969667` |  |
| `dist/globe/vendor/cesium/Workers/createPolylineGeometry.js` | 6.887 | 26 | Drittanbieter (CesiumJS 1.138.0) | `2687be9025076cb2354c8b8a656681f5883e7e43869ffe7e9f0635e43fae8894` |  |
| `dist/globe/vendor/cesium/Workers/createPolylineVolumeGeometry.js` | 5.643 | 26 | Drittanbieter (CesiumJS 1.138.0) | `43cfd7130d0cff02595bbb35295611b27cbf66d7d434eacfe77d4fec3c2f0c97` |  |
| `dist/globe/vendor/cesium/Workers/createPolylineVolumeOutlineGeometry.js` | 4.314 | 26 | Drittanbieter (CesiumJS 1.138.0) | `48427db435ea4950eb314cc2d3ff3c8aa08f589076feefeecfc8759a4fc65b25` |  |
| `dist/globe/vendor/cesium/Workers/createRectangleGeometry.js` | 15.013 | 26 | Drittanbieter (CesiumJS 1.138.0) | `4a104a70e6683c23d374c91acf04a0b107a7a3a936f3433d804002afee39da96` |  |
| `dist/globe/vendor/cesium/Workers/createRectangleOutlineGeometry.js` | 6.225 | 26 | Drittanbieter (CesiumJS 1.138.0) | `1a8b71754cde1891656d3696c22a87233f4923b057af824140e44c83f9b8dfa7` |  |
| `dist/globe/vendor/cesium/Workers/createSimplePolylineGeometry.js` | 5.892 | 26 | Drittanbieter (CesiumJS 1.138.0) | `17c32e303685ee03fa85ebc4639f9feee67cfa74fcd1bdb47ca2724cf1d93008` |  |
| `dist/globe/vendor/cesium/Workers/createSphereGeometry.js` | 2.324 | 26 | Drittanbieter (CesiumJS 1.138.0) | `67b5b6bd3076d90045673e9df3e36c57c2c267c70b3d03783c2249a7b39e450b` |  |
| `dist/globe/vendor/cesium/Workers/createSphereOutlineGeometry.js` | 2.268 | 26 | Drittanbieter (CesiumJS 1.138.0) | `b2df4a981d33ffdd0d7d460bdd8b02054330d19a53fc25b998443bc2eeb26920` |  |
| `dist/globe/vendor/cesium/Workers/createTaskProcessorWorker.js` | 932 | 26 | Drittanbieter (CesiumJS 1.138.0) | `fa70773805b8db6657b32ed7e9b602e83c7e5cab58ada99f0d7a9bd74c8b964d` |  |
| `dist/globe/vendor/cesium/Workers/createVectorTileClampedPolylines.js` | 6.040 | 26 | Drittanbieter (CesiumJS 1.138.0) | `7e4748ac5e4c9229fae9ca322b38037237c499f028a079d9b27bed976b77c004` |  |
| `dist/globe/vendor/cesium/Workers/createVectorTileGeometries.js` | 5.765 | 26 | Drittanbieter (CesiumJS 1.138.0) | `b81f68b2a1289a3703166e19342bfaa58afe172c619764736cee5e9d0a4a8e90` |  |
| `dist/globe/vendor/cesium/Workers/createVectorTilePoints.js` | 1.956 | 26 | Drittanbieter (CesiumJS 1.138.0) | `f6cc36677aca088dea9e860874840d2122c233eee209389d1356a4f356c3af2c` |  |
| `dist/globe/vendor/cesium/Workers/createVectorTilePolygons.js` | 5.413 | 26 | Drittanbieter (CesiumJS 1.138.0) | `717b90a08c72f3401a29f9b45be4c36676111369104e05e58038e30ae568648b` |  |
| `dist/globe/vendor/cesium/Workers/createVectorTilePolylines.js` | 3.617 | 26 | Drittanbieter (CesiumJS 1.138.0) | `21a15040764aacb21bfd2e23b95913ee6d104491fffce7508875c0ea4e9c2183` |  |
| `dist/globe/vendor/cesium/Workers/createVerticesFromCesium3DTilesTerrain.js` | 2.081 | 26 | Drittanbieter (CesiumJS 1.138.0) | `2ed0a2355cbc9b0c88f3cfda471d9d81679c78b57a4af5c6b5a5f6c539fbaafe` |  |
| `dist/globe/vendor/cesium/Workers/createVerticesFromGoogleEarthEnterpriseBuffer.js` | 7.863 | 26 | Drittanbieter (CesiumJS 1.138.0) | `b1eaac3cbb2c9ff08fbf4ba5def9d24baa94f7fa891cd088896102f8bd582bf0` |  |
| `dist/globe/vendor/cesium/Workers/createVerticesFromHeightmap.js` | 28.253 | 26 | Drittanbieter (CesiumJS 1.138.0) | `4422d36d98d84ed7c026af8144bfd925d12b5802fc38205f0cfc500defa99394` |  |
| `dist/globe/vendor/cesium/Workers/createVerticesFromQuantizedTerrainMesh.js` | 5.846 | 26 | Drittanbieter (CesiumJS 1.138.0) | `4bae2da6cd4d8f3ed228efbfbf012a9f643788e02fe0c06e95ac7b4c5b8b7158` |  |
| `dist/globe/vendor/cesium/Workers/createWallGeometry.js` | 6.504 | 26 | Drittanbieter (CesiumJS 1.138.0) | `bae5c0406ed8d3ed3d6191c939a5b73d80675d6acb7a29017a2f1443fea03d6c` |  |
| `dist/globe/vendor/cesium/Workers/createWallOutlineGeometry.js` | 4.865 | 26 | Drittanbieter (CesiumJS 1.138.0) | `23cb9c2caa0af91406e9ff8857e0b6b1ef89cc53750c3861788d7c7b8496d5f9` |  |
| `dist/globe/vendor/cesium/Workers/decodeDraco.js` | 5.045 | 26 | Drittanbieter (CesiumJS 1.138.0) | `76580215d7725f60770ae9da5381e8348ea50abb3d45f0ac91e99398772effdf` |  |
| `dist/globe/vendor/cesium/Workers/decodeGoogleEarthEnterprisePacket.js` | 27.259 | 26 | Drittanbieter (CesiumJS 1.138.0) | `b2e3c3378cdafd9fe2c3de18009da35400055620c02a348fbf4324e65dc69d05` |  |
| `dist/globe/vendor/cesium/Workers/decodeI3S.js` | 17.157 | 26 | Drittanbieter (CesiumJS 1.138.0) | `f04740d40f2345eb35b665fcb3892dc7a0772efdc605556ed84780527d6e298d` |  |
| `dist/globe/vendor/cesium/Workers/gaussianSplatSorter.js` | 1.266 | 26 | Drittanbieter (CesiumJS 1.138.0) | `a03b75b8280eb3d16e2c1bc3aca84a45240a4cab12353811bec5c75f1ff2aba1` |  |
| `dist/globe/vendor/cesium/Workers/gaussianSplatTextureGenerator.js` | 1.304 | 26 | Drittanbieter (CesiumJS 1.138.0) | `3a91175df2e66bda6265c7e18eb031e40acd7f4d50dda97702d926f0fa4a5d29` |  |
| `dist/globe/vendor/cesium/Workers/incrementallyBuildTerrainPicker.js` | 2.098 | 26 | Drittanbieter (CesiumJS 1.138.0) | `86189f3c397f9b08d3c0a8fadca0622b347f3afeccb8d73732a6df7927644019` |  |
| `dist/globe/vendor/cesium/Workers/transcodeKTX2.js` | 60.172 | 56 | Drittanbieter (CesiumJS 1.138.0) | `a87a13ff42f2249b2ea33dba9a946e42c8e6452141ffbcdfd9c9859ffebd8106` |  |
| `dist/globe/vendor/cesium/Workers/transferTypedArrayTest.js` | 979 | 26 | Drittanbieter (CesiumJS 1.138.0) | `42ad49cc080d980c34058f4ac7bb5d7f13e18fc7e14531850505b788129d6898` |  |
| `dist/globe/vendor/cesium/Workers/upsampleQuantizedTerrainMesh.js` | 9.693 | 26 | Drittanbieter (CesiumJS 1.138.0) | `067080b2242f70b169ed76177e8f009a22365b2ddcb2fa7fc4440c8da0ad5727` |  |
| `dist/globe/vendor/cesium/Workers/upsampleVerticesFromCesium3DTilesTerrain.js` | 2.241 | 26 | Drittanbieter (CesiumJS 1.138.0) | `1ecf29f1ac30d06ad82bb997a468d24e4629c20b06955e62648978e88d1d2453` |  |
| `dist/index.html` | 14.354 | 80 | Layereditor / geteilte Styles | `16cd9e0ea4f9e19e4ed604d91218d455e4b80ec9bf265ee6e86daadc95785daf` | `dist/studio/index.html` |
| `dist/kart/index.html` | 1.440 | 7 | Kart und Gelände | `6f3f75ec4a73f4baf059fdbff199f2adb4a516471fe4fb0cc96bc0dc618773e7` |  |
| `dist/kart/insights.js` | 17.102 | 222 | Kart und Gelände | `2fa2901a3b04a041dcd622736a29f3ed22e8a3e7ab61a4a4f0ffbb34bb961ea7` |  |
| `dist/kart/integration.html` | 3.781 | 45 | Kart und Gelände | `a3e887e1def219dd5c215b3418f9f9d833fe5a5b125fc64d1e311eefbaa9efe9` |  |
| `dist/kart/kart.css` | 5.806 | 66 | Kart und Gelände | `dd6e9222c32b54c6334a8b0ebb55f0cfa12bcd1cd5efae0ff2a2a3b1a731d7bb` |  |
| `dist/kart/kart.js` | 7.591 | 141 | Kart und Gelände | `b502f42e9aa9bc8c4b184f1c9720a01ccb23980fbf4c964804012297d2d81b36` |  |
| `dist/kart/main.js` | 43.815 | 634 | Kart und Gelände | `630d3ede802c6d19bb8d1428f8558179dbde488b54a244d78dc6a232cd91accf` |  |
| `dist/kart/pedestrian.js` | 4.421 | 78 | Kart und Gelände | `11548e9360a7c123517fa3c2646047b42eb81aa2113e3f7eb79c66499d8b918c` |  |
| `dist/kart/plane.js` | 5.621 | 87 | Kart und Gelände | `7b1a21f2d7520cf210ee05192516e8e8e27c47216b167ee9bdc069ad1789756e` |  |
| `dist/kart/scenery.js` | 19.969 | 292 | Kart und Gelände | `6ded44b23a54b93d6d79ce22b8f1c7ca2a26bd9f3a513031b8159390b9fba01a` |  |
| `dist/kart/track.js` | 6.088 | 105 | Kart und Gelände | `e90ad8aa853e8dcc033826535902626f072ed2de5ca0d8ba0df42e0dde40c100` |  |
| `dist/map-studio/editor.js` | 27.797 | 269 | Map Studio | `470a9e1b78f717c1460f5e8dfb3d1a3dcc8c92ed1a86686ea7fd8f6227b66544` |  |
| `dist/map-studio/history.js` | 922 | 21 | Map Studio | `8da76f8439cf9e3595939f71a8a83d5a32caa7d500d8b88bc709c90a10d529ba` |  |
| `dist/map-studio/index.html` | 13.630 | 20 | Map Studio | `4a143175736fb12622444ff586269d9d679e56da20c89637a19f91fbaec2e125` |  |
| `dist/map-studio/model.js` | 17.552 | 218 | Map Studio | `688ab4c1a2cff5c90b3f9eadab5ff3740078ba5e888cface0b20f97e7cf846f7` |  |
| `dist/map-studio/project.js` | 6.116 | 89 | Map Studio | `31250709e8b11ca6f72a6e6eae2a5c17aa79263338358d641f5e2aff0c1b80a8` |  |
| `dist/map-studio/renderer.js` | 15.602 | 132 | Map Studio | `32c5f7869b5ebb6b0c1d30bd89692b08cc32ccb3f7da82a43521d738223d952f` |  |
| `dist/map-studio/storage.js` | 5.563 | 87 | Map Studio | `974b32636ce938f18743ebe43b82ab1cdaf4f9cb3abe4804721ea8d02c036587` |  |
| `dist/map-studio/studio.css` | 16.668 | 12 | Map Studio | `6e02464436880b9c5f5b22cd4fa251178736178255d36279d0509622a839ccd6` |  |
| `dist/motionspec-theme.css` | 17.690 | 287 | Layereditor / geteilte Styles | `b1a54686c185a96e401ab45ba134e872101e255c0c81a1052db8ae72d3ac0d0e` |  |
| `dist/runtime/assets/codec.js` | 3.201 | 55 | Runtime (Begehmodus) | `756e1d28c9a4a1a32bf390ba1abbcf6e30673d9b74b405425160126d09343964` |  |
| `dist/runtime/camera-rig.js` | 6.694 | 95 | Runtime (Begehmodus) | `035a98dc03b9e2c49ef2febec3dc2c8f82675623bd1a04d84e02c72a93679a23` |  |
| `dist/runtime/city-layer.js` | 9.960 | 132 | Runtime (Begehmodus) | `e3b5f4ee2e6fb0d758fa148079b407ab61edde30ddd8275144c00a8ea0de80a6` |  |
| `dist/runtime/device-check.js` | 3.267 | 47 | Runtime (Begehmodus) | `a76a92fb7637a7ba57f43324e8deb02c7eebe3dd1b8cafea2ac5858788bec08d` |  |
| `dist/runtime/frame-loop.js` | 2.757 | 45 | Runtime (Begehmodus) | `de6ef54baa36ee2424a5fe45cc5932657ac6cd058de1316ce85c2b3173fef8b2` |  |
| `dist/runtime/frozen.js` | 1.380 | 19 | Runtime (Begehmodus) | `df8ed17f23d92f5377977d2efd409c6efdd71fba10aea1b41ddefa31b4969c42` |  |
| `dist/runtime/geometry/polygon.js` | 5.599 | 92 | Runtime (Begehmodus) | `981036914f249e308092179178aca3b03687a3d4d318e53fa166512fc539bf2e` |  |
| `dist/runtime/gpu-context.js` | 804 | 10 | Runtime (Begehmodus) | `bb29e6a208896910a57c95ee45eeb539c8f901cb281c9d844c81537258fb01c4` |  |
| `dist/runtime/gpu/cull.js` | 8.376 | 145 | Runtime (Begehmodus) | `4ca8058447457da8f82247050f016092a781e24a57da7dea366d6458ad6b7f4b` |  |
| `dist/runtime/ground-layer.js` | 4.413 | 66 | Runtime (Begehmodus) | `fb68a25613394df503d75dfa2210c1124f134acee61946e51969a337a64bff3a` |  |
| `dist/runtime/hud.js` | 1.921 | 30 | Runtime (Begehmodus) | `2009e2fb6e9407cf199d0c8cb478983ee1d7098533bf2af8b367f0e53022908d` |  |
| `dist/runtime/input.js` | 3.338 | 49 | Runtime (Begehmodus) | `5ee827e5c9630ee4fdb6620ee3fafc3f868db812ab55566637cfd7a1c38a4853` |  |
| `dist/runtime/lod/chunk-lod.js` | 2.694 | 41 | Runtime (Begehmodus) | `892b4c20ddf7ec82ae3da3a30ac5ceb33f1c9c42d2b2b51e066b4726b7b3c509` |  |
| `dist/runtime/map-adapter.js` | 4.509 | 67 | Runtime (Begehmodus) | `7b03a754d1ce3394603b0d4666165db3071fcc0286fd599b0c2db8b52c10dc88` |  |
| `dist/runtime/net/client.js` | 7.176 | 107 | Runtime (Begehmodus) | `ff804f0ad0ab03ad6317165c6e035fa6aa69dc9bc0d48a5e27cdd60a74e1f255` |  |
| `dist/runtime/net/protocol.js` | 9.074 | 153 | Runtime (Begehmodus) | `d38aff91d52c87c66d76126ec2510024953f99e752de688e2b015b96a1a7f1bc` |  |
| `dist/runtime/perf-meter.css` | 2.319 | 22 | Runtime (Begehmodus) | `5219b8b0b380d0102883962eec0c42c00ca11d14267291e0d6a565bc21f5841f` |  |
| `dist/runtime/perf-meter.js` | 12.147 | 147 | Runtime (Begehmodus) | `d030cdd81cb8e073a8c3c6535cde6677f013268d455cfb68d8f1d15750d66063` |  |
| `dist/runtime/perf-probes.js` | 931 | 13 | Runtime (Begehmodus) | `95668536747c5574f84608c6c5ea513eabf0afcf7b21d6cad88f64882b4d6d01` |  |
| `dist/runtime/physics/adapter.js` | 10.613 | 152 | Runtime (Begehmodus) | `e1f62ba51d6dc18519ad5352081cf223452b427092d320d81b47b944b4524014` |  |
| `dist/runtime/quality.js` | 4.513 | 66 | Runtime (Begehmodus) | `490ecf62a051a061b44549cb4515c5a8fbfb5ac1ea9a9aa4907c104ecc50a37f` |  |
| `dist/runtime/scan/adapter.js` | 5.780 | 81 | Runtime (Begehmodus) | `050bbbcae521e1784d76e819405cf5ba5e7be8a1c65a17338724b8bc393709ad` |  |
| `dist/runtime/scan/loader.js` | 10.209 | 137 | Runtime (Begehmodus) | `0f75634cadf8b93b6623a47f0ed0e97f1ec692769fdd3bd200219a6e56828733` |  |
| `dist/runtime/session.js` | 2.821 | 49 | Runtime (Begehmodus) | `a919b4c6f1d794bf29dfc8633697d78583a61af7d7b1f262623ad2e7db9b1e87` |  |
| `dist/runtime/sim/layout.js` | 2.834 | 62 | Runtime (Begehmodus) | `d7f58c5ba78d13deafe00b10f58677a1a9d9ba301cf9a0cb597cd2e161437966` |  |
| `dist/runtime/sim/sim.wasm` | 29.162 | — | Runtime (Begehmodus) | `762547eab32ab569197c6b89f261b32edaa18a6b2a57561b54fb02e0032b11e0` |  |
| `dist/runtime/sim/snapshot.js` | 2.534 | 54 | Runtime (Begehmodus) | `ddb2052b2b712a71fb9cddf7d3e964990b1d6578a742753bf9169505a7644410` |  |
| `dist/runtime/sim/wasm.js` | 4.478 | 64 | Runtime (Begehmodus) | `ef2336f9d6d1438781a99ecbc5a90fa4d611d555fcd4b9626814e6fedc3a9dd3` |  |
| `dist/runtime/walk-host.js` | 16.781 | 198 | Runtime (Begehmodus) | `9005e199cafdb1b61666e9bbd51cdcc07b056723bab1ce75aa44be05f3525a44` |  |
| `dist/runtime/walker.js` | 4.711 | 74 | Runtime (Begehmodus) | `c4d6bc251f4b815a8ac38b6561f687348d67cab7011139d952453407f1bfda78` |  |
| `dist/studio/index.html` | 14.354 | 80 | Layereditor / geteilte Styles | `16cd9e0ea4f9e19e4ed604d91218d455e4b80ec9bf265ee6e86daadc95785daf` | `dist/index.html` |
| `dist/styles.css` | 34.585 | 14 | Layereditor / geteilte Styles | `40b64a96590bfc1bb3f1fb2881f686520100e7c4718b02484be1457b9958328b` |  |
| `dist/world-studio/city-store.js` | 1.143 | 19 | World Studio | `2a5f1971b7d8be4ffd112a0550398a9429d80db4048ab7cb75cf3b7bc4b11fd2` |  |
| `dist/world-studio/editor.js` | 38.961 | 356 | World Studio | `0b7f236029f557becd07083d9a9bcb18ad1d6695a8a0aeb6b5a6c3b2b8679f49` |  |
| `dist/world-studio/index.html` | 20.409 | 38 | World Studio | `933aea2e257405c8e90b4ba0060e47dee9d91ba486e14a56242d7f40b82477e7` |  |
| `dist/world-studio/model.js` | 4.464 | 53 | World Studio | `d8d14480f6b28d4c7a822cf98efeab21795fcbd618436574663d7c71a8a4c183` |  |
| `dist/world-studio/renderer.js` | 34.565 | 394 | World Studio | `e45e61ca9f91ef91ea8e65f32e80f56970fff9a30f262b632594247104dc6afc` |  |
| `dist/world-studio/studio.css` | 27.150 | 34 | World Studio | `eb06c9f1301c39ff0f644795273574201df183ebdddbf60f1faff981ce1c1adb` |  |
| `dist/world-studio/walk.js` | 4.041 | 61 | World Studio | `e2265ba00e7a8f84278d689eb2d9681d5ab5b5af6a875b40118261303230be9d` |  |
| `dist/worldport/core.mjs` | 8.640 | 104 | Datenimport | `6ca10c53f66a8a56c1326a5c4e177888984d01f535d53279358d8477b1a92bc9` |  |
| `dist/worldport/osm-ground.mjs` | 13.527 | 206 | Datenimport | `429ae7aa050a4a512d747548b0cd58d00d19486509bf8491d76da1eee0b9fb29` |  |
| `dist/worldport/osm.mjs` | 13.225 | 165 | Datenimport | `b1807fc203d776f7755d7aee4b25c1898e2fdc517747747dae201388fe8f2b90` |  |
| `dist/worlds/assets/alpine.svg` | 450 | — | Welt-Vorlagen (geteilt) | `923f4f55cd09b4754f8b7a354f5864af46ac35a4267b71164bf07cc093cf7e3a` |  |
| `dist/worlds/assets/dune.svg` | 448 | — | Welt-Vorlagen (geteilt) | `e6991416f73d2ba01583ba1d6ffdb24058c981a1b4d2a1c1109b317cda08b87e` |  |
| `dist/worlds/assets/neon.svg` | 448 | — | Welt-Vorlagen (geteilt) | `f9581d446393e694346b0feaec45e74d635b9285b0fa87f5584155b1ce37c504` |  |
| `dist/worlds/assets/ocean.svg` | 449 | — | Welt-Vorlagen (geteilt) | `cde84ec5d89ff4d20b9091b70e4fc4872ef4810374eb6a4befab87daad9d037e` |  |
| `dist/worlds/assets/orbital.svg` | 451 | — | Welt-Vorlagen (geteilt) | `010c0335c1f0ecbf7d39635ce45023b25ea9b5404ae3ec9a5c79da1b3ae94234` |  |
| `dist/worlds/data.js` | 11.624 | 28 | Welt-Vorlagen (geteilt) | `2bacbc55ff474bb6ff67191b3479692814b685527d3faba89fef1ef1d71aba28` |  |
| `dist/worlds/scene.js` | 16.235 | 107 | Welt-Vorlagen (geteilt) | `e3072cd9ceb04e7b03684404251d1376ea5832b0662dcac949df599d8e509cbd` |  |
| `dist/worlds/vendor/GLTFLoader.js` | 114.750 | 4890 | Drittanbieter (Three.js 0.180.0) | `1f952bb50caf694372f5b845383e11cd86065fd0b724857a535d0b7ac2d4c8fc` |  |
| `dist/worlds/vendor/LICENSE.txt` | 1.081 | 21 | Drittanbieter (Three.js 0.180.0) | `bfe119ea4fd413f5f7ca3fcd63adb0c4a073ed39daa2fe7d3e6b769e21272601` |  |
| `dist/worlds/vendor/OrbitControls.js` | 38.715 | 1860 | Drittanbieter (Three.js 0.180.0) | `06864a0fcb647730bfbc690b6c25a121199d716a3e299a40158509cbd247c3bf` |  |
| `dist/worlds/vendor/TransformControls.js` | 49.409 | 1918 | Drittanbieter (Three.js 0.180.0) | `92b8c2af99a0b4f149e7f89b47096258f7270ad945f75d2c01676fe99363c9be` |  |
| `dist/worlds/vendor/three.core.js` | 1.403.455 | 58773 | Drittanbieter (Three.js 0.180.0) | `eb077d2417f61d3e6d9264c317cabc4ea35769ed6b0ab533067292a550784c20` |  |
| `dist/worlds/vendor/three.module.js` | 603.113 | 18251 | Drittanbieter (Three.js 0.180.0) | `c8211c69345d2e9949dc7a8ac969380497aa0600a5a8ac6a459c8cd02dd9cb8a` |  |
| `dist/worlds/vendor/utils/BufferGeometryUtils.js` | 35.552 | 1435 | Drittanbieter (Three.js 0.180.0) | `7ce3f7739d1e459c3a093c89ef9833313a5bb3ef32cff195ef2cfa29a9ce66a9` |  |
| `docs/AUDIT_2026-10-06.md` | 5.300 | 28 | Dokumentation | `9ab5a741fe1fcf138244348e3bb5b2b701c7cb6edb1e1dfea3cffad1597ed3ef` |  |
| `docs/FINDINGS.md` | 4.519 | 38 | Dokumentation | `e16030eb689aae342b0c50a1d4d9eeb1bd11e467e52ba4c876ac7b6c7cdb79cf` |  |
| `docs/GETTING_STARTED.md` | 16.985 | 208 | Dokumentation | `7308ca6370cb3dd4db769ad96d7798d2d101b6507cf2f3a6faee705cef9cec3d` |  |
| `docs/INTEGRATIONS.md` | 4.454 | 39 | Dokumentation | `afe9392182a497fa90b8bd6770545ee1f62f58c4688269bf997136380a6bbbbd` |  |
| `docs/LIMITS.md` | 16.380 | 110 | Dokumentation | `cc428f2aa3d73174bd38e61a984696d366560f2b2960084d3d00f27eefe46283` |  |
| `docs/MAP_STUDIO.md` | 3.175 | 41 | Dokumentation | `b73bd435abee6ced2d356abdf8dce964bde874b4ee1b5d69d4a1ab419d7f9264` |  |
| `docs/RELEASE_STATUS.md` | 5.946 | 65 | Dokumentation | `b80a460e0b41b29ac6e2132d006764446e1d06d9ade2ca3f85dfeb7156f199c9` |  |
| `docs/ROADMAP.md` | 1.353 | 11 | Dokumentation | `27ebd848a1d7300a2f8a446026ecc1073b025db21b89febc2b1a1fd102e66305` |  |
| `docs/VALUE_AND_VALIDATION.md` | 16.811 | 101 | Dokumentation | `6c2869531a7cd1e351322729ebf98a62379baa51490b9ad33ad320f06aab7e8b` |  |
| `docs/architecture/README.md` | 16.190 | 172 | Dokumentation | `806875f4082424cbb946ee73778267176303fed593df9ab144d85ecb5b50241d` |  |
| `docs/validation/RESULT_TEMPLATE.md` | 4.379 | 80 | Dokumentation | `0a019ec54a0d4369a7a7af6f72dbb412be9af0f6e4210d840e354384dfea40a8` |  |
| `edge/app.mjs` | 12.787 | 148 | Edge-Worker (Auslieferung) | `4641bfc5d79e95f31b54439cc9cb5ae95418c731a0dbf4b32206d9b100e181de` |  |
| `edge/globe.mjs` | 3.170 | 43 | Edge-Worker (Auslieferung) | `68bcb07a16d7fed2514938fc3614fd038f38d529eca4d3428cfb253487b56203` |  |
| `edge/guard.mjs` | 2.284 | 39 | Edge-Worker (Auslieferung) | `426e23203b0fb68614efe4df4c1138a820fa314fc5041805c6938846840854d0` |  |
| `edge/map-room.mjs` | 9.661 | 144 | Edge-Worker (Auslieferung) | `06a3f3f78075a827c01964f146c503dee49a8f38f49b1e07be807f4a2f412455` |  |
| `edge/policy.mjs` | 5.220 | 76 | Edge-Worker (Auslieferung) | `b35d00536675f3aa4d62362eb1226683d2ddc1b1bcf0adda99fdf6a89b57286d` |  |
| `edge/realtime.mjs` | 1.474 | 20 | Edge-Worker (Auslieferung) | `44dfec5e3b3a0ca4271717ab03d273b328b44a014dc79f82cc5d4cebda2b799b` |  |
| `edge/room.mjs` | 8.218 | 128 | Edge-Worker (Auslieferung) | `ea5091a1b529a21068770be710775109a79367a1f6196ebe7868dc9aecd0c1d2` |  |
| `edge/telemetry.mjs` | 7.271 | 102 | Edge-Worker (Auslieferung) | `cea45c9f61edec35cb51d4b91b20597ff8f331a0c466cdd0880de4d7eee6be16` |  |
| `edge/worker.mjs` | 624 | 12 | Edge-Worker (Auslieferung) | `e4e090a4fed031fd327f4d86e5f93f65abcfb936540348e0e11e1ef54a7a5148` |  |
| `examples/README.md` | 1.901 | 35 | Einstiegsbeispiel | `3954c30e4a784ae8e693f6ca03abafc0f5dd4d40c629de815cbf73e2ca8ef14a` |  |
| `examples/map-starter.map.json` | 703 | 20 | Einstiegsbeispiel | `423c5e2064208e0bbc7cc25ad584e34b8145bac84727c41d8bb718bcfdc23ba0` |  |
| `package-lock.json` | 276 | 16 | Projekt | `4da12f8e07858ae2b8bd775cbc324c0f8ea012d9ad77929be7ad48a5f272dc29` |  |
| `package.json` | 1.562 | 26 | Projekt | `ba5ad16c8610e0603c24e3445b5d855114d09af78358f36521d7a91941c58084` |  |
| `rust-toolchain.toml` | 88 | — | Projekt | `9cbeb062ec3a97a5b5b76aacde94f5dcb034ed98f32af151480764de2e03d6f9` |  |
| `schemas/world-package-v2.schema.json` | 3.715 | 165 | Entwurfs-Vertrag (nicht implementiert) | `cd6742053de9d61d96a996b4dce4e15567c6f3af7f0fb8782b6ae99966490fe8` |  |
| `scripts/architecture-index.mjs` | 27.843 | 347 | Werkzeug | `b8fe5f68862d2f34f96d0aae2942ca10b1cae3ea79763fb5b99cfcc8c17befb6` |  |
| `scripts/build-wasm.sh` | 452 | — | Werkzeug | `ffcb6a0bf5ae22a1d6fb301badd38040a6c0430cf1152261ee7be81bf74abb83` |  |
| `scripts/check.mjs` | 6.874 | 127 | Werkzeug | `50da85fbe8c0afd7941ccd13009352d0f67e1598be3508ef3e1180aa41d5e041` |  |
| `scripts/city-tile.mjs` | 8.127 | 100 | Werkzeug | `c4897e82793f3a1d5f8573d7445261ee9699288d1ca47735ac08351433450749` |  |
| `scripts/globe/make-vehicles.mjs` | 4.023 | 59 | Werkzeug | `f631f1f03868019303ddcc94204240e9e9bf688e1eb7802e6be9fae1021936f8` |  |
| `scripts/kart/pack-assets.mjs` | 5.169 | 80 | Werkzeug | `95f3029cdad0bbb2eb178610f4dfaa1dc11b6c890bb02ecc8ca70a122eeb6f31` |  |
| `scripts/package-source.mjs` | 962 | 12 | Werkzeug | `8ccd616f23809a8e92d5035072d07cb0a19649248811c836d8e0fcb0f64488dc` |  |
| `scripts/public-tests.mjs` | 1.297 | 21 | Werkzeug | `bac0b3e629c8d4c4e06ec6322b28330ec796085a72165bde593ceac611f9b0a1` |  |
| `scripts/serve.mjs` | 10.421 | 123 | Werkzeug | `f1f46eafec6f2d22479977c316529a7b3872c4c77c89648a5f7f332f26d716c4` |  |
| `scripts/verify-public-source.mjs` | 2.287 | 34 | Werkzeug | `963c2f61e1794b0fd8efaf5a2c448acee276b1bebae122233074c46fbd6eaf55` |  |
| `scripts/worldport-osm.mjs` | 2.889 | 34 | Werkzeug | `64ff641e4b052a71e2f533793496ac0f6f04518d4d8a519485bad42fcc32dc09` |  |
| `scripts/worldport.mjs` | 1.722 | 18 | Werkzeug | `97b038be70349afa4ed676091d192d66a5e026df351ba2398679e9413539a393` |  |
| `scripts/ws-local.mjs` | 3.932 | 58 | Werkzeug | `6c019b479d61d01a462b5c84b6d41b8d0726750853d64694bef7ee92af490af0` |  |
| `sim/Cargo.lock` | 154 | — | Rust-Simulationskern | `1fe06aa1d8cec5a8193c1e679383a02e50994c0b655f7b091d642a5fa3c0ba94` |  |
| `sim/Cargo.toml` | 367 | — | Rust-Simulationskern | `f0ff0c66b82baf05cea66f97646215e97ceec59c3c8e45c57196b02418db03b8` |  |
| `sim/src/lib.rs` | 17.586 | — | Rust-Simulationskern | `cc0bb5618af324b5edf0dbfafc742e9b5488b4dd620a7f8eb943183d1e8e1cfd` |  |
| `tests/broadphase.test.mjs` | 4.983 | 70 | Node-Test | `c03e270eb1ed3721146370ae04fb51a22e7c3c697eabad50e7b7ee0dbddb8225` |  |
| `tests/browser/agent-check.mjs` | 2.952 | 42 | Browsertest | `ba3b1a81dc0cc57aa57717bba669c1c50ad87a425914e38a41b8d239f90e6450` |  |
| `tests/browser/audit-regressions.browser.mjs` | 16.341 | 181 | Browsertest | `cb08b67fe0503f2799bd027bbceeb7ec9c6fcda7d2baae82df1700b6b29e7b9a` |  |
| `tests/browser/baseline.browser.mjs` | 18.285 | 218 | Browsertest | `0d1f6e78b5db051508640c490f9d6cd1fd547e1f217cde831ec75479866d652c` |  |
| `tests/browser/city.browser.mjs` | 6.049 | 72 | Browsertest | `f6708cdd83c8d94cb0db773eda363845b75e0319c9944caecd5922ae0efbb502` |  |
| `tests/browser/collision.browser.mjs` | 7.275 | 102 | Browsertest | `45f4054b51da0dc6697a7befd16732ddf6eca43f2c7935ad6eafe0e17173fca5` |  |
| `tests/browser/enhance.browser.mjs` | 5.055 | 57 | Browsertest | `69619e6a941ca03d481b08ea444a56c681a0995a0f6a50445a87747f7da62ad4` |  |
| `tests/browser/footprint.browser.mjs` | 4.970 | 59 | Browsertest | `9ecdd906a0964c49e8a84fe0125030af6b768912b8023f684d38b83ee899e1ab` |  |
| `tests/browser/harness.mjs` | 4.397 | 75 | Browsertest | `79bcef63454670a6abe37bf3805ede802ba8685c908a0f71b541fd71ee941a78` |  |
| `tests/browser/kart-perf.baseline.json` | 5.456 | 212 | Browsertest | `850786ffcc7228c0437f6b431ab7ad882b4c98fcf96110f2b9aff6f563c21107` |  |
| `tests/browser/kart-perf.browser.mjs` | 18.758 | 263 | Browsertest | `ffc0fa70c48799d0fc3276cf52141b021d2f162cbaff7c095bc8fe0f09633095` |  |
| `tests/browser/perf-meter.browser.mjs` | 4.201 | 46 | Browsertest | `939eb1ad2d30c1a8952e4b55842422ac0644d6a2dc28bf0a4597f8cbbc9d97d2` |  |
| `tests/browser/perf.browser.mjs` | 5.792 | 63 | Browsertest | `fb77e70dec789a3f239e003bee87c82a9ec1bce7dfa8052c0168f246e97972cd` |  |
| `tests/browser/public-smoke.browser.mjs` | 18.355 | 309 | Browsertest | `d883afedb345093a72e1bc80f941ed0610e5045d9fc70bc3693b0b680c827f96` |  |
| `tests/browser/runtime.browser.mjs` | 11.200 | 126 | Browsertest | `56e6f4da228d71f734851aa62ba64d4e10aa7a66ade891639426166a67c105da` |  |
| `tests/browser/scan-world.browser.mjs` | 23.639 | 240 | Browsertest | `bd39e67035339acad31117d524a7e86b9eef3432e7febce41f94b3e138161bd8` |  |
| `tests/browser/walking.browser.mjs` | 6.802 | 89 | Browsertest | `32f2ab0f5c60bcf55e228cb75cae9341d7539dcfe266aaf296abd2584901896c` |  |
| `tests/browser/world-upload.browser.mjs` | 14.852 | 143 | Browsertest | `11ab567c402ee2fb78c5aa6e02f11cd500d40a4462e66a134690ac37ee476a54` |  |
| `tests/browser/world-walk.browser.mjs` | 6.462 | 75 | Browsertest | `35dfe63ce0d9229c5406ab114b0be910712454d2e7af56d6568b7735e8fafacf` |  |
| `tests/build-tools.test.mjs` | 4.387 | 81 | Node-Test | `8bdfb9af794f582aa7e08450157096b9ba6071b5c17841fa0d96169a5bcf1aea` |  |
| `tests/camera-rig.test.mjs` | 4.553 | 52 | Node-Test | `bf70cc3a048bf2e76df27a56166abede8378c03e97b5b83b56f324e2f79a89de` |  |
| `tests/car.test.mjs` | 3.860 | 59 | Node-Test | `40aa252426eed74581d27e815de141d6e909d858ca6294c50bc0442d47fdf163` |  |
| `tests/city-layer.test.mjs` | 4.817 | 51 | Node-Test | `07f8d01ee0d4a3d0e618d097ca1273a48002506beaed19305593b1861e1a3eb6` |  |
| `tests/city-tile.test.mjs` | 2.634 | 35 | Node-Test | `a19cf7319e181d124f4975a20c08e2b214b5f668c56d12b04a19f81e713b2a7c` |  |
| `tests/device-check.test.mjs` | 1.597 | 17 | Node-Test | `df8d403db6c852cb62721395b92c6e0aa7a709d062062129d5a20695cd1c73e1` |  |
| `tests/edge.test.mjs` | 51.050 | 615 | Node-Test | `693b3bbadf5a8a8821d276bfc6a83e4ab1da29a20b0180d70c8dae39595e3ada` |  |
| `tests/fixtures/city-mini.map.json` | 4.079 | 363 | Node-Test | `2e7aefcbf4ad1654ef0028fb0d1ca0442c159a49725ba248147fc223fa7c9f7a` |  |
| `tests/fixtures/leonida-sample.csv` | 796 | — | Node-Test | `6005b852f3f16fdf8999e383ebcba3643504b0baa22fd69ec750140ad0a1f3d7` |  |
| `tests/frame-loop.test.mjs` | 4.625 | 62 | Node-Test | `8479b5a94ae1f50afa90d29e0bb7f9fb7bbb399d23561fbf6a8898fbf945a1d2` |  |
| `tests/globe-surface.test.mjs` | 5.553 | 76 | Node-Test | `9fdd4caf934e39ae938ad59fea6d5a1e30032e04b2fdc0c3afa6e624d1535d5b` |  |
| `tests/gpu-cull.test.mjs` | 3.681 | 41 | Node-Test | `1cd04046216f1784b073f9ff2918a98d0d5452ddb811f38e77245bbdd837f141` |  |
| `tests/kart-assets.test.mjs` | 2.714 | 37 | Node-Test | `78324db30572e88a1cb96c750c7231d87c2cef22d112e7e9ff23347a5acbe3a6` |  |
| `tests/kart-insights.test.mjs` | 3.688 | 54 | Node-Test | `3998e3697fa45fabd06f8d7260e0369fcffbf1d301e00b002db2baafb9819fb7` |  |
| `tests/kart.test.mjs` | 6.923 | 107 | Node-Test | `22e5ffadfaea95d8d7404deb91ade98f8f0cf1c8a816d27affdaac10b08fdf7f` |  |
| `tests/map-edit-cost.test.mjs` | 8.247 | 93 | Node-Test | `d6f0d92e1854a7df3d3078eacc59e79e04b56cb2538ed8f2edd20e9da3ba3b2b` |  |
| `tests/map-enhance.test.mjs` | 1.811 | 23 | Node-Test | `8db57e202b4e2b90f7c0adeae0bd4b204bde9e2a71dc7b5678ce4a9fce61e194` |  |
| `tests/map-history.test.mjs` | 8.260 | 130 | Node-Test | `c45200ae6b935d3bf1eead8f3bac558d8e99cd893fd0a1ec30f5479be0109036` |  |
| `tests/map-project.test.mjs` | 14.347 | 160 | Node-Test | `72b4e766ba417c6d6267caa9eedd07b17b19b060c82f3999187687dcdb1886ed` |  |
| `tests/map-runtime.test.mjs` | 5.501 | 66 | Node-Test | `d97747c22def7682f136f59cd0349b5a0fa91613f40b45fd62952a54b6638e6f` |  |
| `tests/map-studio.test.mjs` | 4.554 | 34 | Node-Test | `34109cfd8fcf11c19cc81a304b6677ea6ded38ed2ca62b60fb0cf9737a4b8db3` |  |
| `tests/map-v2.test.mjs` | 4.535 | 55 | Node-Test | `2079ac0c6254a9b3de706fef14dc0f1a0ef5983b72c97d3b2d7bfd751cc8bd8a` |  |
| `tests/map-v3.test.mjs` | 5.601 | 64 | Node-Test | `a53bbbcab91ec04a84ed89095e9e2364fc82fa958659d1f36fab3e391e3f6a0a` |  |
| `tests/net-client.test.mjs` | 7.720 | 91 | Node-Test | `d74d238fe10733c024031f0f80f796c2d0b9bfe5cddb2e53cde21eedd824b20a` |  |
| `tests/net-delta.test.mjs` | 3.800 | 51 | Node-Test | `0aeba4101f585a2c78a2b953ff549a2cba605094449396c722d30944c944d1a1` |  |
| `tests/net-protocol.test.mjs` | 3.041 | 41 | Node-Test | `f35ab10fcd76396eb251f0309af5e3e3cf4f010c0ea02c3ab205054b941504b4` |  |
| `tests/osm-ground.test.mjs` | 7.351 | 94 | Node-Test | `b6784161a2763a617ea6ca880b4281bddf3b8cc62f4dd475b195164a8ea2e8aa` |  |
| `tests/pedestrian.test.mjs` | 3.253 | 57 | Node-Test | `6f42a88e68d446df1955e58beb606895f358504fc5cc33abb32c1f04e123d189` |  |
| `tests/perf-meter.test.mjs` | 945 | 13 | Node-Test | `34c4fde2be179821c5582aac4bc38b5ff3ee110e3c2e2344b87c510fa580c76e` |  |
| `tests/physics.test.mjs` | 10.120 | 143 | Node-Test | `5b31ac7eec65520c477bc2875165ea86539fe3bc1fd23ae8cbd522ea5bb3f173` |  |
| `tests/plane.test.mjs` | 4.119 | 61 | Node-Test | `a8eeff8b19690eb95b291706d19fe8a921fece65cc847653b41d9cfaf0761764` |  |
| `tests/polygon.test.mjs` | 3.348 | 45 | Node-Test | `15cbbd8cfb417f4cfeadee40b5503dee1752073a5cf8a86927a632dce7f1d285` |  |
| `tests/quality.test.mjs` | 3.799 | 65 | Node-Test | `f26c46f69116768627c8201f9dbabaa2e5a3232489a211e1e78c1d0cd798480a` |  |
| `tests/repository.test.mjs` | 5.594 | 79 | Node-Test | `597030695a721b12886b5b5be41b973a1845c2d2a945bf439cd2ade7e8a72383` |  |
| `tests/room.test.mjs` | 10.796 | 138 | Node-Test | `b004e01b80f33707b9b263230f204c80866f242de46f1a5993827634b0b199a0` |  |
| `tests/runtime.test.mjs` | 10.095 | 149 | Node-Test | `f0ab5f5b928a13c2c65f01087a2971b8b2563a88bd03561ea313071e1e70731d` |  |
| `tests/scan-world.test.mjs` | 4.709 | 70 | Node-Test | `e1b5afeb6d0b7b7a81537bfd5c10f98afdc5b04c243e8ef8d68e3adc15edf47f` |  |
| `tests/sim-layout.test.mjs` | 2.424 | 35 | Node-Test | `c5099e5d3c6b959b316a1b769a54c4a31e1c5d73fbf733bc13c4b9187999de40` |  |
| `tests/sim-snapshot.test.mjs` | 6.843 | 87 | Node-Test | `6989fdbeec8276abd0c8961a665f5d0a0fdfeca7142d1cd33f37802dc66e480d` |  |
| `tests/sim-wasm.test.mjs` | 7.990 | 117 | Node-Test | `6478a2b5526fac3f9540ab7987a924b2151ce7c2ff7d9ff239896984ef04232e` |  |
| `tests/surfaces.test.mjs` | 4.528 | 54 | Node-Test | `6b6e766d6dbe4b9cbf64fb1b9f8488c300a792fc4cfbc74eb3d4b666f0291545` |  |
| `tests/vram-budget.test.mjs` | 2.448 | 26 | Node-Test | `ed876415a79cf550568c5754ae926efa1c8cd9fae869ff7eb9a1865816577c5f` |  |
| `tests/walker.test.mjs` | 5.857 | 81 | Node-Test | `968576b6b6487ce3f4a4d4c090f5184c907604c55cecedc4b300c1fe0a535ff6` |  |
| `tests/water.test.mjs` | 2.791 | 36 | Node-Test | `ba48bc2019e31b71fd55141124402fa010aeb85aa62407b7f5372ecf7ee1db16` |  |
| `tests/world-studio.test.mjs` | 8.662 | 114 | Node-Test | `1e9795292ea70fe10f35c7818eca7ea3caaa77039ea4877cebbb729f25989093` |  |
| `tests/world-walk.test.mjs` | 4.955 | 65 | Node-Test | `17bd518ad220e04d326dc81a9aa8634bb279594e62d89aecfe5b838f0e17a7b0` |  |
| `tests/worldport-osm.test.mjs` | 11.114 | 135 | Node-Test | `d4998e9687b8b63cfb2973cd3d4596b06a9c65d8e2266fd3238a1d2edb940df3` |  |
| `tests/worldport.test.mjs` | 8.679 | 109 | Node-Test | `8377cad8b4ce49cade7cb4d6c60e56024fa5e022b52f6edc5d3ab6dd16817b89` |  |
