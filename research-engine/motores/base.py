"""
Classe base de um motor. Um motor novo (Zaeon ou open-source: STORM, gpt-researcher, PaperQA2…)
herda de `Motor`, preenche os 4 atributos e implementa `executar`.

Regras que a API (motores/api.py) já garante por você — o motor NÃO precisa reimplementar:
  • prazo: `executar` roda dentro de asyncio.timeout(prazo_ms − folga); estourou → 504;
  • citações: [E#] que não existe em `evidencias` é removida do `texto` (e o resultado vira
    degradado=true);
  • evidências: as de entrada sempre voltam; as novas do motor só entram com chave inédita;
  • `motor` da resposta = id pedido.

Erros que o motor pode levantar (mapeados pela API):
  MotorIndisponivel / llm.ProvedorIndisponivel → 503 {"erro": "motor_indisponivel"}
  llm.PrazoEsgotado / TimeoutError             → 504 {"erro": "prazo"}
  llm.SaidaInvalida                            → 502 {"erro": "saida_invalida"}
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import ClassVar

from motores.contrato import Formato, MotorInfo, Origem, Resultado, Tarefa


class MotorIndisponivel(Exception):
    """Dependência/credencial ausente ou serviço externo fora do ar."""


class Motor(ABC):
    id: ClassVar[str]
    nome: ClassVar[str]
    origem: ClassVar[Origem]
    formato: ClassVar[Formato]

    def disponivel(self) -> bool:
        """Barato e sem rede: há o necessário (pacote instalado, credencial) pra rodar?"""
        return True

    @abstractmethod
    async def executar(self, tarefa: Tarefa, deadline: float) -> Resultado:
        """
        Roda a tarefa. `deadline` é ABSOLUTO no relógio do loop
        (asyncio.get_running_loop().time()); repasse-o pra chamadas internas.
        Código bloqueante (SDKs síncronos) deve ir pra `asyncio.to_thread(...)`, senão o
        timeout não consegue interromper e o servidor inteiro trava.
        """

    def info(self) -> MotorInfo:
        try:
            ok = bool(self.disponivel())
        except Exception:
            ok = False
        return MotorInfo(
            id=self.id, nome=self.nome, origem=self.origem, formato=self.formato, disponivel=ok
        )
