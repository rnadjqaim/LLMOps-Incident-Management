from collections import defaultdict

from llmops_incident.models import (
    EventType,
    Incident,
    IncidentEvent,
    Severity,
    SuspectedCause,
    TimelinePhase,
    TimelineReport,
)


PHASE_NAMES: dict[EventType, str] = {
    EventType.deploy: "Change",
    EventType.prompt_change: "Change",
    EventType.metric: "Signal",
    EventType.retrieval: "Retrieval",
    EventType.model_call: "Generation",
    EventType.tool_call: "Tool Use",
    EventType.guardrail: "Policy",
    EventType.user_feedback: "User Impact",
    EventType.eval: "Verification",
    EventType.annotation: "Investigation",
}


SEVERITY_RANK = {
    Severity.info: 0,
    Severity.warning: 1,
    Severity.error: 2,
    Severity.critical: 3,
}


def build_timeline(incident: Incident) -> TimelineReport:
    events = sorted(incident.events, key=lambda event: event.timestamp)
    if not events:
        raise ValueError("Incident must include at least one event")

    phases = _build_phases(events)
    causes = _suspect_causes(events)
    severity = max((event.severity for event in events), key=lambda value: SEVERITY_RANK[value])

    return TimelineReport(
        incident_id=incident.id,
        incident_name=incident.name,
        summary=_summarize(incident, events, causes),
        severity=severity,
        first_seen=events[0].timestamp,
        last_seen=events[-1].timestamp,
        phases=phases,
        suspected_causes=causes,
        recommendations=_recommend(events, causes),
    )


def _build_phases(events: list[IncidentEvent]) -> list[TimelinePhase]:
    grouped: dict[str, list[IncidentEvent]] = defaultdict(list)
    for event in events:
        grouped[PHASE_NAMES[event.type]].append(event)

    phases = []
    for phase_name in [
        "Change",
        "Signal",
        "Retrieval",
        "Generation",
        "Tool Use",
        "Policy",
        "User Impact",
        "Verification",
        "Investigation",
    ]:
        phase_events = grouped.get(phase_name, [])
        if phase_events:
            phases.append(
                TimelinePhase(
                    name=phase_name,
                    summary=_phase_summary(phase_name, phase_events),
                    events=phase_events,
                )
            )
    return phases


def _phase_summary(name: str, events: list[IncidentEvent]) -> str:
    if len(events) == 1:
        return events[0].title
    return f"{len(events)} {name.lower()} events captured from {events[0].service} onward."


def _suspect_causes(events: list[IncidentEvent]) -> list[SuspectedCause]:
    causes: list[SuspectedCause] = []

    stale_events = [
        event
        for event in events
        if event.type == EventType.retrieval and event.attributes.get("stale") is True
    ]
    if stale_events:
        causes.append(
            SuspectedCause(
                label="Stale retrieval context",
                confidence=0.9,
                evidence_event_ids=[event.id for event in stale_events],
            )
        )

    failed_refresh = [
        event
        for event in events
        if event.service in {"embedding-worker", "indexer"}
        and event.severity in {Severity.warning, Severity.error, Severity.critical}
    ]
    if failed_refresh:
        causes.append(
            SuspectedCause(
                label="Embedding or index refresh failure",
                confidence=0.82,
                evidence_event_ids=[event.id for event in failed_refresh],
            )
        )

    prompt_changes = [event for event in events if event.type == EventType.prompt_change]
    generation_errors = [
        event
        for event in events
        if event.type == EventType.model_call
        and event.severity in {Severity.error, Severity.critical}
    ]
    if prompt_changes and generation_errors:
        causes.append(
            SuspectedCause(
                label="Prompt change correlated with generation failure",
                confidence=0.68,
                evidence_event_ids=[event.id for event in [*prompt_changes, *generation_errors]],
            )
        )

    tool_errors = [
        event
        for event in events
        if event.type == EventType.tool_call
        and event.severity in {Severity.error, Severity.critical}
    ]
    if tool_errors:
        causes.append(
            SuspectedCause(
                label="Tool execution failure",
                confidence=0.74,
                evidence_event_ids=[event.id for event in tool_errors],
            )
        )

    if not causes:
        error_events = [event for event in events if event.severity in {Severity.error, Severity.critical}]
        causes.append(
            SuspectedCause(
                label="Unclassified LLMOps failure pattern",
                confidence=0.45,
                evidence_event_ids=[event.id for event in error_events[:3]],
            )
        )

    return sorted(causes, key=lambda cause: cause.confidence, reverse=True)


def _summarize(
    incident: Incident, events: list[IncidentEvent], causes: list[SuspectedCause]
) -> str:
    top_cause = causes[0].label if causes else "unknown cause"
    impact_events = [
        event
        for event in events
        if event.type in {EventType.user_feedback, EventType.eval}
        and event.severity in {Severity.error, Severity.critical}
    ]
    impact = impact_events[0].title if impact_events else events[-1].title
    return f"{incident.name}: likely {top_cause.lower()}. Impact signal: {impact}."


def _recommend(events: list[IncidentEvent], causes: list[SuspectedCause]) -> list[str]:
    labels = {cause.label for cause in causes}
    recommendations = []

    if "Stale retrieval context" in labels:
        recommendations.append("Block answer generation when retrieved chunk versions lag source versions.")
        recommendations.append("Add a freshness eval for policy and compliance documents.")

    if "Embedding or index refresh failure" in labels:
        recommendations.append("Page on failed embedding refreshes for high-impact document collections.")

    if any(event.type == EventType.eval for event in events):
        recommendations.append("Promote the failing eval into a deployment gate for this agent.")

    if not recommendations:
        recommendations.append("Add structured annotations for the next investigation to improve cause scoring.")

    return recommendations
