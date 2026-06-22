# ZAEON ONBOARDING SYSTEM — IMPLEMENTATION PLAN
> Agente Claude: execute cada passo em ordem. Crie um PR ao final com todos os arquivos modificados.
> Stack: Next.js 14 (App Router), TypeScript, Tailwind, Framer Motion, NextAuth, Prisma.
> Superpowers mode: max tokens, step-by-step, sem shortcuts.

---

## VISÃO GERAL DO SISTEMA

```
[Link de Convite] → [Onboard Gate] → [Agent Chat] → [University Modal]
      → [Welcome Screen] → [Login Google/Email] → [Research Room Tour]
```

### Mudança de paradigma
- **Antes:** qualquer pessoa acessa o modal de onboarding diretamente.
- **Depois:** apenas usuários com link de convite (`/onboard/[token]`) iniciam o fluxo. O token valida que o convite vem de uma conta ativa (professor ou aluno existente) — mesma lógica da rota `/join/[token]` existente.

---

## PASSO 1 — CORRIGIR BUG: MODO FOCO NÃO DESATIVA

**Arquivo:** `app/research-lab/page.tsx`

**Diagnóstico:** O estado `isFocusMode` vive no componente da página. Quando o usuário ativa o modo foco e navega para outra rota, o evento `zaeon-focus-mode` com `detail: false` nunca é disparado. O navbar fica preso com `isFocusMode = true` porque seu listener persiste entre navegações.

**Fix exato — adicionar cleanup no useEffect que controla a rota:**

```typescript
// Dentro do componente da página de research-lab, adicione este useEffect:
useEffect(() => {
  return () => {
    // Ao desmontar a página, garantir que o navbar saia do modo foco
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zaeon-focus-mode', { detail: false }));
    }
  };
}, []);
```

**Também:** no botão `toggleFocusMode`, garantir que o ícone e label reflitam o estado atual corretamente:
```typescript
// Linha ~1003: substituir a classe condicional do botão por:
className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
  isFocusMode 
    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
    : 'text-black dark:text-white hover:bg-slate-100 dark:hover:bg-white/5'
}`}
```

---

## PASSO 2 — MAPEAR UNIVERSIDADES FEDERAIS BRASILEIRAS

**Novo arquivo:** `constants/universities.ts`

Criar array tipado com **todas as IFES (Instituições Federais de Ensino Superior) do Brasil** — uma por estado. Estrutura mínima:

```typescript
export interface BrazilianUniversity {
  id: string;           // slug único ex: "ufc", "ufmg", "usp"
  name: string;         // nome completo
  acronym: string;      // sigla ex: "UFC"
  state: string;        // estado ex: "CE"
  city: string;         // cidade sede ex: "Fortaleza"
  website: string;      // URL oficial
  logoPath: string;     // /assets/universities/{id}.png
  color: string;        // cor primária da universidade (hex)
  isPartner: boolean;   // true = UFC, UNILAB, IFCE (fast-track)
}

