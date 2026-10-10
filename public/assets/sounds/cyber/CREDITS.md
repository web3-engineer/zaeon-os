# Créditos — áudio do ciberespaço (`public/assets/sounds/cyber/`)

Dois grupos: **(1) editados de fontes externas** e **(2) sintetizados no projeto (originais, CC0)**.
Antes de publicar, confirmar os termos de cada fonte externa e preencher autor/URL/licença abaixo.

## 1) Editados de fontes externas (conferir licença)
| arquivo final | fonte (em `public/assets/sounds/`) | origem | autor / licença | notas de edição |
|---|---|---|---|---|
| `space-bed.ogg` | `danamusic-calm-meditation-357940.mp3` | Freesound (usuário "danamusic", id 357940) | **preencher** (verificar licença no Freesound) | recorte do início 2–44s + lowpass 2600 + crossfade 4s (loop), nível baixo — 432 Hz leve |
| `crystals.ogg` | `freesound_community-crystal-bowl-ab4-1-106673.mp3` | Freesound (id 106673) | **preencher** | recorte 3.0–6.5s + crossfade 1s (loop), mono |
| `step-1/2/3.ogg` | `freesound_community-foot-steps-14426.mp3` | Freesound (id 14426) | **preencher** | 3 pisadas fatiadas, 24k→44.1k, mono, volume baixo |
| `ship-takeoff.ogg` | `spaceship-whooshing-past-epic-stock-media-4-4-00-06.mp3` | Epic Stock Media | **preencher (licença comercial/stock)** | recorte + reforço grave, mono |
| `ship-landing.ogg` | `spaceship-engine-landing-epic-stock-media-3-3-00-05.mp3` | Epic Stock Media | **preencher (licença comercial/stock)** | só a descida (0.3–2.3s), fade suave, sem impacto, mono |
| `ship-touchdown.ogg` | `spaceship-engine-landing-epic-stock-media-3-3-00-05.mp3` | Epic Stock Media (+ reforço grave synth) | **preencher** | toque real (2.0–3.3s) + thud 58/85Hz + ar hidráulico, mono |
| `ship-flight.ogg` | idem landing (Epic Stock Media) | Epic Stock Media | **preencher** | trecho de motor, lowpass, loop, mono |
| `ship-idle.ogg` | idem landing (Epic Stock Media) | Epic Stock Media | **preencher** | trecho de motor, lowpass forte, baixo, loop, mono |

> ⚠️ Epic Stock Media e Freesound têm termos distintos (alguns pedem atribuição, outros proíbem redistribuição do arquivo-fonte avulso). Verificar antes do deploy público.

## 2) Sintetizados no projeto — originais, CC0
Gerados proceduralmente (numpy), sem fonte externa — uso livre:
`blackhole-hum.ogg` · `neuron-chime.ogg` · `jump.ogg` · `land.ogg` · `cyber-enter.ogg` (startup sofisticado da entrada) · `rise.ogg` · `chat-pop.ogg` · `join.ogg` · `leave.ogg` · `study-confirm.ogg` · `near-ping.ogg`

_Removidos: `fire.ogg`, `computer-hum.ogg`, `computer-typing.ogg` (base fica só com `crystals`), `sit.ogg` (disparava indevidamente na entrada) e `whoosh-hyperspace.ogg` (som estranho na entrada, substituído por `cyber-enter.ogg`)._

## Arquivos-fonte
Os `.mp3` originais em `public/assets/sounds/` (leberch/freesound/spaceship) são **fontes de edição** — podem ser movidos pra fora do deploy (ex.: `/_sources/`) pra não irem ao bundle público.

## Mochila a jato (jetpack)

| arquivo | fonte | autor | licença | edição |
|---|---|---|---|---|
| `jetpack.wav` | "Rocket Engine" — https://opengameart.org/content/rocket-engine | theMinesAreShakin | **CC0 1.0** (domínio público) | estéreo 48 kHz → mono 22,05 kHz WAV (loop sem emenda, 6,1 s) |
| `asa-bater.wav` | "Large Wings Flap" — https://opengameart.org/content/large-wings-flap (de "fast simple chop 5", https://freesound.org/s/127197/) | AntumDeluge / dave.des | **CC0 1.0** (domínio público) | 1 batida recortada (0,58 s), fade-out, mono 22,05 kHz WAV — as asas negras do founder |

