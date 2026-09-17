import os

import pytesseract
from PIL import Image
from pypdf import PdfReader


TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


def extract_text_from_image(file_path: str) -> str:
    try:
        image = Image.open(file_path)

        text = pytesseract.image_to_string(
            image
        )

        return text.strip()

    except Exception as e:
        raise Exception(
            f"Image OCR failed: {str(e)}"
        )


def extract_text_from_pdf(file_path: str) -> str:
    try:
        reader = PdfReader(file_path)

        extracted_text = []

        for page in reader.pages:
            text = page.extract_text()

            if text:
                extracted_text.append(text)

        return "\n".join(
            extracted_text
        ).strip()

    except Exception as e:
        raise Exception(
            f"PDF text extraction failed: {str(e)}"
        )


def extract_text_from_file(
    file_path: str,
    file_type: str
) -> str:

    file_type = file_type.lower()

    if file_type in [
        "jpg",
        "jpeg",
        "png"
    ]:
        return extract_text_from_image(
            file_path
        )

    if file_type == "pdf":
        return extract_text_from_pdf(
            file_path
        )

    raise Exception(
        "Unsupported file type"
    )