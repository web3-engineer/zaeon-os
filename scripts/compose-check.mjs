#!/usr/bin/env node
/**
 * scripts/compose-check.mjs — CHAVE DUPLICADA no docker-compose, que o Compose RECUSA.
 *
 * Nasceu de um deploy vermelho (04/nov/2026, run 557): eu acrescentei `SCHOLAR_WORKER` ao
 * `environment:` de dois serviços que JÁ a tinham, e o deploy morreu em
 *
 *   failed to parse docker-compose.beta.yml: yaml: construct errors:
 *   mapping key "SCHOLAR_WORKER" already defined at line 83
 *
 * O detalhe que torna isto necessário: eu VALIDEI o YAML antes de empurrar, com
 * `yaml.safe_load`, e ele PASSOU — a maioria dos parsers de YAML aceita chave duplicada e deixa a
 * última vencer, enquanto o parser Go do Compose a trata como erro. Validação mais fraca que o
 * consumidor real é validação que mente.
 *
 * E o erro era pior que o símbolo: no serviço `worker`, `SCHOLAR_WORKER` é "1" FIXO porque consumir
 * a fila é o trabalho dele; a chave duplicada com `${SCHOLAR_WORKER:-}` o sobrescreveria com VAZIO e
 * desligaria o worker dedicado em silêncio. O parser pegou antes de ir pro ar; este script é pra
 * pegar antes do parser.
 *
 * Sem dependência: roda no CI em ~50 ms, antes de qualquer `npm ci`.
 *
 * SÓ APIs ANTIGAS AQUI, e isto não é estilo: a primeira versão usava `fs.globSync`, que existe no
 * Node 22 (o meu) e NÃO no Node 20 (o do CI, `node-version: "20"` em ci.yml). O gate morreu no
 * próprio CI que ele devia proteger — segundo erro seguido com a mesma forma: meu ambiente não é o
 * ambiente real. `readdirSync` + filtro funciona em qualquer versão desde sempre.
 */
import { readFileSync, readdirSync } from "node:fs";

const arquivos = readdirSync(".").filter((f) => /^docker-compose.*\.ya?ml$/.test(f)).sort();
if (!arquivos.length) {
  console.error("✗ nenhum docker-compose*.yml na raiz — rode da raiz do repositório");
  process.exit(1);
}
let problemas = 0;

for (const arq of arquivos) {
  const linhas = readFileSync(arq, "utf8").split("\n");
  // Pilha de blocos por INDENTAÇÃO: uma chave só colide com outra do MESMO bloco. Comparar por
  // nome global daria falso positivo (web e worker definem as mesmas envs de propósito).
  const vistas = new Map();   // "indent:caminho" → Map(chave → linha)
  const caminho = [];         // o bloco em que estamos, por nível
  linhas.forEach((linha, i) => {
    const n = i + 1;
    if (/^\s*#/.test(linha) || !linha.trim()) return;
    const m = /^(\s*)([A-Za-z_][\w.-]*):(\s|$)/.exec(linha);
    if (!m) return;
    const indent = m[1].length, chave = m[2];
    caminho.length = indent / 2;
    const bloco = `${indent}:${caminho.join("/")}`;
    if (!vistas.has(bloco)) vistas.set(bloco, new Map());
    const nesse = vistas.get(bloco);
    if (nesse.has(chave)) {
      console.error(`✗ ${arq}: chave "${chave}" duplicada no mesmo bloco — linha ${nesse.get(chave)} e linha ${n}`);
      problemas++;
    } else {
      nesse.set(chave, n);
    }
    caminho[indent / 2] = chave;
    // entrar num bloco novo invalida o que foi visto nos níveis MAIS FUNDOS (outro serviço começa limpo)
    for (const k of [...vistas.keys()]) if (Number(k.split(":")[0]) > indent) vistas.delete(k);
  });
}

if (problemas) {
  console.error(`\n${problemas} chave(s) duplicada(s). O Compose recusa o arquivo — o deploy morreria no \`up\`.`);
  process.exit(1);
}
console.log(`✓ compose: sem chave duplicada (${arquivos.length} arquivo(s))`);
