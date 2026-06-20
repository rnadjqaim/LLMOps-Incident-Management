from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from llmops_incident.models import (
    DemoPredictionRequest,
    DemoPredictionResponse,
    Incident,
    ModelConnectionReport,
    ModelConnectionRequest,
    Severity,
    TelemetryEvent,
    TelemetryIngestResult,
    TimelineReport,
)
from llmops_incident.repository import IncidentRepository
from llmops_incident.timeline import build_timeline

app = FastAPI(
    title="LLMOps Incident API",
    description="Build incident timelines from LLMOps traces and events.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

repository = IncidentRepository()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/incidents", response_model=list[Incident])
def list_incidents() -> list[Incident]:
    return repository.list_incidents()


@app.get("/incidents/{incident_id}", response_model=Incident)
def get_incident(incident_id: str) -> Incident:
    incident = repository.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.get("/incidents/{incident_id}/timeline", response_model=TimelineReport)
def get_timeline(incident_id: str) -> TimelineReport:
    incident = repository.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return build_timeline(incident)


@app.post("/model-connections/analyze", response_model=ModelConnectionReport)
def analyze_model_connection(request: ModelConnectionRequest) -> ModelConnectionReport:
    payload_keys = {key.lower() for key in request.sample_payload}
    has_pii_risk = bool(payload_keys & {"email", "phone", "name", "address", "ssn", "patient_id"})
    has_text_risk = any("text" in key or "prompt" in key or "message" in key for key in payload_keys)
    has_live_target = request.endpoint.strip() != ""
    score = 92 - (0 if has_live_target else 18) - (8 if has_pii_risk else 0) - (6 if has_text_risk else 0)
    score = max(55, min(96, score))

    return ModelConnectionReport(
        name=request.name,
        environment=request.environment,
        status="ready_for_shadow_monitoring" if score >= 80 else "needs_connection_hardening",
        readiness_score=score,
        summary=(
            f"{request.name} is registered as a {request.model_type.lower()} in "
            f"{request.environment}. Start with shadow monitoring from {request.telemetry_source}, "
            "then enable automatic incident creation after telemetry is stable."
        ),
        required_events=[
            "inference.request.started",
            "inference.request.completed",
            "inference.request.failed",
            "model.version.changed",
            "prediction.feedback.received",
            "eval.regression.detected",
            "security.pii.detected",
        ],
        monitors=[
            "p50, p95, and p99 inference latency by model version",
            "request volume, timeout rate, error rate, and saturation",
            "prediction confidence, output distribution, and schema drift",
            "feature drift, missing values, freshness, and data contract violations",
            "user feedback, correction rate, business outcome, and replay eval score",
        ],
        incident_triggers=[
            "open incident when p95 latency or error rate violates production SLO",
            "open incident when confidence drops and negative feedback rises together",
            "open incident when feature drift and replay eval regression happen after deployment",
            "open incident when PII appears in request, response, logs, or feedback",
            "open incident when traffic, token, GPU, or batch cost spikes outside baseline",
        ],
        security_gates=[
            "require service identity or API key for every inference call",
            "redact PII from telemetry before long-term storage",
            "attach model version, deployment id, and trace id to every event",
            "block production rollout unless rollback, owner, and alert route are configured",
            "generate SOC 2 / ISO evidence from alerts, response actions, and access events",
        ],
        integration_steps=[
            "register the production inference endpoint",
            "install SDK, webhook, OpenTelemetry collector, or log forwarder",
            "send inference, metric, deployment, feedback, and security events",
            "run shadow monitoring before enabling automatic incident creation",
            "enable alert routes and incident response ownership",
        ],
    )


@app.post("/events", response_model=TelemetryIngestResult)
def ingest_event(event: TelemetryEvent) -> TelemetryIngestResult:
    return detect_incident(event)


@app.post("/demo-inference/predict", response_model=DemoPredictionResponse)
def demo_inference(request: DemoPredictionRequest) -> DemoPredictionResponse:
    risk_score = min(
        0.99,
        0.12
        + (request.transaction_amount / 10000)
        + (request.failed_login_count * 0.08)
        + (request.region_risk * 0.25)
        - min(request.account_age_days, 730) / 5000,
    )
    prediction = "review" if risk_score >= 0.7 else "approve"
    confidence = max(0.35, 1 - abs(0.5 - risk_score))

    metrics = {
        "latency_ms": 82,
        "p95_latency_ms": 180,
        "error_rate": 0.0,
        "confidence_drop": 0.02,
        "confidence": round(confidence, 3),
        "risk_score": round(risk_score, 3),
    }
    security = {"pii_detected": False, "prompt_injection": False}
    severity = Severity.info

    if request.simulate_incident:
        metrics.update(
            {
                "latency_ms": 1450,
                "p95_latency_ms": 1650,
                "error_rate": 0.09,
                "confidence_drop": 0.31,
            }
        )
        severity = Severity.warning

    event = TelemetryEvent(
        source="demo-inference",
        service="public-demo-prediction-api",
        environment="production",
        event_type="inference.request.completed",
        severity=severity,
        trace_id="demo-trace-001",
        model={"name": "public-demo-prediction-model", "version": "2026.06-demo"},
        metrics=metrics,
        security=security,
        attributes={
            "endpoint": "/demo-inference/predict",
            "prediction": prediction,
            "simulated": request.simulate_incident,
        },
    )

    return DemoPredictionResponse(
        model_name="public-demo-prediction-model",
        model_version="2026.06-demo",
        prediction=prediction,
        risk_score=round(risk_score, 3),
        confidence=round(confidence, 3),
        telemetry_event=event,
        incident=detect_incident(event),
    )


def detect_incident(event: TelemetryEvent) -> TelemetryIngestResult:
    matched_rules: list[str] = []
    metrics = event.metrics
    security = event.security

    if float(metrics.get("error_rate", 0) or 0) >= 0.05:
        matched_rules.append("serving_error_budget_breach")
    if float(metrics.get("p95_latency_ms", metrics.get("latency_ms", 0)) or 0) >= 1000:
        matched_rules.append("inference_latency_slo_breach")
    if float(metrics.get("confidence_drop", 0) or 0) >= 0.2:
        matched_rules.append("prediction_confidence_drop")
    if security.get("pii_detected") is True:
        matched_rules.append("pii_leakage_detected")
    if security.get("prompt_injection") is True:
        matched_rules.append("prompt_injection_detected")

    opened = event.severity in {Severity.error, Severity.critical} or len(matched_rules) > 0
    severity = Severity.error if opened else event.severity
    return TelemetryIngestResult(
        accepted=True,
        opened_incident=opened,
        severity=severity,
        matched_rules=matched_rules,
        next_action=(
            "Open incident, correlate model version and recent deploys, then route to on-call owner."
            if opened
            else "Keep monitoring and append event to the production telemetry stream."
        ),
    )
