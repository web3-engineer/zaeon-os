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

export const TERMO_VERSAO = "2026-11-17.2";

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

Este Termo regula o uso das ferramentas de engenharia reversa da Zaeon (o "REA") sobre um site ou aplicação web identificado por um domínio que você declara (o "Domínio Declarado"). Ao marcar as declarações e aceitar, você ("Usuário") celebra este Termo com a Zaeon ("Zaeon") e ele se soma, como condição específica, aos Termos de Uso gerais da plataforma, que permanecem aplicáveis no que não conflitar com este Termo. Em caso de conflito sobre o objeto aqui tratado, prevalece este Termo.

## 1. Definições
1.1. "REA": o conjunto de ferramentas da Zaeon que, a seu pedido, abre as páginas de um site num navegador controlado pela Zaeon, observa o carregamento, captura e exporta os scripts e recursos entregues ao navegador, recupera e analisa o código JavaScript, mapeia rotas, chamadas de interface de programação (API) e o funcionamento da interface, e executa cenários de navegação que você definir.
1.2. "Domínio Declarado": o domínio que você declara nos termos do item 3, abrangendo seus subdomínios.
1.3. "Resultados": as análises, inventários e evidências produzidos pelo REA a partir do Domínio Declarado.

## 2. Objeto e funcionamento
2.1. O REA atua exclusivamente sobre o Domínio Declarado e apenas sobre o conteúdo que o próprio site entrega a um navegador, interagindo como um visitante faria. O REA não invade, não explora vulnerabilidades, não acessa servidores, bancos de dados, código-fonte de servidor ou áreas restritas senão por meio das credenciais que você fornecer e estiver autorizado a usar (item 6).
2.2. O REA não executa o código capturado para fins de contornar proteções; a recuperação e a análise de código são estáticas ou por observação do comportamento normal da página.

## 3. Suas declarações e garantias
Ao aceitar, você declara e garante, sob as penas da lei, inclusive do crime de falsidade ideológica (art. 299 do Código Penal), que:
a) é o titular do Domínio Declarado e do software que ele serve, ou detém autorização expressa, prévia e por escrito do titular para submetê-lo à engenharia reversa, nos exatos limites dessa autorização, e conserva prova dela, que fornecerá à Zaeon se solicitado;
b) as informações que fornece (Domínio Declarado e finalidade) são verdadeiras, completas e atuais;
c) usará o REA apenas para a finalidade declarada, entre as permitidas no item 4, e dentro da lei;
d) tem capacidade civil e é maior de 18 anos, ou está devidamente representado ou assistido, e, se age por uma pessoa jurídica, tem poderes para representá-la.

## 4. Finalidades permitidas
a) estudo e aprendizado sobre o funcionamento do próprio sistema;
b) reconstrução, migração, documentação, manutenção ou interoperabilidade do próprio software com sistemas próprios;
c) segurança, auditoria e correção de vulnerabilidades do próprio sistema, ou de sistema de terceiro que o tenha autorizado por escrito.

## 5. Condutas vedadas
É vedado usar o REA para:
a) atuar sobre domínio de terceiro sem autorização expressa, prévia e por escrito do titular;
b) contornar autenticação, controle de acesso, gestão de direitos digitais (DRM), mecanismos antifraude ou anti-trapaça, ou qualquer medida técnica de proteção ou de efetividade;
c) copiar, reproduzir, distribuir, comercializar ou de qualquer modo explorar software, marca, conteúdo ou segredo de negócio de terceiros, nem reconstruir produto concorrente a partir de obra alheia;
d) tratar dados pessoais em desconformidade com a Lei nº 13.709/2018 (LGPD);
e) praticar ou preparar invasão de dispositivo informático (art. 154-A do Código Penal), interrupção ou perturbação de serviço, sobrecarga, varredura em massa, força bruta ou qualquer ataque;
f) violar a Lei nº 9.609/1998 (Programa de Computador), a Lei nº 9.610/1998 (Direitos Autorais), a Lei nº 9.279/1996 (Propriedade Industrial), o Marco Civil da Internet (Lei nº 12.965/2014), a LGPD, ou os termos de uso e as medidas de proteção do próprio Domínio Declarado.

## 6. Credenciais e acesso autenticado
6.1. Você só pode fornecer ao REA credenciais que sejam suas, de teste, ou de conta que você esteja autorizado a usar para a finalidade declarada. Prefira contas de teste, sem dados reais de clientes.
6.2. Você é o único responsável pelas credenciais fornecidas e pelo acesso que elas permitem. A Zaeon não solicita e não deve receber credenciais de terceiros não autorizadas.

