# Testes do #850 e do #861 — agenda do Escritório e uso no celular

Registro feito depois (21/11): esses PRs entraram sem o documento de testes. Aqui ficam o que entrou e o
resultado dos testes da Giulia no celular.

## O que entrou

- **#858 (#850 PR 1):** agenda do escritório e uso do Escritório no celular.
  - Agenda: um dia por vez no celular (setas ‹ ›), quadrados de 44 px, "repete toda semana", dias que já passaram apagados, aviso "a próxima é …".
  - Rota da agenda: valida antes de apagar, 409 quando a janelinha ficou velha, apagar + criar numa transação.
  - Sino e lista de escritórios ajustados à tela (`useCabeNaTela`), dicas do escritório novo, o agente não repete a saudação.
- **#860 (#850 PR 2):** avisos com o visual do app no lugar das janelinhas do navegador (`lib/ui/avisos.ts`, `components/sistema/Avisos.tsx`, 51 trocas em 21 arquivos); Perfil e Notícias legíveis (letras ≥ 11 px, botões de 44 px).
- **#863 (#861 PR 1):** cada horário desenhado como **uma barra** do começo ao fim, com a foto conforme o tamanho (`modoDoBloco`: cartão, linha, estreito, mini, curto); salvar e apagar sem travar a grade (o bloco aparece na hora; erro mostra "Tentar de novo").
- **#865 (#861 PR 2):** a equipe.
  - 4 pessoas ou mais no mesmo horário viram **um bloco** (3 rostos, "+N", "N pessoas").
  - Selo **"agora"** e contorno no bloco que está acontecendo; a linha da hora passa por baixo dos blocos.
  - Filtro **Todos / Só eu / Meus contatos** (contatos = convites de contato aceitos; o GET da agenda devolve `contatos`).
  - Tocar no horário de outra pessoa abre a **lista** de quem está, com "Marcar também".

## Testes automáticos

- `lib/canal/agenda861.test.ts`: barras, colunas, `modoDoBloco`, multidão, `pessoasNoBloco`, `acontecendoAgora`, `filtrarFaixas`.
- `components/office/AgendaBandeja.test.tsx`: barra cartão, salvar sem travar, erro + "Tentar de novo", lista + "Marcar também", multidão, filtro "Só eu".
- `app/api/canal/[id]/agenda/route.test.ts`: 409, transação, `contatos` no GET.
- `components/sistema/Avisos.test.tsx`: avisos, confirmação, foco e Esc.
- Suíte completa de cada PR (`--maxWorkers=2`): sem falha nova em relação à main.

## Testes da Giulia no celular (21/11, depois do #865 no ar)

| Teste | Resultado |
|---|---|
| "Meus contatos" | ✅ ficam ela e o Martinez (a andressa não é contato aceito, então some) |
| Tocar no horário da andressa | ✅ lista "Sábado, 9h · 1 pessoa" com "Marcar também"; marcou 9h–10h |
| "Só eu" | ✅ fica só o bloco dela |
| Apagar e Desfazer | ✅ sumiu na hora e voltou igual |
| Mudar 14h–17h → 15h–17h | ✅ mudou sem piscar |
| Modo avião | ✅ "Não deu pra salvar o horário / Tentar de novo", sem marcar de mentira; com internet a hora juntou no bloco (15h–18h, "Esticado") |
| Arrastar 14h→16h | ⚠️ marcou 14h–17h (cada quadrado é a hora inteira) → rascunho tracejado no #867 |
| Aviso "toda sábado" | ⚠️ → "todo sábado" no #867 |
| Dois dividindo no celular | ⚠️ só foto + "7h" → nome e horário no #867 |
| "Marcar também" | ⚠️ só a hora tocada → horário inteiro no #867 |
| Sino e lista de escritórios | ✅ abrem; ⚠️ chat aparecendo por trás e canto direito cortado → #867 |
| "1 on" | ⚠️ quebra em duas linhas com nome comprido → #867 |
| Agente sem repetir o "oi" | ✅ |
| Agente com pedido vago | ⚠️ respondeu um trecho aleatório da base (MMLU) → card #868 |

No celular o Escritório não mostra as fotos de quem está online (só o número), então o teste do anel cortado é só no computador.

Kanban (21/11): #713, #731, #850 e #861 → Corrigido.
