"""Export route actions. All functions take db, current_user, and request data; return result or raise HTTPException."""

import json
from datetime import datetime
from io import BytesIO
from typing import Any

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from crud.text import text_crud
from crud.annotation import annotation_crud


def get_export_stats(
    db: Session,
    current_user: Any,
    from_date: str,
    to_date: str,
    filter_type: str = "annotated",
) -> dict:
    """Get statistics for texts and annotations within a date range (admin only)."""
    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d")
        end_date = datetime.strptime(to_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid date format. Use YYYY-MM-DD"
        )

    if start_date > end_date:
        raise HTTPException(
            status_code=400, detail="Start date must be before end date"
        )
    if filter_type not in ("reviewed", "annotated"):
        raise HTTPException(
            status_code=400,
            detail="Filter type must be 'reviewed' or 'annotated'",
        )

    texts = text_crud.get_texts_by_date_range_and_filter(
        db, start_date, end_date, filter_type
    )
    total_annotations = 0
    for text in texts:
        annotations = annotation_crud.get_by_text(db, text.id)
        total_annotations += len(annotations)

    return {
        "total_texts": len(texts),
        "total_annotations": total_annotations,
        "date_range": {"from": from_date, "to": to_date},
    }


def export_data(
    db: Session,
    current_user: Any,
    from_date: str,
    to_date: str,
    filter_type: str = "annotated",
) -> StreamingResponse:
    """Export texts and annotations as a ZIP file (admin only)."""
    try:
        start_date = datetime.strptime(from_date, "%Y-%m-%d")
        end_date = datetime.strptime(to_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid date format. Use YYYY-MM-DD"
        )

    if start_date > end_date:
        raise HTTPException(
            status_code=400, detail="Start date must be before end date"
        )
    if filter_type not in ("reviewed", "annotated"):
        raise HTTPException(
            status_code=400,
            detail="Filter type must be 'reviewed' or 'annotated'",
        )

    texts = text_crud.get_texts_by_date_range_and_filter(
        db, start_date, end_date, filter_type
    )
    if not texts:
        raise HTTPException(
            status_code=404,
            detail="No texts found in the specified date range",
        )

    import zipfile

    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for text in texts:
            annotations = annotation_crud.get_by_text(db, text.id)
            formatted_annotations = []
            for annotation in annotations:
                annotation_data = {
                    "annotation_type": annotation.annotation_type,
                    "start_position": annotation.start_position,
                    "end_position": annotation.end_position,
                    "label": annotation.label or annotation.annotation_type,
                }
                if annotation.name:
                    annotation_data["name"] = annotation.name
                if annotation.level:
                    annotation_data["level"] = annotation.level
                if annotation.selected_text:
                    annotation_data["selected_text"] = annotation.selected_text
                if annotation.confidence is not None:
                    annotation_data["confidence"] = annotation.confidence
                if annotation.meta:
                    annotation_data["meta"] = annotation.meta
                formatted_annotations.append(annotation_data)

            export_data = {
                "text": {"title": text.title, "content": text.content},
                "annotations": formatted_annotations,
            }
            if text.translation:
                export_data["text"]["translation"] = text.translation
            if getattr(text, "language", None):
                export_data["text"]["language"] = text.language
            if getattr(text, "source", None):
                export_data["text"]["source"] = text.source

            safe_title = "".join(
                c for c in text.title if c.isalnum() or c in (" ", "-", "_")
            ).rstrip().replace(" ", "_")
            filename = f"text_{text.id}_{safe_title[:50]}.json"
            json_content = json.dumps(
                export_data, indent=2, ensure_ascii=False
            )
            zip_file.writestr(filename, json_content.encode("utf-8"))

    export_filename = f"{filter_type}_export_{from_date}_to_{to_date}.zip"
    zip_buffer.seek(0)
    zip_content = zip_buffer.read()

    return StreamingResponse(
        BytesIO(zip_content),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={export_filename}"
        },
    )