## 7. Dados pessoais (LGPD)
7.1. Se o Domínio Declarado expuser dados pessoais (por exemplo, dados de seus clientes ao usar credenciais no item 6), você é o controlador desses dados e a Zaeon atua como operadora, tratando-os somente para executar a análise que você solicitou e seguindo as suas instruções e a LGPD.
7.2. As capturas (scripts, estrutura da página, metadados de rede e demais Resultados) ficam em sessão temporária, isolada por usuário, e são eliminadas ao término da sessão ou por inatividade, conforme os limites técnicos vigentes. A Zaeon não usa esse conteúdo para outra finalidade nem o compartilha, salvo por determinação legal.
7.3. Você se compromete a não submeter ao REA, sem base legal, dados pessoais sensíveis ou de terceiros alheios à finalidade declarada, e a cumprir, perante os titulares, os deveres de controlador.

## 8. Propriedade intelectual
8.1. Este Termo não transfere a você nenhum direito sobre software, marca ou conteúdo de terceiros. A engenharia reversa autorizada aqui não cria direito de cópia, de uso de marca ou de exploração de obra alheia.
8.2. Entre você e a Zaeon, os Resultados sobre o seu próprio software pertencem a você. A Zaeon não reivindica titularidade sobre eles e os mantém apenas pelo tempo da sessão (item 7.2).

## 9. Limites técnicos da Zaeon
A Zaeon pode, sem aviso, limitar ou bloquear destinos de rede (como redes internas, endereços privados e a própria infraestrutura), restringir a duração e a quantidade de sessões, e recusar ferramentas que atuem sobre o seu ambiente, dispositivos ou infraestrutura. Esses limites existem por segurança, independem do seu aceite e não ampliam nem restringem suas responsabilidades deste Termo.

## 10. Responsabilidade e indenização
10.1. Você é o único responsável pela veracidade das suas declarações, pela licitude da finalidade e por todos os atos praticados por meio do REA a partir do Domínio Declarado.
10.2. Você manterá a Zaeon, suas controladas e seus colaboradores indenes e os ressarcirá de toda reclamação, perda, dano, sanção, custo ou despesa (inclusive honorários advocatícios) decorrentes de declaração falsa ou inexata, de ausência de autorização do titular, ou de uso em desacordo com este Termo ou com a lei, inclusive reclamações de terceiros e de autoridades.

## 11. Isenção de garantias e limitação de responsabilidade
11.1. O REA é fornecido "no estado em que se encontra" e "conforme disponível". A Zaeon não garante a completude, a exatidão ou a adequação dos Resultados a qualquer finalidade, que servem de apoio e não substituem a sua própria verificação.
11.2. Na máxima extensão permitida pela lei aplicável, a Zaeon não responde por danos indiretos, lucros cessantes ou perda de dados decorrentes do uso do REA. Nada neste Termo exclui responsabilidade que a lei não permita afastar, inclusive, quando aplicável o Código de Defesa do Consumidor, as garantias e responsabilidades nele previstas.

## 12. Prova e validade do aceite
12.1. A Zaeon registra o seu aceite com: a sua conta, o Domínio Declarado, a finalidade, a versão deste Termo, o hash SHA-256 do texto exibido e aceito, a data e a hora, o endereço IP e o identificador do navegador (user agent). Esse registro é a prova da sua manifestação de vontade e do seu aceite e tem a validade reconhecida ao documento eletrônico assinado por meio não vinculado à ICP-Brasil, aceito pelas partes (art. 10, § 2º, da MP nº 2.200-2/2001, e art. 441 do Código de Processo Civil).
12.2. Mediante ordem judicial ou requisição de autoridade competente, a Zaeon pode fornecer esse registro, nos termos da lei.

## 13. Guarda dos registros
A Zaeon conserva o registro do aceite (item 12) enquanto durar a liberação do domínio e, após a revogação, pelo prazo necessário ao cumprimento de obrigação legal ou ao exercício regular de direitos em processo, findo o qual o elimina ou o anonimiza (art. 16 da LGPD).

## 14. Revogação e suspensão
14.1. Você pode revogar a declaração a qualquer momento; as sessões novas deixam de liberar o domínio. A revogação não apaga o registro do aceite (item 13) e não afeta atos já praticados.
14.2. A Zaeon pode suspender ou cancelar a liberação, a qualquer tempo, diante de indício de uso indevido, de reclamação do titular do domínio, de ordem de autoridade ou de descumprimento deste Termo.

## 15. Alteração deste Termo
A Zaeon pode alterar este Termo, publicando nova versão. A liberação de um domínio vale para a versão que você aceitou; alterada a versão, a Zaeon pede novo aceite antes de liberar de novo, e o uso posterior depende desse novo aceite.

## 16. Disposições gerais
16.1. As obrigações dos itens 3, 5, 7, 8, 10, 11, 12 e 13 sobrevivem ao término da liberação ou deste Termo.
16.2. A tolerância quanto a qualquer descumprimento não significa renúncia. Se alguma cláusula for considerada inválida, as demais permanecem em vigor.
16.3. Este Termo não cria vínculo societário, de mandato, de emprego ou de parceria entre você e a Zaeon.

## 17. Lei aplicável e foro
Este Termo é regido pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca da sede da Zaeon para dirimir controvérsias, ressalvada, quando a relação for de consumo, a competência do foro do domicílio do consumidor.
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
