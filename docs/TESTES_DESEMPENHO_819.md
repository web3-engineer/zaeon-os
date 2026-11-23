# Testes do #819 — primeira visita mais leve (de ~68 MB para ~5 MB)

Registro feito depois (22/11): o PR #820 (mergeado em 15/11) entrou sem o documento de testes.

## O que muda

- **1. Corpos do jogo só para quem vai jogar** (`lib/cyber/precarga.ts`, `components/main/CyberCta.tsx`): a pré-carga da página inicial continua com código, sons e texturas, mas os corpos `.vrm` (~60 MB) só começam a baixar quando a pessoa passa o mouse, foca ou toca no "Play game" (uma vez por aba, só em máquina que aguenta). Isso também tira o `fundador.vrm` e o `examiner.vrm` (~28 MB) da Sala de Estudos.
  - Troca: a primeira entrada no jogo pode levar uns segundos a mais.
- **2. `.vrm` comprimido no servidor** (`Caddyfile`): `encode @vrm` próprio (o `.vrm` é `application/octet-stream`, fora da lista padrão do Caddy). `nina.vrm` 11,9 MB → ~5,2 MB.
- **3. Avatar tenta de novo quando o download cai** (`components/cyber/AvatarVrm.ts`, `lib/cyber/tentarDeNovo.ts`): até 3 tentativas (espera 1,5 s e 4 s) em erro de rede e 5xx/408/429; 404 falha na hora.
- **4. Sons `.wav` → `.ogg`:** fora deste PR (conferir a emenda dos sons em loop).

## Para o Martinez

- Cyberespaço (pré-carga e corpos), Sala de Estudos/avatar e deploy (`Caddyfile`) são área dele.

## Testes automáticos

- `lib/cyber/precarga.test.ts`: a página inicial em tela grande não baixa corpo; passar o mouse baixa todos uma vez; no celular nunca.
- `lib/cyber/tentarDeNovo.test.ts`: corte na 1ª tentativa e inteiro na 2ª; 502 repete e desiste em 3; 404 falha na hora.
- `lib/cyber/caddyVrm.test.ts`: a amarração do Caddyfile.

## Como testar em produção (computador, DevTools → Network, "Disable cache")

1. Abrir `zaeon.com.br`: o total transferido fica abaixo de ~10 MB e nenhum `.vrm` aparece.
2. Passar o mouse no "Play game": os `.vrm` começam a baixar.
3. Clicar num `.vrm` → Headers: `content-encoding: zstd` (ou gzip) e tamanho bem menor que o arquivo.
4. Sala de Estudos: não baixa `fundador.vrm` nem `examiner.vrm`.

## Resultado dos testes da Giulia (20/11) — aprovado ✅

| Teste | Resultado |
|---|---|
| Peso da página inicial | ✅ 4,70 MB transferidos |
| `.vrm` só ao passar o mouse | ✅ |
| Compressão do `.vrm` | ✅ zstd, 11,9 MB → 5,25 MB |
| Laboratório sem fundador/examiner | ✅ |

Card movido para Corrigido em 20/11.
Pendência anotada: o mesmo `.vrm` é lido 3 vezes (`AvatarVrm.ts` / `precarga.ts`) — continuação, área do Martinez.
