"""Diplomatic-only TEI XML parser.

Extracts plain text from <text><body><div> (and its ab/lb/pb/inline content).
Does not look for type="transcription" subtype="diplomatic". Kept separate from
tei_parser so full TEI upload and diplomatic-from-file flows stay independent.
"""

import xml.etree.ElementTree as ET
from typing import Optional

TEI_NS = "http://www.tei-c.org/ns/1.0"


def _ns(tag: str) -> str:
    """Add TEI namespace to tag name."""
    if tag.startswith("{"):
        return tag
    return f"{{{TEI_NS}}}{tag}"


def _text_content(elem: ET.Element) -> str:
    """Get all text content including descendants, concatenated."""
    if elem.text:
        parts = [elem.text]
    else:
        parts = []
    for child in elem:
        parts.append(_text_content(child))
        if child.tail:
            parts.append(child.tail)
    return "".join(parts).strip()


def _get_body(root: ET.Element) -> Optional[ET.Element]:
    """Find TEI body element."""
    return root.find(f".//{_ns('body')}")


def _extract_text_from_div(div: ET.Element) -> str:
    """Extract plain text from body/div (ab/lb/pb and inline elements like decoration). Preserves line breaks."""
    parts: list[str] = []
    for ab in div.iter(_ns("ab")):
        if ab.text:
            parts.append(ab.text)
        for child in ab:
            if child.tag == _ns("lb") and child.tail:
                parts.append(child.tail)
            elif child.tag == _ns("pb") and child.tail:
                parts.append(child.tail)
            else:
                parts.append(_text_content(child))
                if child.tail:
                    parts.append(child.tail)
        parts.append("\n")
    content = "".join(parts).strip()
    if content:
        return content
    return _text_content(div).strip()


def parse_diplomatic_from_tei(content: str) -> Optional[str]:
    """Extract diplomatic text from TEI XML.

    Uses <text><body><div> content only (first div under body, or body if no div).
    Does not look for type="transcription" subtype="diplomatic".
    Does not use or depend on utils.tei_parser.
    """
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        raise ValueError(f"Invalid XML: {e}") from e

    body = _get_body(root)
    if body is None:
        raise ValueError("TEI document has no body element")

    content_root = body.find(_ns("div"))
    if content_root is None:
        content_root = body
    raw = _extract_text_from_div(content_root)
    return raw.strip() if raw and raw.strip() else None
