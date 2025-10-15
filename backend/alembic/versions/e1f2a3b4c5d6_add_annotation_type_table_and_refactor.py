"""add_annotation_type_table_and_refactor

Revision ID: e1f2a3b4c5d6
Revises: f5d6e7a8b9c0
Create Date: 2025-10-13 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'f5d6e7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Create the annotation_type table
    op.create_table(
        'annotation_type',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_annotation_type_id'), 'annotation_type', ['id'], unique=False)
    op.create_index(op.f('ix_annotation_type_name'), 'annotation_type', ['name'], unique=True)

    # Step 2: Extract unique types from annotation_list and populate annotation_type
    # This is done using raw SQL to handle data migration
    connection = op.get_bind()
    
    # Get distinct types from annotation_list
    result = connection.execute(
        sa.text("SELECT DISTINCT type FROM annotation_list WHERE type IS NOT NULL")
    )
    unique_types = [row[0] for row in result]
    
    # Create a mapping of type names to new UUIDs
    type_id_mapping = {}
    for type_name in unique_types:
        new_id = str(uuid.uuid4())
        type_id_mapping[type_name] = new_id
        
        # Insert into annotation_type table
        connection.execute(
            sa.text(
                "INSERT INTO annotation_type (id, name, created_at) "
                "VALUES (:id, :name, now())"
            ),
            {"id": new_id, "name": type_name}
        )
    
    # Step 3: Add type_id column to annotation_list (nullable initially)
    op.add_column('annotation_list', sa.Column('type_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_annotation_list_type_id'), 'annotation_list', ['type_id'], unique=False)
    
    # Step 4: Populate type_id based on existing type values
    for type_name, type_id in type_id_mapping.items():
        connection.execute(
            sa.text(
                "UPDATE annotation_list SET type_id = :type_id WHERE type = :type_name"
            ),
            {"type_id": type_id, "type_name": type_name}
        )
    
    # Step 5: Add foreign key constraint to type_id
    op.create_foreign_key(
        'fk_annotation_list_type_id',
        'annotation_list', 'annotation_type',
        ['type_id'], ['id'],
        ondelete='CASCADE'
    )
    
    # Step 6: Drop the old type column and its index
    op.drop_index('ix_annotation_list_type', table_name='annotation_list')
    op.drop_column('annotation_list', 'type')


def downgrade() -> None:
    # Step 1: Add back the type column
    op.add_column('annotation_list', sa.Column('type', sa.String(), nullable=True))
    op.create_index('ix_annotation_list_type', 'annotation_list', ['type'], unique=False)
    
    # Step 2: Populate type column from annotation_type relationship
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE annotation_list 
            SET type = annotation_type.name 
            FROM annotation_type 
            WHERE annotation_list.type_id = annotation_type.id
            """
        )
    )
    
    # Step 3: Drop the type_id foreign key and column
    op.drop_constraint('fk_annotation_list_type_id', 'annotation_list', type_='foreignkey')
    op.drop_index(op.f('ix_annotation_list_type_id'), table_name='annotation_list')
    op.drop_column('annotation_list', 'type_id')
    
    # Step 4: Drop the annotation_type table and its indexes
    op.drop_index(op.f('ix_annotation_type_name'), table_name='annotation_type')
    op.drop_index(op.f('ix_annotation_type_id'), table_name='annotation_type')
    op.drop_table('annotation_type')

