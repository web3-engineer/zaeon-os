# Zaeon Hermes (macOS)

O console **interno** da orquestra de agentes da Zaeon. Leva para os agentes de produto a mesma
interface do Hermes (NousResearch `hermes-agent`, MIT) que usamos no desenvolvimento
(`docs/FLUXO_HERMES.md`): um **quadro** de cartões em que cada tarefa vai para uma faixa, e aqui a
faixa é o **motor** (`aura`, `deepseek-v4-profundo`, `tongyi-deepresearch`, `kimi-enxame`,
`enxame-misto`, `http:<id>`), mais um **dashboard por motor** com tudo o que ele tem e faz.

É controle interno: nada daqui chega ao aluno. O contrato exato da API está em
`docs/HERMES_ZAEON.md`; o vocabulário (formatos, `[E#]`, verificador) em `docs/ORQUESTRA.md`.

## Telas

| Tela | O que mostra |
|---|---|
| **Quadro** | Kanban com as colunas Rodando · Concluída · Fallback (Aura assumiu) · Falhou. Cada cartão: selo do motor (cor pela origem), intent, objetivo, tempo, custo, subagentes, citações inventadas (vermelho se > 0) e cobertura. Filtros por motor, origem (chat/arena), busca e ordenação. Clique abre a tarefa. |
| **Saúde do chat** | `GET /saude?horas=` (Estudos e Pesquisa, Aura e orquestra). Serve para **verificar se as correções de experiência funcionaram**. Seletor 1 h / 24 h / 7 d; cartões de taxa de falha, % de turnos na **reserva** (troca de família: âmbar acima de 5%, vermelho acima de 10%), turnos com **modelo aposentado** (vermelho se > 0) e total de turnos; tabela por fase (chamadas, falhas, taxa, p50, p90); barras por alvo (Vertex, Hugging Face…); erros por classe; tabela por modelo; série por hora (chamadas ok × falhas em barras, p50 em linha). Bom = reserva perto de 0, aposentado = 0, p90 do rascunho ≤ 12 s. Atualiza a cada 30 s. |
| **Motores** | Na barra lateral, com o ponto de disponibilidade. O dashboard tem cabeçalho (nome, origem, formato, descrição), cartões de métricas (tarefas, concluídas, fallbacks, degradadas, p50/p90, custo médio/total, citações inventadas, cobertura média, subagentes), gráfico de barras das últimas tarefas (duração ou custo), modelos com rotas (provedor/modelo, ✓/✗ de chave) e preço por milhão de tokens, ferramentas, datasets, o system prompt (monoespaçado, com botão de copiar) e as últimas tarefas. |
| **Tarefa** | Resumo e decisão do roteador; abas **Texto** (markdown final, com cada `[E#]` clicável abrindo a evidência ao lado; chave sem evidência fica em vermelho), **Linha do tempo** (eventos com tempo relativo e intervalo), **Subagentes** (árvore orquestrador → subagentes → chamadas de ferramenta, com as evidências de cada um), **Evidências** (tabela com chave, afirmação, fonte clicável, ferramenta e agente) e **Ledger** (cada chamada de LLM com modelo, provedor, fase, tokens, tempo, ok/erro e custo, com totais). Enquanto a tarefa roda, recarrega a cada 3 s. |
| **Datasets** | Nome, tipo, fonte, licença, documentos, trechos e se está conectado (— quando o banco do RAG não respondeu). |
| **Arena** | Objetivo, intent, kind opcional e até 4 motores → `POST /arena`. As tarefas criadas aparecem lado a lado e se atualizam por polling, com selo para a mais rápida, a mais barata e a de maior cobertura; cada uma abre a trilha completa. |
| **Pesquisas** (Vitrine) | `/api/admin/vitrine/pesquisas`. À esquerda, **publicar**: título, nicho, tags, resumo, em nome de qual conta (e-mail, opcional) e as **partes** (artigo, dados, protocolo, revisão, código, anexo), cada uma com texto, um arquivo importado (.md, .txt, .csv, .json…) e/ou um link https. Entra publicada na hora (origem console) e vira uma **pasta** na vitrine, com as partes como papéis. As regras são as mesmas do servidor e o app avisa antes de mandar. À direita, a **fila**: o que os usuários mandaram da Sala de Pesquisa, com **aprovar** e **recusar com motivo**, e as abas Publicadas e Recusadas. |
| **Configurações** | URL do servidor (padrão `https://zaeon.com.br`) e token (arquivo só do usuário), "Testar conexão" e "Exportar trajetórias para o Hugging Face" (`POST /exportar`). |

Barra de ferramentas: modo da orquestra (`off`/`sombra`/`on`), tarefas em voo e
atualizar (⌘R). O painel se atualiza sozinho a cada 10 s. Não há tela de carregamento: o app abre
direto na interface e os carregamentos aparecem dentro dos cards.

