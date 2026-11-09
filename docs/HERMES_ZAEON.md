# Zaeon Hermes: o console interno da orquestra (app macOS)

> App: `apps/zaeon-hermes-mac/` (SwiftUI, macOS 14+) · Servidor: `app/api/admin/orquestra/*` · Núcleo: `lib/orquestra/`
> Build: `.github/workflows/zaeon-hermes-mac.yml` (runner macOS). O `.app` sai como artefato do workflow.

## Por quê

O Hermes (NousResearch `hermes-agent`, MIT) é o nosso orquestrador **de desenvolvimento** (`docs/FLUXO_HERMES.md`):
um quadro de cartões em que cada cartão vai para uma faixa (claude-code, codex-cli, manus). O Zaeon Hermes
leva a **mesma interface** para os agentes **de produto**:
- **quadro:** cada tarefa da orquestra é um cartão, com estado e faixa (o motor);
- **motores:** o dashboard de cada um mostra tudo o que ele tem e faz (modelos, rotas, preços, ferramentas, datasets, prompt, métricas, últimas tarefas);
- **tarefa:** a trilha completa (decisão, eventos no tempo, subagentes, chamadas de ferramenta, evidências [E#], verificador, ledger por chamada);
- **arena:** testar motores antes de chegarem ao aluno;
- **exportar:** levar as trajetórias para um dataset do Hugging Face, para treino e avaliação.

É controle interno: nada aqui chega ao cliente final.

## Autenticação

Toda rota exige **um** destes:
- `Authorization: Bearer <ORQUESTRA_CONSOLE_TOKEN>`. O token vem do env do servidor, com no mínimo 32 caracteres. Sem env = o caminho por token fica desligado.
- uma sessão NextAuth de super-admin (o mesmo `isSuperAdmin` das outras rotas admin).

Falhou: `401 {"erro":"nao_autorizado"}`. O app guarda URL e token no Keychain.

## Contrato (JSON; datas ISO-8601; dinheiro em USD estimado)

### `GET /api/admin/orquestra/painel`
```jsonc
{
  "geradoEm": "2026-11-08T05:00:00.000Z",
  "modo": "off" | "sombra" | "on",
  "emVoo": 0,
  "config": { "planoMinimo": "pro", "subagentesPro": 4, "subagentesMax": 12, "maxSimultaneas": 2,
              "prazoProfundoMs": 240000, "prazoEnxameMs": 480000, "sorteio": false,
              "verificador": "max" | "todos" | "off", "motorForcado": null },
  "motores": [MotorPainel],
  "datasets": [DatasetPainel],
  "ferramentas": [{ "nome": "literature_search", "descricao": "…", "risco": "read" }],
  "tarefas": [ResumoTarefa]            // as 50 mais recentes
}
```
`MotorPainel`:
```jsonc
{ "id": "kimi-enxame", "nome": "Kimi K2.6 · enxame", "origem": "zaeon|alibaba|deepseek|moonshot|outro",
  "formato": "unico|profundo|enxame", "descricao": "…", "disponivel": true,
  "modelos": [{ "id": "kimi-k2.6", "nome": "Kimi K2.6", "familia": "moonshot",
                "rotas": [{ "provedor": "moonshot", "modelo": "kimi-k2.6", "configurado": true }],
                "preco": { "prompt": 0.95, "completion": 4.0, "cached": 0.16 } }],
  "ferramentas": ["literature_search", "web_search", "base_conhecimento"],
  "datasets": ["rag:area:medicina", "rag:turma", "…"],
  "prompt": "o system prompt que o motor recebe, renderizado para uma tarefa de exemplo",
  "metricas": { "tarefas": 0, "concluidas": 0, "fallbacks": 0, "degradadas": 0, "msP50": 0, "msP90": 0,
                "custoMedioUsd": 0, "custoTotalUsd": 0, "citacoesInventadas": 0, "coberturaMedia": 0, "subagentesMedia": 0 } }
```
A Aura entra como motor `aura` (origem zaeon, formato unico), com `modelos` vindos do Vertex.

`DatasetPainel`:
```jsonc
{ "id": "rag:area:medicina", "nome": "Área · medicina", "tipo": "rag-area|rag-turma|rag-pessoal|hf-dataset",
  "fonte": "SciELO pt + Wikipédia pt + rhaymison/medicine-*", "licenca": "CC-BY-4.0 / CC-BY-SA / Apache-2.0",
  "descricao": "…", "documentos": 1234, "trechos": 56789, "conectado": true }
```
`documentos`/`trechos` são `null` quando o banco do RAG não respondeu.

`ResumoTarefa`:
```jsonc
{ "id": "24hex", "criadaEm": "…", "atualizadaEm": "…", "status": "rodando|concluida|fallback|falhou",
  "origem": "chat|arena", "motor": "kimi-enxame", "nomeMotor": "Kimi K2.6 · enxame", "formato": "enxame",
  "intent": "criar_trabalho", "plano": "max", "objetivo": "primeiros 160 caracteres",
  "ms": 123456, "custoUsd": 0.42, "subagentes": 6, "evidencias": 31, "citadas": 18, "invalidas": 1,
  "cobertura": 0.83, "aprovado": true, "degradado": false }
```
`ms`/`custoUsd`/… são `null` enquanto a tarefa está `rodando`.

### `GET /api/admin/orquestra/tarefas?motor=&status=&limite=50`
`{ "tarefas": [ResumoTarefa] }`

### `GET /api/admin/orquestra/tarefas/{id}`
```jsonc
{ "tarefa": ResumoTarefa & {
    "decisao": { "motor": "…", "formato": "…", "motivo": "…", "maxSubagentes": 12, "prazoMs": 480000, "verificadorGlobal": true },
    "eventos": [{ "t": 1234, "fase": "subagente", "rotulo": "subagente 3 · DeepSeek V4 Flash: Métodos", "agente": "…" }],   // t = ms desde o início
    "evidencias": [{ "chave": "E1", "claim": "…", "source": { "title": "…", "url": "…", "authors": "…", "year": 2025 }, "ferramenta": "literature_search", "agente": "subagente 1 · …" }],
    "texto": "markdown final com as chaves [E#] — as MESMAS da tabela de evidências (o aluno vê [n]; o console vê a chave)",
    "motivo": "…" | null, "erro": "…" | null,
    "uso": { "promptTokens": 0, "completionTokens": 0, "chamadas": 0, "custoUsd": 0 },
    "ledger": [{ "at": "…", "model": "kimi-k2.6", "provedor": "moonshot", "phase": "subagente", "promptTokens": 0,
                 "completionTokens": 0, "ms": 0, "ok": true, "erro": null, "custoUsd": 0 }] } }
```
`404 {"erro":"nao_encontrada"}` quando não existe.

### `POST /api/admin/orquestra/arena`
Corpo: `{ "objetivo": "…", "intent": "criar_trabalho|pesquisar_fontes|revisar|explicar_conceito", "kind": "artigo"?, "motores": ["kimi-enxame","aura"] }`
→ `202 { "tarefas": ["24hex", …] }`. Cada motor roda em segundo plano, numa tarefa com `origem: "arena"`; o app acompanha por polling em `/tarefas/{id}`.
A arena está limitada a 4 motores por pedido e respeita o teto `ORQ_MAX_SIMULTANEAS`.

### `POST /api/admin/orquestra/exportar`
Corpo: `{ "desde": "ISO"? }` → `{ "exportadas": 12, "repo": "<org>/zaeon-orquestra-trajetorias", "arquivo": "data/…jsonl" }`.
Exige `HF_DATASETS_TOKEN` e `HF_DATASETS_ORG`; sem eles responde `503 {"erro":"datasets_desligados"}`.
O que vai para o dataset: pedido, motor, decisão, eventos, evidências, texto, métricas. **Nunca** userId nem e-mail.

### `GET /api/admin/orquestra/saude?horas=24` — a saúde do chat (verificar as correções)
Agrega o TokenLedger das superfícies `estudos` e `pesquisa` (Aura **e** orquestra). Cada turno do chat tem `taskId` próprio.
```jsonc
{ "geradoEm": "…", "janelaHoras": 24, "chamadas": 1234, "turnos": 310, "falhas": 41, "taxaFalha": 0.0332,
  "turnosComReserva": 12, "taxaReserva": 0.0387,          // turnos em que o aluno recebeu OUTRA família (gpt-oss pela reserva HF)
  "turnosComModeloAposentado": 0,                          // 404 de modelo (ex.: Pro aposentado) — deve ir a zero
  "porFase": [{ "fase": "draft", "chamadas": 300, "falhas": 9, "taxaFalha": 0.03, "msP50": 4100, "msP90": 9800 }],
  "porAlvo": [{ "alvo": "vertex", "chamadas": 1100, "fracao": 0.89 }],
  "erros": [{ "classe": "rate_limit", "n": 20 }],
  "modelos": [{ "model": "gemini-3.5-flash", "chamadas": 900, "falhas": 10, "taxaFalha": 0.011 }],
  "serie": [{ "hora": "2026-11-08T06:00:00Z", "chamadas": 50, "falhas": 2, "msP50": 3900 }] }
```

### `GET /api/admin/orquestra/agentes?dias=7` — os agentes da casa
Personas (Zaeon, Aura, Nina, Zenita, Eiffel, Davi, Caio, Téo…), os 17 mentores, o Octa e os agentes criados no admin
(`lib/orquestra/elenco.ts`). A identidade vem do roster (`lib/agents/roster`) com `AgentProfile`/`MentorTemplate` por cima; o que sabe
fazer, de `lib/agents/capacidades` e das skills do mentor; o uso, do TokenLedger por `agentKey` na janela (1–90 dias).
Chave do ledger que nenhum agente reclama vira uma linha `tipo: "sistema"`, para nenhum gasto ficar fora da tela.
Os motores da orquestra (DeepSeek, Qwen, Kimi…) continuam no `/painel`.
```jsonc
{ "geradoEm": "…", "janelaDias": 7, "bancoOk": true,
  "agentes": [{ "id": "zenita", "nome": "Zenita", "tipo": "persona|mentor|custom|sistema", "curso": null, "ativo": true,
    "ondeTrabalha": ["chat do lab"], "plugin": null, "distincao": "…", "habilidades": ["anatomia", "literature"],
    "habilidadesDegradadas": [], "ferramentas": ["buscar_anatomia", "…"], "datasets": ["rag:area:medicina", "rag:area:geral"],
    "protocolo": { "ensemble": 3, "reflexoes": 1, "porque": "…" }, "artefatos": [], "fontes": [], "guardrail": null,
    "chavesLedger": ["zenita"], "prompt": "…",
    "uso": { "chamadas": 120, "falhas": 3, "taxaFalha": 0.025, "turnos": 40, "msP50": 2100, "msP90": 7400, "tokens": 340000,
             "custoUsd": 0.42, "ultimo": "…", "modelos": [{ "modelo": "…", "chamadas": 100 }],
             "superficies": [{ "superficie": "estudos", "chamadas": 120 }], "erros": [{ "erro": "timeout", "chamadas": 3 }],
             "porDia": [{ "dia": "2026-11-09", "chamadas": 30, "falhas": 1 }] } }] }
```
