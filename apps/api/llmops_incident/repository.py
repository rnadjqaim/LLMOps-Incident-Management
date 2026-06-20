import json
from pathlib import Path

from llmops_incident.models import Incident


ROOT = Path(__file__).resolve().parents[3]
EXAMPLES_DIR = ROOT / "examples"


class IncidentRepository:
    def __init__(self, examples_dir: Path = EXAMPLES_DIR) -> None:
        self.examples_dir = examples_dir

    def list_incidents(self) -> list[Incident]:
        incidents = []
        for path in sorted(self.examples_dir.glob("*.json")):
            incidents.append(self._load(path))
        return incidents

    def get_incident(self, incident_id: str) -> Incident | None:
        path = self.examples_dir / f"{incident_id}.json"
        if not path.exists():
            return None
        return self._load(path)

    @staticmethod
    def _load(path: Path) -> Incident:
        with path.open() as handle:
            return Incident.model_validate(json.load(handle))