export const BRAZILIAN_FEDERAL_UNIVERSITIES: BrazilianUniversity[] = [
  // --- CEARÁ ---
  { id: 'ufc', name: 'Universidade Federal do Ceará', acronym: 'UFC', state: 'CE', city: 'Fortaleza', website: 'https://www.ufc.br', logoPath: '/assets/universities/ufc.png', color: '#003DA5', isPartner: true },
  { id: 'unilab', name: 'Universidade da Integração Internacional da Lusofonia Afro-Brasileira', acronym: 'UNILAB', state: 'CE', city: 'Redenção', website: 'https://www.unilab.edu.br', logoPath: '/assets/universities/unilab.png', color: '#006633', isPartner: true },
  { id: 'ifce', name: 'Instituto Federal de Educação, Ciência e Tecnologia do Ceará', acronym: 'IFCE', state: 'CE', city: 'Fortaleza', website: 'https://ifce.edu.br', logoPath: '/assets/universities/ifce.png', color: '#1B5E20', isPartner: true },
  { id: 'uva', name: 'Universidade Estadual Vale do Acaraú', acronym: 'UVA', state: 'CE', city: 'Sobral', website: 'https://www.uvanet.br', logoPath: '/assets/universities/uva.png', color: '#4A148C', isPartner: false },
  // --- NORDESTE ---
  { id: 'ufal', name: 'Universidade Federal de Alagoas', acronym: 'UFAL', state: 'AL', city: 'Maceió', website: 'https://ufal.edu.br', logoPath: '/assets/universities/ufal.png', color: '#B71C1C', isPartner: false },
  { id: 'ufba', name: 'Universidade Federal da Bahia', acronym: 'UFBA', state: 'BA', city: 'Salvador', website: 'https://www.ufba.br', logoPath: '/assets/universities/ufba.png', color: '#1A237E', isPartner: false },
  { id: 'ufrb', name: 'Universidade Federal do Recôncavo da Bahia', acronym: 'UFRB', state: 'BA', city: 'Cruz das Almas', website: 'https://www.ufrb.edu.br', logoPath: '/assets/universities/ufrb.png', color: '#004D40', isPartner: false },
  { id: 'ufsb', name: 'Universidade Federal do Sul da Bahia', acronym: 'UFSB', state: 'BA', city: 'Itabuna', website: 'https://ufsb.edu.br', logoPath: '/assets/universities/ufsb.png', color: '#006064', isPartner: false },
  { id: 'ufma', name: 'Universidade Federal do Maranhão', acronym: 'UFMA', state: 'MA', city: 'São Luís', website: 'https://portais.ufma.br', logoPath: '/assets/universities/ufma.png', color: '#1B5E20', isPartner: false },
  { id: 'ufpb', name: 'Universidade Federal da Paraíba', acronym: 'UFPB', state: 'PB', city: 'João Pessoa', website: 'https://www.ufpb.br', logoPath: '/assets/universities/ufpb.png', color: '#880E4F', isPartner: false },
  { id: 'ufcg', name: 'Universidade Federal de Campina Grande', acronym: 'UFCG', state: 'PB', city: 'Campina Grande', website: 'https://www.ufcg.edu.br', logoPath: '/assets/universities/ufcg.png', color: '#4A148C', isPartner: false },
  { id: 'ufpe', name: 'Universidade Federal de Pernambuco', acronym: 'UFPE', state: 'PE', city: 'Recife', website: 'https://www.ufpe.br', logoPath: '/assets/universities/ufpe.png', color: '#E65100', isPartner: false },
  { id: 'ufrpe', name: 'Universidade Federal Rural de Pernambuco', acronym: 'UFRPE', state: 'PE', city: 'Recife', website: 'https://www.ufrpe.br', logoPath: '/assets/universities/ufrpe.png', color: '#33691E', isPartner: false },
  { id: 'univasf', name: 'Universidade Federal do Vale do São Francisco', acronym: 'UNIVASF', state: 'PE', city: 'Petrolina', website: 'https://www.univasf.edu.br', logoPath: '/assets/universities/univasf.png', color: '#BF360C', isPartner: false },
  { id: 'ufersa', name: 'Universidade Federal Rural do Semi-Árido', acronym: 'UFERSA', state: 'RN', city: 'Mossoró', website: 'https://ufersa.edu.br', logoPath: '/assets/universities/ufersa.png', color: '#558B2F', isPartner: false },
  { id: 'ufrn', name: 'Universidade Federal do Rio Grande do Norte', acronym: 'UFRN', state: 'RN', city: 'Natal', website: 'https://www.ufrn.br', logoPath: '/assets/universities/ufrn.png', color: '#1A237E', isPartner: false },
  { id: 'ufpi', name: 'Universidade Federal do Piauí', acronym: 'UFPI', state: 'PI', city: 'Teresina', website: 'https://www.ufpi.br', logoPath: '/assets/universities/ufpi.png', color: '#4E342E', isPartner: false },
  { id: 'ufs', name: 'Universidade Federal de Sergipe', acronym: 'UFS', state: 'SE', city: 'São Cristóvão', website: 'https://www.ufs.br', logoPath: '/assets/universities/ufs.png', color: '#006064', isPartner: false },
  // --- NORTE ---
  { id: 'ufpa', name: 'Universidade Federal do Pará', acronym: 'UFPA', state: 'PA', city: 'Belém', website: 'https://www.ufpa.br', logoPath: '/assets/universities/ufpa.png', color: '#1B5E20', isPartner: false },
  { id: 'ufra', name: 'Universidade Federal Rural da Amazônia', acronym: 'UFRA', state: 'PA', city: 'Belém', website: 'https://www.ufra.edu.br', logoPath: '/assets/universities/ufra.png', color: '#1B5E20', isPartner: false },
  { id: 'unifap', name: 'Universidade Federal do Amapá', acronym: 'UNIFAP', state: 'AP', city: 'Macapá', website: 'https://www2.unifap.br', logoPath: '/assets/universities/unifap.png', color: '#006064', isPartner: false },
  { id: 'ufam', name: 'Universidade Federal do Amazonas', acronym: 'UFAM', state: 'AM', city: 'Manaus', website: 'https://www.ufam.edu.br', logoPath: '/assets/universities/ufam.png', color: '#1A237E', isPartner: false },
  { id: 'ufrr', name: 'Universidade Federal de Roraima', acronym: 'UFRR', state: 'RR', city: 'Boa Vista', website: 'https://ufrr.br', logoPath: '/assets/universities/ufrr.png', color: '#4A148C', isPartner: false },
  { id: 'unir', name: 'Fundação Universidade Federal de Rondônia', acronym: 'UNIR', state: 'RO', city: 'Porto Velho', website: 'https://www.unir.br', logoPath: '/assets/universities/unir.png', color: '#BF360C', isPartner: false },
  { id: 'ufac', name: 'Universidade Federal do Acre', acronym: 'UFAC', state: 'AC', city: 'Rio Branco', website: 'https://www.ufac.br', logoPath: '/assets/universities/ufac.png', color: '#B71C1C', isPartner: false },
  { id: 'ufopa', name: 'Universidade Federal do Oeste do Pará', acronym: 'UFOPA', state: 'PA', city: 'Santarém', website: 'https://www.ufopa.edu.br', logoPath: '/assets/universities/ufopa.png', color: '#004D40', isPartner: false },
  { id: 'unifesspa', name: 'Universidade Federal do Sul e Sudeste do Pará', acronym: 'UNIFESSPA', state: 'PA', city: 'Marabá', website: 'https://www.unifesspa.edu.br', logoPath: '/assets/universities/unifesspa.png', color: '#37474F', isPartner: false },
  // --- CENTRO-OESTE ---
  { id: 'unb', name: 'Universidade de Brasília', acronym: 'UnB', state: 'DF', city: 'Brasília', website: 'https://www.unb.br', logoPath: '/assets/universities/unb.png', color: '#1B5E20', isPartner: false },
  { id: 'ufg', name: 'Universidade Federal de Goiás', acronym: 'UFG', state: 'GO', city: 'Goiânia', website: 'https://www.ufg.br', logoPath: '/assets/universities/ufg.png', color: '#E65100', isPartner: false },
  { id: 'ufgd', name: 'Universidade Federal da Grande Dourados', acronym: 'UFGD', state: 'MS', city: 'Dourados', website: 'https://www.ufgd.edu.br', logoPath: '/assets/universities/ufgd.png', color: '#880E4F', isPartner: false },
  { id: 'ufms', name: 'Universidade Federal de Mato Grosso do Sul', acronym: 'UFMS', state: 'MS', city: 'Campo Grande', website: 'https://www.ufms.br', logoPath: '/assets/universities/ufms.png', color: '#4A148C', isPartner: false },
  { id: 'ufmt', name: 'Universidade Federal de Mato Grosso', acronym: 'UFMT', state: 'MT', city: 'Cuiabá', website: 'https://www.ufmt.br', logoPath: '/assets/universities/ufmt.png', color: '#B71C1C', isPartner: false },
  // --- SUDESTE ---
  { id: 'ufes', name: 'Universidade Federal do Espírito Santo', acronym: 'UFES', state: 'ES', city: 'Vitória', website: 'https://www.ufes.br', logoPath: '/assets/universities/ufes.png', color: '#004D40', isPartner: false },
  { id: 'ufjf', name: 'Universidade Federal de Juiz de Fora', acronym: 'UFJF', state: 'MG', city: 'Juiz de Fora', website: 'https://www.ufjf.br', logoPath: '/assets/universities/ufjf.png', color: '#1A237E', isPartner: false },
  { id: 'ufla', name: 'Universidade Federal de Lavras', acronym: 'UFLA', state: 'MG', city: 'Lavras', website: 'https://www.ufla.br', logoPath: '/assets/universities/ufla.png', color: '#1B5E20', isPartner: false },
  { id: 'ufmg', name: 'Universidade Federal de Minas Gerais', acronym: 'UFMG', state: 'MG', city: 'Belo Horizonte', website: 'https://www.ufmg.br', logoPath: '/assets/universities/ufmg.png', color: '#1A237E', isPartner: false },
  { id: 'ufop', name: 'Universidade Federal de Ouro Preto', acronym: 'UFOP', state: 'MG', city: 'Ouro Preto', website: 'https://www.ufop.br', logoPath: '/assets/universities/ufop.png', color: '#BF360C', isPartner: false },
  { id: 'uftm', name: 'Universidade Federal do Triângulo Mineiro', acronym: 'UFTM', state: 'MG', city: 'Uberaba', website: 'https://www.uftm.edu.br', logoPath: '/assets/universities/uftm.png', color: '#006064', isPartner: false },
  { id: 'ufv', name: 'Universidade Federal de Viçosa', acronym: 'UFV', state: 'MG', city: 'Viçosa', website: 'https://www.ufv.br', logoPath: '/assets/universities/ufv.png', color: '#558B2F', isPartner: false },
  { id: 'unifal', name: 'Universidade Federal de Alfenas', acronym: 'UNIFAL', state: 'MG', city: 'Alfenas', website: 'https://www.unifal-mg.edu.br', logoPath: '/assets/universities/unifal.png', color: '#4A148C', isPartner: false },
  { id: 'unifei', name: 'Universidade Federal de Itajubá', acronym: 'UNIFEI', state: 'MG', city: 'Itajubá', website: 'https://unifei.edu.br', logoPath: '/assets/universities/unifei.png', color: '#E65100', isPartner: false },
  { id: 'ufabc', name: 'Universidade Federal do ABC', acronym: 'UFABC', state: 'SP', city: 'Santo André', website: 'https://www.ufabc.edu.br', logoPath: '/assets/universities/ufabc.png', color: '#1A237E', isPartner: false },
  { id: 'ufscar', name: 'Universidade Federal de São Carlos', acronym: 'UFSCar', state: 'SP', city: 'São Carlos', website: 'https://www.ufscar.br', logoPath: '/assets/universities/ufscar.png', color: '#880E4F', isPartner: false },
  { id: 'unifesp', name: 'Universidade Federal de São Paulo', acronym: 'UNIFESP', state: 'SP', city: 'São Paulo', website: 'https://www.unifesp.br', logoPath: '/assets/universities/unifesp.png', color: '#1B5E20', isPartner: false },
  { id: 'uff', name: 'Universidade Federal Fluminense', acronym: 'UFF', state: 'RJ', city: 'Niterói', website: 'https://www.uff.br', logoPath: '/assets/universities/uff.png', color: '#006064', isPartner: false },
  { id: 'ufrj', name: 'Universidade Federal do Rio de Janeiro', acronym: 'UFRJ', state: 'RJ', city: 'Rio de Janeiro', website: 'https://ufrj.br', logoPath: '/assets/universities/ufrj.png', color: '#1A237E', isPartner: false },
  { id: 'ufrrj', name: 'Universidade Federal Rural do Rio de Janeiro', acronym: 'UFRRJ', state: 'RJ', city: 'Seropédica', website: 'https://portal.ufrrj.br', logoPath: '/assets/universities/ufrrj.png', color: '#1B5E20', isPartner: false },
  { id: 'unirio', name: 'Universidade Federal do Estado do Rio de Janeiro', acronym: 'UNIRIO', state: 'RJ', city: 'Rio de Janeiro', website: 'https://www.unirio.br', logoPath: '/assets/universities/unirio.png', color: '#880E4F', isPartner: false },
  // --- SUL ---
  { id: 'ufcspa', name: 'Universidade Federal de Ciências da Saúde de Porto Alegre', acronym: 'UFCSPA', state: 'RS', city: 'Porto Alegre', website: 'https://www.ufcspa.edu.br', logoPath: '/assets/universities/ufcspa.png', color: '#004D40', isPartner: false },
  { id: 'ufrgs', name: 'Universidade Federal do Rio Grande do Sul', acronym: 'UFRGS', state: 'RS', city: 'Porto Alegre', website: 'https://www.ufrgs.br', logoPath: '/assets/universities/ufrgs.png', color: '#1A237E', isPartner: false },
  { id: 'ufpel', name: 'Universidade Federal de Pelotas', acronym: 'UFPel', state: 'RS', city: 'Pelotas', website: 'https://portal.ufpel.edu.br', logoPath: '/assets/universities/ufpel.png', color: '#4E342E', isPartner: false },
  { id: 'ufsm', name: 'Universidade Federal de Santa Maria', acronym: 'UFSM', state: 'RS', city: 'Santa Maria', website: 'https://www.ufsm.br', logoPath: '/assets/universities/ufsm.png', color: '#B71C1C', isPartner: false },
  { id: 'furg', name: 'Universidade Federal do Rio Grande', acronym: 'FURG', state: 'RS', city: 'Rio Grande', website: 'https://www.furg.br', logoPath: '/assets/universities/furg.png', color: '#006064', isPartner: false },
  { id: 'unipampa', name: 'Universidade Federal do Pampa', acronym: 'UNIPAMPA', state: 'RS', city: 'Bagé', website: 'https://www.unipampa.edu.br', logoPath: '/assets/universities/unipampa.png', color: '#558B2F', isPartner: false },
  { id: 'uffs', name: 'Universidade Federal da Fronteira Sul', acronym: 'UFFS', state: 'SC', city: 'Chapecó', website: 'https://www.uffs.edu.br', logoPath: '/assets/universities/uffs.png', color: '#1B5E20', isPartner: false },
  { id: 'ufsc', name: 'Universidade Federal de Santa Catarina', acronym: 'UFSC', state: 'SC', city: 'Florianópolis', website: 'https://ufsc.br', logoPath: '/assets/universities/ufsc.png', color: '#1A237E', isPartner: false },
  { id: 'ufpr', name: 'Universidade Federal do Paraná', acronym: 'UFPR', state: 'PR', city: 'Curitiba', website: 'https://www.ufpr.br', logoPath: '/assets/universities/ufpr.png', color: '#B71C1C', isPartner: false },
  { id: 'utfpr', name: 'Universidade Tecnológica Federal do Paraná', acronym: 'UTFPR', state: 'PR', city: 'Curitiba', website: 'https://www.utfpr.edu.br', logoPath: '/assets/universities/utfpr.png', color: '#4A148C', isPartner: false },
  { id: 'unioeste', name: 'Universidade Estadual do Oeste do Paraná', acronym: 'UNIOESTE', state: 'PR', city: 'Cascavel', website: 'https://www.unioeste.br', logoPath: '/assets/universities/unioeste.png', color: '#006064', isPartner: false },
  // --- TOCANTINS ---
  { id: 'uft', name: 'Universidade Federal do Tocantins', acronym: 'UFT', state: 'TO', city: 'Palmas', website: 'https://www.uft.edu.br', logoPath: '/assets/universities/uft.png', color: '#E65100', isPartner: false },
  { id: 'ifto', name: 'Instituto Federal do Tocantins', acronym: 'IFTO', state: 'TO', city: 'Palmas', website: 'https://www.ifto.edu.br', logoPath: '/assets/universities/ifto.png', color: '#1B5E20', isPartner: false },
];
```

---

## PASSO 3 — PYTHON WORKER: FETCH DE LOGOS DE UNIVERSIDADES

**Novo arquivo:** `scripts/fetch_university_logos.py`

Este worker usa a API do Clearbit (gratuita por domínio) + fallback para Wikipedia para baixar logos em alta resolução de todas as universidades.

```python
#!/usr/bin/env python3
"""
Zaeon University Logo Fetcher
Busca logos de todas as universidades federais brasileiras e salva em
public/assets/universities/{id}.png
"""

