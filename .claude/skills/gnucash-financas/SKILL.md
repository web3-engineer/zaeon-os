---
name: gnucash-financas
description: Entrega o GnuCash, o programa open-source de contabilidade pessoal e de pequenos negócios por partidas dobradas, com a instalação e o roteiro para montar o plano de contas, lançar e fechar o mês. Use quando o aluno quiser organizar as finanças pessoais, aprender contabilidade na prática (débito, crédito, balanço, DRE), controlar o caixa de um pequeno negócio ou MEI, ou perguntar por uma alternativa livre a planilhas e apps pagos. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho e as instruções, não executa o app. GnuCash (GnuCash Development Team, GPL-2.0-or-later).
license: GPL-2.0-or-later
runtime: ts
risk: read
minPlan: free
courseTags:
  - financas
  - contabilidade
  - educacao-financeira
  - administracao
metadata:
  zaeon-familia: device
  zaeon-titulo: GnuCash — suas contas em partidas dobradas
  zaeon-subtitulo: Contabilidade de verdade, livre e no seu computador, para a vida pessoal ou o pequeno negócio
  zaeon-modelo: predio
  zaeon-tags: GnuCash, finanças, contabilidade, partidas dobradas, orçamento, open source
  zaeon-entrega: o espelho oficial do GnuCash (GPL); as partidas dobradas explicadas com o dia a dia; o plano de contas inicial; como lançar e conciliar com o extrato; o balanço e o demonstrativo de resultado do mês
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://www.gnucash.org/download.phtml
  zaeon-app-licenca: GPL-2.0-or-later (GnuCash, GnuCash Development Team; licenciado sob GPL versão 2 ou, à escolha, versão 3)
---

# GnuCash — suas contas em partidas dobradas

Procedimento para instalar e começar no **GnuCash**, programa open-source de contabilidade.
Código-fonte em https://github.com/Gnucash/gnucash, licença **GNU GPL versão 2 ou versão 3**.

Este é um card de **dispositivo**: o app roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções. Os dados financeiros ficam num arquivo **no computador do
aluno** — não vão para nuvem nenhuma, nem para a Zaeon.

## Instalação

**Baixe** pelo espelho do card (a página oficial de download). O card marca Windows por ser o caso mais comum; os instaladores de **macOS** e **Linux** estão na mesma página.
No assistente inicial, escolha a moeda **BRL** e um plano de contas modelo.

## Partidas dobradas em uma frase

Todo dinheiro **sai de um lugar e vai para outro**. Cada lançamento mexe em duas contas, pelo
mesmo valor. Pagou o mercado no débito: sai de *Ativo:Conta Corrente*, entra em
*Despesas:Alimentação*. Por isso a conta sempre fecha — e quando não fecha, há um erro a achar.

## Os cinco tipos de conta

| Tipo | O que é | Exemplo |
|---|---|---|
| Ativo | o que você tem | conta corrente, poupança, carteira |
| Passivo | o que você deve | cartão de crédito, financiamento |
| Patrimônio líquido | ativo − passivo | saldos de abertura |
| Receita | de onde vem | salário, vendas |
| Despesa | para onde vai | aluguel, alimentação, transporte |

## A rotina do mês

1. **Saldos de abertura** de cada conta de ativo e passivo, na data de início.
2. **Lance** as transações (ou importe o extrato em OFX/CSV do banco).
3. **Concilie** cada conta com o extrato: o saldo do GnuCash tem de bater com o do banco.
4. **Relatórios → Demonstrativo de resultado** (receitas − despesas do mês) e **Balanço**
   (o retrato do que se tem e se deve).
5. Compra no **cartão** é passivo que nasce na data da compra, não na do pagamento da fatura.

## O que esta skill NÃO faz

- **Não executa o app no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não é recomendação de investimento.** Organiza e mostra; não diz onde aplicar dinheiro.
- **Não substitui o contador.** Escrituração fiscal, imposto de renda e obrigações de empresa
  são de profissional habilitado (CRC).
- **Não recebe extrato nem senha do aluno.** Nada de dado bancário colado no chat.
