import asyncio
import os
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

# Import application models for autogenerate
from app.models import Base

# Load environment variables
load_dotenv()

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Retrieve database URL from environment
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy .env.example to .env and fill in your local database credentials."
    )


def include_object(object_, name, type_, reflected, compare_to):
    """
    Exclude tables/objects that exist in the DB (PostGIS extension tables,
    tiger geocoder, spatial_ref_sys, etc.) but aren't part of our own
    SQLAlchemy models, so autogenerate doesn't try to drop them.
    """
    if type_ == "table" and reflected and compare_to is None:
        return False
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    connectable = create_async_engine(
        db_url,
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()