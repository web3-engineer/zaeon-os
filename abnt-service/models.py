from pydantic import BaseModel, Field
from typing import List, Optional


class SubsectionData(BaseModel):
    title: str
    content: str


class SectionData(BaseModel):
    type: str  # "introducao" | "desenvolvimento" | "conclusao" | "custom"
    title: str
    content: str
    subsections: List[SubsectionData] = []


class ReferenceData(BaseModel):
    text: str = ""           # fallback pré-formatado (NBR 6023) — usado se não houver campos
    # Campos estruturados (NBR 6023:2018) — quando presentes, o worker formata
    # deterministicamente com o destaque (negrito) correto.
    authors: List[str] = []
    title: Optional[str] = None
    year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    url: Optional[str] = None
    access_date: Optional[str] = None  # "20 jan. 2026"; default = data de geração


class AppendixData(BaseModel):
    title: str
    content: str = ""


class CoverData(BaseModel):
    author: str
    institution: str
    course: str
    advisor: Optional[str] = None
    city: str
    year: str


class ValidationData(BaseModel):
    has_introduction: bool = False
    has_conclusion: bool = False
    has_references: bool = False
    warnings: List[str] = []


class DocumentPayload(BaseModel):
    title: str
    work_type: str = Field(..., description="Artigo | TCC | Relatório")
    cover: CoverData
    resumo: str
    palavras_chave: List[str] = Field(..., min_length=1)
    abstract: Optional[str] = None  # resumo em língua estrangeira (NBR 14724)
    keywords: List[str] = []         # palavras-chave do abstract
    sections: List[SectionData]
    references: List[ReferenceData] = []
    apendices: List[AppendixData] = []  # pós-textuais (APÊNDICE A, B, …)
    anexos: List[AppendixData] = []     # pós-textuais (ANEXO A, B, …)
    validation: Optional[ValidationData] = None
    format: str = Field(..., description="pdf | docx")
    font_choice: str = Field(default="Times New Roman", description="Times New Roman | Arial")
