import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  Loader2,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

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
import type { AIMessage } from "@/services/ai/types";

type ChatMessage = AIMessage & {
  id: string;
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function AICenter() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(
    null,
  );

  const conversationEndRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function handleSubmit(
    event?: React.FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();

    const content = prompt.trim();

    if (!content || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content,
    };

    const nextMessages = [...messages, userMessage];

    /*
     * Clear the composer immediately.
     *
     * The message now belongs to the conversation,
     * not to the typing field.
     */
    setPrompt("");
    setMessages(nextMessages);
    setError("");
    setLoading(true);

    const result = await requestTjcAi(
      nextMessages.map(({ role, content: messageContent }) => ({
        role,
        content: messageContent,
      })),
    );

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    const assistantContent =
      result.data?.message.content?.trim();

    if (!assistantContent) {
      setError(
        "TJC AI returned an empty response. Please try again.",
      );
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role: "assistant",
        content: assistantContent,
      },
    ]);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!loading && prompt.trim()) {
      void handleSubmit();
    }
  }

  function handleNewChat() {
    if (loading) {
      return;
    }

    setMessages([]);
    setPrompt("");
    setError("");
    setCopiedId(null);
  }

  async function handleCopy(
    id: string,
    content: string,
  ) {
    try {
      await navigator.clipboard.writeText(content);

      setCopiedId(id);

      window.setTimeout(() => {
        setCopiedId((current) =>
          current === id ? null : current,
        );
      }, 1600);
    } catch {
      setError(
        "TJC AI could not copy that message.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">
            System · Intelligence
          </p>

          <h1 className="mt-3 flex items-center gap-3 font-display text-3xl font-semibold">
            <Bot
              className="size-7 text-gold"
              aria-hidden
            />
            TJC AI
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The intelligence layer inside TJC OS. TJC AI
            connects your workspace to its active engine
            through a secure server-side gateway.
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
              <Sparkles
                className="size-4 text-gold"
                aria-hidden
              />
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
              <ShieldCheck
                className="size-4 text-gold"
                aria-hidden
              />
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

      <Card className="surface-panel mt-8 overflow-hidden border-border">
        <CardHeader className="border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display text-lg">
                TJC AI Workspace
              </CardTitle>

              <p className="mt-1 text-xs text-muted-foreground">
                Your conversation stays here until you
                start a new chat.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleNewChat}
              disabled={
                loading || messages.length === 0
              }
              className="rounded-full"
            >
              <Plus
                className="size-4"
                aria-hidden
              />
              New chat
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex min-h-[520px] flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              {messages.length === 0 ? (
                <div className="flex min-h-[380px] items-center justify-center">
                  <div className="max-w-md text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border">
                      <Bot
                        className="size-7 text-gold"
                        aria-hidden
                      />
                    </div>

                    <h2 className="mt-5 font-display text-xl font-semibold">
                      Welcome to TJC AI
                    </h2>

                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      Hi and welcome to TJC OS. How can I
                      help you today?
                    </p>

                    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                      Ask a question to begin your
                      conversation with TJC AI.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isUser =
                    message.role === "user";

                  return (
                    <div
                      key={message.id}
                      className={`flex ${
                        isUser
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex max-w-[90%] gap-3 sm:max-w-[78%] ${
                          isUser
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                      >
                        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-border">
                          {isUser ? (
                            <User
                              className="size-4"
                              aria-hidden
                            />
                          ) : (
                            <Bot
                              className="size-4 text-gold"
                              aria-hidden
                            />
                          )}
                        </div>

                        <div
                          className={`rounded-2xl border p-4 ${
                            isUser
                              ? "border-border bg-muted/40"
                              : "border-border bg-background"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold">
                              {isUser
                                ? "You"
                                : "TJC AI"}
                            </p>

                            {!isUser ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() =>
                                  void handleCopy(
                                    message.id,
                                    message.content,
                                  )
                                }
                                aria-label="Copy TJC AI response"
                              >
                                {copiedId ===
                                message.id ? (
                                  <Check
                                    className="size-3.5"
                                    aria-hidden
                                  />
                                ) : (
                                  <Copy
                                    className="size-3.5"
                                    aria-hidden
                                  />
                                )}
                              </Button>
                            ) : null}
                          </div>

                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {loading ? (
                <div className="flex justify-start">
                  <div className="flex max-w-[90%] gap-3 sm:max-w-[78%]">
                    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-border">
                      <Bot
                        className="size-4 text-gold"
                        aria-hidden
                      />
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center gap-2">
                        <Loader2
                          className="size-4 animate-spin text-gold"
                          aria-hidden
                        />
                        <span className="text-sm text-muted-foreground">
                          TJC AI is thinking…
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div ref={conversationEndRef} />
            </div>
                        <div className="border-t border-border p-4 sm:p-5">
              {error ? (
                <div className="mb-3 rounded-xl border border-border px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    {error}
                  </p>
                </div>
              ) : null}

              <form
                onSubmit={(event) =>
                  void handleSubmit(event)
                }
                className="rounded-2xl border border-border bg-background p-2"
              >
                <Textarea
                  value={prompt}
                  onChange={(event) =>
                    setPrompt(event.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="Message TJC AI..."
                  className="min-h-24 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  disabled={loading}
                  autoComplete="off"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1 pt-2">
                  <p className="text-[0.68rem] text-muted-foreground">
                    Enter to send · Shift + Enter for a new
                    line
                  </p>

                  <div className="flex items-center gap-2">
                    {messages.length > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleNewChat}
                        disabled={loading}
                        className="rounded-full"
                      >
                        <Trash2
                          className="size-4"
                          aria-hidden
                        />
                        Clear
                      </Button>
                    ) : null}

                    <Button
                      type="submit"
                      disabled={
                        !prompt.trim() || loading
                      }
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
                          <Send
                            className="size-4"
                            aria-hidden
                          />
                          Ask TJC AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>

              <p className="mt-3 text-center text-[0.68rem] text-muted-foreground">
                TJC AI · Intelligence layer inside TJC OS
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
