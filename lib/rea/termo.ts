/**
 * lib/rea/termo.ts — o TERMO DE USO da engenharia reversa em domínios declarados (REA na Zaeon).
 *
 * Por que existe: as ferramentas de RUNTIME web do REA (abrir a página num navegador do motor, observar a sessão,
 * capturar cenários, exportar scripts) agem sobre um site de verdade. A pessoa DECLARA que o domínio é dela (ou que tem
 * autorização expressa do titular) e para que vai usar; o aceite — com a versão, o hash SHA-256 deste texto, a data,
 * o IP e o navegador — é a PROVA. Com ele, o domínio fica liberado por inteiro nas sessões do REA, como no REA local.
 *
 * Mudou o texto? Suba TERMO_VERSAO. Aceites antigos continuam valendo para o que foi aceito, mas o app pede o novo
 * antes de liberar de novo (o hash do aceite tem que bater com o termo vigente).
 *
 * ⚠️ Texto redigido pela engenharia; revisão jurídica recomendada antes de valer para terceiros.
 */
import { createHash } from "node:crypto";

export const TERMO_VERSAO = "2026-11-17";

export const FINALIDADES = {
  estudo: "Estudo e aprendizado (entender como o próprio sistema funciona)",
  reconstrucao: "Reconstrução, migração ou documentação do próprio software",
  seguranca: "Segurança e auditoria do próprio sistema (ou com autorização do titular)",
  interoperabilidade: "Interoperabilidade com sistemas próprios",
} as const;
export type Finalidade = keyof typeof FINALIDADES;
export const ehFinalidade = (f: unknown): f is Finalidade => typeof f === "string" && f in FINALIDADES;

export const TERMO_TITULO = "Termo de Uso — Engenharia Reversa em Domínio Declarado (REA)";

