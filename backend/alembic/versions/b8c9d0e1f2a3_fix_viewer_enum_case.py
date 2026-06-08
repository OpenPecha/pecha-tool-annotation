"""fix_viewer_enum_case

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-06-08 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLAlchemy persists UserRole enum member names (VIEWER), not values (viewer).
    # Existing userrole values are uppercase (ADMIN, USER, ...); prior migration added lowercase 'viewer'.
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'VIEWER'")


def downgrade() -> None:
    pass
