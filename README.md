# Panel de coches

Panel estático para seguir la búsqueda de un coche eléctrico familiar: ofertas de coches nuevos y de ocasión del Stellantis Club, Spoticar, evolución de precios y comparativa con Carwow, Tesla y BYD.

- Todo es HTML/CSS/JS sin compilación; los gráficos usan Chart.js desde jsDelivr.
- `data/publico.json` solo contiene datos de mercado.
- `privado.enc.json` está cifrado en el navegador con AES-256-GCM y una clave derivada con PBKDF2-SHA256 (600.000 iteraciones, sal e IV aleatorios). Sin la contraseña solo es texto ilegible.

## Fotos

- `img/e5008.webp`: Peugeot E-5008 — Alexander Migl, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Peugeot_e-5008_Automesse_Ludwigsburg_2025_DSC_2651_(cropped).jpg). Redimensionada a 1200 px.
- `img/e3008.webp`: Peugeot E-3008 — Alexander-93, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Peugeot_e-3008_Automesse_Ludwigsburg_2024_IMG_1537.jpg). Redimensionada a 1200 px.
- `img/e408.webp`: Peugeot 408 (misma carrocería que el E-408) — MoCars, CC0 (https://commons.wikimedia.org/wiki/File:2023_Peugeot_408_GT_PureTech_e-Hybrid_(Front).jpg). Redimensionada a 1200 px.
- `img/ec5.webp`: Citroën ë-C5 Aircross — Alexander Migl, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Citro%C3%ABn_%C3%AB-C5_Aircross_Auto_Zuerich_2025_DSC_2991.jpg). Redimensionada a 1200 px.
- `img/grandland.webp`: Opel Grandland Electric — © M 93, CC BY-SA 3.0 de (https://commons.wikimedia.org/wiki/File:Opel_Grandland_Electric_GS_(B)_%E2%80%93_f_19072025.jpg). Redimensionada a 1200 px.
- `img/c10.webp`: Leapmotor C10 — Alexander Migl, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Leapmotor_C10_EV_DSC_8756.jpg). Redimensionada a 1200 px.
- `img/tesla.webp`: Tesla Model Y — OWS Photography, CC BY 4.0 (https://commons.wikimedia.org/wiki/File:Tesla_Model_Y_Juniper_Washington_DC_Metro_Area,_USA.jpg). Redimensionada a 1200 px.
- `img/byd.webp`: BYD Sealion 7 — Alexander-93, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:BYD_Sealion_7_Classic-Gala_2025_DSC_0775.jpg). Redimensionada a 1200 px.
