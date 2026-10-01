"""Gera os PDFs de apresentação a partir dos arquivos Markdown desta pasta.

Uso:  python docs/build_pdfs.py        (requer `pip install reportlab`)

Saídas (na raiz de projeto-api/):
  CONECTA_API_Especificacao_SDD_v2.pdf  <- docs/apresentacao_especificacao_v2.md
  CONECTA_Decisoes_v2.pdf               <- docs/CONECTA_Decisoes_v2.md

Suporta o subconjunto de Markdown usado nos documentos: títulos (#, ##, ###), parágrafos,
listas (- e 1.), tabelas, blocos de código, citações (>), **negrito** e `código`.
"""
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (CondPageBreak, KeepTogether, PageBreak, Paragraph, Preformatted,
                                SimpleDocTemplate, Spacer, Table, TableStyle)

ROOT = Path(__file__).resolve().parent.parent
DOCS = Path(__file__).resolve().parent
FONT_DIRS = [Path("/System/Library/Fonts/Supplemental"), Path("/Library/Fonts"),
             Path("/usr/share/fonts/truetype/msttcorefonts")]

NAVY = colors.HexColor("#1F3A5F")
GRAY = colors.HexColor("#555555")
LIGHT = colors.HexColor("#EEF2F7")
RULE = colors.HexColor("#C9D3E0")


def register_fonts():
    def find(name):
        for d in FONT_DIRS:
            if (d / name).exists():
                return str(d / name)
        return None

    files = {"Body": "Arial.ttf", "Body-Bold": "Arial Bold.ttf", "Body-Italic": "Arial Italic.ttf",
             "Body-BoldItalic": "Arial Bold Italic.ttf", "Mono": "Courier New.ttf",
             "Mono-Bold": "Courier New Bold.ttf"}
    paths = {k: find(v) for k, v in files.items()}
    if not all(paths.values()):
        raise SystemExit("Fontes Arial/Courier New não encontradas; ajuste FONT_DIRS em build_pdfs.py")
    for k, p in paths.items():
        pdfmetrics.registerFont(TTFont(k, p))
    pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body-Italic",
                                  boldItalic="Body-BoldItalic")
    pdfmetrics.registerFontFamily("Mono", normal="Mono", bold="Mono-Bold", italic="Mono",
                                  boldItalic="Mono-Bold")


def styles():
    base = dict(fontName="Body", fontSize=9.5, leading=13.5, textColor=colors.HexColor("#222222"))
    return {
        "p": ParagraphStyle("p", spaceAfter=6, **base),
        "h1": ParagraphStyle("h1", fontName="Body", fontSize=17, leading=21, textColor=NAVY,
                             spaceBefore=6, spaceAfter=4, keepWithNext=1),
        "h2": ParagraphStyle("h2", fontName="Body-Bold", fontSize=11.5, leading=15, textColor=NAVY,
                             spaceBefore=10, spaceAfter=4, keepWithNext=1),
        "h3": ParagraphStyle("h3", fontName="Body-Bold", fontSize=10, leading=13, textColor=NAVY,
                             spaceBefore=6, spaceAfter=3, keepWithNext=1),
        "li": ParagraphStyle("li", leftIndent=16, bulletIndent=5, spaceAfter=3, **base),
        "cell": ParagraphStyle("cell", fontName="Body", fontSize=8, leading=10.2,
                               textColor=colors.HexColor("#222222")),
        "cellh": ParagraphStyle("cellh", fontName="Body-Bold", fontSize=8, leading=10.2,
                                textColor=colors.white),
        "quote": ParagraphStyle("quote", leftIndent=12, borderPadding=(4, 4, 4, 8), spaceAfter=8,
                                backColor=LIGHT, **{**base, "textColor": colors.HexColor("#333333")}),
        "code": ParagraphStyle("code", fontName="Mono", fontSize=7.3, leading=9.2,
                               backColor=colors.HexColor("#F4F4F4"), borderPadding=5,
                               leftIndent=6, spaceBefore=3, spaceAfter=9),
        "cover_t": ParagraphStyle("ct", fontName="Body", fontSize=30, leading=36, textColor=NAVY,
                                  alignment=TA_CENTER, spaceAfter=14),
        "cover_s": ParagraphStyle("cs", fontName="Body", fontSize=13, leading=18, alignment=TA_CENTER,
                                  textColor=colors.HexColor("#222222"), spaceAfter=10),
        "cover_n": ParagraphStyle("cn", fontName="Body", fontSize=9, leading=13, alignment=TA_CENTER,
                                  textColor=GRAY),
        "toc": ParagraphStyle("toc", leftIndent=14, bulletIndent=2, spaceAfter=3, **base),
    }


