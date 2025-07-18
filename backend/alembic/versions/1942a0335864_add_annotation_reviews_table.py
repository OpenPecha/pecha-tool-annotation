"""add_annotation_reviews_table

Revision ID: 1942a0335864
Revises: 7c634d86ca15
Create Date: 2025-07-14 10:57:46.069764

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1942a0335864'
down_revision: Union[str, None] = '7c634d86ca15'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('annotation_reviews',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('annotation_id', sa.Integer(), nullable=False),
    sa.Column('reviewer_id', sa.Integer(), nullable=False),
    sa.Column('decision', sa.String(), nullable=False),
    sa.Column('comment', sa.String(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['annotation_id'], ['annotations.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('annotation_id', 'reviewer_id', name='unique_annotation_reviewer')
    )
    op.create_index(op.f('ix_annotation_reviews_annotation_id'), 'annotation_reviews', ['annotation_id'], unique=False)
    op.create_index(op.f('ix_annotation_reviews_id'), 'annotation_reviews', ['id'], unique=False)
    op.create_index(op.f('ix_annotation_reviews_reviewer_id'), 'annotation_reviews', ['reviewer_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_annotation_reviews_reviewer_id'), table_name='annotation_reviews')
    op.drop_index(op.f('ix_annotation_reviews_id'), table_name='annotation_reviews')
    op.drop_index(op.f('ix_annotation_reviews_annotation_id'), table_name='annotation_reviews')
    op.drop_table('annotation_reviews')
    # ### end Alembic commands ###
