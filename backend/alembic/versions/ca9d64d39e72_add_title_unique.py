"""add_title_unique

Revision ID: ca9d64d39e72
Revises: c1178e4a2276
Create Date: 2025-07-07 11:44:10.579270

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca9d64d39e72'
down_revision: Union[str, None] = 'c1178e4a2276'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
