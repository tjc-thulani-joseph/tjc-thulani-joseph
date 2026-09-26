import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  Mic,
  MessageCircle,
  Server,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  getActiveAIEngine,
} from "@/services/ai/engine-registry";
import {
  getConfiguredAIProviders,
} from "@/services/ai/provider-registry";

interface ManagementCardProps {
  icon: typeof Bot;
  title: string;
  description: string;
  status: string;
  statusType: "active" | "available" | "planned";
  children?: React.ReactNode;
}

function ManagementCard({
  icon: Icon,
  title,
  description,
  status,
  statusType,
  children,
}: ManagementCardProps) {
  const statusClass =
    statusType === "active"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : statusType === "available"
        ? "border-gold/20 bg-gold/10 text-gold"
        : "border-border bg-muted/30 text-muted-foreground";

  return (
    <div className="surface-panel rounded-2xl border border-border/60 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
          <Icon className="size-5" aria-hidden />
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] ${statusClass}`}
        >
          {status}
        </span>
      </div>

      <h2 className="mt-5 font-display text-lg font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

function ManagementLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold transition hover:text-gold/80"
    >
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

export function AIManagement() {
  const activeEngine = getActiveAIEngine();
  const configuredProviders = getConfiguredAIProviders();

  const [voiceAvailable, setVoiceAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const speechRecognitionAvailable =
      "SpeechRecognition" in window ||
      "webkitSpeechRecognition" in window;

    const speechSynthesisAvailable =
      "speechSynthesis" in window;

    setVoiceAvailable(
      speechRecognitionAvailable && speechSynthesisAvailable,
    );
  }, []);

  const activeProvider =
    configuredProviders.find(
      (provider) =>
        provider.adapterKey === activeEngine?.id,
    ) ?? configuredProviders[0] ?? null;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/dashboard/$module"
            params={{ module: "manage-center" }}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:text-gold"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to TJC Manage Center
          </Link>

          <p className="mt-6 text-xs uppercase tracking-[0.28em] text-gold">
            TJC Manage Center · AI
          </p>

          <h1 className="mt-3 font-display text-3xl font-semibold">
            TJC AI Management
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Control and inspect the TJC AI operating layer from one
            management surface. TJC AI remains the product identity;
            external AI engines are replaceable runtime adapters.
          </p>
        </div>

        <Link
          to="/dashboard/$module"
          params={{ module: "manage-center" }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-foreground transition hover:border-gold/50 hover:text-gold"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Manage Center
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="surface-panel rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              TJC AI
            </span>
          </div>

          <p className="mt-3 font-display text-xl font-semibold">
            Operational
          </p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            The conversational AI runtime is connected through the
            TJC AI gateway.
          </p>
        </div>

        <div className="surface-panel rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3">
            <Server className="size-5 text-gold" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              Active Engine
            </span>
          </div>

          <p className="mt-3 font-display text-xl font-semibold">
            {activeEngine?.backend ?? "Not configured"}
          </p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Runtime selection is controlled by the TJC AI server
            adapter layer.
          </p>
        </div>

        <div className="surface-panel rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-gold" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">
              Runtime Boundary
            </span>
          </div>

          <p className="mt-3 font-display text-xl font-semibold">
            Protected
          </p>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Provider credentials stay on the server and are never
            placed in browser code.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <ManagementCard
          icon={Bot}
          title="AI Engine"
          description={
            activeEngine
              ? `${activeEngine.description} Current capabilities: ${activeEngine.capabilities.join(", ")}.`
              : "No active TJC AI engine is currently registered."
          }
          status={activeEngine ? "Active" : "Unavailable"}
          statusType={activeEngine ? "active" : "planned"}
        >
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              <span className="text-foreground">Engine:</span>{" "}
              {activeEngine?.backend ?? "None"}
            </p>

            <p>
              <span className="text-foreground">Provider:</span>{" "}
              {activeProvider?.label ?? "None"}
            </p>

            <p>
              <span className="text-foreground">Selection:</span>{" "}
              {activeEngine?.selectable
                ? "Selectable"
                : "Not selectable"}
            </p>
          </div>
        </ManagementCard>

        <Link
          to="/dashboard/$module"
          params={{ module: "ai" }}
          className="block rounded-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <ManagementCard
            icon={MessageCircle}
            title="Conversation"
            description="The actual conversational interface remains in TJC AI Center, including text conversation, streaming responses and the existing conversational loop."
            status="Available"
            statusType="available"
          >
            <ManagementLink
              to="/dashboard/$module"
              params={{ module: "ai" }}
            >
              Open TJC AI Center
            </ManagementLink>
          </ManagementCard>
        </Link>

        <Link
          to="/dashboard/$module"
          params={{ module: "ai" }}
          className="block rounded-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <ManagementCard
            icon={Mic}
            title="Voice"
            description="Voice interaction is already connected to TJC AI Center. The management layer reports browser capability while the actual voice conversation remains in the working AI interface."
            status={voiceAvailable ? "Browser ready" : "Use AI Center"}
            statusType={voiceAvailable ? "active" : "available"}
          >
            <div className="space-y-3">
              <p className="text-xs leading-5 text-muted-foreground">
                Speech recognition and speech synthesis are both
                detected in this browser.
              </p>

              <ManagementLink
                to="/dashboard/$module"
                params={{ module: "ai" }}
              >
                Open voice assistant
              </ManagementLink>
            </div>
          </ManagementCard>
        </Link>

        <Link
          to="/dashboard/$module"
          params={{ module: "ai-knowledge" }}
          className="block rounded-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <ManagementCard
            icon={Database}
            title="Knowledge"
            description="TJC AI has a live knowledge layer backed by the TJC OS database. Verified knowledge can be managed separately and supplied to TJC AI when relevant."
            status="Operational"
            statusType="active"
          >
            <ManagementLink
              to="/dashboard/$module"
              params={{ module: "ai-knowledge" }}
            >
              Manage AI knowledge
            </ManagementLink>
          </ManagementCard>
        </Link>

        <ManagementCard
          icon={Bot}
          title="Memory"
          description="Persistent AI memory is intentionally not marked operational yet. The future memory system will be built as a TJC-owned subsystem rather than delegated to an external AI provider."
          status="Not operational"
          statusType="planned"
        >
          <p className="text-xs leading-5 text-muted-foreground">
            Next architecture work: persistent memory, memory
            retrieval, user control, retention rules and memory
            security.
          </p>
        </ManagementCard>

        <ManagementCard
          icon={Wrench}
          title="Tools & Permissions"
          description="TJC AI does not yet have the final controlled tool-execution layer. This is where future actions will be registered, validated, authorized, executed and audited."
          status="Not operational"
          statusType="planned"
        >
          <p className="text-xs leading-5 text-muted-foreground">
            The future system will use explicit tools and
            permissions rather than unrestricted database access.
          </p>
        </ManagementCard>
      </section>

      <section className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-6">
        <div className="flex items-start gap-4">
          <Server className="mt-0.5 size-5 shrink-0 text-gold" />

          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gold">
              Runtime architecture
            </p>

            <h2 className="mt-3 font-display text-xl font-semibold">
              TJC owns the intelligence layer
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
              The current runtime is intentionally separated into
              layers: the TJC OS interface communicates with the TJC
              AI gateway, the gateway selects the server-side
              adapter, and the adapter communicates with the external
              AI provider. This keeps provider credentials and
              provider-specific implementation outside the browser.
            </p>

            <div className="mt-5 grid gap-3 text-xs text-muted-foreground sm:grid-cols-4">
              <div className="rounded-xl border border-border/60 p-3">
                TJC OS
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                TJC AI Gateway
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                Adapter Layer
              </div>
              <div className="rounded-xl border border-border/60 p-3">
                AI Provider
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-6">
        <div className="flex items-start gap-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-gold" />

          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gold">
              Next control layer
            </p>

            <h2 className="mt-3 font-display text-xl font-semibold">
              Tools, permissions and execution
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
              The next major TJC AI checkpoint is the controlled tool
              system. It will allow TJC AI to perform real operations
              across TJC OS while respecting explicit permissions,
              validation and audit requirements.
            </p>

            <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <ShieldCheck className="size-4" />
              No unrestricted database execution
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
