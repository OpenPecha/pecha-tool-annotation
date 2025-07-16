"""add_translation_field_to_texts

Revision ID: f5d6e7a8b9c0
Revises: ba791f669c9b
Create Date: 2025-01-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5d6e7a8b9c0'
down_revision: Union[str, None] = 'ba791f669c9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add translation column to texts table
    op.add_column('texts', 
        sa.Column('translation', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    # Remove translation column from texts table
    op.drop_column('texts', 'translation') 