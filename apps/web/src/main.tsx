import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  BellRing,
  BookOpenCheck,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cpu,
  Database,
  FileWarning,
  Gauge,
  GitBranch,
  KeyRound,
  ListChecks,
  Plug,
  RadioTower,
  RefreshCcw,
  SearchCheck,
  Server,
  ShieldCheck,
  Siren,
  Sparkles,
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

type Severity = "info" | "warning" | "error" | "critical";
type View =
  | "overview"
  | "connect"
  | "analyze"
  | "timeline"
  | "response"
  | "triggers"
  | "book"
  | "postmortem"
  | "security";

type IncidentEvent = {
  id: string;
  incident_id: string;
  timestamp: string;
  type: string;
  service: string;
  severity: Severity;
  title: string;
  details: string;
  attributes: Record<string, unknown>;
};

type Incident = {
  id: string;
  name: string;
  description: string;
  events: IncidentEvent[];
};

type TimelinePhase = {
  name: string;
  summary: string;
  events: IncidentEvent[];
};

type SuspectedCause = {
  label: string;
  confidence: number;
  evidence_event_ids: string[];
};

type TimelineReport = {
  incident_id: string;
  incident_name: string;
  summary: string;
  severity: Severity;
  first_seen: string;
  last_seen: string;
  phases: TimelinePhase[];
  suspected_causes: SuspectedCause[];
  recommendations: string[];
};

type ModelConnectionReport = {
  name: string;
  environment: string;
  status: string;
  readiness_score: number;
  summary: string;
  required_events: string[];
  monitors: string[];
  incident_triggers: string[];
  security_gates: string[];
  integration_steps: string[];
};

