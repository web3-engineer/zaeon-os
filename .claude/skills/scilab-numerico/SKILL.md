---
name: scilab-numerico
description: Entrega o Scilab, o ambiente open-source de computação numérica — matrizes, gráficos, sinais, controle e a simulação por blocos do Xcos — com a instalação e os primeiros comandos. Use quando o aluno precisar de cálculo numérico, álgebra linear, simulação de sistemas dinâmicos ou controle, quando a disciplina usar Scilab ou Xcos, ou quando ele perguntar por uma alternativa livre ao MATLAB e ao Simulink. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho oficial e as instruções, não executa o Scilab. Scilab (Dassault Systèmes e contribuidores, GPL-2.0).
license: GPL-2.0-only
runtime: ts
risk: read
minPlan: free
courseTags:
  - calculo-numerico
  - engenharia
  - controle
  - matematica
metadata:
  zaeon-familia: device
  zaeon-titulo: Scilab — cálculo numérico e simulação
  zaeon-subtitulo: Matrizes, gráficos e diagramas de blocos (Xcos) livres no seu computador
  zaeon-modelo: ondas
  zaeon-tags: Scilab, Xcos, cálculo numérico, controle, simulação, open source
  zaeon-entrega: o espelho oficial de download do Scilab (GPL-2.0); a instalação; os primeiros comandos com matrizes e gráficos; o primeiro diagrama de blocos no Xcos; a tabela de equivalência com MATLAB e com Python (NumPy)
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://www.scilab.org/download
  zaeon-agente: noether
  zaeon-app-licenca: GPL-2.0 (Scilab, desde a versão 6.0; Dassault Systèmes, Scilab Enterprises, Inria e contribuidores)
---

# Scilab — cálculo numérico e simulação

Procedimento para instalar e começar no **Scilab**, ambiente open-source de computação numérica.
Código-fonte em https://gitlab.com/scilab/scilab, licença **GNU GPL v2.0** (desde a versão 6.0;
as anteriores eram CeCILL).

Este é um card de **dispositivo**: o Scilab roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções.

## Instalação

1. **Baixe** pelo espelho do card — a página oficial, com instaladores para **Windows**, **macOS**
   e **Linux** (o card marca Windows por ser o caso mais comum).
2. Instale e abra. A janela tem o **console** (onde se digita), o **navegador de variáveis** e o
   **SciNotes** (o editor de scripts `.sce`).

## Os primeiros comandos

```
A = [1 2; 3 4]        // matriz 2x2 (ponto e vírgula separa linhas)
b = [5; 6]
x = A \ b             // resolve A*x = b  (não use inv(A)*b)
t = linspace(0, 2*%pi, 200);
plot(t, sin(t)); xgrid(); xlabel("t (s)"); ylabel("sen(t)")
```

- Constantes levam `%`: `%pi`, `%e`, `%i`, `%t`, `%f`.
- `.*` e `./` operam **elemento a elemento**; `*` é produto de **matrizes**. Confundir os dois é
  o erro número um.
- `;` no fim da linha silencia a saída. `help plot` abre a ajuda.

## Xcos — simulação por blocos

1. No console, `xcos` abre o editor e a paleta de blocos.
2. Arraste uma **fonte** (degrau), um bloco de **função de transferência** (`CLR`), um
   **osciloscópio** (`CSCOPE`) e um **relógio** (`CLOCK_c`) ligado ao osciloscópio.
3. Ligue os blocos, ajuste o tempo final em *Simulação → Configurar* e rode. É o equivalente
   livre do Simulink para as disciplinas de sinais e controle.

## Equivalência rápida

| Ideia | Scilab | MATLAB | Python (NumPy) |
|---|---|---|---|
| resolver sistema | `A \ b` | `A \ b` | `np.linalg.solve(A, b)` |
| pi | `%pi` | `pi` | `np.pi` |
| comentário | `//` | `%` | `#` |
| autovalores | `spec(A)` | `eig(A)` | `np.linalg.eigvals(A)` |

Se o aluno só precisa do **cálculo** e não do Xcos, o mesmo exercício cabe em Python com NumPy,
que roda no navegador (sandbox dos cursos ou JupyterLite) sem instalar nada.

## O que esta skill NÃO faz

- **Não executa o Scilab no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não garante compatibilidade com código MATLAB.** A sintaxe é parecida, não idêntica; script
  `.m` precisa de adaptação.
