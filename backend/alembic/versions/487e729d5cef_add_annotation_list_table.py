"""add_annotation_list_table

Revision ID: 487e729d5cef
Revises: d8e5f3c2a1b9
Create Date: 2025-10-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '487e729d5cef'
down_revision: Union[str, None] = 'd8e5f3c2a1b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create annotation_list table
    op.create_table('annotation_list',
    sa.Column('id', sa.String(), nullable=False),
    sa.Column('type', sa.String(), nullable=True),
    sa.Column('title', sa.String(), nullable=False),
    sa.Column('level', sa.String(), nullable=True),
    sa.Column('parent_id', sa.String(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('meta', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['parent_id'], ['annotation_list.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_annotation_list_id'), 'annotation_list', ['id'], unique=False)
    op.create_index(op.f('ix_annotation_list_type'), 'annotation_list', ['type'], unique=False)
    op.create_index(op.f('ix_annotation_list_parent_id'), 'annotation_list', ['parent_id'], unique=False)
    op.create_index(op.f('ix_annotation_list_created_by'), 'annotation_list', ['created_by'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_annotation_list_created_by'), table_name='annotation_list')
    op.drop_index(op.f('ix_annotation_list_parent_id'), table_name='annotation_list')
    op.drop_index(op.f('ix_annotation_list_type'), table_name='annotation_list')
    op.drop_index(op.f('ix_annotation_list_id'), table_name='annotation_list')
    
    # Drop table
    op.drop_table('annotation_list')
