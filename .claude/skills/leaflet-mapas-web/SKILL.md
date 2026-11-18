---
name: leaflet-mapas-web
description: Ensina a publicar um mapa interativo numa página web com o Leaflet — mapa base, marcadores, popups, camadas GeoJSON e mapa coroplético — com atribuição correta dos dados. Use quando o aluno quiser colocar um mapa num site, mostrar pontos ou regiões num mapa interativo, visualizar um GeoJSON, ou perguntar por uma alternativa livre à API do Google Maps. Leaflet (Volodymyr Agafonkin e contribuidores, BSD-2-Clause).
license: BSD-2-Clause
runtime: ts
risk: read
minPlan: free
courseTags:
  - geografia
  - web
  - cartografia
  - javascript
metadata:
  zaeon-familia: procedimento
  zaeon-repo: Leaflet/Leaflet
  zaeon-titulo: Leaflet — seu mapa interativo na web
  zaeon-subtitulo: Do mapa base ao GeoJSON colorido por dado, numa página que abre em qualquer celular
  zaeon-modelo: planta
  zaeon-tags: Leaflet, mapas, GeoJSON, web, OpenStreetMap, open source
  zaeon-entrega: o mapa mínimo em uma página HTML; marcadores e popups; como carregar e estilizar um GeoJSON; o mapa coroplético com legenda; a atribuição obrigatória do OpenStreetMap
  zaeon-app-licenca: BSD-2-Clause (Leaflet, Volodymyr Agafonkin e CloudMade)
---

# Leaflet — seu mapa interativo na web

Procedimento para publicar um **mapa interativo** numa página web com o **Leaflet**, a biblioteca
JavaScript open-source mais usada para isso. Código-fonte em https://github.com/Leaflet/Leaflet,
licença **BSD-2-Clause**. É biblioteca de navegador: roda na página do aluno.

## O mapa mínimo

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css">
<div id="mapa" style="height: 420px"></div>
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script>
  const mapa = L.map('mapa').setView([-15.78, -47.93], 4);          // [latitude, longitude], zoom
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);
  L.marker([-23.55, -46.63]).addTo(mapa).bindPopup('São Paulo');
</script>
```

1. **O `div` precisa de altura.** Mapa em branco, nove em cada dez vezes, é `height` faltando.
2. **Leaflet usa `[latitude, longitude]`; GeoJSON usa `[longitude, latitude]`.** Ponto que cai no
   oceano é essa troca.
3. **GeoJSON**: `fetch('bairros.geojson').then(r => r.json()).then(g => L.geoJSON(g).addTo(mapa))`.
4. **Coroplético**: passe `style: f => ({ fillColor: cor(f.properties.valor), weight: 1,
   fillOpacity: .7 })` e uma função `cor` com 4 a 6 classes. Sempre com **legenda** — cor sem
   legenda não é informação.
5. **Atribuição não é opcional.** Os dados do OpenStreetMap são ODbL: o crédito fica visível no
   mapa. Para tráfego alto, use um provedor de tiles próprio; o servidor público do OSM tem
   política de uso.

Para preparar ou simplificar o GeoJSON antes, o caminho é o QGIS (card `qgis-sig`).

## O que esta skill NÃO faz

- **Não hospeda o mapa nem os tiles.** A página e os dados são do aluno.
- **Não rastreia localização de pessoas.** Mapa com posição de gente real exige consentimento.
- **Não é SIG.** Análise espacial (buffer, interseção, área) é no QGIS; o Leaflet mostra.
