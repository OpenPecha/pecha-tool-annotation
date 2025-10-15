"""
OpenPecha API Client

This module provides async client functions for interacting with the OpenPecha API.
It handles all HTTP requests, error handling, and data transformation for OpenPecha endpoints.

Equivalent to the original JavaScript: apis/openpecha_api.js
"""

import os
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get the OpenPecha API endpoint from environment
OPENPECHA_ENDPOINT = os.getenv("OPENPECHA_ENDPOINT", "")


# ============================================================================
# Main API Functions
# ============================================================================

async def get_expressions(expression_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch list of expressions from OpenPecha API.
    """
    if not OPENPECHA_ENDPOINT:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENPECHA_ENDPOINT is not configured"
        )
    
    url = f"{OPENPECHA_ENDPOINT}/texts"
    if expression_type:
        url += f"?type={expression_type}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                url,
                headers={
                    "accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Failed to fetch expressions: {e.response.text}"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to connect to OpenPecha API: {str(e)}"
            )


async def get_expression_texts(text_id: str) -> List[Dict[str, Any]]:
    """
    Get list of available manifestations/instances for an expression.
    """
    if not OPENPECHA_ENDPOINT:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENPECHA_ENDPOINT is not configured"
        )
    
    url = f"{OPENPECHA_ENDPOINT}/texts/{text_id}/instances"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                url,
                headers={
                    "accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Failed to fetch text instances: {e.response.text}"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to connect to OpenPecha API: {str(e)}"
            )


async def get_text(instance_id: str) -> Dict[str, Any]:
    """
    Fetch serialized text for translation.
    """
    if not OPENPECHA_ENDPOINT:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENPECHA_ENDPOINT is not configured"
        )
    
    url = f"{OPENPECHA_ENDPOINT}/instances/{instance_id}"
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                url,
                headers={
                    "accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Failed to fetch instance text: {e.response.text}"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to connect to OpenPecha API: {str(e)}"
            )
