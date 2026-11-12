---
name: astropy-astronomia
description: Ensina astronomia computacional com o Astropy — unidades físicas que não deixam somar metro com segundo, constantes, conversão de coordenadas celestes, tempo astronômico e leitura de imagens FITS. Use quando o aluno de astronomia ou física precisar converter coordenadas (equatorial, altazimutal), calcular quando um astro está visível, fazer conta com unidades, ou abrir um arquivo FITS de telescópio. Astropy (Astropy Developers, BSD-3-Clause).
license: BSD-3-Clause
runtime: ts
risk: read
minPlan: free
courseTags:
  - astronomia
  - fisica
  - astrofisica
  - python
metadata:
  zaeon-familia: procedimento
  zaeon-titulo: Astropy — o céu em Python
  zaeon-subtitulo: Unidades, coordenadas celestes, tempo e imagens FITS com a biblioteca que os observatórios usam
  zaeon-modelo: foguete
  zaeon-tags: Astropy, astronomia, coordenadas, FITS, Python, open source
  zaeon-entrega: contas com unidades e constantes físicas; coordenadas celestes e a conversão para altura e azimute; quando um astro está visível da sua cidade; como abrir e inspecionar um FITS; onde achar dados públicos de telescópio
  zaeon-app-licenca: BSD-3-Clause (Astropy, Astropy Developers)
---

# Astropy — o céu em Python

Procedimento para ensinar **astronomia computacional** com o **Astropy**, a biblioteca central da
astronomia em Python. Código-fonte em https://github.com/astropy/astropy, licença
**BSD-3-Clause**. Instala com `pip install astropy`.

## O roteiro

```python
from astropy import units as u, constants as const
from astropy.coordinates import SkyCoord, EarthLocation, AltAz
from astropy.time import Time
from astropy.io import fits

d = 4.24 * u.lyr
d.to(u.pc)                               # anos-luz -> parsecs
(const.G * const.M_sun / (1*u.au)**2).to(u.m / u.s**2)   # gravidade do Sol na órbita da Terra

sirius = SkyCoord(ra="06h45m08.9s", dec="-16d42m58s")
local = EarthLocation(lat=-23.55*u.deg, lon=-46.63*u.deg, height=760*u.m)
agora = Time("2026-07-01 23:00:00") - (-3*u.hour)          # hora de Brasília -> UTC
sirius.transform_to(AltAz(obstime=agora, location=local)).alt   # altura acima do horizonte

with fits.open("imagem.fits") as hdul:
    hdul.info(); dados = hdul[0].data; cab = hdul[0].header
```

1. **Unidade junto do número, sempre.** O Astropy recusa somar grandezas incompatíveis — é o
   professor de análise dimensional que não cansa.
2. **Tempo é UTC.** Converta a hora local antes; erro de fuso desloca o céu em 15° por hora.
3. **Altura > 0** = acima do horizonte. Para observar de fato, peça altura acima de ~20°.
4. **FITS = dados + cabeçalho.** O cabeçalho diz instrumento, exposição e a calibração de
   coordenadas (WCS). Leia o cabeçalho antes de abrir a imagem.

Dados públicos para praticar: os arquivos do **MAST** (Hubble, JWST) e do **SDSS**.

Para ver o céu sem programar, o caminho é o planetário (card `stellarium-planetario`).

## O que esta skill NÃO faz

- **Não controla telescópio.** É cálculo e leitura de dado.
- **Não substitui efemérides oficiais** em uso que exige precisão certificada (navegação,
  perícia). Para aula e pesquisa, a precisão é mais que suficiente.
- **Não faz astrologia.** Posição de astro, sim; previsão de vida, não.
