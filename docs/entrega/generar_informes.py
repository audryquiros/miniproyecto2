"""Genera los informes y una copia PDF de una política sin alterar sus TXT originales."""
from pathlib import Path
import json
from html import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parents[2]
output = root / "outputs" / "nuvexa"
output.mkdir(parents=True, exist_ok=True)
content = json.loads((root / "docs/entrega/contenido-informes.json").read_text(encoding="utf-8"))
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="NTitle", fontName="Helvetica-Bold", fontSize=19, leading=24, textColor=colors.HexColor("#18212f"), spaceAfter=12))
styles.add(ParagraphStyle(name="NHeading", fontName="Helvetica-Bold", fontSize=14, leading=19, spaceAfter=16, textColor=colors.HexColor("#5144b5")))
styles.add(ParagraphStyle(name="NBody", fontName="Helvetica", fontSize=11.5, leading=18, spaceAfter=14, alignment=TA_LEFT, splitLongWords=True))
styles.add(ParagraphStyle(name="NMeta", fontName="Helvetica", fontSize=9, leading=13, textColor=colors.HexColor("#606b7d"), spaceAfter=18))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#dce1eb"))
    canvas.line(48, 43, A4[0]-48, 43)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#606b7d"))
    canvas.drawString(48, 29, "Nuvexa | Proyecto académico | Datos simulados")
    canvas.drawRightString(A4[0]-48, 29, str(doc.page))
    canvas.restoreState()

for key, name, expected_pages in [("research", "Informe_Investigacion", 6), ("technical", "Informe_Tecnico", 8)]:
    report = content[key]
    story = []
    md = ["# " + report["title"], report["subtitle"]]
    for number, page in enumerate(report["pages"]):
        if number:
            story.append(PageBreak())
        if number == 0:
            story += [Paragraph(escape(report["title"]), styles["NTitle"]), Paragraph(escape(report["subtitle"]), styles["NMeta"])]
        story.append(Paragraph(escape(page["title"]), styles["NHeading"]))
        md.append("\n## " + page["title"])
        for text in page["paragraphs"]:
            story.append(Paragraph(escape(text), styles["NBody"]))
            md.append(text)
    target = output / (name + ".pdf")
    SimpleDocTemplate(str(target), pagesize=A4, rightMargin=48, leftMargin=48, topMargin=48, bottomMargin=60, title=report["title"], author="Equipo Nuvexa").build(story, onFirstPage=footer, onLaterPages=footer)
    (root / "docs/entrega" / (name + ".md")).write_text("\n\n".join(md) + "\n", encoding="utf-8")
    reader = PdfReader(target)
    assert len(reader.pages) == expected_pages, (name, len(reader.pages))
    assert all(len(p.extract_text().strip()) > 250 for p in reader.pages)
    rendered = pdfium.PdfDocument(str(target))
    tiles = []
    for i in range(len(rendered)):
        picture = rendered[i].render(scale=0.65).to_pil().convert("RGB")
        picture.thumbnail((310, 440))
        tile = Image.new("RGB", (330, 475), "#e9edf3")
        tile.paste(picture, ((330-picture.width)//2, 12))
        ImageDraw.Draw(tile).text((12, 455), f"{name} - página {i+1}", fill="black")
        tiles.append(tile)
    columns = 3 if len(tiles) == 6 else 4
    contact = Image.new("RGB", (330*columns, 475*2), "white")
    for i, tile in enumerate(tiles):
        contact.paste(tile, ((i % columns)*330, (i//columns)*475))
    contact.save(output / (name + "_revision.png"))
    print(name, len(reader.pages), "páginas verificadas")

policy = (root / "docs/politicas/01_Politica_Vacaciones_Feriados.txt").read_text(encoding="utf-8")
story = [Paragraph("Política de vacaciones y feriados", styles["NTitle"]), Paragraph("Versión académica 1.1 · vigencia 2026-11-19 · responsable: equipo RRHH de Nuvexa (ficticio). Pendiente de publicación por el equipo en Drive.", styles["NMeta"])]
for part in policy.split("\n\n"):
    if part.strip(): story.append(Paragraph(escape(part.strip()).replace("\n", "<br/>"), styles["NBody"]))
SimpleDocTemplate(str(output / "Politica_Vacaciones_Demo.pdf"), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=48, bottomMargin=60).build(story, onFirstPage=footer, onLaterPages=footer)
assert len(PdfReader(output / "Politica_Vacaciones_Demo.pdf").pages) >= 1
print("Política PDF exportada sin modificar el TXT original")
