---
name: arduino-ide
description: Entrega a Arduino IDE 2, o ambiente open-source para programar placas Arduino e compatíveis, com a instalação e o roteiro do primeiro circuito — piscar um LED, ler um sensor e ver os dados no monitor serial. Use quando o aluno quiser começar em eletrônica e sistemas embarcados, programar um Arduino ou ESP32, ler um sensor, controlar um motor, ou tiver erro de porta ou de upload. É um app de DISPOSITIVO — o aluno baixa e roda no computador dele; a Zaeon entrega o espelho e as instruções, não executa o app. Arduino IDE (Arduino SA, AGPL-3.0-or-later).
license: AGPL-3.0-or-later
runtime: ts
risk: read
minPlan: free
courseTags:
  - eletronica
  - sistemas-embarcados
  - robotica
  - engenharia
metadata:
  zaeon-familia: device
  zaeon-titulo: Arduino IDE — sua primeira placa programada
  zaeon-subtitulo: Do LED piscando ao sensor no monitor serial, com a IDE oficial e livre
  zaeon-modelo: chip
  zaeon-tags: Arduino, eletrônica, embarcados, robótica, ESP32, open source
  zaeon-entrega: o espelho oficial da Arduino IDE 2 (AGPL-3.0-or-later); instalação e escolha de placa e porta; o primeiro sketch explicado; leitura de sensor e monitor serial; os erros clássicos de upload e de ligação; as regras de segurança da bancada
  zaeon-device-plataforma: windows
  zaeon-device-mirror: https://www.arduino.cc/en/software
  zaeon-app-licenca: AGPL-3.0-or-later (Arduino IDE 2, Arduino SA)
---

# Arduino IDE — sua primeira placa programada

Procedimento para instalar e começar na **Arduino IDE 2**. Código-fonte em
https://github.com/arduino/arduino-ide, licença **GNU AGPL versão 3 ou posterior**.

Este é um card de **dispositivo**: o app roda **no computador do aluno**, não no servidor da
Zaeon. A casa entrega o espelho oficial de download e estas instruções.
A licença é **AGPL**: por isso este card é de dispositivo e só de dispositivo — código AGPL
**nunca roda no servidor da Zaeon**; quem executa é a máquina do aluno.

## Instalação

1. **Baixe** pelo espelho do card (a página oficial de software do Arduino). O card marca Windows por ser o caso mais comum; os instaladores de **macOS** e **Linux** estão na mesma página.
2. Conecte a placa por USB. Em **Tools → Board** escolha o modelo; em **Tools → Port**, a porta
   que APARECEU quando você plugou. Placas com chip CH340 pedem o driver do fabricante.
3. Para ESP32 e outras, instale o núcleo em **Boards Manager**.

## O primeiro sketch

```cpp
const int LED = 13;
void setup() { pinMode(LED, OUTPUT); Serial.begin(9600); }
void loop() {
  digitalWrite(LED, HIGH); delay(500);
  digitalWrite(LED, LOW);  delay(500);
  Serial.println(analogRead(A0));   // lê um sensor no pino A0 (0 a 1023)
}
```

- `setup()` roda uma vez; `loop()` roda para sempre. É o modelo mental inteiro.
- **Monitor serial** (ícone da lupa) na MESMA velocidade do `Serial.begin`. Caracteres
  estranhos = velocidade diferente.
- LED externo **sempre com resistor** (220 Ω a 1 kΩ) em série.

## Quando o upload falha

Porta errada; cabo USB que só carrega (sem dados); monitor serial de outro programa segurando a
porta; placa errada selecionada. Confira nessa ordem.

## Segurança da bancada

Fique em **5 V ou 3,3 V**. Nunca ligue a placa direto à **rede elétrica** nem a carga que puxe
mais corrente do que o pino aguenta (motor e relé pedem driver e fonte própria). Bateria de
lítio só com circuito de proteção.

## O que esta skill NÃO faz

- **Não executa o app no servidor da Zaeon.** É dispositivo: roda na máquina do aluno.
- **Não redistribui o instalador.** O espelho aponta para a página oficial do projeto.
- **Não projeta ligação à rede elétrica.** Projeto em 127/220 V exige profissional habilitado.
- **Não ajuda a construir dispositivo para ferir, vigiar alguém sem consentimento ou burlar
  sistema de segurança.**
