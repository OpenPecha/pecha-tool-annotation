"""add_viewer_user_role

Revision ID: a7b8c9d0e1f2
Revises: ff5cde856476
Create Date: 2026-06-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "ff5cde856476"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'VIEWER'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values safely.
    pass
