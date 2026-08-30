import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Index, Numeric, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for SQLAlchemy 2.0 declarative models."""
    pass


class CanonicalEntity(Base):
    """
    Canonical Entity model mapping to canonical_entities table.
    Represents reconciled geospatial building footprints.
    """
    __tablename__ = "canonical_entities"

    entity_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    geometry: Mapped[Any] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=False),
        nullable=False,
    )

    reconciled_area_m2: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    sources: Mapped[Optional[List[str]]] = mapped_column(
        JSONB,
        nullable=True,
    )

    source_areas: Mapped[Optional[Dict[str, float]]] = mapped_column(
        JSONB,
        nullable=True,
    )

    conflict_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    confidence_score: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        default=Decimal("0.0"),
        server_default=text("0.0"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="unprocessed",
        server_default=text("'unprocessed'"),
        nullable=False,
    )

    centroid_lat: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 7),
        nullable=True,
    )

    centroid_lon: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 7),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "idx_canonical_entities_geometry",
            "geometry",
            postgresql_using="gist",
        ),
    )
