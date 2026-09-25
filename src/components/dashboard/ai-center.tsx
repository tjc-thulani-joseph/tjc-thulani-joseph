import { useState } from "react";
import { Bot, Loader2, Send, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requestTjcAi } from "@/services/ai/gateway";

export function AICenter() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const message = prompt.trim();

    if (!message || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setResponse("");

    const result = await requestTjcAi([
      {
        role: "user",
        content: message,
      },
    ]);

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setResponse(result.data?.message.content ?? "");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">
            System · Intelligence
          </p>

          <h1 className="mt-3 flex items-center gap-3 font-display text-3xl font-semibold">
            <Bot className="size-7 text-gold" aria-hidden />
            TJC AI
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The intelligence layer inside TJC OS. TJC AI connects your
            workspace to its active AI engine through a secure server-side
            gateway.
          </p>
        </div>

        <Badge
          variant="outline"
          className="border-border px-3 py-1.5 text-muted-foreground"
        >
          <span className="mr-2 size-1.5 rounded-full bg-gold" />
          Online
        </Badge>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Card className="surface-panel border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-gold" aria-hidden />
              TJC AI
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-muted-foreground">
              Permanent intelligence layer
            </p>
          </CardContent>
        </Card>

        <Card className="surface-panel border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Secure Gateway
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-muted-foreground">
              Authenticated server-side requests
            </p>
          </CardContent>
        </Card>

        <Card className="surface-panel border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="size-4 text-gold" aria-hidden />
              Credentials
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-sm text-muted-foreground">
              Provider keys stay off the browser
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-panel mt-8 border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            AI Workspace
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask TJC AI something..."
              className="min-h-32 resize-y"
              disabled={loading}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Requests are routed through the secure TJC AI gateway.
              </p>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!prompt.trim() || loading}
                className="rounded-full"
              >
                {loading ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden
                    />
                    Thinking…
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden />
                    Ask TJC AI
                  </>
                )}
              </Button>
            </div>

            {error ? (
              <div className="rounded-2xl border border-border p-4">
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : null}

            {response ? (
              <div className="rounded-2xl border border-border p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Bot className="size-4 text-gold" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                    TJC AI
                  </p>
                </div>

                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {response}
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
