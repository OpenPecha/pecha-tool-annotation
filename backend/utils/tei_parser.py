"""TEI XML parser for webuddhist annotation tool.

Parses TEI P5 documents (Transkribus/OpenPecha style) and extracts:
- Title from teiHeader
- Plain text content from body (prefers segmented > normalized > diplomatic)
- POS annotations from annotated layer (w elements with lemma, pos)
- Other annotation layers (e.g. Animacy) that share the same words, either as extra
  attributes on w (animacy="human") or as stand-off spanGrp/span pointing at w ids
- Editorial annotations from diplomatic layer (add, unclear, hi, decoration)
"""

import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

TEI_NS = "http://www.tei-c.org/ns/1.0"
XML_NS = "http://www.w3.org/XML/1998/namespace"

# Editorial TEI elements to extract as annotations
EDITORIAL_ELEMENTS = {"add", "unclear", "hi", "decoration"}

# Attributes of <w> that describe the word itself, not an annotation layer.
# Any other attribute is read as "<layer>=<label>", e.g. animacy="human".
W_RESERVED_ATTRS = {
    "lemma", "pos", "id", "n", "type", "subtype", "lang", "rend", "rendition",
    "ana", "corresp", "facs", "part", "join", "cert", "resp", "next", "prev",
    "sameas", "copyof", "select", "norm", "orig", "reg", "space", "base",
}


@dataclass
class TEIAnnotation:
    """Parsed annotation from TEI - POS (w), another layer (Animacy, ...) or editorial."""
    start_position: int
    end_position: int
    selected_text: str
    label: Optional[str] = None  # POS tag, layer value or editorial element name
    meta: Optional[dict] = None  # lemma, place, etc.
    is_editorial: bool = False  # True if from add/unclear/hi/decoration
    annotation_type: Optional[str] = None  # Layer name for non-POS annotations
    name: Optional[str] = None  # Optional display name (span/@n)


@dataclass
class TEIParseResult:
    """Result of parsing a TEI document."""
    title: str
    content: str
    annotations: List[TEIAnnotation]  # POS from annotated layer
    editorial_annotations: List[TEIAnnotation] = field(default_factory=list)  # add, unclear, hi, decoration
    source: str = "TEI XML"
    diplomatic_text: Optional[str] = None  # Plain text from div type=transcription subtype=diplomatic
    pos_values: Optional[Set[str]] = None  # Distinct POS tags from XML
    editorial_labels: Optional[Set[str]] = None  # Distinct editorial element names from XML
    other_annotations: List[TEIAnnotation] = field(default_factory=list)  # Non-POS layers
    other_values: Dict[str, Set[str]] = field(default_factory=dict)  # Layer name -> distinct labels


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


def _extract_title(root: ET.Element) -> str:
    """Extract title from teiHeader."""
    title_elem = root.find(f".//{_ns('titleStmt')}/{_ns('title')}")
    if title_elem is not None and title_elem.text:
        return title_elem.text.strip()
    return "Untitled TEI"


def _local_name(tag: str) -> str:
    """Get local tag name without namespace."""
    return tag.split("}")[-1] if "}" in tag else tag