const views: Array<{ id: View; label: string; icon: React.ReactElement<{ size?: number }> }> = [
  { id: "overview", label: "Overview", icon: <Gauge /> },
  { id: "connect", label: "Connect", icon: <Plug /> },
  { id: "analyze", label: "Analyze Model", icon: <ChartNoAxesCombined /> },
  { id: "timeline", label: "Timeline", icon: <Clock3 /> },
  { id: "response", label: "Response", icon: <Siren /> },
  { id: "triggers", label: "Triggers", icon: <RadioTower /> },
  { id: "book", label: "Incident Book", icon: <BookOpenCheck /> },
  { id: "postmortem", label: "Postmortem", icon: <BookOpenCheck /> },
  { id: "security", label: "Security", icon: <ShieldCheck /> },
];

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState("demo-support-agent");
  const [timeline, setTimeline] = useState<TimelineReport | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<IncidentEvent | null>(null);
  const [activeView, setActiveView] = useState<View>("overview");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    async function load() {
      setStatus("loading");
      try {
        const [incidentResponse, timelineResponse] = await Promise.all([
          fetch(`${API_BASE}/incidents`),
          fetch(`${API_BASE}/incidents/${selectedId}/timeline`),
        ]);
        const incidentData = (await incidentResponse.json()) as Incident[];
        const timelineData = (await timelineResponse.json()) as TimelineReport;
        setIncidents(incidentData);
        setTimeline(timelineData);
        setSelectedEvent(timelineData.phases.flatMap((phase) => phase.events)[0] ?? null);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    }

    load();
  }, [selectedId]);

  const allEvents = useMemo(
    () => timeline?.phases.flatMap((phase) => phase.events) ?? [],
    [timeline],
  );

  if (status === "error") {
    return (
      <main className="center-state">
        <AlertTriangle size={36} />
        <h1>API connection failed</h1>
        <p>Start the backend on port 8080, then refresh this dashboard.</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="command-bar">
        <div className="brand-row">
          <BrainCircuit size={25} />
          <div>
            <strong>LLMOps Incident</strong>
            <span>Incident Response Manager</span>
          </div>
        </div>

        <nav className="icon-tabs" aria-label="Incident sections">
          {views.map((view) => (
            <button
              className={`tab-button ${activeView === view.id ? "active" : ""}`}
              key={view.id}
              title={view.label}
              onClick={() => setActiveView(view.id)}
            >
              {React.cloneElement(view.icon, { size: 18 })}
              <span>{view.label}</span>
            </button>
          ))}
        </nav>

        <button className="icon-button" title="Refresh incident" onClick={() => window.location.reload()}>
          <RefreshCcw size={18} />
        </button>
      </header>

      <section className="workspace">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">Live AI Incident Response</p>
            <h1>{timeline?.incident_name ?? "Loading incident"}</h1>
            <p>
              Connect production inference, pipelines, metrics, logs, evaluations, feedback, and
              security events. The platform scans live telemetry and opens incidents when risky
              patterns appear.
            </p>
          </div>
          <div className="incident-picker">
            <label className="field-label" htmlFor="incident-select">
              Incident
            </label>
            <select
              id="incident-select"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {incidents.map((incident) => (
                <option key={incident.id} value={incident.id}>
                  {incident.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {timeline ? (
          <IncidentView
            activeView={activeView}
            allEvents={allEvents}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            timeline={timeline}
          />
        ) : (
          <div className="center-state compact">
            <Clock3 size={32} />
            <h1>Building timeline</h1>
          </div>
        )}
      </section>
    </main>
  );
}

function IncidentView({
  activeView,
  allEvents,
  selectedEvent,
  setSelectedEvent,
  timeline,
}: {
  activeView: View;
  allEvents: IncidentEvent[];
  selectedEvent: IncidentEvent | null;
  setSelectedEvent: (event: IncidentEvent) => void;
  timeline: TimelineReport;
}) {
  if (activeView === "timeline") {
    return <TimelineView selectedEvent={selectedEvent} setSelectedEvent={setSelectedEvent} timeline={timeline} />;
  }

  if (activeView === "connect") {
    return <ConnectView />;
  }

  if (activeView === "analyze") {
    return <AnalyzeModelView />;
  }

  if (activeView === "response") {
    return <ResponseView timeline={timeline} />;
  }

  if (activeView === "triggers") {
    return <TriggerView allEvents={allEvents} timeline={timeline} />;
  }

  if (activeView === "postmortem") {
    return <PostmortemView allEvents={allEvents} timeline={timeline} />;
  }

  if (activeView === "book") {
    return <IncidentBookView />;
  }

  if (activeView === "security") {
    return <SecurityView timeline={timeline} />;
  }

  return <Overview allEvents={allEvents} timeline={timeline} />;
}

function Overview({ allEvents, timeline }: { allEvents: IncidentEvent[]; timeline: TimelineReport }) {
  return (
    <>
      <section className="metrics-grid">
        <Metric icon={<Gauge />} label="Severity" value={timeline.severity} tone={timeline.severity} />
        <Metric icon={<Activity />} label="Events" value={String(allEvents.length)} />
        <Metric icon={<GitBranch />} label="Phases" value={String(timeline.phases.length)} />
        <Metric icon={<Sparkles />} label="Top Cause" value={timeline.suspected_causes[0]?.label ?? "Unknown"} />
      </section>

      <section className="summary-band">
        <div>
          <p className="eyebrow">Executive Summary</p>
          <h2>{timeline.summary}</h2>
        </div>
        <div className="time-range">
          <span>{formatTime(timeline.first_seen)}</span>
          <span>{formatTime(timeline.last_seen)}</span>
        </div>
      </section>

      <section className="overview-grid">
        <section className="panel-block">
          <h2>What Happened</h2>
          <p>
            The incident was reconstructed from deploy events, retrieval traces, model calls,
            guardrail signals, evaluations, and user feedback. The strongest cause is currently{" "}
            <strong>{timeline.suspected_causes[0]?.label ?? "unknown"}</strong>.
          </p>
        </section>
        <section className="panel-block">
          <h2>Next Best Actions</h2>
          {timeline.recommendations.map((recommendation) => (
            <ActionRow key={recommendation} text={recommendation} />
          ))}
          <ActionRow text="Connect a live model in Analyze Model to generate monitors, incident triggers, and security gates." />
        </section>
      </section>
    </>
  );
}

function TimelineView({
  selectedEvent,
  setSelectedEvent,
  timeline,
}: {
  selectedEvent: IncidentEvent | null;
  setSelectedEvent: (event: IncidentEvent) => void;
  timeline: TimelineReport;
}) {
  return (
    <section className="content-grid">
      <div className="timeline-panel">
        {timeline.phases.map((phase) => (
          <article className="phase" key={phase.name}>
            <div className="phase-header">
              <span>{phase.name}</span>
              <small>{phase.summary}</small>
            </div>
            {phase.events.map((event) => (
              <button
                className={`event-row ${selectedEvent?.id === event.id ? "selected" : ""}`}
                key={event.id}
                onClick={() => setSelectedEvent(event)}
              >
                <span className={`severity-dot ${event.severity}`} />
                <div>
                  <strong>{event.title}</strong>
                  <span>
                    {event.service} · {formatTime(event.timestamp)}
                  </span>
                </div>
              </button>
            ))}
          </article>
        ))}
      </div>

      <aside className="details-panel">
        <Evidence event={selectedEvent} />
        <Causes timeline={timeline} />
      </aside>
    </section>
  );
}

function ConnectView() {
  return (
    <>
      <section className="summary-band">
        <div>
          <p className="eyebrow">Connect Live AI Infrastructure</p>
          <h2>
            Register any production inference endpoint, stream normalized telemetry, and let the
            scanner open incidents from live model, pipeline, data, security, and feedback signals.
          </h2>
        </div>
      </section>

      <section className="connect-grid">
        <section className="panel-block">
          <h2>Live Integration Checklist</h2>
          <ConnectorRow
            icon={<Server />}
            title="Production Inference Endpoint"
            text="Register endpoint URL, service name, environment, auth method, health path, model name, and model version."
          />
          <ConnectorRow
            icon={<GitBranch />}
            title="Deployment And Pipeline Events"
            text="Stream deploy, rollback, training, evaluation, feature build, approval, and release-gate events."
          />
          <ConnectorRow
            icon={<Database />}
            title="Prediction Inputs And Data Signals"
            text="Send schema drift, missing fields, feature freshness, data quality, PII findings, and lineage metadata."
          />
          <ConnectorRow
            icon={<Cpu />}
            title="Runtime Metrics And Traces"
            text="Send latency, errors, saturation, request volume, trace id, confidence, token/GPU/cost, and output validation."
          />
          <ConnectorRow
            icon={<RadioTower />}
            title="Monitoring And Alert Routes"
            text="Connect OpenTelemetry, Prometheus, logs, eval systems, feedback, Slack/PagerDuty/webhooks, and on-call owners."
          />
          <ConnectorRow
            icon={<KeyRound />}
            title="Security"
            text="Send auth failures, access events, secret scans, container scans, PII leakage, prompt injection, and policy violations."
          />
        </section>

        <aside className="panel-block">
          <h2>Generic Event Contract</h2>
          <pre>{`POST /events
{
  "trace_id": "req_01J...",
  "source": "model-serving",
  "event_type": "inference.request.completed",
  "severity": "warning",
  "service": "prediction-api",
  "environment": "production",
  "model": {
    "name": "any-production-model",
    "version": "2026.06.19"
  },
  "metrics": {
    "p95_latency_ms": 940,
    "confidence_drop": 0.24,
    "error_rate": 0.08
  },
  "security": {
    "pii_detected": false,
    "prompt_injection": false
  }
}`}</pre>
        </aside>
      </section>

      <section className="trigger-flow">
        <FlowStep icon={<Plug />} title="Register" text="Add the live inference endpoint and ownership metadata." />
        <FlowStep icon={<SearchCheck />} title="Stream" text="Send inference, metric, deploy, eval, feedback, and security events." />
        <FlowStep icon={<BellRing />} title="Detect" text="Open incidents when live telemetry violates rules or correlated thresholds." />
        <FlowStep icon={<Siren />} title="Respond" text="Guide triage, rollback, containment, owner routing, and postmortem actions." />
      </section>
    </>
  );
}

function AnalyzeModelView() {
  const [modelName, setModelName] = useState("production-prediction-model");
  const [modelType, setModelType] = useState("REST endpoint");
  const [environment, setEnvironment] = useState("production");
  const [telemetrySource, setTelemetrySource] = useState("OpenTelemetry");
  const [endpoint, setEndpoint] = useState("https://your-inference-host.example.com/predict");
  const [payload, setPayload] = useState(`{
  "feature_a": 42,
  "feature_b": "segment-a",
  "feature_c": 1280
}`);
  const [analysis, setAnalysis] = useState<ModelConnectionReport>(() =>
    analyzeModel(
      "production-prediction-model",
      "REST endpoint",
      "https://your-inference-host.example.com/predict",
      "production",
      "OpenTelemetry",
      payload,
    ),
  );
  const [connectionState, setConnectionState] = useState<"idle" | "checking" | "ready">("idle");

  async function runAnalysis() {
    setConnectionState("checking");
    const samplePayload = parsePayload(payload);
    try {
      const response = await fetch(`${API_BASE}/model-connections/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: modelName,
          model_type: modelType,
          endpoint,
          environment,
          telemetry_source: telemetrySource,
          sample_payload: samplePayload,
        }),
      });
      if (!response.ok) {
        throw new Error("Connection analysis failed");
      }
      setAnalysis((await response.json()) as ModelConnectionReport);
    } catch {
      setAnalysis(analyzeModel(modelName, modelType, endpoint, environment, telemetrySource, payload));
    } finally {
      setConnectionState("ready");
    }
  }

  return (
    <>
      <section className="summary-band">
        <div>
          <p className="eyebrow">Production Model Connection</p>
          <h2>
            Connect a live inference endpoint, verify the telemetry contract, and enable shadow
            monitoring before automatic incident creation.
          </h2>
        </div>
      </section>

      <section className="analyze-grid">
        <section className="panel-block">
          <h2>Live Endpoint Registration</h2>
          <div className="form-grid">
            <label>
              <span>Model name</span>
              <input value={modelName} onChange={(event) => setModelName(event.target.value)} />
            </label>
            <label>
              <span>Model type</span>
              <select value={modelType} onChange={(event) => setModelType(event.target.value)}>
                <option>REST endpoint</option>
                <option>Docker container</option>
                <option>Kubernetes service</option>
                <option>Python function</option>
                <option>ONNX artifact</option>
                <option>Hugging Face model</option>
                <option>LLM gateway</option>
                <option>Batch scoring job</option>
              </select>
            </label>
            <label>
              <span>Environment</span>
              <select value={environment} onChange={(event) => setEnvironment(event.target.value)}>
                <option>production</option>
                <option>staging</option>
                <option>shadow</option>
                <option>development</option>
              </select>
            </label>
            <label>
              <span>Telemetry source</span>
              <select value={telemetrySource} onChange={(event) => setTelemetrySource(event.target.value)}>
                <option>OpenTelemetry</option>
                <option>Prometheus</option>
                <option>Application logs</option>
                <option>Webhook</option>
                <option>SDK</option>
                <option>Managed model platform</option>
              </select>
            </label>
            <label className="wide-field">
              <span>Inference endpoint, image, service, path, or job id</span>
              <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} />
            </label>
            <label className="wide-field">
              <span>Sample prediction payload or input schema</span>
              <textarea value={payload} onChange={(event) => setPayload(event.target.value)} rows={9} />
            </label>
          </div>
          <button className="primary-button" onClick={runAnalysis}>
            <SearchCheck size={18} />
            {connectionState === "checking" ? "Checking connection" : "Check production connection"}
          </button>
        </section>

        <aside className="panel-block readiness-card">
          <p className="eyebrow">Live Readiness</p>
          <strong>{analysis.readiness_score}%</strong>
          <span>{formatStatus(analysis.status)}</span>
          <p>{analysis.summary}</p>
          <div className="readiness-meta">
            <b>{analysis.environment}</b>
            <b>{modelType}</b>
            <b>{telemetrySource}</b>
          </div>
        </aside>
      </section>

      <section className="analysis-grid">
        <AnalysisColumn title="Required Live Events" items={analysis.required_events} />
        <AnalysisColumn title="Integration Steps" items={analysis.integration_steps} />
        <AnalysisColumn title="Production Monitors" items={analysis.monitors} />
      </section>

      <section className="analysis-grid">
        <AnalysisColumn title="Incident Triggers" items={analysis.incident_triggers} />
        <AnalysisColumn title="Security Gates" items={analysis.security_gates} />
        <section className="panel-block">
          <h2>Runtime Incident Loop</h2>
          <ActionRow text="Inference endpoint emits a trace id for every prediction request." />
          <ActionRow text="Telemetry stream sends latency, errors, confidence, drift, eval, feedback, and security events." />
          <ActionRow text="Scanner correlates events by trace id, model version, deployment id, and time window." />
          <ActionRow text="If a trigger matches, the platform opens an incident and starts the response workflow." />
        </section>
      </section>
    </>
  );
}

function ResponseView({ timeline }: { timeline: TimelineReport }) {
  const steps = [
    ["Detect", "Incident opened from monitoring trigger and correlated LLMOps events.", "Done"],
    ["Triage", `Validate top cause: ${timeline.suspected_causes[0]?.label ?? "unknown pattern"}.`, "Active"],
    ["Contain", "Freeze risky prompt, index, deployment, or model route before more users are affected.", "Next"],
    ["Recover", "Rollback, refresh index, or ship corrected guardrail and verify with evals.", "Next"],
    ["Learn", "Promote the failed case into a permanent monitor and postmortem action.", "Next"],
  ];

  return (
    <section className="response-grid">
      <section className="panel-block">
        <h2>Incident Response Flow</h2>
        <div className="response-steps">
          {steps.map(([name, text, state]) => (
            <article className="response-step" key={name}>
              <span>{state}</span>
              <h3>{name}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="panel-block">
        <h2>Commander Checklist</h2>
        <ActionRow text="Assign owner and severity within 5 minutes." />
        <ActionRow text="Confirm the affected agent, model version, prompt version, and retrieval index." />
        <ActionRow text="Pause unsafe traffic path or route users to the previous stable version." />
        <ActionRow text="Run replay test on the failing prompt or user journey." />
        <ActionRow text="Publish postmortem with monitor, eval, and deployment-gate fixes." />
      </section>
    </section>
  );
}

function TriggerView({ allEvents, timeline }: { allEvents: IncidentEvent[]; timeline: TimelineReport }) {
  const errorEvents = allEvents.filter((event) => ["warning", "error", "critical"].includes(event.severity));

  return (
    <>
      <section className="trigger-flow">
        <FlowStep icon={<Activity />} title="Monitor" text="Collect traces, evals, RAG freshness, latency, errors, guardrails, and user feedback." />
        <FlowStep icon={<BellRing />} title="Trigger" text="Open an incident when rules cross severity, impact, or freshness thresholds." />
        <FlowStep icon={<FileWarning />} title="Correlate" text="Join model calls, deploys, prompts, retrievers, tools, and user reports into one case." />
        <FlowStep icon={<Siren />} title="Respond" text="Recommend containment, rollback, replay tests, and postmortem actions." />
      </section>

      <section className="content-grid">
        <section className="panel-block">
          <h2>Trigger Rules</h2>
          <RuleRow
            title="RAG freshness breach"
            rule="retrieved_chunk.version < source_document.version"
            action="Open SEV-2 incident and block answer generation for policy content."
          />
          <RuleRow
            title="User-impact spike"
            rule="negative_feedback_rate > 8% for 10 minutes"
            action="Escalate to incident commander and attach recent prompts."
          />
          <RuleRow
            title="Eval regression"
            rule="production_replay_eval fails after deploy"
            action="Stop rollout, start rollback plan, and create postmortem draft."
          />
          <RuleRow
            title="Guardrail escape"
            rule="blocked_or_sensitive_output_detected"
            action="Quarantine conversation, redact logs, and notify security owner."
          />
          <RuleRow
            title="Model drift incident"
            rule="feature_drift_score > threshold AND confidence_drop > 20%"
            action="Open MLOps incident, compare last training data, and recommend retraining."
          />
          <RuleRow
            title="Training pipeline failure"
            rule="training_job_failed OR eval_gate_failed"
            action="Create release-blocking incident and attach logs, metrics, and failed checks."
          />
          <RuleRow
            title="Model serving degradation"
            rule="p95_latency_ms > slo OR error_rate > budget"
            action="Escalate serving incident and recommend rollback, autoscale, or canary pause."
          />
        </section>

        <aside className="panel-block">
          <h2>Current Incident Signals</h2>
          <Metric icon={<AlertTriangle />} label="Risk Signals" value={String(errorEvents.length)} tone={timeline.severity} />
          <Metric icon={<RadioTower />} label="Trigger Source" value={errorEvents[0]?.service ?? "No risk source"} />
          <Metric icon={<Clock3 />} label="Opened At" value={formatTime(timeline.first_seen)} />
          <Metric icon={<ListChecks />} label="Rule Status" value="Ready for automation" />
        </aside>
      </section>
    </>
  );
}

function IncidentBookView() {
  const incidentTypes = [
    ["Model serving outage", "High latency, high error rate, timeout spike, failed health checks.", "Rollback or shift traffic to stable version."],
    ["Quality regression", "Accuracy, precision, recall, F1, eval, or human feedback drops after release.", "Pause rollout and run replay eval."],
    ["Data drift", "Feature distribution, schema, nulls, freshness, or source behavior changes.", "Validate data contract and start retraining review."],
    ["Training failure", "Training job, feature build, eval gate, artifact upload, or approval step fails.", "Block deployment and attach failed job evidence."],
    ["PII leakage", "PII appears in prompts, outputs, logs, embeddings, datasets, or feedback.", "Redact, quarantine evidence, and notify security owner."],
    ["Prompt injection", "User or document tries to override policies, leak data, or force unsafe tool use.", "Block request, preserve trace, update guardrail."],
    ["RAG poisoning", "Untrusted or stale document changes retrieval behavior or answer quality.", "Disable source, refresh index, add source trust rule."],
    ["Agent tool misuse", "Agent calls forbidden tool, skips approval, writes bad memory, or changes infra.", "Revoke token, quarantine memory, require human approval."],
    ["Model theft/extraction", "Boundary probing, abnormal request volume, or repeated confidence harvesting.", "Rate-limit, watermark, rotate keys, open security case."],
    ["Cost explosion", "Token, GPU, job, or endpoint cost spikes outside expected range.", "Throttle workload and inspect traffic source."],
  ];

  return (
    <section className="incident-book">
      <section className="panel-block">
        <p className="eyebrow">Small Incident Book</p>
        <h2>LLMOps And MLOps Incidents The Scanner Can Detect</h2>
        <p>
          This book makes the product general: not only RAG. It covers model serving, training,
          data, agents, security, cost, and governance incidents.
        </p>
      </section>

      <section className="book-grid">
        {incidentTypes.map(([name, signal, action]) => (
          <article className="book-card" key={name}>
            <h3>{name}</h3>
            <p>{signal}</p>
            <strong>{action}</strong>
          </article>
        ))}
      </section>
    </section>
  );
}

function PostmortemView({ allEvents, timeline }: { allEvents: IncidentEvent[]; timeline: TimelineReport }) {
  const firstError = allEvents.find((event) => event.severity === "error" || event.severity === "critical");

  return (
    <section className="postmortem-grid">
      <section className="panel-block postmortem-paper">
        <p className="eyebrow">Postmortem Draft</p>
        <h2>{timeline.incident_name}</h2>
        <h3>Summary</h3>
        <p>{timeline.summary}</p>
        <h3>Customer Impact</h3>
        <p>{firstError?.details ?? "Impact still needs owner confirmation."}</p>
        <h3>Root Cause</h3>
        <p>
          Most likely cause: <strong>{timeline.suspected_causes[0]?.label ?? "unknown"}</strong> with{" "}
          {Math.round((timeline.suspected_causes[0]?.confidence ?? 0) * 100)}% confidence.
        </p>
        <h3>Corrective Actions</h3>
        {timeline.recommendations.map((recommendation) => (
          <ActionRow key={recommendation} text={recommendation} />
        ))}
      </section>
      <aside className="panel-block">
        <h2>Postmortem Quality</h2>
        <CheckItem label="Timeline reconstructed" ok />
        <CheckItem label="Evidence attached" ok />
        <CheckItem label="Owner assigned" />
        <CheckItem label="Customer impact reviewed" />
        <CheckItem label="Permanent monitor created" />
        <CheckItem label="Deployment gate updated" />
      </aside>
    </section>
  );
}

function SecurityView({ timeline }: { timeline: TimelineReport }) {
  return (
    <section className="security-grid">
      <section className="panel-block">
        <h2>Response Controls</h2>
        <ControlRow name="SOC 2 CC7 Monitoring" status="Pass" text="Incident has telemetry, severity, and event evidence." />
        <ControlRow name="SOC 2 CC6 Access" status="Review" text="Add owner approval before risky deployment rollback actions." />
        <ControlRow name="ISO 27001 Logging" status="Pass" text="Investigation uses timestamped event records." />
        <ControlRow name="ISO 27001 Incident Management" status="Pass" text="Detect, triage, contain, recover, and learn workflow is defined." />
        <ControlRow name="AI Governance Gate" status="Review" text={`Turn ${timeline.suspected_causes[0]?.label ?? "top cause"} into a release gate.`} />
      </section>
      <section className="panel-block">
        <h2>Security Recommendations</h2>
        <ActionRow text="Redact prompts, retrieved chunks, tool payloads, and feedback before sharing evidence." />
        <ActionRow text="Require signed prompt and retriever index versions in every incident." />
        <ActionRow text="Add rollback permission checks for agent, model, and RAG deployments." />
        <ActionRow text="Export an audit bundle with events, owners, actions, and final postmortem." />
      </section>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactElement<{ size?: number }>;
  label: string;
  value: string;
  tone?: Severity;
}) {
  return (
    <article className={`metric ${tone ?? ""}`}>
      {React.cloneElement(icon, { size: 20 })}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function Evidence({ event }: { event: IncidentEvent | null }) {
  if (!event) {
    return null;
  }

  return (
    <section className="panel-block evidence">
      <p className="eyebrow">Selected Evidence</p>
      <h2>{event.title}</h2>
      <p>{event.details}</p>
      <dl>
        <div>
          <dt>Type</dt>
          <dd>{event.type}</dd>
        </div>
        <div>
          <dt>Service</dt>
          <dd>{event.service}</dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>{event.severity}</dd>
        </div>
      </dl>
      <pre>{JSON.stringify(event.attributes, null, 2)}</pre>
    </section>
  );
}

function Causes({ timeline }: { timeline: TimelineReport }) {
  return (
    <section className="panel-block">
      <h2>Suspected Causes</h2>
      {timeline.suspected_causes.map((cause) => (
        <div className="cause-row" key={cause.label}>
          <div>
            <strong>{cause.label}</strong>
            <span>{cause.evidence_event_ids.join(", ")}</span>
          </div>
          <b>{Math.round(cause.confidence * 100)}%</b>
        </div>
      ))}
    </section>
  );
}

function ActionRow({ text }: { text: string }) {
  return (
    <div className="recommendation">
      <CheckCircle2 size={17} />
      <span>{text}</span>
    </div>
  );
}

function FlowStep({
  icon,
  title,
  text,
}: {
  icon: React.ReactElement<{ size?: number }>;
  title: string;
  text: string;
}) {
  return (
    <article className="flow-step">
      {React.cloneElement(icon, { size: 22 })}
      <ChevronRight className="flow-chevron" size={18} />
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

function ConnectorRow({
  icon,
  title,
  text,
}: {
  icon: React.ReactElement<{ size?: number }>;
  title: string;
  text: string;
}) {
  return (
    <article className="connector-row">
      {React.cloneElement(icon, { size: 20 })}
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

function AnalysisColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="panel-block">
      <h2>{title}</h2>
      {items.map((item) => (
        <ActionRow key={item} text={item} />
      ))}
    </section>
  );
}

function RuleRow({ title, rule, action }: { title: string; rule: string; action: string }) {
  return (
    <article className="rule-row">
      <div>
        <strong>{title}</strong>
        <code>{rule}</code>
      </div>
      <p>{action}</p>
    </article>
  );
}

function CheckItem({ label, ok = false }: { label: string; ok?: boolean }) {
  return (
    <div className={`check-item ${ok ? "ok" : ""}`}>
      <CheckCircle2 size={17} />
      <span>{label}</span>
    </div>
  );
}

function ControlRow({ name, status, text }: { name: string; status: "Pass" | "Review"; text: string }) {
  return (
    <article className="control-row">
      <div>
        <strong>{name}</strong>
        <p>{text}</p>
      </div>
      <span className={status === "Pass" ? "pass" : "review"}>{status}</span>
    </article>
  );
}

function analyzeModel(
  modelName: string,
  modelType: string,
  endpoint: string,
  environment: string,
  telemetrySource: string,
  payload: string,
): ModelConnectionReport {
  const lowerPayload = payload.toLowerCase();
  const hasText = /text|prompt|message|document|support|chat/.test(lowerPayload);
  const hasCustomer = /customer|email|phone|name|address|ssn|patient|user/.test(lowerPayload);
  const hasFinancial = /transaction|amount|risk|fraud|loan|payment|credit/.test(lowerPayload);
  const hasEndpoint = endpoint.trim().length > 0;
  const score = Math.max(62, 92 - (hasCustomer ? 8 : 0) - (hasText ? 6 : 0) - (hasEndpoint ? 0 : 12));

  return {
    name: modelName,
    environment,
    status: score >= 80 ? "ready_for_shadow_monitoring" : "needs_connection_hardening",
    readiness_score: score,
    summary: `${modelName || "This model"} is configured as a ${modelType.toLowerCase()} in ${environment}. The platform would start with shadow monitoring from ${telemetrySource}, then enable automatic incident creation after the stream is stable.`,
    required_events: [
      "inference.request.started",
      "inference.request.completed",
      "inference.request.failed",
      "model.version.changed",
      "prediction.feedback.received",
      "eval.regression.detected",
      "security.pii.detected",
    ],
    integration_steps: [
      "Register the live endpoint and production owner.",
      `Connect telemetry through ${telemetrySource}.`,
      "Attach trace id, model version, deployment id, and environment to every event.",
      "Run shadow monitoring before enabling automatic incident creation.",
      "Configure alert route, rollback owner, and postmortem owner.",
    ],
    monitors: [
      "p50, p95, and p99 inference latency by model version.",
      "Error rate, timeout rate, request volume, and saturation.",
      "Prediction distribution, confidence drift, and feature drift.",
      hasFinancial ? "Business outcome feedback for fraud, payment, risk, or financial decisions." : "Human feedback and accepted/rejected prediction rate.",
      hasText ? "Prompt, response, token, retrieval, and safety telemetry." : "Input schema, missing value, and feature freshness telemetry.",
    ],
    incident_triggers: [
      "Open incident when p95 latency or error rate breaks the production SLO.",
      "Open incident when confidence drops while negative feedback increases.",
      "Open incident when a new model version fails replay eval after deployment.",
      hasText ? "Open incident when prompt injection, unsafe output, or retrieval poisoning is detected." : "Open incident when feature drift and quality regression appear together.",
      "Open incident when traffic, token, GPU, or batch cost spikes outside baseline.",
    ],
    security_gates: [
      hasCustomer ? "Enable PII detection and log redaction before storing requests or outputs." : "Confirm request and output logs are safe to retain.",
      "Require API key or service identity for inference calls.",
      "Attach model version, dataset version, and deployment approval to every event.",
      "Block production rollout until rollback, monitoring, and owner are configured.",
      "Generate SOC 2 / ISO evidence from incident logs, access checks, and response actions.",
    ],
  };
}

function parsePayload(payload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payload) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

createRoot(document.getElementById("root")!).render(<App />);
