#!/usr/bin/env python3
"""
Generates the synthetic demo reports in `public/samples/`.

These are *fictional* reports for a fictional patient, written to exercise the
real ingestion path end to end: a header row so `columns.ts` recovers the table,
printed section headings so panels (and their artwork) come from the paper, a
run of unheaded rows so the catch-all is visible, non-numeric and censored
values, comma decimals, lab flags in words, and three collection dates so every
analyte has a trend to draw.

No dependencies — it writes the PDF bytes directly. Text is placed run by run,
which is also how the superscript in `10^3/uL` is produced: a smaller, raised
run right after its base, exactly as a real report sets it.

Usage: python3 tools/make-samples.py [outdir]
"""

from __future__ import annotations

import sys
from pathlib import Path

# ---------------------------------------------------------------- pdf writer --

PAGE_W, PAGE_H = 595.0, 842.0  # A4 points


class Pdf:
    """A minimal, uncompressed PDF with two Helvetica faces."""

    def __init__(self) -> None:
        self.pages: list[list[str]] = []
        self.current: list[str] = []
        self.pages.append(self.current)

    def new_page(self) -> None:
        self.current = []
        self.pages.append(self.current)

    def text(self, x: float, y: float, s: str, size: float = 8.5, bold: bool = False) -> None:
        font = "/F2" if bold else "/F1"
        self.current.append(
            f"BT {font} {size:.2f} Tf 1 0 0 1 {x:.2f} {y:.2f} Tm ({escape(s)}) Tj ET"
        )

    def line(self, x1: float, y: float, x2: float, width: float = 0.5) -> None:
        self.current.append(f"{width} w {x1:.2f} {y:.2f} m {x2:.2f} {y:.2f} l S")

    def to_bytes(self) -> bytes:
        objects: list[bytes] = []

        def add(body: bytes) -> int:
            objects.append(body)
            return len(objects)  # 1-based object number

        font_regular = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        font_bold = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

        pages_id = len(objects) + 1 + 2 * len(self.pages)  # after page + content objs
        page_ids: list[int] = []
        for ops in self.pages:
            stream = "\n".join(ops).encode("latin-1")
            content_id = add(
                b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream"
            )
            page_ids.append(
                add(
                    (
                        f"<< /Type /Page /Parent {pages_id} 0 R "
                        f"/MediaBox [0 0 {PAGE_W} {PAGE_H}] "
                        f"/Resources << /Font << /F1 {font_regular} 0 R /F2 {font_bold} 0 R >> >> "
                        f"/Contents {content_id} 0 R >>"
                    ).encode("latin-1")
                )
            )

        kids = " ".join(f"{i} 0 R" for i in page_ids)
        add(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("latin-1"))
        catalog = add(f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode("latin-1"))

        out = bytearray(b"%PDF-1.4\n")
        offsets = [0]
        for number, body in enumerate(objects, start=1):
            offsets.append(len(out))
            out += b"%d 0 obj\n" % number + body + b"\nendobj\n"

        xref = len(out)
        out += b"xref\n0 %d\n" % (len(objects) + 1)
        out += b"0000000000 65535 f \n"
        for offset in offsets[1:]:
            out += b"%010d 00000 n \n" % offset
        out += (
            b"trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n"
            % (len(objects) + 1, catalog, xref)
        )
        return bytes(out)


def escape(s: str) -> str:
    return s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


# ------------------------------------------------------------------- layout --

X_LABEL, X_VALUE, X_UNIT, X_RANGE, X_WORDS = 40.0, 250.0, 320.0, 385.0, 495.0
ROW_PITCH = 15.0
BODY_SIZE = 8.5
BOTTOM = 90.0

HEADERS = [
    (X_LABEL, "Test Name"),
    (X_VALUE, "Result"),
    (X_UNIT, "Unit"),
    (X_RANGE, "Reference Range"),
    (X_WORDS, "Result Words"),
]


