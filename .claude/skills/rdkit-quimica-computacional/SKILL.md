---
name: rdkit-quimica-computacional
description: Ensina quimioinformática com o RDKit — ler uma molécula a partir de SMILES, desenhar a estrutura, calcular massa molar, logP e outros descritores, e comparar moléculas por similaridade. Use quando o aluno de química ou farmácia quiser representar moléculas no computador, entender SMILES, calcular propriedades de um composto, ou começar em química computacional e descoberta de fármacos. RDKit (Greg Landrum e contribuidores, BSD-3-Clause).
license: BSD-3-Clause
runtime: ts
risk: read
minPlan: free
courseTags:
  - quimica
  - farmacia
  - quimioinformatica
  - python
metadata:
  zaeon-familia: procedimento
  zaeon-repo: rdkit/rdkit
  zaeon-titulo: RDKit — moléculas que o computador entende
  zaeon-subtitulo: De um SMILES à estrutura desenhada, à massa molar e à similaridade entre compostos
  zaeon-modelo: molecula
  zaeon-tags: RDKit, química, SMILES, moléculas, Python, open source
  zaeon-entrega: como ler e validar um SMILES; o desenho 2D da estrutura; descritores (massa molar, logP, doadores e aceptores de H); a regra de Lipinski explicada; similaridade de Tanimoto entre duas moléculas
  zaeon-app-licenca: BSD-3-Clause (RDKit, Rational Discovery LLC, Greg Landrum e contribuidores)
---

# RDKit — moléculas que o computador entende

Procedimento para ensinar **quimioinformática** com o **RDKit**, a biblioteca open-source de
referência da área. Código-fonte em https://github.com/rdkit/rdkit, licença **BSD-3-Clause**.
Instala com `pip install rdkit` e roda na máquina do aluno ou num notebook.

## SMILES — a molécula numa linha de texto

SMILES escreve a estrutura como texto: `CCO` é etanol, `c1ccccc1` é benzeno (minúscula =
aromático), `CC(=O)O` é ácido acético (parênteses = ramificação, `=` = dupla). Ensine a LER
antes de programar: peça ao aluno para desenhar à mão o que o SMILES descreve.

## O roteiro

```python
from rdkit import Chem, DataStructs
from rdkit.Chem import Descriptors, Draw, AllChem

mol = Chem.MolFromSmiles("CC(=O)Oc1ccccc1C(=O)O")   # ácido acetilsalicílico
assert mol is not None                               # SMILES inválido devolve None, não erro
Descriptors.MolWt(mol)        # massa molar (g/mol)
Descriptors.MolLogP(mol)      # logP estimado (lipofilicidade)
Descriptors.NumHDonors(mol), Descriptors.NumHAcceptors(mol)
Draw.MolToImage(mol)          # a estrutura 2D
```

1. **Sempre confira `mol is not None`.** É o erro silencioso clássico: o SMILES errado não
   lança exceção, só devolve `None` e quebra três linhas depois.
2. **Regra de Lipinski** (triagem de biodisponibilidade oral): massa ≤ 500, logP ≤ 5, doadores
   de H ≤ 5, aceptores ≤ 10. Explique que é heurística de triagem, não lei.
3. **Similaridade**: gere a impressão digital de cada molécula
   (`AllChem.GetMorganFingerprintAsBitVect(mol, 2, nBits=2048)`) e compare com
   `DataStructs.TanimotoSimilarity(fp1, fp2)` — 1 é idêntico, 0 é nada em comum.

## O que esta skill NÃO faz

- **Não dá rota de síntese** nem condição de reação, e não ajuda a obter ou produzir substância
  controlada, tóxica ou explosiva. É representação e cálculo de propriedade, para estudo.
- **Não substitui o laboratório.** logP e afins são ESTIMATIVAS de modelo; o valor que vale é o
  medido.
- **Não prevê segurança nem eficácia de fármaco.** Passar em Lipinski não torna nada um remédio.
