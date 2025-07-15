"""change_level_field_to_string

Revision ID: ba791f669c9b
Revises: c8acfc959e8c
Create Date: 2025-07-15 19:28:03.310175

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba791f669c9b'
down_revision: Union[str, None] = 'c8acfc959e8c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Change the column type from enum to string
    # We need to cast the enum values to string
    op.execute("ALTER TABLE annotations ALTER COLUMN level TYPE varchar USING level::text")
    
    # Step 2: Drop the enum type since it's no longer used
    op.execute("DROP TYPE IF EXISTS annotation_level")


def downgrade() -> None:
    # Step 1: Recreate the enum type
    annotation_level_enum = sa.Enum('minor', 'major', 'critical', name='annotation_level')
    annotation_level_enum.create(op.get_bind())
    
    # Step 2: Change the column type back to enum
    # We need to cast the string values back to enum
    op.execute("ALTER TABLE annotations ALTER COLUMN level TYPE annotation_level USING level::annotation_level")
