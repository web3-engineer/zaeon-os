# Sala de Pesquisa — Regras de UX (fonte da verdade)

> Convenções acordadas com o Martinez. Toda mudança na sala respeita isto.

## 1. Abas (pills) acima da linha; texto abaixo
- Os **únicos botões** da folha ficam **acima da linha reta** (a linha de pills/abas), estilo **liquid glass**.
- **Abaixo da linha = só texto** (o editor de escrita). Nada de botão/aba ali dentro.

## 2. Pill do trabalho = seletor de tipo (uma coisa só)
- O pill **"📝 Meu TCC/Artigo/Relatório"** É o seletor de tipo. Clicar nele abre as opções (Artigo/Relatório/TCC).
- Mantém a flag do tipo atual. Só **um** tipo ativo por vez.
- Essa aba é **permanente** — nunca pode ser apagada.

## 3. Cada coisa gerada = uma aba deletável
- **Play** num documento → abre uma aba do documento.
- **Merge** (arrastar pesquisa A sobre B) → abre **uma aba nova "A × B"** com o resumo da relação.
- Play e merge são renderizados **juntos**, como abas, ao lado do pill do trabalho.
- Toda aba gerada tem um **✕** (canto superior direito) e pode ser apagada. Só a do trabalho não.
- **Passivo:** ao gerar, NÃO interrompe o usuário (sem modal, sem trocar a view). A aba aparece;
  o usuário clica nela quando quiser ver.

## 4. Carregamento sempre sutil
- **Toda operação que carrega** (play, merge, resumo, etc.) mostra uma **barrinha de carregamento sutil**.
- Nada agressivo: sem spinners gigantes, sem modal bloqueante, sem flash. Fino, discreto, no canto/topo.
- Padrão visual: barra fina com gradiente (violeta→ciano) como no `liquid-glass-style-reference.md §8`.

## 5. Comunicação do agente (Aura)
- Tom de **parceira de pesquisa**, humano e fluido — **texto corrido**, sem lista numerada robótica.
- Negrito (`**`) renderizado de verdade (ver `components/research/RichText.tsx`), só no que merece destaque.

## 6. Badges nos ícones (padrão único)
- **Tudo na barra inferior.** Documento (DocIcon) e citação (CitationsPanel) seguem o mesmo padrão:
  - canto **inferior esquerdo** = ação/estado verde (ver doc · status da citação);
  - canto **inferior direito** = **×** vermelho de excluir (aparece no hover).
- O **＋ verde** do documento só aparece se o arquivo é **realmente visualizável** (blob morto/sem PDF → não mostra).

## 7. Citações (motor + painel)
- **Motor estável:** ABNT/inline montados em código (NBR 6023/10520) a partir de metadados cruzados via
  **CrossRef** (DOI + título) e **arXiv**. Nunca inventa: se não cruzar, devolve `needsMetadata` e o app abre um
  **modal** pra o usuário digitar autores/ano/título. Ver `lib/abntFormat.ts` + `app/api/ai/cite/route.ts`.
- **Citações vivem no painel DIREITO** (não vazam pro editor). Abrem no 🔖 como notinhas/arquivos, arrastáveis pro texto.
- **Status ＋ / ✓ (inferior esquerdo):** `＋` = ainda não usada · `✓` = já colada no trabalho (`SavedCitation.used`).
  A citação **permanece** no painel depois de usada (como um arquivo).
- **Correlação total:** apagar a citação no painel (×) remove **também** a frase + a referência do trabalho
  (evento `zaeon:citationRemove` → `applyCitationRemoval` em `lib/citationInsert.ts`). Nunca fica num lado só.
- **Aplicar sugestão:** quando a Aura sugere um recorte melhor, o botão **Aplicar** recita e atualiza a mesma nota.