## Como rodar

**Pelo artefato do CI (sem Xcode).** Em *Actions → Zaeon Hermes (macOS)*, abra o run mais recente
e baixe `ZaeonHermes-app`. Dentro está o `ZaeonHermes.app.zip`; descompacte e mova o app para
`/Applications`. O app é assinado **ad-hoc** (sem Developer ID), então na primeira abertura o
Gatekeeper bloqueia:
- macOS 14: botão direito no app → **Abrir** → **Abrir**;
- macOS 15: abra uma vez, depois *Ajustes do Sistema → Privacidade e Segurança* → **Abrir Mesmo Assim**;
- ou, no Terminal: `xattr -dr com.apple.quarantine /Applications/ZaeonHermes.app`.

Depois dessa primeira vez, o app se atualiza sozinho ("Atualização disponível" no pé da barra lateral) e
nunca mais pede senha: a chave do console fica num arquivo só seu, não no Keychain (ver abaixo).

**No Xcode.** Abra `apps/zaeon-hermes-mac/Package.swift` (File → Open), escolha o esquema
`ZaeonHermes` e rode (⌘R). Xcode 16+ (Swift 5.10+), macOS 14+.

**No Terminal.**
```bash
cd apps/zaeon-hermes-mac
swift run ZaeonHermes        # abre a janela
swift test                   # testes do HermesCore
./scripts/empacotar.sh       # dist/ZaeonHermes.app e dist/ZaeonHermes.app.zip
UNIVERSAL=1 ./scripts/empacotar.sh   # arm64 + x86_64 (Macs Intel)
```

## Só dado real

O app **não tem modo DEMO**: abre apontando para `https://zaeon.com.br` e, sem token, mostra só o pedido de
conexão — nunca dados de exemplo. As fixtures em `Sources/HermesCore/Resources/fixtures/` (e a `FonteDemo`)
existem só para os testes do HermesCore.

## Ligar o console no servidor

O app fala com `GET/POST /api/admin/orquestra/*` mandando `Authorization: Bearer <token>`.
1. No `.env` da VPS (o mesmo que chega ao web), defina um token aleatório de no mínimo 32 caracteres:
   ```bash
   ORQUESTRA_CONSOLE_TOKEN=$(openssl rand -hex 32)
   ```
2. Refaça o deploy (rerun do último `deploy.yml`).
3. No app, em Configurações: URL (`https://…` ou `http://localhost:3000` em dev), o mesmo token,
   **Salvar** e **Testar conexão**.

Sem a variável no servidor, o caminho por token fica desligado (só a sessão de super-admin entra) e o
app recebe `401`. A exportação para o Hugging Face exige `HF_DATASETS_TOKEN` e `HF_DATASETS_ORG` no
servidor; sem eles, o app mostra o `503 datasets_desligados`.

A URL e o token ficam em `~/Library/Application Support/space.zaeon.hermes/config.json` (pasta 0700,
arquivo 0600: só o seu usuário lê). Não no Keychain: o app é ad-hoc, e o Keychain amarra cada item ao hash
exato do binário, então toda atualização fazia o macOS pedir a senha de login. HTTP sem TLS só é aceito
para `localhost` (exceção de ATS no `Info.plist`).

## Estrutura

```
Package.swift                       # tools 5.10, macOS 14; o alvo do app só é declarado no macOS
Sources/HermesCore/                 # compila em macOS e Linux, sem SwiftUI/AppKit/Security
  Modelos.swift Enums.swift         # o contrato, com decodificação tolerante (.desconhecido, nulos)
  APIClient.swift                   # URLSession + Bearer, erros tipados (401/404/503…)
  Quadro.swift Estatisticas.swift   # kanban, filtros, métricas, arena
  Trilha.swift Formatacao.swift     # linha do tempo, árvore de subagentes, ledger, texto com [E#]
  Saude.swift                       # saúde do chat: modelos, tons, critérios de "bom"
  Pesquisas.swift                   # pesquisas da vitrine: rascunho com as regras do servidor, pedido, fila
  Fixtures.swift                    # fixtures + FonteDemo (só testes)
  Resources/fixtures/*.json
Sources/ZaeonHermes/                # SwiftUI (macOS)
  Resources/zaeon-name.png          # o letreiro original (cópia de app/zaeon-name.png)
Tests/HermesCoreTests/              # XCTest: decodificação, quadro, métricas, árvore, APIClient com URLProtocol
scripts/empacotar.sh                # .app + Info.plist + codesign ad-hoc + zip
```

O HermesCore é testado também no Linux (`swift test` com o toolchain do swift.org); o app SwiftUI só
compila no runner macOS do workflow `.github/workflows/zaeon-hermes-mac.yml`.