import os
import time
import json
import requests
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "assets" / "universities"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Mapeamento manual de logos conhecidas (URLs diretas para os logos)
LOGO_URLS = {
    "ufc": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Brasao_ufc.png/200px-Brasao_ufc.png",
    "unilab": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Logo_Unilab.png/200px-Logo_Unilab.png",
    "ifce": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Marca_IFCE_2021.png/200px-Marca_IFCE_2021.png",
    "ufmg": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Bras%C3%A3o_UFMG.svg/200px-Bras%C3%A3o_UFMG.svg.png",
    "usp": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/USP_logo.svg/200px-USP_logo.svg.png",
    "unb": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Universidade_de_Bras%C3%ADlia_%28logo%29.svg/200px-Universidade_de_Bras%C3%ADlia_%28logo%29.svg.png",
    "ufrj": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/UFRJ_logo.svg/200px-UFRJ_logo.svg.png",
    "uff": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/UFF_logo.svg/200px-UFF_logo.svg.png",
    "ufba": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/UFBA-logo.svg/200px-UFBA-logo.svg.png",
    "ufrgs": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Bras%C3%A3o_UFRGS.svg/200px-Bras%C3%A3o_UFRGS.svg.png",
    "ufsc": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/UFSC_logo.svg/200px-UFSC_logo.svg.png",
    "ufpe": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/UFPE_logo.svg/200px-UFPE_logo.svg.png",
    "ufpr": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Bras%C3%A3o_da_UFPR.svg/200px-Bras%C3%A3o_da_UFPR.svg.png",
    "ufscar": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/UFSCar_logo.svg/200px-UFSCar_logo.svg.png",
    "unifesp": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Unifesp_logo.svg/200px-Unifesp_logo.svg.png",
    "ufsm": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Bras%C3%A3o_UFSM.svg/200px-Bras%C3%A3o_UFSM.svg.png",
    "ufpa": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Logo_UFPA.svg/200px-Logo_UFPA.svg.png",
    "ufam": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/UFAM_logo.svg/200px-UFAM_logo.svg.png",
}

