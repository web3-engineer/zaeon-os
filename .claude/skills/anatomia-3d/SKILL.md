---
name: anatomia-3d
description: Mostra uma estrutura do corpo humano no atlas 3D da Zaeon (BodyParts3D, 2.234 malhas e 3.432 conceitos). Use quando o pedido nomear uma parte do corpo, um órgão, um sistema ou um osso, músculo, artéria, veia ou nervo específico — "me mostra o fêmur", "onde fica o úmero", "como é o diafragma". Use também quando o pedido usar uma CLASSE genérica ("mostra um osso", "quero ver um músculo"), caso em que esta skill manda perguntar qual, em vez de abrir o atlas inteiro. Não use para pergunta clínica, cirúrgica ou de diagnóstico: o atlas é educacional e de referência adulta masculina.
license: MIT
runtime: ts
risk: read
minPlan: free
allowedTools:
  - buscar_anatomia
  - inspecionar_anatomia
courseTags:
  - anatomia
  - biologia
  - saude
  - educacao-fisica
metadata:
  zaeon-app: atlas-anatomia
  zaeon-titulo: Atlas 3D do corpo humano
  zaeon-subtitulo: Peça o fêmur e vem o fêmur — isolado, girável, com os sistemas que ele atravessa
  zaeon-modelo: molecula
  zaeon-tags: anatomia, 3D, saúde, open source
  zaeon-entrega: a peça isolada no visualizador 3D; os sistemas que ela atravessa; correção do termo quando o pedido é vago; o atlas BodyParts3D com 3.432 conceitos
  zaeon-app-licenca: CC-BY-SA 2.1 JP (BodyParts3D, RIKEN)
---

# Atlas 3D do corpo humano

Procedimento para mostrar estrutura anatômica. O atlas é o **BodyParts3D**, aberto, com 2.234
malhas e 3.432 conceitos nomeados — referência de **adulto masculino**, **educacional**.

## A regra que manda em todas as outras

**Uma peça por pedido, isolada.** Quem pede o fêmur quer ver o fêmur, não o corpo inteiro com o
fêmur em algum lugar dentro.

Isto não é preferência estética, é uma medida: um pedido de pulmão sem isolamento deixa 2.229
peças desenhadas, e as 124 do pulmão ficam **atrás** de 402 músculos. A peça está lá, visível pela
regra de visibilidade do atlas, e o aluno não vê nada. Selecionar não é mostrar.

## Mostrar o que NÃO foi pedido é erro

Não é "resposta parcial" nem "contexto a mais": é **erro**, e o sistema o trata assim. O harness só
deixa viajar a peça que o atlas consegue mostrar isolada; o que não passa não vira cartão.

- **O corpo inteiro nunca é a resposta a um pedido de parte.** Se a única coisa que você tem para
  mostrar é o corpo, não mostre nada e pergunte qual parte.
- **O lado importa.** "Pulmão direito" é o direito — `right lung`, 156 malhas —, não o esquerdo.
  O atlas guarda quase tudo em par (`left …` / `right …`): passe o lado que o aluno disse, com as
  palavras dele ("direito", "esquerda"). Se ele não disse o lado e a estrutura só existe em par,
  mostre um e **diga qual**, oferecendo o outro.
- **O vizinho de nome não serve.** Intestino delgado não é o grosso; veia cava superior não é a
  inferior; membro inferior não é o músculo reto inferior do olho. Se a busca devolveu um nome que
  não é o que foi pedido, isso é "o atlas não tem" — não é "achei algo parecido".
- **Uma estrutura por resposta.** Pedido com duas ("coração e pulmão") mostra a primeira e oferece
  a segunda.

## Passo a passo

1. **Identifique a estrutura no pedido.** Use `buscar_anatomia` com o termo do aluno, em
   português mesmo — o atlas tem tabela de sinônimos para órgãos e sistemas comuns.

2. **Se o termo for uma CLASSE genérica, pergunte qual.** "osso", "músculo", "artéria", "veia",
   "nervo", "tendão", "órgão" não são pedidos de peça: são categorias. `artéria` sozinha casa com
   **562 conceitos**, um quarto do atlas. Nesse caso a busca recusa com `classe_generica` e devolve
   `alternativas` — ofereça essas alternativas e espere a escolha. Nunca escolha por ele, e nunca
   abra a categoria inteira.

3. **Se o pedido tiver qualificador, o qualificador vence a categoria.** "nervo ciático" é o
   ciático, não a categoria `nerve`. "osso do fêmur" é o fêmur, não a categoria `bone`.

4. **Confira o nome que voltou contra o que foi pedido** — estrutura, lado e posição
   (superior/inferior, delgado/grosso). Se não bate, não mostre: diga que o atlas não tem.

5. **Mostre uma peça só, isolada**, e diga os sistemas que ela atravessa. `inspecionar_anatomia`
   com o identificador exato (ex.: `FMA7088`) dá nome, sistemas, quantas malhas agrupa e a
   explicação disponível.

6. **Se não existir no atlas, diga que não existe** — e diga o que existe perto. O atlas tem
   buracos conhecidos e grandes: **não há parênquima pulmonar** (as 119 peças "respiratórias" são
   100 árvores brônquicas mais traqueia, nasal e faríngeo), e os conceitos de nervo são **todos
   cranianos e orbitais** — não há ciático, tibial, femoral nem safeno. Prometer o que não tem é
   pior do que admitir o buraco.

## O que esta skill não faz

- **Não responde pergunta clínica, cirúrgica ou de diagnóstico.** O atlas é educacional e de
  referência adulta masculina. Pedido clínico: diga isso e devolva ao estudo da estrutura.
- **Não inventa estrutura.** Se `buscar_anatomia` não devolveu, a estrutura não entra na resposta
  como se o atlas a tivesse.
