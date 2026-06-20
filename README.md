# LLMOps Incident

Open-source incident timeline builder for LLM and agent applications.

LLMOps Incident turns messy logs from LLM calls, retrievers, tools, agents, prompts, user feedback, and deploy events into a readable incident timeline. The goal is to help teams answer:

- What changed before the incident?
- Which step first failed?
- Did retrieval, model behavior, prompt changes, tool calls, or guardrails contribute?
- What evidence supports the suspected cause?
- What should be added to evals or monitors so this does not happen again?

## MVP

This repository starts with a working local prototype:

- FastAPI backend with deterministic timeline analysis.
- React frontend with an incident list, timeline view, evidence panel, and summary metrics.
- Example LLM incident trace data.
- Strategy docs for roadmap, architecture, and open-source positioning.

## Quick Start

Run the API:

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn llmops_incident.main:app --reload --port 8080
```

Run the web app:

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:5173`.

## API

```bash
curl http://localhost:8080/incidents
curl http://localhost:8080/incidents/demo-support-agent/timeline
```

## Project Structure

```text
apps/api      FastAPI backend and timeline engine
apps/web      Vite React frontend
docs          Product strategy and architecture
examples      Sample traces and incidents
```

## License

Apache-2.0. See `LICENSE`.
