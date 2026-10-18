# Panel de coches

Panel estático para seguir la búsqueda de un coche eléctrico familiar: ofertas de coches nuevos y de ocasión del Stellantis Club, Spoticar, evolución de precios y comparativa con Carwow, Tesla y BYD.

- Todo es HTML/CSS/JS sin compilación; los gráficos usan Chart.js desde jsDelivr.
- `data/publico.json` solo contiene datos de mercado.
- `privado.enc.json` está cifrado en el navegador con AES-256-GCM y una clave derivada con PBKDF2-SHA256 (600.000 iteraciones, sal e IV aleatorios). Sin la contraseña solo es texto ilegible.
