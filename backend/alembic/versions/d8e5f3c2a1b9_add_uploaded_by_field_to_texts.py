"""add_uploaded_by_field_to_texts

Revision ID: d8e5f3c2a1b9
Revises: f5d6e7a8b9c0
Create Date: 2025-01-17 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8e5f3c2a1b9'
down_revision: Union[str, None] = 'f5d6e7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add uploaded_by column to texts table
    op.add_column('texts', 
        sa.Column('uploaded_by', sa.Integer(), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_texts_uploaded_by_users',
        'texts', 'users',
        ['uploaded_by'], ['id']
    )


def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint('fk_texts_uploaded_by_users', 'texts', type_='foreignkey')
    
    # Remove uploaded_by column from texts table
    op.drop_column('texts', 'uploaded_by') 