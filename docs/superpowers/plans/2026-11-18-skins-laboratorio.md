# Skins do laboratório — plano de implementação

**Meta:** o laboratório troca de cor por skin (Original + 6 salas), escolhida em Configurações e salva na conta.
**Arquitetura:** as famílias `cyan`/`sky`/`blue` do Tailwind e três fundos escuros leem variáveis CSS (`--sk-*`); um plugin do Tailwind declara os valores por `[data-skin]` a partir de `lib/skins`; `SkinDoLab` põe o atributo no `<html>` enquanto o laboratório está montado.
**Stack:** Next 14, Tailwind 3 (`darkMode: 'class'`), vitest + jsdom, Prisma (Mongo).
**Spec:** `docs/superpowers/specs/2026-11-18-skins-laboratorio-design.md`

## Restrições globais
- Skin Original e qualquer página fora do laboratório: nenhum valor de cor muda.
- Só cor: nada de letra, textura, canto, layout.
- Sem mudar o schema: preferência em `UserSpaceData.settings.labSkin`.
- `lib/skins/paletas.ts` e `lib/skins/variaveis.ts` usam só imports relativos (o `tailwind.config.ts` os carrega sem o alias `@/`).

## Foco de revisão (o que os testes de tarefa não pegam sozinhos)
1. Valor inválido salvo (navegador ou conta) → cai no Original, nunca quebra.
2. Sair do laboratório → o atributo some (outras páginas não herdam a skin).
3. Outras chaves de `settings` não são apagadas ao salvar a skin.
4. Deslogado → a skin do navegador funciona; a rota responde 401 sem efeito.
5. Trocar a skin noutra aba → esta aba acompanha.

## Tarefas
1. **Dados e variáveis** — `lib/skins/paletas.ts` (`SKINS_ID`, `SkinId`, `SKINS`, `ehSkin`, `SKIN_PADRAO`), `lib/skins/variaveis.ts` (`variaveisDaSkin(id): Record<string,string>`, `cssBaseDasSkins()`), teste `lib/skins/skins.test.ts`. Original = valores do Tailwind; fundos `--sk-fundo 3 0 20`, `--sk-vidro 22 22 34`, `--sk-popover 11 16 32`; nas skins, fundo = mistura de 35% do tom 950 da paleta de destaque.
2. **Tailwind** — `tailwind.config.ts`: `cyan`/`sky`/`blue` → `rgb(var(--sk-<fam>-<tom>) / <alpha-value>)`; cores `skfundo`, `skvidro`, `skpopover`; plugin `addBase(cssBaseDasSkins())`. Conferir gerando o CSS.
3. **Fundos do shell** — `app/research-lab/page.tsx` (4 pontos), `ResearchShell.tsx` (1), `ConfigMenu.tsx` (1), `navbar.tsx` (1) passam a usar `skfundo`/`skvidro`/`skpopover`.
4. **Preferência** — `lib/skins/preferencia.ts` (`lerSkinLocal`, `aplicarSkin`, `escolherSkin`, `EVT_SKIN`, `skinDaConta`), rota `app/api/user/skin/route.ts` (GET/PUT), testes dos dois.
5. **Aplicação** — `components/skins/SkinDoLab.tsx`, montado em `app/research-lab/page.tsx`; teste.
6. **Configurações** — `components/sub/ConfigMenu.tsx` (linha "Skin do laboratório", grupo de rádio com 7 opções, marca "sua sala"), 4 chaves novas em `public/locales/*/common.json` (7 idiomas).
7. **Verificação** — tsc, vitest, CSS gerado, página estática com a sidebar real nas 7 skins (claro e escuro) no navegador.
