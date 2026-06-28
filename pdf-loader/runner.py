"""
Runner isolado: roda o opendataloader-pdf em um PROCESSO separado.

Rodar a conversão como subprocesso (e não in-process) permite um timeout DURO
e matar o grupo de processos (a JVM é filha) se travar — essencial no limite de
RAM da VPS. Uso: python runner.py <pdf_path> <out_dir>
"""
import os
import sys

import opendataloader_pdf


def main() -> int:
    pdf_path, out_dir = sys.argv[1], sys.argv[2]
    hybrid = os.getenv("PDF_LOADER_HYBRID", "0") == "1"

    kwargs = dict(
        input_path=[pdf_path],
        output_dir=out_dir,
        format="json,markdown",
        quiet=True,
        sanitize=True,          # remove texto oculto / prompt-injection (NBR de segurança)
        image_output="off",     # não embute imagens — só precisamos de bbox/tipo dos blocos
    )
    # Hybrid (OCR/SmolVLM/fórmulas) fica DESLIGADO nesta VPS (RAM). Só liga via flag.
    if hybrid:
        kwargs["hybrid"] = "docling-fast"

    opendataloader_pdf.convert(**kwargs)
    return 0


if __name__ == "__main__":
    sys.exit(main())
