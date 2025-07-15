"""add_annotation_level_field

Revision ID: c8acfc959e8c
Revises: 69fbba723bee
Create Date: 2025-07-15 16:47:05.823284

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8acfc959e8c'
down_revision: Union[str, None] = '69fbba723bee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type first
    annotation_level_enum = sa.Enum('minor', 'major', 'critical', name='annotation_level')
    annotation_level_enum.create(op.get_bind())
    
    # Add level column to annotations table
    op.add_column('annotations', 
        sa.Column('level', annotation_level_enum, nullable=True)
    )


def downgrade() -> None:
    # Remove level column from annotations table
    op.drop_column('annotations', 'level')
    # Drop the enum type
    op.execute("DROP TYPE IF EXISTS annotation_level")