def fetch_logo_clearbit(website: str, university_id: str) -> bool:
    """Tenta buscar logo via Clearbit Logo API (gratuito para domínios)"""
    domain = website.replace("https://", "").replace("http://", "").split("/")[0]
    url = f"https://logo.clearbit.com/{domain}"
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Zaeon/1.0"})
        if resp.status_code == 200 and len(resp.content) > 1000:
            path = OUTPUT_DIR / f"{university_id}.png"
            path.write_bytes(resp.content)
            print(f"  ✓ Clearbit → {university_id}.png ({len(resp.content)} bytes)")
            return True
    except Exception as e:
        print(f"  ✗ Clearbit falhou para {university_id}: {e}")
    return False

def fetch_logo_wikipedia(university_id: str) -> bool:
    """Usa URL manual do Wikipedia se disponível"""
    if university_id not in LOGO_URLS:
        return False
    url = LOGO_URLS[university_id]
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "Zaeon/1.0"})
        if resp.status_code == 200 and len(resp.content) > 500:
            path = OUTPUT_DIR / f"{university_id}.png"
            path.write_bytes(resp.content)
            print(f"  ✓ Wikipedia → {university_id}.png")
            return True
    except Exception as e:
        print(f"  ✗ Wikipedia falhou para {university_id}: {e}")
    return False

