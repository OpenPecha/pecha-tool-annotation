"""fix_annotation_list_created_by_reference

Revision ID: d1e2f3a4b5c6
Revises: cb9d78c60ba0
Create Date: 2025-10-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'cb9d78c60ba0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old foreign key constraint
    op.drop_constraint('annotation_list_created_by_fkey', 'annotation_list', type_='foreignkey')
    
    # Alter the column type to String
    op.alter_column('annotation_list', 'created_by',
                    existing_type=sa.Integer(),
                    type_=sa.String(),
                    existing_nullable=True)
    
    # Add the new foreign key constraint to users.auth0_user_id
    op.create_foreign_key('annotation_list_created_by_fkey', 
                         'annotation_list', 'users',
                         ['created_by'], ['auth0_user_id'])


def downgrade() -> None:
    # Drop the new foreign key constraint
    op.drop_constraint('annotation_list_created_by_fkey', 'annotation_list', type_='foreignkey')
    
    # Alter the column type back to Integer
    op.alter_column('annotation_list', 'created_by',
                    existing_type=sa.String(),
                    type_=sa.Integer(),
                    existing_nullable=True)
    
    # Add back the old foreign key constraint to users.id
    op.create_foreign_key('annotation_list_created_by_fkey',
                         'annotation_list', 'users',
                         ['created_by'], ['id'])

