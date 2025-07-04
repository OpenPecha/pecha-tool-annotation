"""add_annotator_id_to_texts_table

Revision ID: 9b3d3077e539
Revises: fe1a46f513db
Create Date: 2025-07-04 11:11:43.172144

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b3d3077e539'
down_revision: Union[str, None] = 'fe1a46f513db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add annotator_id column to texts table
    op.add_column('texts', sa.Column('annotator_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_texts_annotator_id', 'texts', 'users', ['annotator_id'], ['id'])


def downgrade() -> None:
    # Remove annotator_id column from texts table
    op.drop_constraint('fk_texts_annotator_id', 'texts', type_='foreignkey')
    op.drop_column('texts', 'annotator_id')
