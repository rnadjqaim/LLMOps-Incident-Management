from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class EventType(str, Enum):
    deploy = "deploy"
    prompt_change = "prompt_change"
    model_call = "model_call"
    retrieval = "retrieval"
    tool_call = "tool_call"
    guardrail = "guardrail"
    user_feedback = "user_feedback"
    metric = "metric"
    eval = "eval"
    annotation = "annotation"


class Severity(str, Enum):
    info = "info"
    warning = "warning"
    error = "error"
    critical = "critical"


class IncidentEvent(BaseModel):
    id: str
    incident_id: str
    timestamp: datetime
    type: EventType
    service: str
    severity: Severity = Severity.info
    title: str
    details: str
    attributes: dict[str, Any] = Field(default_factory=dict)


class Incident(BaseModel):
    id: str
    name: str
    description: str
    events: list[IncidentEvent]


class TimelinePhase(BaseModel):
    name: str
    summary: str
    events: list[IncidentEvent]


class SuspectedCause(BaseModel):
    label: str
    confidence: float = Field(ge=0, le=1)
    evidence_event_ids: list[str]


class TimelineReport(BaseModel):
    incident_id: str
    incident_name: str
    summary: str
    severity: Severity
    first_seen: datetime
    last_seen: datetime
    phases: list[TimelinePhase]
    suspected_causes: list[SuspectedCause]
    recommendations: list[str]


class ModelConnectionRequest(BaseModel):
    name: str
    model_type: str
    endpoint: str
    environment: str = "production"
    telemetry_source: str = "OpenTelemetry"
    sample_payload: dict[str, Any] = Field(default_factory=dict)


class ModelConnectionReport(BaseModel):
    name: str
    environment: str
    status: str
    readiness_score: int = Field(ge=0, le=100)
    summary: str
    required_events: list[str]
    monitors: list[str]
    incident_triggers: list[str]
    security_gates: list[str]
    integration_steps: list[str]


class TelemetryEvent(BaseModel):
    source: str
    service: str
    environment: str = "production"
    event_type: str
    severity: Severity = Severity.info
    trace_id: str
    model: dict[str, Any] = Field(default_factory=dict)
    metrics: dict[str, Any] = Field(default_factory=dict)
    security: dict[str, Any] = Field(default_factory=dict)
    attributes: dict[str, Any] = Field(default_factory=dict)


class TelemetryIngestResult(BaseModel):
    accepted: bool
    opened_incident: bool
    severity: Severity
    matched_rules: list[str]
    next_action: str


class DemoPredictionRequest(BaseModel):
    account_age_days: int = 180
    transaction_amount: float = 120.0
    failed_login_count: int = 0
    region_risk: float = Field(default=0.2, ge=0, le=1)
    simulate_incident: bool = False


class DemoPredictionResponse(BaseModel):
    model_name: str
    model_version: str
    prediction: str
    risk_score: float
    confidence: float
    telemetry_event: TelemetryEvent
    incident: TelemetryIngestResult
