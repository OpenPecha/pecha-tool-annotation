# cache.py
"""Redis-backed cache for text content (content/translation/diplomatic_text).

These are the largest columns on the texts table and are re-read verbatim by
every annotator who opens a document. Caching them cuts repeated large-row
reads under concurrent load without touching the DB connection pool.

If Redis is unreachable, every function here degrades to a no-op (cache miss)
instead of raising, so a Redis outage never takes the API down with it.
"""
import json
import logging
import os
from typing import Optional

import redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
TEXT_CONTENT_CACHE_TTL = int(os.getenv("TEXT_CONTENT_CACHE_TTL", "3600"))
_CONTENT_KEY_PREFIX = "text:content:"

_client: Optional["redis.Redis"] = None
_client_unavailable = False


def _get_client() -> Optional["redis.Redis"]:
    """Lazily connect to Redis. Once a connection attempt fails, stop retrying
    for the life of the process so a Redis outage doesn't add latency to every
    request."""
    global _client, _client_unavailable
    if _client_unavailable:
        return None
    if _client is None:
        try:
            _client = redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
            _client.ping()
        except RedisError as e:
            logger.warning("Redis unavailable, text content caching disabled: %s", e)
            _client_unavailable = True
            _client = None
    return _client


def get_cached_text_content(text_id: int) -> Optional[dict]:
    """Return {"content", "translation", "diplomatic_text"} for text_id, or None on a cache miss / Redis outage."""
    client = _get_client()
    if client is None:
        return None
    try:
        raw = client.get(f"{_CONTENT_KEY_PREFIX}{text_id}")
    except RedisError as e:
        logger.warning("Redis GET failed for text %s: %s", text_id, e)
        return None
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except ValueError:
        return None


def set_cached_text_content(
    text_id: int,
    content: Optional[str],
    translation: Optional[str],
    diplomatic_text: Optional[str],
) -> None:
    client = _get_client()
    if client is None:
        return
    payload = json.dumps(
        {"content": content, "translation": translation, "diplomatic_text": diplomatic_text}
    )
    try:
        client.set(f"{_CONTENT_KEY_PREFIX}{text_id}", payload, ex=TEXT_CONTENT_CACHE_TTL)
    except RedisError as e:
        logger.warning("Redis SET failed for text %s: %s", text_id, e)


def invalidate_text_content(text_id: int) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        client.delete(f"{_CONTENT_KEY_PREFIX}{text_id}")
    except RedisError as e:
        logger.warning("Redis DELETE failed for text %s: %s", text_id, e)
