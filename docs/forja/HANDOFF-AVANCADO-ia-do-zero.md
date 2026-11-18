# Handoff avançado — 🧠 IA / MACHINE LEARNING DO ZERO

Curadoria verificada de repos pra construir redes neurais, LLMs e agentes **do zero**. Leia
[`HANDOFF-AVANCADO.md`](./HANDOFF-AVANCADO.md) e [`HANDOFF-NOVOS-CURSOS.md`](./HANDOFF-NOVOS-CURSOS.md) antes.
Linhas de `gh api` real. Tamanho: ✅ &lt;30 MB · ⚠️ 30–150 MB · ⛔ &gt;150 MB.

> **Entregável = treinar/rodar**, não publicar. E cuidado com peso: repos de IA às vezes trazem checkpoints/
> datasets e incham. Os ✅ aqui são os enxutos e didáticos; os ⚠️ (tinygrad, modded-nanogpt) fume antes.

| owner/repo | ⭐ | tamanho | licença | lang | sub-área | por que é um bom curso difícil |
|---|---|---|---|---|---|---|
| `karpathy/micrograd` | 18904 | ✅ 0.24 MB | MIT | Jupyter | Autograd do zero | O engine escalar de backprop em ~100 linhas: reconstrói o motor de gradiente que sustenta toda rede neural. |
| `seungeunrho/minimalRL` | 3271 | ✅ 62 KB | MIT | Python | Aprendizado por reforço | Cada algoritmo de RL (DQN, PPO, A3C…) num arquivo curto — RL sem abstrações escondidas. |
| `bot66/MNISTDiffusion` | 146 | ✅ 0.65 MB | MIT | Python | Modelo de difusão | DDPM mínimo em MNIST: entende ruído/denoise e a U-Net sem o peso de bibliotecas de difusão. |
| `lionelmessi6410/Neural-Networks-from-Scratch` | 187 | ✅ 0.78 MB | Apache-2.0 | Jupyter | Rede neural em numpy | MLP/backprop só com numpy — derivar o gradiente na mão antes de confiar em frameworks. |
| `pguso/agents-from-scratch` | 1074 | ✅ 0.88 MB | MIT | Python | Agente de IA do zero | O loop de um agente (tools, planejamento, memória) na mão — o que os frameworks escondem. |
| `karpathy/nanoGPT` | 64720 | ✅ 1 MB | MIT | Python | GPT / transformer | Treina um GPT de ponta a ponta com código legível: atenção, tokenização e loop de treino. |
| `pguso/rag-from-scratch` | 1653 | ✅ 1.3 MB | MIT | JavaScript | RAG educacional | Pipeline RAG peça por peça (embeddings, índice, recuperação) sem framework. |
| `Lightning-AI/lit-llama` | 6080 | ✅ 1.7 MB | Apache-2.0 | Python | LLM (LLaMA) do zero | Reimplementação limpa do LLaMA: arquitetura de LLM moderno, LoRA e quantização lendo código de produção. |
| `KellerJordan/modded-nanogpt` | 6031 | ⚠️ 85 MB | MIT | Python | GPT / otimização de treino | "Speedrun" de treino do GPT-2: otimizadores, eficiência e engenharia de treinamento avançada. |
| `tinygrad/tinygrad` | 33906 | ⚠️ 138 MB | MIT | Python | Engine de deep learning | Framework de DL completo em pouco código: autograd, lazy eval e kernels de verdade. |

## Sugestão de registro (exemplos)
```ts
{ id: "autograd-micrograd", conceito: "autograd do zero (avançado)", modo: "curso",
  repo: "karpathy/micrograd", titulo: "Autograd do zero (micrograd)",
  resumo: "Em ~100 linhas você reconstrói o motor de backprop que sustenta toda rede neural.",
  licenca: { spdx: "MIT", titular: "Andrej Karpathy", url: "https://github.com/karpathy/micrograd/blob/HEAD/LICENSE" } },
{ id: "gpt-do-zero", conceito: "GPT/transformer do zero (avançado)", modo: "curso",
  repo: "karpathy/nanoGPT", titulo: "Treine um GPT do zero (nanoGPT)",
  resumo: "Atenção, tokenização e loop de treino — um GPT de ponta a ponta em código legível.",
  licenca: { spdx: "MIT", titular: "Andrej Karpathy", url: "https://github.com/karpathy/nanoGPT/blob/HEAD/LICENSE" } },
```

## Copyleft notáveis — FORA
- **zishansami102/CNN-from-Scratch** — CNN em numpy didática, mas **GPL-3.0** (copyleft) → fora da regra.

(Apareceram só MIT/Apache nas buscas; nenhum BSD/ISC/MPL relevante surgiu, então nenhum foi incluído.)
