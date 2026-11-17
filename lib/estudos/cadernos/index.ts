import type { CadernoEstudo } from "../cadernosEstudo";
import { caderno as acessoTransporte } from "./acesso-transporte";
import { caderno as baciaUrbana } from "./bacia-urbana";
import { caderno as biogasLocal } from "./biogas-local";
import { caderno as captacaoChuva } from "./captacao-chuva";
import { caderno as cardiovascular } from "./cardiovascular";
import { caderno as coberturaSolo } from "./cobertura-solo";
import { caderno as comedouros } from "./comedouros";
import { caderno as cooperativas } from "./cooperativas";
import { caderno as corredoresVerdes } from "./corredores-verdes";
import { caderno as ecovila } from "./ecovila";
import { caderno as estacaoReparo } from "./estacao-reparo";
import { caderno as fluxoCaixa } from "./fluxo-caixa";
import { caderno as geracaoFotovoltaica } from "./geracao-fotovoltaica";
import { caderno as governancaComunitaria } from "./governanca-comunitaria";
import { caderno as hortaComunitaria } from "./horta-comunitaria";
import { caderno as isolamentoTermico } from "./isolamento-termico";
import { caderno as luzNatural } from "./luz-natural";
import { caderno as memoriaFerrovia } from "./memoria-ferrovia";
import { caderno as mercadosMunicipais } from "./mercados-municipais";
import { caderno as monitorEnergia } from "./monitor-energia";
import { caderno as reaproveitamentoSolar } from "./reaproveitamento-solar";
import { caderno as riosUrbanos } from "./rios-urbanos";
import { caderno as sazonalidadeFeiras } from "./sazonalidade-feiras";
import { caderno as sensorIrrigacao } from "./sensor-irrigacao";
import { caderno as sinalizacaoParque } from "./sinalizacao-parque";
import { caderno as sonoAprendizagem } from "./sono-aprendizagem";
import { caderno as temperaturaBairros } from "./temperatura-bairros";

export const CADERNOS_EXTRA: readonly CadernoEstudo[] = [
  acessoTransporte,
  baciaUrbana,
  biogasLocal,
  captacaoChuva,
  cardiovascular,
  coberturaSolo,
  comedouros,
  cooperativas,
  corredoresVerdes,
  ecovila,
  estacaoReparo,
  fluxoCaixa,
  geracaoFotovoltaica,
  governancaComunitaria,
  hortaComunitaria,
  isolamentoTermico,
  luzNatural,
  memoriaFerrovia,
  mercadosMunicipais,
  monitorEnergia,
  reaproveitamentoSolar,
  riosUrbanos,
  sazonalidadeFeiras,
  sensorIrrigacao,
  sinalizacaoParque,
  sonoAprendizagem,
  temperaturaBairros,
];
