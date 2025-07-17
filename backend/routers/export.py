from datetime import datetime
from typing import List, Optional
import tempfile
import zipfile
import json
import os
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from deps import get_db
from auth import require_admin
from models.user import User
from crud.text import text_crud
from crud.annotation import annotation_crud
router = APIRouter()


@router.get("/stats")
async def get_export_stats(
    from_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    to_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    filter_type: str = Query("annotated", description="Filter type: 'reviewed' or 'annotated'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Get statistics for texts and annotations within a date range.
    Only accessible by admin users.
    """
    try:
        # Parse dates
        start_date = datetime.strptime(from_date, "%Y-%m-%d")
        end_date = datetime.strptime(to_date, "%Y-%m-%d")
        # Validate date range
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        # Validate filter type
        if filter_type not in ["reviewed", "annotated"]:
            raise HTTPException(status_code=400, detail="Filter type must be 'reviewed' or 'annotated'")
        
        # Get texts in date range with filter
        texts = text_crud.get_texts_by_date_range_and_filter(db, start_date, end_date, filter_type)
        # Get total annotation count for these texts
        total_annotations = 0
        for text in texts:
            annotations = annotation_crud.get_by_text(db, text.id)
            total_annotations += len(annotations)
        
        return {
            "total_texts": len(texts),
            "total_annotations": total_annotations,
            "date_range": {
                "from": from_date,
                "to": to_date
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get export statistics: {str(e)}")


@router.get("/download")
async def export_data(
    from_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    to_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    filter_type: str = Query("annotated", description="Filter type: 'reviewed' or 'annotated'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """
    Export texts and annotations as a ZIP file containing JSON files.
    Only accessible by admin users.
    """
    try:
        # Parse dates
        start_date = datetime.strptime(from_date, "%Y-%m-%d")
        end_date = datetime.strptime(to_date, "%Y-%m-%d")
        # Validate date range
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
        
        # Validate filter type
        if filter_type not in ["reviewed", "annotated"]:
            raise HTTPException(status_code=400, detail="Filter type must be 'reviewed' or 'annotated'")
        
        # Get texts in date range with filter
        texts = text_crud.get_texts_by_date_range_and_filter(db, start_date, end_date, filter_type)
        
        if not texts:
            raise HTTPException(status_code=404, detail="No texts found in the specified date range")
        
        print(f"🟢 Creating ZIP file for {len(texts)} texts...")
        # Create ZIP file in memory
        zip_buffer = BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for i, text in enumerate(texts):
                print(f"🟢 Processing text {i+1}/{len(texts)}: {text.title[:30]}...")
                # Get annotations for this text
                annotations = annotation_crud.get_by_text(db, text.id)
                print(f"🟢 Found {len(annotations)} annotations for text {text.id}")
                
                # Convert annotations to the required format
                formatted_annotations = []
                for annotation in annotations:
                    annotation_data = {
                        "annotation_type": annotation.annotation_type,
                        "start_position": annotation.start_position,
                        "end_position": annotation.end_position,
                        "label": annotation.label or annotation.annotation_type,
                    }
                    
                    # Add optional fields if they exist
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
                
                # Create the export format matching sample structure
                export_data = {
                    "text": {
                        "title": text.title,
                        "content": text.content,
                    },
                    "annotations": formatted_annotations
                }
                
                # Add translation if it exists
                if text.translation:
                    export_data["text"]["translation"] = text.translation
                
                # Add language and source if they exist
                if hasattr(text, 'language') and text.language:
                    export_data["text"]["language"] = text.language
                if hasattr(text, 'source') and text.source:
                    export_data["text"]["source"] = text.source
                
                # Create filename (sanitize title for filename)
                safe_title = "".join(c for c in text.title if c.isalnum() or c in (' ', '-', '_')).rstrip()
                safe_title = safe_title.replace(' ', '_')
                filename = f"text_{text.id}_{safe_title[:50]}.json"
                
                # Add to ZIP
                json_content = json.dumps(export_data, indent=2, ensure_ascii=False)
                zip_file.writestr(filename, json_content.encode('utf-8'))
                print(f"🟢 Added {filename} to ZIP ({len(json_content)} chars)")
        
        # Generate filename with filter type and date range (matching frontend expectation)
        export_filename = f"{filter_type}_export_{from_date}_to_{to_date}.zip"
        
        # Prepare response
        zip_buffer.seek(0)
        zip_content = zip_buffer.read()
        print(f"🟢 ZIP file created successfully: {export_filename} ({len(zip_content)} bytes)")
        
        # Return as streaming response
        return StreamingResponse(
            BytesIO(zip_content),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={export_filename}"}
        )
        
    except ValueError as e:
        print(f"🔴 ValueError in download: {e}")
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        print(f"🔴 Unexpected error in download: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}") 