def draw_unit(pdf: Pdf, x: float, y: float, unit: str) -> None:
    """Sets a unit, raising the exponent of `10^3/uL` into a real superscript."""
    if "^" not in unit:
        pdf.text(x, y, unit)
        return

    base, rest = unit.split("^", 1)
    exponent, tail = rest[0], rest[1:]
    pdf.text(x, y, base)
    x += len(base) * 0.556 * BODY_SIZE  # digits are 556/1000 em in Helvetica
    pdf.text(x, y + 3.0, exponent, size=5.5)
    x += 0.556 * 5.5
    if tail:
        pdf.text(x, y, tail)


# --------------------------------------------------------------------- data --

LAB = "Riverbend Diagnostics Laboratory"
PATIENT = "Alex Rivera Demo"
DOB = "03.05.1988"

# (label, unit, reference, [(value, words) per visit])
Panel = tuple[str, list[tuple[str, str, str, list[tuple[str, str]]]]]

PANELS: list[Panel] = [
    (
        "",  # printed with no heading above it: lands in the catch-all
        [
            ("C-Reactive Protein", "mg/L", "0 - 5.0", [("2.1", "Normal"), ("8.4", "High"), ("3.2", "Normal")]),
            ("Erythrocyte Sed. Rate", "mm/h", "0 - 15", [("11", "Normal"), ("24", "High"), ("14", "Normal")]),
        ],
    ),
    (
        "Hematology - Complete Blood Count",
        [
            ("Hemoglobin", "g/dL", "13.5 - 17.5", [("12.9", "Low"), ("13.8", "Normal"), ("14.6", "Normal")]),
            ("Hematocrit", "%", "40 - 52", [("38.4", "Low"), ("41.2", "Normal"), ("43.5", "Normal")]),
            ("White Blood Cells", "10^3/uL", "4.0 - 11.0", [("6.2", "Normal"), ("11.8", "High"), ("7.1", "Normal")]),
            ("Platelets", "10^3/uL", "150 - 400", [("233", "Normal"), ("198", "Normal"), ("221", "Normal")]),
            ("MCV", "fL", "80 - 100", [("86", "Normal"), ("88", "Normal"), ("89", "Normal")]),
        ],
    ),
    (
        "Lipid Profile",
        [
            ("Total Cholesterol", "mg/dL", "0 - 200 Desirable; 200-239 Borderline; > 240 High", [("232", "High"), ("214", "High"), ("186", "Normal")]),
            ("LDL Cholesterol", "mg/dL", "< 100", [("158", "High"), ("141", "High"), ("104", "High")]),
            ("HDL Cholesterol", "mg/dL", "> 40", [("38", "Low"), ("42", "Normal"), ("49", "Normal")]),
            ("Triglycerides", "mg/dL", "< 150", [("212", "High"), ("176", "High"), ("128", "Normal")]),
        ],
    ),
    (
        "Thyroid Function",
        [
            ("TSH", "mIU/L", "0.4 - 4.0", [("5,4", "High"), ("3.9", "Normal"), ("2.6", "Normal")]),
            ("Free T4", "ng/dL", "0.8 - 1.8", [("0.9", "Normal"), ("1.1", "Normal"), ("1.2", "Normal")]),
            ("Free T3", "pg/mL", "2.3 - 4.2", [("2.4", "Normal"), ("2.9", "Normal"), ("3.1", "Normal")]),
        ],
    ),
    (
        "Liver Function Tests",
        [
            ("ALT", "U/L", "0 - 41", [("64", "High"), ("52", "High"), ("36", "Normal")]),
            ("AST", "U/L", "0 - 40", [("48", "High"), ("39", "Normal"), ("29", "Normal")]),
            ("GGT", "U/L", "0 - 60", [("88", "High"), ("71", "High"), ("44", "Normal")]),
            ("Total Bilirubin", "mg/dL", "0.2 - 1.2", [("0.8", "Normal"), ("1.0", "Normal"), ("0.7", "Normal")]),
            ("Albumin", "g/dL", "3.5 - 5.2", [("4.4", "Normal"), ("4.2", "Normal"), ("4.5", "Normal")]),
        ],
    ),
    (
        "Renal Panel and Electrolytes",
        [
            ("Creatinine", "mg/dL", "0.7 - 1.3", [("1.42", "High"), ("1.21", "Normal"), ("1.05", "Normal")]),
            ("Urea", "mg/dL", "17 - 43", [("46", "High"), ("38", "Normal"), ("31", "Normal")]),
            ("Sodium", "mmol/L", "136 - 145", [("139", "Normal"), ("141", "Normal"), ("140", "Normal")]),
            ("Potassium", "mmol/L", "3.5 - 5.1", [("3.2", "Low"), ("4.0", "Normal"), ("4.3", "Normal")]),
            ("eGFR", "mL/min", "> 90", [("62", "Low"), ("78", "Low"), ("94", "Normal")]),
        ],
    ),
    (
        "Glucose and Diabetes",
        [
            ("Fasting Glucose", "mg/dL", "70 - 99", [("118", "High"), ("104", "High"), ("92", "Normal")]),
            ("HbA1c", "%", "4.0 - 5.6", [("6.4", "High"), ("5.9", "High"), ("5.4", "Normal")]),
            ("Insulin, Fasting", "uIU/mL", "2.6 - 24.9", [("18.2", "Normal"), ("14.7", "Normal"), ("9.8", "Normal")]),
        ],
    ),
    (
        "Bone Profile and Vitamin D",
        [
            ("Vitamin D 25-OH", "ng/mL", "30 - 100", [("14", "Critical low"), ("26", "Low"), ("38", "Normal")]),
            ("Calcium, Total", "mg/dL", "8.6 - 10.2", [("9.1", "Normal"), ("9.4", "Normal"), ("9.3", "Normal")]),
            ("Phosphorus", "mg/dL", "2.5 - 4.5", [("3.4", "Normal"), ("3.1", "Normal"), ("3.6", "Normal")]),
            ("Alkaline Phosphatase", "U/L", "40 - 129", [("134", "High"), ("118", "Normal"), ("96", "Normal")]),
        ],
    ),
    (
        "Immunology and Autoantibodies",
        [
            ("ANA Screen", "titre", "Negative at 1:80", [("1:160", "Positive"), ("1:80", ""), ("1:80", "")]),
            ("Rheumatoid Factor", "IU/mL", "< 14", [("Negative", "Normal"), ("Negative", "Normal"), ("Negative", "Normal")]),
            ("Total IgE", "IU/mL", "0 - 100", [("186", "High"), ("142", "High"), ("121", "High")]),
        ],
    ),
    (
        "Urinalysis",
        [
            ("Urine pH", "", "5.0 - 8.0", [("6.0", "Normal"), ("5.5", "Normal"), ("6.5", "Normal")]),
            ("Urine Protein", "", "Negative", [("Trace", ""), ("Negative", "Normal"), ("Negative", "Normal")]),
            ("Urine Glucose", "", "Negative", [("Negative", "Normal"), ("Negative", "Normal"), ("Negative", "Normal")]),
            ("Urine Microalbumin", "mg/L", "< 20", [("<0.01", ""), ("<0.01", ""), ("<0.01", "")]),
        ],
    ),
    (
        "Gastric and H. pylori Testing",
        [
            ("H. pylori Antigen", "", "Negative", [("Positive", "Abnormal"), ("Negative", "Normal"), ("Negative", "Normal")]),
            ("Pepsinogen I", "ng/mL", "30 - 120", [("41", "Normal"), ("52", "Normal"), ("58", "Normal")]),
        ],
    ),
    (
        "Arterial Blood Gas - Respiratory",
        [
            ("pO2", "mmHg", "80 - 100", [("86", "Normal"), ("91", "Normal"), ("95", "Normal")]),
            ("pCO2", "mmHg", "35 - 45", [("47", "High"), ("41", "Normal"), ("39", "Normal")]),
            ("O2 Saturation", "%", "94 - 100", [("93", "Low"), ("96", "Normal"), ("98", "Normal")]),
        ],
    ),
    (
        "General Biochemistry Profile",
        [
            ("Total Protein", "g/dL", "6.4 - 8.3", [("7.2", "Normal"), ("7.0", "Normal"), ("7.4", "Normal")]),
            ("Uric Acid", "mg/dL", "3.4 - 7.0", [("7.8", "High"), ("6.9", "Normal"), ("5.8", "Normal")]),
            ("Magnesium", "mg/dL", "1.7 - 2.2", [("1.9", "Normal"), ("2.0", "Normal"), ("2.1", "Normal")]),
        ],
    ),
    (
        "Miscellaneous Add-on Tests",
        [
            # No unit, no range: the lowest-confidence shape the reviewer must see.
            ("Sample Quality Index", "", "", [("7", ""), ("8", ""), ("8", "")]),
            ("Ferritin", "ng/mL", "30 - 400", [("22", "Low"), ("64", "Normal"), ("112", "Normal")]),
        ],
    ),
]

