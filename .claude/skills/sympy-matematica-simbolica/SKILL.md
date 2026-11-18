---
name: sympy-matematica-simbolica
description: Ensina matemática simbólica em Python com o SymPy — simplificar, derivar, integrar, resolver equações e conferir contas de cálculo e álgebra com resposta exata, não aproximada. Use quando o aluno quiser conferir uma derivada, uma integral, um limite ou a solução de uma equação, aprender álgebra computacional, ou perguntar por uma alternativa livre ao Mathematica ou ao Maple. Roda em Python puro, inclusive no navegador. SymPy (SymPy Development Team, BSD-3-Clause).
license: BSD-3-Clause
runtime: ts
risk: read
minPlan: free
courseTags:
  - matematica
  - calculo
  - algebra
  - python
metadata:
  zaeon-familia: procedimento
  zaeon-repo: sympy/sympy
  zaeon-titulo: SymPy — a conta exata, conferida
  zaeon-subtitulo: Derivar, integrar e resolver equações em Python com resposta simbólica, sem arredondar
  zaeon-modelo: livro
  zaeon-tags: SymPy, matemática, cálculo, álgebra, Python, open source
  zaeon-entrega: o roteiro de símbolos, expressões e simplificação; derivada, integral, limite e série; resolução de equações e sistemas; como conferir uma conta feita à mão; a saída em LaTeX
  zaeon-agente: noether
  zaeon-card: agente
  zaeon-app-licenca: BSD-3-Clause (SymPy, SymPy Development Team)
---

# SymPy — a conta exata, conferida

Procedimento para ensinar e usar o **SymPy**, a biblioteca de matemática simbólica em Python.
Código-fonte em https://github.com/sympy/sympy, licença **BSD-3-Clause**, do SymPy Development
Team. É Python puro — por isso roda também no navegador (JupyterLite, sandbox dos cursos).

## A ideia que separa simbólico de numérico

`math.sqrt(8)` devolve `2.828...`, um número aproximado. `sympy.sqrt(8)` devolve `2*sqrt(2)`,
a resposta **exata**. Ensine isto primeiro: no SymPy a expressão é um objeto, e a conta é feita
como no caderno, não como na calculadora.

## O roteiro

```python
from sympy import symbols, diff, integrate, limit, solve, simplify, Eq, sin, oo, latex
x = symbols('x')
diff(x**3 * sin(x), x)          # derivada
integrate(x * sin(x), x)        # primitiva (sem a constante: lembre o aluno do + C)
integrate(x**2, (x, 0, 1))      # integral definida -> 1/3
limit(sin(x)/x, x, 0)           # limite -> 1
solve(Eq(x**2 - 5*x + 6, 0), x) # equação -> [2, 3]
latex(diff(x**3, x))            # a expressão em LaTeX, pronta para o relatório
```

1. **Declare os símbolos** com `symbols`. Variável Python comum não é símbolo.
2. Use `Rational(1, 3)` ou `S(1)/3` para frações; `1/3` vira `0.333...` antes de o SymPy ver.
3. **Para conferir uma conta do aluno**, não mostre a resposta de cara: calcule
   `simplify(resposta_dele - resposta_certa)`. Se der `0`, as duas são equivalentes mesmo com
   formas diferentes. É assim que se confere sem humilhar e sem aceitar errado.
4. Quando o resultado sair feio, tente `simplify`, `factor`, `expand` ou `trigsimp` — cada um
   arruma numa direção.

## Como conduzir com o aluno

Peça a tentativa à mão antes. O SymPy é o **gabarito e o microscópio**, não o substituto do
raciocínio: use-o para achar em qual passo a conta dele desviou, comparando passo a passo.

## O que esta skill NÃO faz

- **Não faz a lista de exercícios pelo aluno.** Confere e explica; a resolução é dele.
- **Não prova teorema.** `simplify(...) == 0` é evidência forte, não demonstração formal.
- **Não promete solução fechada para tudo.** Há integrais e equações sem forma elementar; aí o
  SymPy devolve a expressão sem resolver, e o caminho é o numérico (`nsolve`, `evalf`).
