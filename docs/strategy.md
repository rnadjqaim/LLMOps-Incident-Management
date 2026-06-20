# LLMOps Incident Strategy

## One-Line Pitch

An open-source incident timeline builder that explains failures in LLM, RAG, and agent systems from the evidence already hidden in logs.

## Problem

LLM incidents are hard to debug because evidence is scattered across:

- LLM requests and responses.
- Prompt versions.
- Retrieval queries and returned chunks.
- Vector index changes.
- Tool calls and API responses.
- Agent planner decisions.
- Guardrail decisions.
- User feedback.
- Deployment events.
- Cost and latency telemetry.

Traditional observability shows traces and metrics, but it rarely explains the narrative of the incident.

## Target Users

- LLMOps engineers responsible for production AI systems.
- MLOps engineers moving into GenAI reliability.
- Platform teams supporting multiple AI product teams.
- Security teams reviewing prompt injection and tool abuse incidents.
- Open-source maintainers who want reproducible LLM app bug reports.

## Core Differentiator

Most tools show observability data. LLMOps Incident builds a timeline that says:

1. What changed.
2. What degraded.
3. What evidence proves it.
4. What likely caused it.
5. What prevention should be added.

## Initial Use Cases

- RAG answer quality dropped after docs changed.
- Agent called the wrong tool after prompt change.
- Model upgrade changed JSON behavior.
- Retrieval returned stale chunks.
- Tool latency caused fallback prompt to trigger.
- Guardrail blocked valid requests after policy update.
- Prompt injection caused an agent to expose internal data.

## MVP Scope

The first open-source release should support:

- JSON event ingestion.
- Deterministic timeline construction.
- Incident summary generation.
- Evidence grouping by event type.
- Basic suspected cause scoring.
- Local web dashboard.
- CLI export to Markdown.

## Event Types

- `deploy`
- `prompt_change`
- `model_call`
- `retrieval`
- `tool_call`
- `guardrail`
- `user_feedback`
- `metric`
- `eval`
- `annotation`

## Roadmap

### Phase 1: Useful Local Tool

- Local API and dashboard.
- Sample incident datasets.
- Timeline generation.
- Markdown incident report export.
- Basic adapters for OpenTelemetry-style JSON.

### Phase 2: Integrations

- LangChain callback export adapter.
- LlamaIndex event adapter.
- OpenAI tracing export adapter.
- Arize/Phoenix import format.
- Langfuse import format.
- GitHub issue report template.

### Phase 3: Reliability Intelligence

- Similar incident clustering.
- Prompt/version diff attachment.
- Eval recommendation generation.
- RAG freshness checks.
- Tool permission risk markers.

### Phase 4: Team Workflow

- Incident annotations.
- Owner assignment.
- Postmortem templates.
- CI check that blocks deployment if eval regressions match a previous incident.

## Open-Source Positioning

This should be vendor-neutral. It should not compete head-on as another tracing backend. It should sit above traces and turn them into investigation artifacts.

Good tagline candidates:

- "Postmortems for LLM apps, built from your traces."
- "Turn LLM traces into incident timelines."
- "Explain what broke in your RAG or agent pipeline."