# (visit index, filename, collected, reported, accession)
VISITS = [
    (0, "demo-report-2025-02-14.pdf", "14.02.2025 08:20", "14.02.2025 17:40", "RB-25-004182"),
    (1, "demo-report-2025-09-08.pdf", "08.09.2025 07:55", "08.09.2025 16:10", "RB-25-031907"),
    (2, "demo-report-2026-06-02.pdf", "02.06.2026 08:05", "02.06.2026 15:25", "RB-26-018744"),
]


# ------------------------------------------------------------------ drawing --


def draw_masthead(pdf: Pdf, collected: str, reported: str, accession: str) -> float:
    pdf.text(X_LABEL, 800, LAB, size=14, bold=True)
    pdf.text(X_LABEL, 786, "14 Mill Race Road, Riverbend - Fictional sample report", size=8)
    pdf.text(X_LABEL, 766, f"Patient: {PATIENT}", size=9)
    pdf.text(X_LABEL, 754, f"Date of birth: {DOB}", size=9)
    pdf.text(X_LABEL, 742, f"Accession: {accession}", size=9)
    pdf.text(X_LABEL, 730, f"Specimen collected: {collected}", size=9)
    pdf.text(X_LABEL, 718, f"Reported: {reported}", size=9)
    pdf.line(X_LABEL, 708, PAGE_W - 40)
    return 690.0


