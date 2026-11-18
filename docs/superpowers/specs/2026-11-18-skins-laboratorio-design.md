# Skins do laboratório — desenho

Data: 2026-11-18 · Branch: `feat/skins-laboratorio` (empilhada sobre `chore/limpa-codigo-base-onboarding`, PR #852)

## Intenção

Cada pessoa pode vestir o laboratório com as cores de uma das salas (Cyber, MedLab, Bio, Quantic, Grand
Archive, Lounge) e trocar em Configurações. O visual de hoje continua sendo o padrão de todo mundo.

## Decidido pelo dono

- A skin troca **só cores**. Degradês, vidro, sombras, cantos, letra e layout ficam exatamente como são.
- **Sem textura / desenho de fundo.**
- **Padrão = visual original.** As seis skins são opcionais, escolhidas em Configurações.
- As cores seguem as salas (os cursos); as paletas dos mockups foram aceitas.

## Metas, não-metas, anti-metas

- Meta: a skin vale no laboratório inteiro (sidebar, chat, Sala de Estudos, Escritório, modais, barra do topo
  enquanto se está no laboratório), nos modos claro e escuro.
- Meta: fora do laboratório, e com a skin Original, nenhum pixel muda.
- Não-meta: letra, textura, formato de canto por skin (o mecanismo aceita depois; não entra agora).
- Não-meta: mexer nas skins do quadro da Sala de Estudos (blueprint / cartolina / barbie) e nas dos cards
  da vitrine — continuam escolhas próprias.
- Anti-meta: reescrever os ~2.300 usos de classe de cor um a um; skin que deixa texto ilegível num dos modos.

## Caminhos considerados

1. **Variáveis de cor na raiz + Tailwind apontando pra elas (escolhido).** As famílias `cyan`, `sky` e `blue`
   do Tailwind passam a ler variáveis CSS; o valor padrão das variáveis é a cor de hoje. Uma skin só troca as
   variáveis. Cobre 1.823 + 288 + 214 usos sem tocar neles.
2. Cada componente pergunta a cor a um contexto (como o quadro faz com `corNaSkin`). Controle fino, mas exige
   reescrever centenas de arquivos.
3. Folha de estilo por skin sobrescrevendo classes (como `vitrine-skins.css`). Frágil com transparência
   (`/60`) e com `dark:`.

## Como funciona

**Dados — `lib/skins/skins.ts`.** `SkinId = "original" | TemaId`. Cada skin diz por qual paleta do Tailwind
cada família é trocada:

| Skin | `cyan` (destaque) | `sky` (tom claro) | `blue` (tom fundo) |
|---|---|---|---|
| original | cyan | sky | blue |
| cyber | cyan | cyan | teal |
| med | rose | rose | pink |
| bio | emerald | emerald | green |
| quantic | blue | blue | indigo |
| humanities | amber | amber | orange |
| lounge | violet | violet | purple |

As cores vêm de `tailwindcss/colors` (nada de hex escolhido à mão), então os degradês existentes mantêm a
mesma estrutura de tons, só com outro matiz.

**CSS.** `tailwind.config.ts` define `cyan`, `sky`, `blue` como `rgb(var(--sk-cyan-500) / <alpha-value>)` etc.
Um arquivo gerado a partir de `lib/skins/skins.ts` declara em `:root` os valores originais e, em
`[data-skin="med"]` etc., os da skin. Gerado por script + teste que falha se o arquivo estiver desatualizado.

**Fundo escuro.** Os poucos fundos escritos à mão no shell (`#030014` da raiz, `rgba(22,22,34,.55)` da
sidebar, o painel do `ResearchShell`, o `#0b1020` do vidro do Escritório) passam a ler `--sk-fundo` /
`--sk-vidro`, que no original valem o que valem hoje e nas skins recebem um leve tom da paleta.

**Aplicação — `components/skins/SkinDoLab.tsx`.** Montado na raiz do laboratório: põe `data-skin` no `<html>`
enquanto o laboratório está na tela (cobre modais em portal e a barra do topo) e tira ao sair. Lê primeiro do
navegador (sem piscar), depois confere a conta.

**Onde salva.** Navegador (`localStorage`) + conta, em `UserSpaceData.settings.labSkin` (o campo JSON que já
existe pra "tema e preferências" — sem mudar o schema). Rota `GET/PUT /api/user/skin`, só a própria sessão,
recusa id desconhecido.

**Configurações — `components/sub/ConfigMenu.tsx`, gaveta Geral.** Uma linha "Skin do laboratório" com sete
opções (grupo de rádio): Original e as seis salas, cada uma com a bolinha de cor e o nome; a da sala do curso
da pessoa leva a marca "sua sala". Troca na hora. Textos nos 7 idiomas (`public/locales/*/common.json`).

## Riscos conhecidos

- Dentro do laboratório, todo `blue-*`/`sky-*` vira o tom da skin, inclusive onde azul queria dizer "link" ou
  "informação". Aceito: é o que "trocar as cores" significa.
- Na skin MedLab o destaque é rosa, a mesma família dos erros (`rose`). Erros continuam com ícone e texto;
  conferir no navegador se ainda se distinguem.
- A sala Cyber já é ciano, quase o original; por isso ela troca o azul por ciano/teal pra ficar distinta.
- Cores em `style={{…}}` e SVG com hex fixo dentro do laboratório não seguem a skin (fora os 4 fundos acima).

## Fica com quem constrói

Nome exato das variáveis, forma do script gerador, proporção do tom nos fundos escuros, layout fino da linha
em Configurações, e a lista final de fundos escritos à mão convertidos (começar pelos 4 citados).

## Como saber que deu certo

- Testes: mapa das skins completo e válido; CSS gerado em dia; rota recusa id inválido e não-logado;
  `SkinDoLab` põe e tira o atributo; original = valores atuais do Tailwind.
- No navegador, claro e escuro: Original idêntico ao de hoje; cada skin recolore sidebar, chat, Escritório e
  Configurações; sair do laboratório devolve as cores originais.
