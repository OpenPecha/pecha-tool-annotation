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
import time
from typing import Optional

import redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
TEXT_CONTENT_CACHE_TTL = int(os.getenv("TEXT_CONTENT_CACHE_TTL", "3600"))
_CONTENT_KEY_PREFIX = "text:content:"

# A remote, TLS-secured managed Redis (cross-region WAN + TLS handshake, and
# free-tier instances can be slow to wake from idle) needs more headroom than
# a local instance would.
_SOCKET_TIMEOUT_SECONDS = 5
_RETRY_COOLDOWN_SECONDS = 30

_client: Optional["redis.Redis"] = None
_unavailable_until = 0.0


def _get_client() -> Optional["redis.Redis"]:
    """Lazily connect to Redis. On failure, stop retrying for a cooldown
    window (not forever) so a single transient blip doesn't disable caching
    for the rest of the process's life, while a genuine outage still doesn't
    add connection-attempt latency to every request."""
    global _client, _unavailable_until
    if _client is not None:
        return _client
    now = time.monotonic()
    if now < _unavailable_until:
        return None
    try:
        client = redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=_SOCKET_TIMEOUT_SECONDS,
            socket_timeout=_SOCKET_TIMEOUT_SECONDS,
        )
        client.ping()
        _client = client
        logger.warning("[CACHE-DEBUG] Connected to Redis OK")  # TEMP DEBUG - remove after verifying
    except RedisError as e:
        logger.warning(
            "Redis unavailable, text content caching disabled for %ss: %s",
            _RETRY_COOLDOWN_SECONDS,
            e,
        )
        _unavailable_until = now + _RETRY_COOLDOWN_SECONDS
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
        logger.warning("[CACHE-DEBUG] MISS for text %s", text_id)  # TEMP DEBUG - remove after verifying
        return None
    logger.warning("[CACHE-DEBUG] HIT for text %s", text_id)  # TEMP DEBUG - remove after verifying
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
        logger.warning("[CACHE-DEBUG] SET for text %s", text_id)  # TEMP DEBUG - remove after verifying
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