def draw_header_row(pdf: Pdf, y: float) -> float:
    for x, title in HEADERS:
        pdf.text(x, y, title, size=8.5, bold=True)
    pdf.line(X_LABEL, y - 4, PAGE_W - 40)
    return y - ROW_PITCH - 2


def build(visit: int, collected: str, reported: str, accession: str) -> bytes:
    pdf = Pdf()
    y = draw_header_row(pdf, draw_masthead(pdf, collected, reported, accession))

    for heading, rows in PANELS:
        needed = ROW_PITCH * (len(rows) + (2 if heading else 1))
        if y - needed < BOTTOM:
            pdf.new_page()
            y = draw_header_row(pdf, 800.0)

        if heading:
            y -= 4
            pdf.text(X_LABEL, y, heading, size=9, bold=True)
            y -= ROW_PITCH

        for label, unit, ref, values in rows:
            value, words = values[visit]
            pdf.text(X_LABEL, y, label)
            pdf.text(X_VALUE, y, value)
            if unit:
                draw_unit(pdf, X_UNIT, y, unit)
            if ref:
                pdf.text(X_RANGE, y, ref if len(ref) <= 26 else ref.split(";")[0].strip())
                # A reference printed as bands wraps onto its own line, exactly
                # like the reports columns.ts folds tails from.
                if len(ref) > 26:
                    for band in [b.strip() for b in ref.split(";")[1:]]:
                        y -= ROW_PITCH
                        pdf.text(X_RANGE, y, band)
            if words:
                pdf.text(X_WORDS, y, words)
            y -= ROW_PITCH

    pdf.text(X_LABEL, 60, "Fictional data for software testing. Not a medical document.", size=7.5)
    return pdf.to_bytes()


def main() -> None:
    outdir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "public" / "samples"
    outdir.mkdir(parents=True, exist_ok=True)

    for visit, name, collected, reported, accession in VISITS:
        path = outdir / name
        path.write_bytes(build(visit, collected, reported, accession))
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
