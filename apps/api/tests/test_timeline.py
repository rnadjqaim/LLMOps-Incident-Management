import json
from pathlib import Path

from llmops_incident.models import Incident
from llmops_incident.timeline import build_timeline


def test_build_timeline_detects_stale_retrieval() -> None:
    path = Path(__file__).resolve().parents[3] / "examples" / "demo-support-agent.json"
    incident = Incident.model_validate(json.loads(path.read_text()))

    report = build_timeline(incident)

    assert report.incident_id == "demo-support-agent"
    assert report.severity == "error"
    assert report.suspected_causes[0].label == "Stale retrieval context"
    assert any(phase.name == "Retrieval" for phase in report.phases)
    assert "freshness eval" in " ".join(report.recommendations)
