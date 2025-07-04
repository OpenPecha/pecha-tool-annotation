"""add anootator id

Revision ID: a2f913604fbd
Revises: 9b3d3077e539
Create Date: 2025-07-04 11:17:03.109276

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a2f913604fbd'
down_revision: Union[str, None] = '9b3d3077e539'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
