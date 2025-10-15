"""Merge multiple heads

Revision ID: f402fb478068
Revises: d1e2f3a4b5c6, e1f2a3b4c5d6
Create Date: 2025-10-14 09:45:54.552248

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f402fb478068'
down_revision: Union[str, None] = ('d1e2f3a4b5c6', 'e1f2a3b4c5d6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
