# Testes do #816 — coração no 3D, cartão de anatomia, título da imagem e gaveta do celular

Registro feito depois (22/11): o PR #818 (mergeado em 15/11) entrou sem o documento de testes.
Correções do que ficou faltando no #764 e no #754, achadas testando no ar.

## O que muda

- **1. Coração pequeno no 3D** (`lib/anatomia/cena.ts`): ao mudar o tamanho do quadro, a cena enquadrava o corpo inteiro e não a estrutura isolada; o coração ficava do tamanho de um ponto. Agora `redimensionar` zera `ultimoIsolar` e a estrutura é enquadrada de novo.
- **2. Cartão do 3D some ao reabrir a conversa** (`StudyCoworkChat.tsx`): a cópia do navegador (`enxugarArtefatos`) não guardava a anatomia. Agora guarda só o número (`data: null`), como imagem e diagrama; o cartão busca o estado em `/api/studio/<id>`.
- **3. Título da imagem** (`lib/studio/tituloImagem.ts`): "desenhe a anatomia do coração humano" → "anatomia do coração humano". Só verbos de desenho (desenhe, ilustre, pinte).
- **4. Gaveta do celular** (`ConversasSidebar.tsx`): tocar em "Últimos 7 dias" não fecha mais a gaveta (`data-gaveta-fica` nos títulos dos grupos).
- **5. Fonte do vulcão no rodapé:** sem mudança — já corrigida no #764 (o teste anterior rodou antes do deploy terminar).

## Para o Martinez

- Anatomia (itens 1 e 2) e a gaveta do celular (item 4) são área dele.

## Testes automáticos

- `lib/agent/correcoes816.test.ts` (novo): amarrações da cena, do chat e da gaveta.
- `lib/studio/tituloImagem.test.ts`: casos novos de verbos de desenho.
- CI do fork (giu8550/zaeon-os#56): 800 arquivos de teste passaram.

## Como testar em produção

1. "desenhe a anatomia do coração humano": o título é "Imagem — anatomia do coração humano".
2. Em **Ver em 3D**, o coração aparece grande. Mude o tamanho da janela: continua enquadrado.
3. Troque de conversa e volte (ou F5): o cartão do 3D continua lá.
4. `/anatomia?estrutura=FMA7088`: abre já no coração, grande.
5. Celular, gaveta de conversas: tocar em "Últimos 7 dias" abre o grupo e a gaveta continua aberta.

## Resultado dos testes da Giulia

- Sem registro dos testes no ar. O card está em Corrigido no kanban. **Falta conferir** os itens acima.