def inline(text):
    text = escape(text)
    text = re.sub(r"`([^`]+)`", r'<font name="Mono" size="8">\1</font>', text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    return text


def table_flowable(rows, st, avail):
    header, body = rows[0], rows[1:]
    ncol = len(header)
    weights = []
    for c in range(ncol):
        longest = max(len(re.sub(r"[`*]", "", r[c])) if c < len(r) else 0 for r in rows)
        weights.append(min(max(longest, 7), 48) ** 0.85)
    total = sum(weights)
    widths = [avail * w / total for w in weights]
    data = [[Paragraph(inline(c), st["cellh"]) for c in header]]
    for r in body:
        r = r + [""] * (ncol - len(r))
        data.append([Paragraph(inline(c), st["cell"]) for c in r[:ncol]])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return [t, Spacer(1, 8)]


def wrap_code(line, width=108):
    out = []
    while len(line) > width:
        cut = line.rfind(" ", 0, width)
        cut = cut if cut > width // 2 else width
        out.append(line[:cut])
        line = "      " + line[cut:].lstrip()
    out.append(line)
    return out


def parse(md, st, avail):
    flow, toc = [], []
    lines = md.split("\n")
    i = 0
    para = []

    def flush():
        if para:
            flow.append(Paragraph(inline(" ".join(para)), st["p"]))
            para.clear()

    while i < len(lines):
        ln = lines[i]
        s = ln.strip()
        if s.startswith("```"):
            flush()
            i += 1
            code = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code.extend(wrap_code(lines[i].rstrip()))
                i += 1
            flow.append(Preformatted("\n".join(code), st["code"]))
        elif s.startswith("|"):
            flush()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{3,}:?", c) for c in cells):
                    rows.append(cells)
                i += 1
            flow.extend(table_flowable(rows, st, avail))
            continue
        elif s.startswith("# "):
            flush()
            title = s[2:]
            toc.append(title)
            flow.append(CondPageBreak(6 * cm))
            flow.append(Paragraph(inline(title), st["h1"]))
            flow.append(Table([[""]], colWidths=[avail], rowHeights=[1],
                              style=[("LINEABOVE", (0, 0), (-1, 0), 0.6, RULE)]))
            flow.append(Spacer(1, 6))
        elif s.startswith("## "):
            flush()
            flow.append(Paragraph(inline(s[3:]), st["h2"]))
        elif s.startswith("### "):
            flush()
            flow.append(Paragraph(inline(s[4:]), st["h3"]))
        elif s.startswith("> "):
            flush()
            q = [s[2:]]
            while i + 1 < len(lines) and lines[i + 1].strip().startswith("> "):
                i += 1
                q.append(lines[i].strip()[2:])
            flow.append(Paragraph(inline(" ".join(q)), st["quote"]))
        elif re.match(r"^- ", s):
            flush()
            flow.append(Paragraph(inline(s[2:]), st["li"], bulletText="•"))
        elif re.match(r"^\d+\. ", s):
            flush()
            n, rest = s.split(". ", 1)
            flow.append(Paragraph(inline(rest), st["li"], bulletText=f"{n}."))
        elif s == "":
            flush()
        else:
            para.append(s)
        i += 1
    flush()
    return flow, toc


class Numbered(canvas.Canvas):
    footer = ""

    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self._saved = []

    def showPage(self):
        self._saved.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved)
        for state in self._saved:
            self.__dict__.update(state)
            if self._pageNumber > 1:
                self.setFont("Body", 7.5)
                self.setFillColor(GRAY)
                self.drawString(2 * cm, 1.2 * cm, self.footer)
                self.drawRightString(A4[0] - 2 * cm, 1.2 * cm,
                                     f"Página {self._pageNumber} de {total}")
            super().showPage()
        super().save()


def build(src, out, title, cover_lines, footer):
    st = styles()
    avail = A4[0] - 4 * cm
    flow, toc = parse(Path(src).read_text(encoding="utf-8"), st, avail)

    cover = [Spacer(1, 6.5 * cm), Paragraph("CONECTA", st["cover_t"])]
    cover += [Paragraph(inline(t), st["cover_s"]) for t in cover_lines[:2]]
    cover += [Spacer(1, 1.2 * cm)]
    cover += [Paragraph(inline(t), st["cover_n"]) for t in cover_lines[2:]]
    cover += [PageBreak(), Paragraph("Sumário", st["h1"]), Spacer(1, 6)]
    cover += [Paragraph(inline(t), st["toc"], bulletText="•") for t in toc]

    Numbered.footer = footer
    doc = SimpleDocTemplate(str(out), pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
                            topMargin=2 * cm, bottomMargin=2 * cm, title=title,
                            author="Projeto CONECTA")
    doc.build(cover + [PageBreak()] + flow, canvasmaker=Numbered)
    print("OK", out)


if __name__ == "__main__":
    register_fonts()
    build(DOCS / "apresentacao_especificacao_v2.md", ROOT / "CONECTA_API_Especificacao_SDD_v2.pdf",
          "CONECTA API — Especificação SDD (v2)",
          ["Especificação da API Backend — Processo de Spec-Driven Development (SDD)",
           "Versão 2: Entregas, Perfis, Turmas e Avisos",
           "Documento de apresentação para orientação acadêmica",
           "Gerado a partir das especificações formais do projeto (GitHub Spec Kit)",
           "Revisão do parecer sobre a v1 — Setembro de 2026"],
          "CONECTA — Especificação SDD da API Backend (v2)")
    build(DOCS / "CONECTA_Decisoes_v2.md", ROOT / "CONECTA_Decisoes_v2.pdf",
          "CONECTA — Decisões de Revisão da Especificação (v2)",
          ["Decisões de Revisão da Especificação (v2)",
           "Respostas ao parecer do orientador sobre a especificação v1",
           "Documento complementar à Especificação v2",
           "Registra somente o que foi decidido a partir do parecer",
           "Setembro de 2026"],
          "CONECTA — Decisões de Revisão da Especificação (v2)")
