#!/usr/bin/env python3
"""
PDF Name Extractor - EXACT COPY from your working Meesho_helper repo
This ensures 100% compatibility with your proven logic
"""
import sys
import json
import fitz  # PyMuPDF
from typing import List
import re

def clean_customer_name(text: str) -> str:
    """
    Cleans the extracted line to return only the name.
    Removes addresses, commas, hyphens, numbers etc.
    """
    if not text or text.isdigit():
        return ""

    # Remove after comma or hyphen
    text = re.split(r'[,-]', text)[0]

    # Remove digits
    text = re.sub(r'\d+', '', text)

    # Remove extra spaces
    words = text.strip().split()

    # Return first 2 words only (like "Rafey Khan", "Mariam Fatima")
    if len(words) >= 2:
        return " ".join(words[:2])
    elif len(words) == 1:
        return words[0]
    return ""

def extract_customer_names(pdf_path: str) -> List[str]:
    """
    Extracts only customer names from a Meesho PDF label.
    Looks for lines after "BILL TO / SHIP TO" and cleans names by removing address parts.
    EXACT COPY from your working Meesho_helper/utils/pdf_parser.py
    """
    unique_names = set()

    try:
        document = fitz.open(pdf_path)
    except Exception as e:
        print(f"Error opening PDF: {e}", file=sys.stderr)
        return []

    for page in document:
        text = page.get_text()
        lines = text.split('\n')

        for i, line in enumerate(lines):
            if "BILL TO / SHIP TO" in line.upper():
                if i + 1 < len(lines):
                    raw_name = lines[i + 1].strip()
                    cleaned = clean_customer_name(raw_name)
                    if cleaned:
                        unique_names.add(cleaned)

    document.close()
    return sorted(unique_names)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_names.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    names = extract_customer_names(pdf_path)
    
    # Return JSON for Node.js to parse
    print(json.dumps(names))