def _text_and_editorial_from_diplomatic(
    body: ET.Element,
) -> tuple[str, List[TEIAnnotation]]:
    """Extract plain text and editorial annotations from diplomatic layer.
    Walks ab/lb and inline elements; records add, unclear, hi, decoration spans.
    """
    parts: List[str] = []
    editorial: List[TEIAnnotation] = []
    current_pos = 0

    def _emit(text: str) -> None:
        nonlocal current_pos
        if text:
            parts.append(text)
            current_pos += len(text)

    def _walk_inline(elem: ET.Element) -> None:
        """Walk mixed content, recording editorial spans."""
        if elem.text:
            _emit(elem.text)
        for child in elem:
            local = _local_name(child.tag)
            if local in EDITORIAL_ELEMENTS:
                text = _text_content(child)
                if text:
                    start = current_pos
                    _emit(text)
                    meta = {}
                    if local == "add" and child.get("place"):
                        meta["place"] = child.get("place")
                    if local == "hi" and child.get("style"):
                        meta["style"] = child.get("style")
                    editorial.append(
                        TEIAnnotation(
                            start_position=start,
                            end_position=current_pos,
                            selected_text=text,
                            label=local,
                            meta=meta if meta else None,
                            is_editorial=True,
                        )
                    )
            else:
                _walk_inline(child)
            if child.tail:
                _emit(child.tail)

    # Prefer div with subtype=diplomatic; else use body (tei.xml has body > div > ab)
    div_diplo = None
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "diplomatic":
            div_diplo = div
            break
    search_root = div_diplo if div_diplo is not None else body

    for ab in search_root.iter(_ns("ab")):
        if ab.text:
            _emit(ab.text)
        for child in ab:
            if child.tag == _ns("lb"):
                # lb tail is the line text (may contain inline editorial elements as siblings)
                if child.tail:
                    _emit(child.tail)
            elif child.tag in (_ns("pb"),):
                # Skip pb, process its tail
                if child.tail:
                    _emit(child.tail)
            else:
                local = _local_name(child.tag)
                if local in EDITORIAL_ELEMENTS:
                    # Direct editorial child of ab: record span
                    text = _text_content(child)
                    if text:
                        start = current_pos
                        _emit(text)
                        meta = {}
                        if local == "add" and child.get("place"):
                            meta["place"] = child.get("place")
                        if local == "hi" and child.get("style"):
                            meta["style"] = child.get("style")
                        editorial.append(
                            TEIAnnotation(
                                start_position=start,
                                end_position=current_pos,
                                selected_text=text,
                                label=local,
                                meta=meta if meta else None,
                                is_editorial=True,
                            )
                        )
                else:
                    _walk_inline(child)
                if child.tail:
                    _emit(child.tail)
        parts.append("\n")
        current_pos += 1

    content = "".join(parts)
    # Fallback for standard TEI prose (body with div/p/head/lg/l/list/etc, no ab)
    if not content.strip():
        content = _text_content(search_root)
    # Adjust editorial positions: they were computed on raw content; strip removes leading whitespace
    if editorial:
        leading = len(content) - len(content.lstrip())
        for ann in editorial:
            ann.start_position -= leading
            ann.end_position -= leading
    content = content.strip()
    return content, editorial


def _text_from_diplomatic(body: ET.Element) -> str:
    """Extract plain text from diplomatic layer (ab, lb elements)."""
    content, _ = _text_and_editorial_from_diplomatic(body)
    return content


def _text_from_normalized(body: ET.Element) -> Optional[str]:
    """Extract plain text from normalized layer (div subtype=normalized, p elements)."""
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "normalized":
            return _text_content(div).strip() or None
    return None


def _text_from_segmented(body: ET.Element) -> Optional[str]:
    """Extract plain text from segmented layer (w elements, joined by space)."""
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "segmented":
            words = [w.text or "" for w in div.iter(_ns("w"))]
            return " ".join(words).strip() or None
    return None


def _get_segment_word_counts_from_segmented(body: ET.Element) -> Optional[List[int]]:
    """Get word counts per <u> from segmented layer for segment boundaries.
    Returns e.g. [3, 9, 3] meaning first u has 3 words, second has 9, third has 3.
    Returns None if no segmented div or no u elements.
    """
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "segmented":
            u_elements = div.findall(f"./{_ns('u')}")
            if not u_elements:
                return None
            return [len(list(u.iter(_ns("w")))) for u in u_elements]
    return None


def _word_text(w: ET.Element) -> str:
    """Text of a <w>. Pretty-printed indentation is dropped, real spacing is kept."""
    raw = w.text or ""
    if "\n" in raw or "\r" in raw:
        return raw.strip()
    return raw


def _word_id(w: ET.Element) -> Optional[str]:
    """xml:id (or id) of a <w>, used as target of stand-off spans."""
    return w.get(f"{{{XML_NS}}}id") or w.get("id")


def _layer_attributes(w: ET.Element) -> List[Tuple[str, str]]:
    """Non-reserved attributes of a <w>, read as (layer name, label) pairs."""
    layers: List[Tuple[str, str]] = []
    for key, value in w.attrib.items():
        local = _local_name(key)
        if local.lower() in W_RESERVED_ATTRS:
            continue
        label = (value or "").strip()
        if label:
            layers.append((local, label))
    return layers


@dataclass
class _AnnotatedLayer:
    """Text and annotations extracted from the annotated transcription layer."""
    content: Optional[str] = None
    annotations: List[TEIAnnotation] = field(default_factory=list)  # POS
    other_annotations: List[TEIAnnotation] = field(default_factory=list)  # Other layers on <w>
    token_ranges: Dict[str, Tuple[int, int]] = field(default_factory=dict)  # w id -> offsets


