"""Pydantic models for FlockGuard API."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum
import uuid


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertStatus(str, Enum):
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    VET_DISPATCHED = "vet_dispatched"
    RESOLVED = "resolved"


class Observation(BaseModel):
    title: str = ""
    description: str = ""
    severity: Severity = Severity.LOW


class AnalysisResult(BaseModel):
    summary: str = ""
    observations: list[Observation] = []
    risk_level: RiskLevel = RiskLevel.LOW
    evidence: list[str] = []
    recommended_action: str = ""
    uncertainty: str = "This AI system provides visual anomaly detection only. It does not provide veterinary diagnosis."
    mode: str = "single"  # "single" or "comparison"


class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    farm_id: str = "A17"
    risk_level: RiskLevel = RiskLevel.HIGH
    summary: str = ""
    observations: list[Observation] = []
    evidence: list[str] = []
    recommended_action: str = ""
    status: AlertStatus = AlertStatus.PENDING
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class AlertCreate(BaseModel):
    farm_id: str = "A17"
    risk_level: RiskLevel = RiskLevel.HIGH
    summary: str = ""
    observations: list[Observation] = []
    evidence: list[str] = []
    recommended_action: str = ""


class AlertUpdate(BaseModel):
    status: AlertStatus
