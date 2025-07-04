"""add anootator id

Revision ID: fe1a46f513db
Revises: 79d0d9fbf4b0
Create Date: 2025-07-04 11:03:33.718014

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe1a46f513db'
down_revision: Union[str, None] = '79d0d9fbf4b0'
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