export const TERMO_TEXTO = `# ${TERMO_TITULO}
Versão ${TERMO_VERSAO}

Este Termo regula o uso das ferramentas de engenharia reversa da Zaeon (o "REA") sobre um site ou aplicação web identificado por um domínio que você declara (o "Domínio Declarado"). Ao aceitar, você celebra este Termo com a Zaeon e ele se soma aos Termos de Uso gerais da plataforma.

## 1. O que o REA faz
1.1. Com o Domínio Declarado, o REA pode abrir as páginas dele num navegador isolado da Zaeon, observar o carregamento, capturar e exportar os scripts e recursos entregues ao navegador, recuperar e analisar o código JavaScript, mapear rotas, chamadas de API e o funcionamento da interface, e executar cenários de navegação que você definir.
1.2. O REA só analisa o que o próprio site entrega a um navegador. Ele não acessa servidores, bancos de dados ou áreas que exigem credenciais que você não forneceu.

## 2. Sua declaração
Ao aceitar, você declara, sob as penas da lei, que:
a) é o titular do Domínio Declarado e do software que ele serve, ou tem autorização expressa, prévia e por escrito do titular para submetê-lo à engenharia reversa, nos limites desta autorização;
b) as informações que você fornece (domínio e finalidade) são verdadeiras;
c) vai usar o REA apenas para a finalidade declarada, entre as permitidas no item 3;
d) é maior de 18 anos ou está devidamente representado ou assistido.

## 3. Finalidades permitidas
a) estudo e aprendizado sobre o funcionamento do próprio sistema;
b) reconstrução, migração, documentação ou manutenção do próprio software;
c) segurança, auditoria e correção de vulnerabilidades do próprio sistema, ou de terceiro que tenha autorizado por escrito;
d) interoperabilidade com sistemas próprios.

## 4. O que é proibido
É proibido usar o REA para:
a) analisar domínio de terceiro sem autorização expressa do titular;
b) contornar autenticação, controle de acesso, DRM, mecanismos anti-fraude ou anti-cheat, ou qualquer medida técnica de proteção;
c) copiar, reproduzir, distribuir ou explorar comercialmente software, marca, conteúdo ou segredo de negócio de terceiros;
d) coletar, tratar ou expor dados pessoais de terceiros em desacordo com a Lei nº 13.709/2018 (LGPD);
e) praticar ou preparar invasão de dispositivo informático (art. 154-A do Código Penal), interrupção de serviço, sobrecarga, varredura em massa ou qualquer ataque;
f) violar a Lei nº 9.609/1998 (Lei de Software), a Lei nº 9.610/1998 (Direitos Autorais), a Lei nº 9.279/1996 (Propriedade Industrial), o Marco Civil da Internet (Lei nº 12.965/2014) ou os termos de uso do Domínio Declarado.

## 5. Credenciais e dados
5.1. Se você usar credenciais nos cenários, elas devem ser suas, de teste ou de conta autorizada. Use contas sem dados reais de clientes sempre que possível.
5.2. O que o REA captura (scripts, estrutura da página, metadados de rede) fica numa sessão temporária, apagada ao fim da sessão ou por inatividade. A Zaeon não usa esse conteúdo para outra finalidade.

## 6. Limites técnicos da Zaeon
A Zaeon pode, sem aviso, limitar ou bloquear destinos de rede (como redes internas e endereços privados), a duração e a quantidade de sessões, e recusar ferramentas que afetem a infraestrutura dela. Esses limites existem por segurança e não dependem do seu aceite.

## 7. Responsabilidade
7.1. Você é o único responsável pelo uso do REA, pela veracidade da sua declaração e pelos atos praticados a partir dela.
7.2. Você se obriga a indenizar e manter a Zaeon livre de qualquer reclamação, dano, multa ou despesa (inclusive honorários) decorrente de declaração falsa ou de uso em desacordo com este Termo ou com a lei.
7.3. O REA é fornecido "no estado em que se encontra". A Zaeon não garante a completude ou a exatidão das análises.

## 8. Prova do aceite
8.1. A Zaeon registra o seu aceite com: a sua conta, o Domínio Declarado, a finalidade, a versão deste Termo, o hash SHA-256 do texto aceito, a data e a hora, o endereço IP e o identificador do navegador. Esse registro é a prova da sua declaração e do seu aceite (art. 10, § 2º, da MP nº 2.200-2/2001).
8.2. Mediante ordem judicial ou requisição de autoridade competente, a Zaeon pode fornecer esse registro, nos termos da lei.

## 9. Revogação e suspensão
9.1. Você pode revogar a declaração a qualquer momento; as sessões novas deixam de liberar o domínio.
9.2. A Zaeon pode suspender ou cancelar a liberação diante de indício de uso indevido, de reclamação do titular do domínio ou de ordem de autoridade.

## 10. Lei e foro
Este Termo é regido pelas leis da República Federativa do Brasil. Fica eleito o foro do domicílio do consumidor, quando aplicável, ou, nos demais casos, o foro da sede da Zaeon.
`;

/** hash do texto exato que a pessoa viu — vai no registro do aceite */
export const termoHash = (texto: string = TERMO_TEXTO): string => createHash("sha256").update(texto, "utf8").digest("hex");
export const TERMO_HASH = termoHash();

/** o domínio como fica gravado: host em minúsculas, sem www., sem porta; recusa IP, localhost e nomes internos.
 *  (o motor tem a MESMA regra em infra/rea-engine/politica.mjs — o motor é a autoridade final) */
export function normalizarDominio(bruto: string): string {
  let s = String(bruto || "").trim().toLowerCase();
  if (!s) throw new Error("dominio_vazio");
  if (!/^[a-z]+:\/\//.test(s)) s = "https://" + s;
  let u: URL; try { u = new URL(s); } catch { throw new Error("dominio_invalido"); }
  const host = u.hostname.replace(/^www\./, "").replace(/\.$/, "");
  if (/^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) throw new Error("dominio_ip");
  if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) throw new Error("dominio_invalido");
  if (/\.(local|localhost|internal|lan|home|corp|ts\.net|test|example|invalid)$/.test(host)) throw new Error("dominio_interno");
  return host;
}

export const MENSAGEM_ERRO_DOMINIO: Record<string, string> = {
  dominio_vazio: "Informe o domínio.",
  dominio_invalido: "Esse domínio não parece válido (ex.: meusite.com.br).",
  dominio_ip: "Use o domínio, não um endereço IP.",
  dominio_interno: "Domínios internos ou de teste não podem ser declarados.",
};