def create_placeholder(university_id: str, acronym: str, color: str):
    """Cria placeholder SVG convertido a PNG quando não há logo disponível"""
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="20" fill="{color}"/>
  <text x="100" y="115" font-family="Arial,sans-serif" font-size="48" font-weight="bold" 
        fill="white" text-anchor="middle">{acronym[:4]}</text>
</svg>'''
    path = OUTPUT_DIR / f"{university_id}.svg"
    path.write_text(svg)
    print(f"  ~ Placeholder SVG → {university_id}.svg (sem logo disponível)")

def main():
    # Importa a lista do arquivo constants (via JSON gerado)
    constants_path = Path(__file__).parent.parent / "constants" / "universities_data.json"
    if not constants_path.exists():
        print("ERRO: Rode `npx ts-node scripts/export_universities.ts` primeiro para gerar o JSON.")
        return

    with open(constants_path) as f:
        universities = json.load(f)

    print(f"\n🎓 Zaeon University Logo Fetcher")
    print(f"   Processando {len(universities)} universidades...\n")

    success = 0
    placeholder = 0

    for univ in universities:
        uid = univ["id"]
        output_path = OUTPUT_DIR / f"{uid}.png"

        if output_path.exists():
            print(f"  → {uid}.png já existe, pulando.")
            success += 1
            continue

        print(f"Buscando logo: {univ['acronym']} ({univ['name'][:40]}...)")

        # Tentativa 1: Wikipedia manual
        if fetch_logo_wikipedia(uid):
            success += 1
            time.sleep(0.5)
            continue

        # Tentativa 2: Clearbit
        if fetch_logo_clearbit(univ["website"], uid):
            success += 1
            time.sleep(0.5)
            continue

        # Fallback: placeholder SVG
        create_placeholder(uid, univ["acronym"], univ["color"])
        placeholder += 1
        time.sleep(0.3)

    print(f"\n✅ Concluído!")
    print(f"   Logos baixadas: {success}")
    print(f"   Placeholders gerados: {placeholder}")
    print(f"   Saída: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
```

**Para rodar:** `pip install requests && python scripts/fetch_university_logos.py`

---

## PASSO 4 — GATE PAGE: `/app/onboard/[token]/page.tsx`

Esta página substitui o fluxo antigo. Valida o token (reutiliza a API `/api/student/join`) e inicia o agente conversacional. Só avança se o token for válido.

```tsx
// app/onboard/[token]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldX } from 'lucide-react';
import OnboardAgent from '@/components/onboard/OnboardAgent';

export default function OnboardGatePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [inviteData, setInviteData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/student/join?token=' + token)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setStatus('invalid'); return; }
        setInviteData(data);
        setStatus('valid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'invalid') return <InvalidTokenScreen />;

  return <OnboardAgent token={token} inviteData={inviteData} />;
}
```

---

## PASSO 5 — COMPONENTE: `OnboardAgent`

**Novo arquivo:** `components/onboard/OnboardAgent.tsx`

Agente conversacional em 3 fases:

```
Fase 1: Coleta básica (nome → idade → cidade)
Fase 2: Universidade (dispara UniversityModal)
Fase 3: Redireciona para WelcomeScreen com dados coletados
```

**Script do agente (mensagens pré-definidas, estilo natural):**

```typescript
// Mensagens do agente para cada fase (em PT-BR)
const AGENT_SCRIPT = {
  greeting: [
    "Olá! Fico feliz que você chegou até aqui 😊",
    "Antes de liberar seu acesso, quero conhecer você um pouco. Pode ser rápido, prometo!",
    "Qual é o seu nome?"
  ],
  afterName: (name: string) => [
    `Que nome bonito, ${name}! 😄`,
    "Agora me conta: quantos anos você tem?"
  ],
  afterAge: (name: string) => [
    `Legal! E onde você mora, ${name}? Cidade e estado são suficientes.`
  ],
  afterCity: [
    "Perfeito! Última coisa antes de entrar...",
    "Em qual universidade você estuda? Clique na sua abaixo 👇"
  ],
};
```

**Layout:** Chat estilo iMessage no centro da tela, fundo escuro com partículas, bubble do agente à esquerda (avatar Zaeon), resposta do usuário à direita. Após coletar cidade, dispara `<UniversityModal />`.

---

## PASSO 6 — COMPONENTE: `UniversityModal`

**Novo arquivo:** `components/onboard/UniversityModal.tsx`

Modal elegante que aparece sobre o chat, sobrepondo a tela.

**Comportamento:**
1. Input de busca no topo com debounce 300ms
2. Grid de cards com logo + sigla + estado
3. Card selecionado: glow animado (inspirado no frame "Blockchain" em `encryption.tsx`):
   - `drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]` + ring ciano + scale 1.05
   - Borda animada com `animate-pulse` na cor da universidade
4. Ao clicar no card: logo da universidade aparece centralizada (grande, com glow) por 1.5s
5. Depois: transição para `WelcomeScreen`

```tsx
// Estilo do card selecionado — referência direta ao efeito de encryption.tsx:
const selectedCardClass = `
  ring-2 ring-cyan-400 scale-105
  shadow-[0_0_20px_rgba(34,211,238,0.4),0_0_40px_rgba(34,211,238,0.2)]
  dark:drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]
  border-cyan-400/60 bg-white dark:bg-cyan-900/10
  transition-all duration-300
`;

// Animação da logo após seleção:
<motion.div
  initial={{ scale: 0.5, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 1.5, opacity: 0 }}
  className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl"
>
  <motion.img
    src={selectedUniversity.logoPath}
    alt={selectedUniversity.name}
    className="w-48 h-48 object-contain drop-shadow-[0_0_60px_rgba(34,211,238,0.8)]"
    animate={{ filter: ['drop-shadow(0 0 20px rgba(34,211,238,0.4))', 'drop-shadow(0 0 60px rgba(34,211,238,0.9))', 'drop-shadow(0 0 20px rgba(34,211,238,0.4))'] }}
    transition={{ repeat: Infinity, duration: 1.5 }}
  />
</motion.div>
```

---

## PASSO 7 — COMPONENTE: `WelcomeScreen` (Split Layout)

**Novo arquivo:** `components/onboard/WelcomeScreen.tsx`

Layout inspirado na imagem de referência (Wispr Flow onboarding). Dois painéis lado a lado.

### Painel Esquerdo — Seleção de Curso

```
┌─────────────────────────────────────┐
│  [Logo da universidade selecionada] │
│                                     │
│  Seja bem-vindo(a), {nome}! 🎓      │
│  A Zaeon.                           │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🔍  Buscar seu curso...       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌──────────┐ ┌──────────┐          │
│  │ Ciência  │ │Engenharia│          │
│  │da Comput.│ │de Software│         │
│  └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐          │
│  │ Direito  │ │ Medicina │          │
│  └──────────┘ └──────────┘          │
│         ... mais cursos ...         │
└─────────────────────────────────────┘
```

**Mensagem de boas-vindas:**
```tsx
const welcomeMessage = gender === 'female' 
  ? `Seja bem-vinda, ${name}!` 
  : `Seja bem-vindo, ${name}!`;
```

### Painel Direito — Prova Social + Login

```
┌─────────────────────────────────────┐
│                                     │
│  Sucesso entre +10.000              │
│  pessoas como você! 🚀              │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ 📸 Ana, UFC — "A Zaeon me     │ │
│  │    ajudou a finalizar meu TCC │ │
│  │    em 2 semanas!"             │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │ 📸 Carlos, UFMG — "...        │ │
│  └────────────────────────────────┘ │
│  ... (8 depoimentos no total) ...   │
│                                     │
│  ──────── Após escolher curso ──────│
│  [G] Entrar com Google              │
│      ou                             │
│  [✉] Continuar com outro email      │
│                                     │
│  ℹ️ Entraremos em contato para      │
│  verificar sua identidade. Email    │
│  acadêmico acelera verificação e    │
│  garante 30 dias Pro grátis!        │
└─────────────────────────────────────┘
```

**Os 8 depoimentos mínimos:**
```typescript
const TESTIMONIALS = [
  { name: "Ana Beatriz", university: "UFC", course: "Ciência da Computação", text: "A Zaeon transformou como eu faço pesquisa. Terminei meu TCC em metade do tempo.", avatar: "/assets/testimonials/ana.jpg", rating: 5 },
  { name: "Carlos Eduardo", university: "UFMG", course: "Engenharia de Software", text: "O modo foco é incrível. Consigo estudar por horas sem me distrair.", avatar: "/assets/testimonials/carlos.jpg", rating: 5 },
  { name: "Larissa Mendes", university: "UFRJ", course: "Medicina", text: "A organização de artigos científicos ficou muito mais simples. Recomendo demais!", avatar: "/assets/testimonials/larissa.jpg", rating: 5 },
  { name: "Pedro Alves", university: "UnB", course: "Direito", text: "As normas ABNT integradas salvaram minha vida. Não erro mais formatação.", avatar: "/assets/testimonials/pedro.jpg", rating: 5 },
  { name: "Marina Costa", university: "UFPE", course: "Psicologia", text: "O agente de pesquisa encontra fontes que eu nunca acharia sozinha. Fantástico.", avatar: "/assets/testimonials/marina.jpg", rating: 5 },
  { name: "Thiago Santos", university: "UFRGS", course: "Física", text: "A sala colaborativa com meu orientador ficou fácil demais. Aprovado com louvor!", avatar: "/assets/testimonials/thiago.jpg", rating: 5 },
  { name: "Juliana Ferreira", university: "UFBA", course: "Biologia", text: "O layout personalizável é demais. Cada um usa do seu jeito e funciona!", avatar: "/assets/testimonials/juliana.jpg", rating: 5 },
  { name: "Rafael Oliveira", university: "UFSC", course: "Arquitetura", text: "Nunca imaginei uma plataforma de estudos tão elegante e funcional ao mesmo tempo.", avatar: "/assets/testimonials/rafael.jpg", rating: 5 },
];
```

**Nota:** criar as imagens de avatar como placeholders usando `https://ui-avatars.com/api/?name={name}&background=random&size=80` enquanto as fotos reais não estão disponíveis.

---

## PASSO 8 — AUTH FLOW PÓS-CURSO

Após o usuário selecionar o curso no painel esquerdo, o painel direito transiciona para a seção de login.

```tsx
// Armazenar dados do onboarding em sessionStorage (não localStorage — mais seguro)
const onboardData = {
  name, age, city, gender,
  university: selectedUniversity,
  course: selectedCourse,
  inviteToken: token,
};
sessionStorage.setItem('zaeon_onboard', JSON.stringify(onboardData));

// Login com Google
await signIn('google', { callbackUrl: '/research-lab?tour=true' });

// Login com email alternativo
await signIn('email', { email: userEmail, callbackUrl: '/research-lab?tour=true' });
```

**Mensagem de verificação (obrigatória, visível):**
```tsx
<div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-2xl">
  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed text-center">
    <strong>Entraremos em contato para verificar sua identidade em breve.</strong><br/>
    Selecionar um email acadêmico (.edu.br) <strong>acelera a verificação</strong> e garante{' '}
    <span className="text-blue-600 dark:text-blue-400 font-bold">benefícios Pro grátis por 30 dias</span>.
  </p>
</div>
```

---

## PASSO 9 — TOUR INTERATIVO DA SALA DE PESQUISA

**Novo arquivo:** `components/onboard/ResearchRoomTour.tsx`

Ativado quando `?tour=true` está na URL após o login. Um overlay guiado que destaca cada função da research-lab.

**Os 12 passos do tour (em ordem):**

```typescript
const TOUR_STEPS = [
  {
    id: 'welcome',
    target: null, // tela toda
    title: '🎉 Bem-vindo(a) à sua Sala de Pesquisa!',
    description: 'Este é o coração do Zaeon. Aqui você organiza tudo para o seu TCC. Vamos te apresentar cada ferramenta — são simples, prometo!',
    position: 'center',
  },
  {
    id: 'focus-mode',
    target: '[data-tour="focus-mode"]', // adicionar data-tour no botão
    title: '🎯 Modo Foco',
    description: 'Ativa um ambiente limpo e sem distrações. A navbar some, o layout simplifica. Clique para ver! (Lembre-se: clique de novo para voltar ao normal.)',
    position: 'right',
    highlight: true,
  },
  {
    id: 'layout-toggle',
    target: '[data-tour="layout-toggle"]',
    title: '↔️ Escolha seu Layout',
    description: 'Prefere a barra de ferramentas à esquerda ou à direita? Clique para alternar. A Zaeon se adapta ao seu jeito de estudar.',
    position: 'right',
  },
  {
    id: 'new-research',
    target: '[data-tour="new-research"]',
    title: '📝 Nova Pesquisa',
    description: 'Clique aqui para começar uma nova pesquisa. Dê um título, e o agente começa a te ajudar a organizar tudo.',
    position: 'right',
  },
  {
    id: 'save-research',
    target: '[data-tour="save-research"]',
    title: '💾 Salvar Pesquisa — ABNT',
    description: 'Este é o botão mais importante! Ao salvar, sua pesquisa é formatada automaticamente nas normas ABNT. Título, referências, citações — tudo no padrão correto para TCC.',
    position: 'top',
    highlight: true,
    pulse: true, // adiciona efeito de pulso extra
  },
  {
    id: 'ai-chat',
    target: '[data-tour="ai-chat"]',
    title: '🤖 Agente de Pesquisa',
    description: 'Pergunte qualquer coisa ao seu agente. Ele busca artigos, resume documentos, sugere referências e até corrige seu texto.',
    position: 'left',
  },
  {
    id: 'pdf-upload',
    target: '[data-tour="pdf-upload"]',
    title: '📄 Upload de PDFs',
    description: 'Arraste qualquer PDF aqui — artigos, livros, apostilas. O agente lê e referencia automaticamente.',
    position: 'right',
  },
  {
    id: 'youtube',
    target: '[data-tour="youtube"]',
    title: '🎬 Vídeos de Apoio',
    description: 'Adicione links do YouTube. O agente transcreve e extrai os pontos principais para você.',
    position: 'right',
  },
  {
    id: 'citations',
    target: '[data-tour="citations"]',
    title: '📌 Notas e Citações',
    description: 'Salve trechos importantes com um clique. Tudo fica organizado com a fonte correta para suas referências ABNT.',
    position: 'left',
  },
  {
    id: 'specialists',
    target: '[data-tour="specialists"]',
    title: '👩‍🔬 Especialistas IA',
    description: 'Alterne entre diferentes agentes especializados: Scribe (redação), Examiner (avaliação crítica) e mais. Cada um tem um jeito único de te ajudar.',
    position: 'bottom',
  },
  {
    id: 'mural-teaser',
    target: null,
    title: '🌐 Próximo: O Mural da Comunidade',
    description: 'Quando terminar aqui, explore o Mural — onde você se conecta com outros estudantes, compartilha descobertas e colabora em tempo real.',
    position: 'center',
    hasNavigation: true,
    navigationTarget: '/workstation/profiles',
  },
  {
    id: 'finish',
    target: null,
    title: '✅ Tudo certo!',
    description: 'Você está pronto para usar a Zaeon. Bons estudos! Qualquer dúvida, o agente está sempre aqui. 🚀',
    position: 'center',
    isLast: true,
  },
];
```

**Implementação do overlay:**
- Fundo semi-transparente (`bg-black/60 backdrop-blur-sm`)
- Elemento alvo recortado com `clip-path` ou `box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)` para destacar
- Card tooltip animado com Framer Motion (slide from direction)
- Botões: "Anterior" / "Próximo" / "Pular tour"
- Progress dots na parte inferior
- Tecla ESC para sair do tour

**Adicionar atributos `data-tour` nos elementos da research-lab:**
```tsx
// Em app/research-lab/page.tsx, adicionar nos elementos existentes:
// Botão modo foco: data-tour="focus-mode"
// Botão salvar: data-tour="save-research"
// Input de chat: data-tour="ai-chat"
// Botão novo: data-tour="new-research"
// Upload PDF: data-tour="pdf-upload"
// Área YouTube: data-tour="youtube"
// Seção citações: data-tour="citations"
// Toggle layout: data-tour="layout-toggle"
// Tabs de especialistas: data-tour="specialists"
```

---

## PASSO 10 — TOUR DO MURAL

**Complemento ao arquivo:** `app/workstation/profiles/NetworkMural.tsx`

Verificar se `?tour=true` está na URL ao entrar no mural e disparar um mini-tour de 4 passos:

```typescript
const MURAL_TOUR_STEPS = [
  {
    id: 'mural-welcome',
    title: '🌐 O Mural da Comunidade',
    description: 'Aqui vivem os estudantes Zaeon. Veja perfis, projetos em andamento e colaborações ativas.',
  },
  {
    id: 'mural-profile',
    title: '🪪 Seu Perfil',
    description: 'Clique no seu avatar para editar seu perfil. Adicione seus projetos, áreas de interesse e links.',
  },
  {
    id: 'mural-connect',
    title: '🤝 Conectar',
    description: 'Encontre colegas do mesmo curso ou universidade. Colaboração começa com uma conexão.',
  },
  {
    id: 'mural-done',
    title: '🎓 Pronto para voar!',
    description: 'Sua conta está ativa. Agora é com você. Boa sorte no TCC!',
    isLast: true,
  },
];
```

---

## PASSO 11 — INTEGRAÇÃO E ROTEAMENTO

**Modificar:** `app/workstation/page.tsx` e `app/research-lab/page.tsx`

1. Em `research-lab/page.tsx`: detectar `?tour=true` na URL e montar `<ResearchRoomTour />` após 800ms de delay (esperar a página carregar completamente).

2. Atualizar `app/workstation/page.tsx` para redirecionar novos usuários (sem `zaeon_onboard_complete` em sessionStorage) para `/onboard/{token}` se existir token de convite pendente.

3. Limpar sessionStorage após onboarding completo:
```typescript
sessionStorage.removeItem('zaeon_onboard');
sessionStorage.setItem('zaeon_onboard_complete', 'true');
```

---

## PASSO 12 — MEMÓRIA DO AGENTE (salvamento no banco)

**Modificar:** `app/api/auth/[...nextauth]/route.ts` ou callback de sessão

Após o login com Google, ler `sessionStorage.zaeon_onboard` (via cookie ou URL param seguro) e salvar no Prisma:

```typescript
// No callback signIn ou session do NextAuth:
const onboardData = req.cookies.get('zaeon_onboard_temp')?.value;
if (onboardData) {
  const data = JSON.parse(onboardData);
  await prisma.user.update({
    where: { email: user.email },
    data: {
      name: data.name,
      age: data.age,
      city: data.city,
      gender: data.gender,
      university: data.university?.id,
      course: data.course,
      onboardingComplete: true,
    }
  });
}
```

**Nota:** usar cookie httpOnly temporário em vez de sessionStorage para passar dados cross-request (sessionStorage não persiste entre origens no callback OAuth).

---

## PASSO 13 — VALIDAÇÃO E TESTES

Verificar:
- [ ] Token inválido → tela de erro (não trava)
- [ ] Bug modo foco resolvido: navegar para outra rota reseta o navbar
- [ ] Busca de universidades com debounce funciona (não trava com digitação rápida)
- [ ] Logo de universidade carrega com fallback gracioso (placeholder SVG se 404)
- [ ] Mensagem "bem-vindo/bem-vinda" respeita o gênero selecionado
- [ ] Tour skip funciona (ESC ou botão pular)
- [ ] Auth callback salva os dados corretamente no Prisma
- [ ] Rota `/onboard/[token]` não é acessível sem token válido
- [ ] Worker Python: `fetch_university_logos.py` roda sem erro em ambiente limpo
- [ ] Mobile responsivo: modal de universidades scroll corretamente em tela pequena

---

## ARQUIVOS A CRIAR/MODIFICAR (RESUMO PR)

### Novos arquivos:
```
constants/universities.ts
scripts/fetch_university_logos.py
app/onboard/[token]/page.tsx
components/onboard/OnboardAgent.tsx
components/onboard/UniversityModal.tsx
components/onboard/WelcomeScreen.tsx
components/onboard/CourseSelector.tsx
components/onboard/Testimonials.tsx
components/onboard/ResearchRoomTour.tsx
public/assets/universities/.gitkeep
```

### Arquivos modificados:
```
app/research-lab/page.tsx         — fix modo foco + data-tour attrs + ?tour=true handler
components/main/navbar.tsx        — (sem mudança necessária, bug é na page)
app/workstation/profiles/NetworkMural.tsx — mini-tour do mural
app/api/auth/[...nextauth]/route.ts       — salvar dados do onboard pós-OAuth
```

### Título do PR sugerido:
```
feat: invite-only onboarding with AI agent, university modal & research room tour
```

### Branch:
```
git checkout -b feat/onboarding-v2-invite-gate
```

---

## NOTAS FINAIS PARA O AGENTE

1. **Não quebre o fluxo existente** do `join/[token]` — ele é usado por professores. O novo `/onboard/[token]` é paralelo.
2. **O efeito "glow" do card selecionado** deve ser idêntico ao da string `dark:drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]` já usada em `encryption.tsx` para o texto "Blockchain". Usar a mesma paleta cyan.
3. **Modo foco bug:** a linha de fix (`useEffect` com cleanup) deve ser inserida antes do `return` do componente, não dentro de um `useEffect` existente.
4. **O Python worker** não é bloqueante para o PR — pode ser mergeado mesmo com logos faltando, pois há fallback para placeholder SVG.
5. **Testimonials avatars:** usar `https://ui-avatars.com/api/?name=Ana+Beatriz&background=0ea5e9&color=fff&size=80` como placeholder até ter fotos reais.
6. **Acessibilidade:** todos os modais devem ter `role="dialog"`, `aria-modal="true"` e foco trapped enquanto abertos.
