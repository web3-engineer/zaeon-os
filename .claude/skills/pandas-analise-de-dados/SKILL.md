---
name: pandas-analise-de-dados
description: Ensina análise de dados tabulares em Python com o pandas — carregar um CSV, inspecionar, limpar valores faltantes, filtrar, agrupar, juntar tabelas e resumir, no roteiro de uma análise exploratória honesta. Use quando o aluno tiver uma planilha ou CSV para analisar, perguntar como agrupar ou cruzar dados, quiser sair do Excel para o Python, ou começar em ciência de dados. pandas (PyData Development Team, BSD-3-Clause).
license: BSD-3-Clause
runtime: ts
risk: read
minPlan: free
courseTags:
  - ciencia-de-dados
  - estatistica
  - python
  - analise-de-dados
metadata:
  zaeon-familia: procedimento
  zaeon-repo: pandas-dev/pandas
  zaeon-titulo: pandas — da planilha à resposta
  zaeon-subtitulo: Carregar, limpar, agrupar e cruzar dados em Python, no roteiro de uma análise exploratória honesta
  zaeon-modelo: graos
  zaeon-tags: pandas, ciência de dados, Python, CSV, análise, open source
  zaeon-entrega: o roteiro de análise exploratória em sete passos; leitura de CSV brasileiro (separador e decimal); limpeza de faltantes sem esconder o problema; groupby e merge explicados; os erros que geram conclusão falsa
  zaeon-agente: noether
  zaeon-app-licenca: BSD-3-Clause (pandas, AQR Capital Management, Lambda Foundry e PyData Development Team)
---

# pandas — da planilha à resposta

Procedimento para ensinar **análise de dados tabulares** com o **pandas**. Código-fonte em
https://github.com/pandas-dev/pandas, licença **BSD-3-Clause**. Roda na máquina do aluno e
também no navegador (JupyterLite).

## O roteiro de uma análise exploratória

```python
import pandas as pd
df = pd.read_csv("dados.csv", sep=";", decimal=",", encoding="utf-8")   # CSV no padrão brasileiro
df.shape; df.dtypes; df.head()          # 1. o que eu tenho?
df.isna().sum()                         # 2. o que falta?
df.describe(include="all")              # 3. como cada coluna se distribui?
df[df["idade"] >= 18]                   # 4. filtrar
df.groupby("curso")["nota"].agg(["count", "mean", "median"])   # 5. agrupar e resumir
df.merge(turmas, on="id_turma", how="left", validate="m:1")    # 6. cruzar com outra tabela
```

1. **Olhe antes de calcular.** `shape`, `dtypes` e `head` antes de qualquer média. Número lido
   como texto (por causa da vírgula decimal) é o tropeço número um com dado brasileiro.
2. **Faltante não se apaga calado.** Conte, entenda POR QUE falta, e só então decida entre
   remover, preencher ou manter. Diga no relatório o que fez e quantas linhas afetou.
3. **Sempre `count` junto da média.** Média de um grupo com 3 linhas não se compara com média de
   um grupo com 3.000.
4. **`merge` com `validate`.** Junção que duplica linha infla soma e ninguém percebe. Confira o
   número de linhas antes e depois.
5. **Mediana ao lado da média** quando houver valor extremo (renda, tempo, preço).
6. **A pergunta vem antes do gráfico.** Cada tabela ou gráfico responde a uma pergunta escrita.
7. **Correlação não é causa.** Diga isso em voz alta toda vez que aparecer um `corr()`.

## O que esta skill NÃO faz

- **Não tira a conclusão pelo aluno.** Mostra o caminho e os alertas; a interpretação é dele.
- **Não trata dado pessoal sem cuidado.** Planilha com nome, CPF ou saúde de gente real pede
  anonimização antes de sair do computador de quem tem o direito de usá-la (LGPD).
- **Não substitui o delineamento estatístico.** Resumir dados não é testar hipótese.