def _text_and_annotations_from_annotated(
    body: ET.Element,
    segment_word_counts: Optional[List[int]] = None,
) -> _AnnotatedLayer:
    """Extract text and annotations from annotated layer.

    Words with a pos/lemma attribute become POS annotations; any other attribute
    (e.g. animacy="human") becomes an annotation of that layer over the same word.

    Inserts a newline at segment boundaries. If segment_word_counts is provided (from
    the segmented layer), those boundaries are used; otherwise uses <u> in the annotated layer.
    Annotation start/end positions account for these newlines so span addresses stay correct.
    """
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "annotated":
            # Build list of (w, add_newline_after). Prefer segmented layer boundaries when available.
            word_items: List[Tuple[ET.Element, bool]] = []
            u_elements = div.findall(f"./{_ns('u')}")
            if segment_word_counts is not None and segment_word_counts:
                # Use segmented layer: newline after word at indices (cumsum - 1) for each segment
                all_ws = list(div.iter(_ns("w")))
                segment_end_indices: Set[int] = set()
                idx = 0
                for count in segment_word_counts:
                    idx += count
                    segment_end_indices.add(idx - 1)
                for i, w in enumerate(all_ws):
                    word_items.append((w, i in segment_end_indices))
            elif u_elements:
                for u in u_elements:
                    ws = list(u.iter(_ns("w")))
                    for w in ws:
                        word_items.append((w, w is ws[-1]))
            else:
                for w in div.iter(_ns("w")):
                    word_items.append((w, False))

            content_parts = []
            annotations: List[TEIAnnotation] = []
            other_annotations: List[TEIAnnotation] = []
            token_ranges: Dict[str, Tuple[int, int]] = {}
            current_pos = 0
            for w, add_newline_after in word_items:
                text = _word_text(w)
                if text:
                    start = current_pos
                    end = current_pos + len(text)
                    content_parts.append(text)
                    current_pos = end  # no space between words (preserves source spacing, e.g. Tibetan)
                    word_id = _word_id(w)
                    if word_id:
                        token_ranges[word_id] = (start, end)
                    lemma = w.get("lemma")
                    pos_tag = w.get("pos")
                    # Words without pos/lemma are plain text (e.g. spacing between annotated
                    # words) and must not become empty POS annotations.
                    if pos_tag or lemma:
                        annotations.append(
                            TEIAnnotation(
                                start_position=start,
                                end_position=end,
                                selected_text=text,
                                label=pos_tag,
                                meta={"lemma": lemma} if lemma else None,
                            )
                        )
                    for layer_name, label in _layer_attributes(w):
                        other_annotations.append(
                            TEIAnnotation(
                                start_position=start,
                                end_position=end,
                                selected_text=text,
                                label=label,
                                annotation_type=layer_name,
                            )
                        )
                if add_newline_after:
                    content_parts.append("\n")
                    current_pos += 1
            content = "".join(content_parts).rstrip() if u_elements else "".join(content_parts).strip()
            return _AnnotatedLayer(
                content=content,
                annotations=annotations,
                other_annotations=other_annotations,
                token_ranges=token_ranges,
            )
    return _AnnotatedLayer()


def _resolve_span_range(
    span: ET.Element, token_ranges: Dict[str, Tuple[int, int]]
) -> Optional[Tuple[int, int]]:
    """Resolve a <span>'s from/to/target pointers (#w12) to character offsets."""
    ranges: List[Tuple[int, int]] = []
    for attr in ("from", "to", "target"):
        value = span.get(attr)
        if not value:
            continue
        for ref in value.split():
            token_range = token_ranges.get(ref.lstrip("#"))
            if token_range:
                ranges.append(token_range)
    if not ranges:
        return None
    return min(r[0] for r in ranges), max(r[1] for r in ranges)


def _span_to_annotation(
    span: ET.Element,
    group_type: str,
    token_ranges: Dict[str, Tuple[int, int]],
    content: str,
) -> Optional[TEIAnnotation]:
    """Build an annotation from a stand-off <span>, or None if it cannot be placed."""
    type_name = (span.get("type") or group_type or "").strip()
    if not type_name:
        return None
    span_range = _resolve_span_range(span, token_ranges)
    if span_range is None:
        return None
    start, end = span_range
    return TEIAnnotation(
        start_position=start,
        end_position=end,
        selected_text=content[start:end],
        label=(span.get("ana") or "").strip().lstrip("#") or None,
        annotation_type=type_name,
        name=(span.get("n") or "").strip() or None,
    )