**Sintetizados no navegador (sem arquivo, CC0 — código próprio):** `jato-sopro` (o sopro/chiado do jato, por cima do ronco gravado) e `baque` (o corpo batendo no chão ao pousar) — `lib/cyber/audio.ts` (`sintetizarJetpack`, `sintetizarBaque`).

## Animações (poses capturadas)

`lib/cyber/poses-ual.json` — Jump_Start / Jump_Loop / Jump_Land da **Quaternius Universal Animation Library** (https://quaternius.itch.io/universal-animation-library), **CC0 1.0**. Convertidas offline em direções de membros por quadro (o GLB original não vai pro bundle).

## Voz do Droid (sem palavras)

| arquivo | fonte | autor | licença | edição |
|---|---|---|---|---|
| `droid-agua.wav` | "Sea and River Wave Sounds" (VistulaShort.mp3) — https://opengameart.org/node/92680 | RandomMind | **CC0 1.0** (domínio público) | trecho de 8 s (25,5–33,5 s) do rio Vístula, estéreo 44,1 kHz → mono 22,05 kHz WAV, fades de 60 ms, pico 0,9 |
| `droid-alien.ogg` | "Ambient Alien Light sfx" — https://opengameart.org/content/ambient-alien-light-sfx | Dr. Neptune | **CC0 1.0** (domínio público) | sem edição (7,9 s, estéreo) |

Esculpidos no navegador (`AudioCyber.vozDroid`, `lib/cyber/audio.ts` `VOZ_DROID`): formantes em "sílabas", delay com repetição e reverb longo por convolução.

## Motor da moto (gravações reais)

| arquivo | fonte | autor | licença | edição |
|---|---|---|---|---|
| `moto-motor-alto.wav` | "Sportsbike Flyby" (superbike 1000 cc numa pista) — https://freesound.org/people/richwise/sounds/361403/ | richwise | **CC0 1.0** (domínio público) | trecho de 6,4–7,85 s (depois da passagem: rotação alta estável), passa-alta 60 Hz, tom TRAVADO em 300 Hz (re-amostragem seguindo o tom medido), volume nivelado, loop de 1,25 s (múltiplo do período, emenda de 0,15 s), AGRESSIVO (grave reforçado + saturação), reverb leve embutido (20 %, 1,6 s, convolução circular), mono 44,1 kHz |
| `moto-motor.wav` | "XSR700 tickover loop" (marcha lenta) — https://freesound.org/people/richwise/sounds/432304/ | richwise | **CC0 1.0** (domínio público) | trecho de 0,6–4,9 s, passa-alta 25 Hz, volume meio nivelado, loop de 4 s (emenda de 0,25 s), AGRESSIVO (grave reforçado + saturação), reverb leve embutido (18 %, 1,6 s), mono 44,1 kHz |

| `moto-pipoco.wav` (desacelerando) | "Car Antilag" — https://freesound.org/people/modusmogulus/sounds/797835/ · "Large backfiring motorbike passes by." — https://freesound.org/people/mudflea2/sounds/705363/ | modusmogulus · mudflea2 | **CC0 1.0** (ambos) | 17 estouros recortados (148 ms cada, ataque de 2 ms, cauda caindo, passa-alta 45 Hz), espalhados num loop de 3 s em intervalos irregulares (às vezes rajadas de 2–3), força e tom variando (0,78–1,23×), saturação + grave reforçado, reverb 16 % (1,2 s); mono 44,1 kHz |
| `moto-boost.wav` | o mesmo "Sportsbike Flyby" (o grito da superbike) | richwise | **CC0 1.0** | o grito tocado com a afinação SUBINDO de 0,45× a 2,1× em 0,7 s (exponencial), segura e some; saturado (tanh) + reverb 28 % (1,4 s); 2,2 s mono 44,1 kHz |

O jogo toca os dois afinados na rotação do motor (`lib/cyber/somMoto` `mixDaMoto`/`freqDoMotor`): a lenta embaixo, o grito da superbike da puxada até o corte.
