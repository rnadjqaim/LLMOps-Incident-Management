from fastapi.testclient import TestClient

from llmops_incident.main import app


client = TestClient(app)


def test_analyze_model_connection_returns_live_monitoring_plan() -> None:
    response = client.post(
        "/model-connections/analyze",
        json={
            "name": "production-prediction-model",
            "model_type": "REST endpoint",
            "endpoint": "https://example.internal/predict",
            "environment": "production",
            "telemetry_source": "OpenTelemetry",
            "sample_payload": {"feature_a": 42, "feature_b": "segment-a"},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["environment"] == "production"
    assert body["readiness_score"] >= 80
    assert "inference.request.completed" in body["required_events"]
    assert any("p95 latency" in trigger for trigger in body["incident_triggers"])


def test_ingest_event_opens_incident_for_bad_inference_telemetry() -> None:
    response = client.post(
        "/events",
        json={
            "source": "model-serving",
            "service": "prediction-api",
            "environment": "production",
            "event_type": "inference.request.completed",
            "severity": "warning",
            "trace_id": "req_123",
            "model": {"name": "production-prediction-model", "version": "v12"},
            "metrics": {"p95_latency_ms": 1400, "error_rate": 0.08},
            "security": {"pii_detected": False},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is True
    assert body["opened_incident"] is True
    assert "serving_error_budget_breach" in body["matched_rules"]
    assert "inference_latency_slo_breach" in body["matched_rules"]


def test_demo_inference_healthy_prediction_keeps_monitoring() -> None:
    response = client.post(
        "/demo-inference/predict",
        json={
            "account_age_days": 360,
            "transaction_amount": 140,
            "failed_login_count": 0,
            "region_risk": 0.1,
            "simulate_incident": False,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["prediction"] == "approve"
    assert body["incident"]["opened_incident"] is False
    assert body["incident"]["matched_rules"] == []


def test_demo_inference_incident_prediction_opens_incident() -> None:
    response = client.post(
        "/demo-inference/predict",
        json={
            "account_age_days": 14,
            "transaction_amount": 5800,
            "failed_login_count": 5,
            "region_risk": 0.8,
            "simulate_incident": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["incident"]["opened_incident"] is True
    assert "serving_error_budget_breach" in body["incident"]["matched_rules"]
    assert "inference_latency_slo_breach" in body["incident"]["matched_rules"]
    assert "prediction_confidence_drop" in body["incident"]["matched_rules"]