def _standoff_annotations(
    body: ET.Element, token_ranges: Dict[str, Tuple[int, int]], content: str
) -> List[TEIAnnotation]:
    """Extract stand-off annotations (spanGrp/span) that point at word ids.

    This is how layers that cover several words (e.g. an Animacy label over a phrase)
    are encoded without repeating the text of those words.
    """
    if not token_ranges:
        return []

    annotations: List[TEIAnnotation] = []
    handled: Set[int] = set()
    for group in body.iter(_ns("spanGrp")):
        group_type = (group.get("type") or "").strip()
        for span in group.iter(_ns("span")):
            handled.add(id(span))
            annotation = _span_to_annotation(span, group_type, token_ranges, content)
            if annotation:
                annotations.append(annotation)
    for span in body.iter(_ns("span")):
        if id(span) in handled:
            continue
        annotation = _span_to_annotation(span, "", token_ranges, content)
        if annotation:
            annotations.append(annotation)
    return annotations


def _get_body(root: ET.Element) -> Optional[ET.Element]:
    """Get body element from TEI text."""
    text_elem = root.find(f".//{_ns('text')}/{_ns('body')}")
    if text_elem is not None:
        return text_elem
    # Some TEI may have body directly under text
    return root.find(f".//{_ns('body')}")


def parse_tei(content: str, filename: str = "") -> TEIParseResult:
    """Parse TEI XML content and extract title, text, and annotations.

    - POS annotations: from annotated layer (w elements with pos)
    - Editorial annotations: from diplomatic layer (add, unclear, hi, decoration)

    Prefers content in order: annotated > segmented > normalized > diplomatic.
    Editorial annotations use positions in the extracted content.
    """
    try:
        root = ET.fromstring(content)
    except ET.ParseError as e:
        raise ValueError(f"Invalid XML: {e}") from e

    title = _extract_title(root)
    body = _get_body(root)
    if body is None:
        raise ValueError("TEI document has no body element")

    content = ""
    pos_annotations: List[TEIAnnotation] = []
    editorial_annotations: List[TEIAnnotation] = []
    other_annotations: List[TEIAnnotation] = []

    # Segment boundaries: use segmented layer when present so UI shows that segmentation
    segment_word_counts = _get_segment_word_counts_from_segmented(body)

    # Try annotated layer first (gives content + POS annotations)
    annotated = _text_and_annotations_from_annotated(body, segment_word_counts)
    if annotated.content:
        content = annotated.content
        pos_annotations = annotated.annotations
        other_annotations = annotated.other_annotations + _standoff_annotations(
            body, annotated.token_ranges, annotated.content
        )

    # Fallbacks for content
    if not content:
        content = _text_from_segmented(body)
    if not content:
        content = _text_from_normalized(body)
    if not content:
        content, editorial_annotations = _text_and_editorial_from_diplomatic(body)

    if not content or not content.strip():
        raise ValueError("TEI document contains no extractable text content")

    # Editorial annotations only valid when content from diplomatic (positions match)
    # output_combined uses annotated layer - skip editorial to avoid position mismatch

    content = content.strip()

    # Always extract diplomatic layer when present (for storage in text.diplomatic_text)
    diplomatic_text: Optional[str] = None
    for div in body.iter(_ns("div")):
        if div.get("type") == "transcription" and div.get("subtype") == "diplomatic":
            raw = _text_from_diplomatic(body)
            diplomatic_text = raw.strip() if raw and raw.strip() else None
            break

    # Distinct values for annotation list merge (add-only on upload)
    pos_values: Optional[Set[str]] = None
    if pos_annotations:
        pos_values = {ann.label.strip() for ann in pos_annotations if ann.label and ann.label.strip()}
    editorial_labels_val: Optional[Set[str]] = None
    if editorial_annotations:
        editorial_labels_val = {ann.label.strip() for ann in editorial_annotations if ann.label and ann.label.strip()}
    other_values: Dict[str, Set[str]] = {}
    for ann in other_annotations:
        if not ann.annotation_type:
            continue
        labels = other_values.setdefault(ann.annotation_type, set())
        if ann.label and ann.label.strip():
            labels.add(ann.label.strip())

    return TEIParseResult(
        title=title,
        content=content,
        annotations=pos_annotations,
        editorial_annotations=editorial_annotations,
        source=filename or "TEI XML",
        diplomatic_text=diplomatic_text,
        pos_values=pos_values,
        editorial_labels=editorial_labels_val,
        other_annotations=other_annotations,
        other_values=other_values,
    )
