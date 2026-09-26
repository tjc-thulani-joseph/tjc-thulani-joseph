import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Mic,
  MicOff,
  Plus,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { streamTjcAi } from "@/services/ai/gateway";
import type { AIMessage } from "@/services/ai/types";

interface ChatMessage extends AIMessage {
  id: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    [index: number]: SpeechRecognitionResultLike;
    length: number;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult:
    | ((event: SpeechRecognitionEventLike) => void)
    | null;
  onerror:
    | ((event: SpeechRecognitionErrorEventLike) => void)
    | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function createMessage(
  role: AIMessage["role"],
  content: string,
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    role,
    content,
  };
}

export function AICenter() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const conversationRef =
    useRef<HTMLDivElement | null>(null);

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(null);
    const voiceBasePromptRef =
    useRef("");

  const voiceFinalTranscriptRef =
    useRef("");

  const voiceInterimTranscriptRef =
    useRef("");

  useEffect(() => {
    const element = conversationRef.current;

    if (!element) return;

    element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const canSend = useMemo(
    () => prompt.trim().length > 0 && !loading,
    [prompt, loading],
  );

  function getSpeechRecognition():
    | SpeechRecognitionConstructor
    | null {
    if (typeof window === "undefined") {
      return null;
    }

    return (
      window.SpeechRecognition ??
      window.webkitSpeechRecognition ??
      null
    );
  }

  function handleVoiceError(
    error: SpeechRecognitionErrorEventLike,
  ) {
    setListening(false);

    if (error.error === "not-allowed") {
      toast.error("Microphone permission denied", {
        description:
          "Allow microphone access for TJC OS and try again.",
      });
      return;
    }

    if (error.error === "no-speech") {
      toast.info("No speech detected", {
        description:
          "Tap the microphone and speak again.",
      });
      return;
    }

    if (error.error === "audio-capture") {
      toast.error("Microphone unavailable", {
        description:
          "Check that your device microphone is available.",
      });
      return;
    }

    toast.error("Voice input stopped", {
      description:
        "TJC OS could not continue listening.",
    });
  }

  function toggleVoiceInput() {
    if (loading) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition =
      getSpeechRecognition();

    if (!SpeechRecognition) {
      toast.error(
        "Voice input is not supported in this browser",
        {
          description:
            "Try a browser with speech recognition support.",
        },
      );
      return;
    }

     const recognition =
      new SpeechRecognition();

    voiceBasePromptRef.current =
      prompt.trim();

    voiceFinalTranscriptRef.current =
      "";

    voiceInterimTranscriptRef.current =
      "";

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-ZA";

    recognition.onstart = () => {
      setListening(true);

      toast.success("TJC AI is listening", {
        description:
          "Speak naturally. Your words will appear in the message box.",
      });
    };
    recognition.onresult = (
      event: SpeechRecognitionEventLike,
    ) => {
      let interimTranscript = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const transcript =
          result[0]?.transcript ?? "";

        if (result.isFinal) {
          const finalText =
            transcript.trim();

          if (finalText) {
            voiceFinalTranscriptRef.current =
              [
                voiceFinalTranscriptRef.current,
                finalText,
              ]
                .filter(Boolean)
                .join(" ");
          }
        } else {
          interimTranscript += transcript;
        }
      }

      voiceInterimTranscriptRef.current =
        interimTranscript.trim();

      const combinedText = [
        voiceBasePromptRef.current,
        voiceFinalTranscriptRef.current,
        voiceInterimTranscriptRef.current,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      setPrompt(combinedText);
    };
    
    recognition.onerror = (
      event: SpeechRecognitionErrorEventLike,
    ) => {
      handleVoiceError(event);
    };

        recognition.onend = () => {
      const finalText = [
        voiceBasePromptRef.current,
        voiceFinalTranscriptRef.current,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      setPrompt(finalText);

      voiceInterimTranscriptRef.current =
        "";

      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);

      toast.error(
        "Could not start voice input",
        {
          description:
            "Please try the microphone again.",
        },
      );
    }
  }

  function handleNewChat() {
    if (loading || listening) return;

    setMessages([]);
    setPrompt("");
  }

  async function handleSubmit() {
    const content = prompt.trim();

    if (!content || loading) return;

    if (listening) {
      recognitionRef.current?.stop();
    }

    const userMessage =
      createMessage("user", content);

    const assistantMessage =
      createMessage("assistant", "");

    const conversationMessages: AIMessage[] = [
      ...messages.map(
        ({ role, content: messageContent }) => ({
          role,
          content: messageContent,
        }),
      ),
      {
        role: userMessage.role,
        content: userMessage.content,
      },
    ];

    setPrompt("");

    setMessages((current) => [
      ...current,
      userMessage,
      assistantMessage,
    ]);

    setLoading(true);

    try {
      const result =
        await streamTjcAi(
          conversationMessages,
          {
            onEvent: (event) => {
              if (event.type === "delta") {
                setMessages((current) =>
                  current.map((message) =>
                    message.id ===
                    assistantMessage.id
                      ? {
                          ...message,
                          content:
                            message.content +
                            event.content,
                        }
                      : message,
                  ),
                );

                return;
              }

              if (event.type === "error") {
                setMessages((current) =>
                  current.filter(
                    (message) =>
                      message.id !==
                      assistantMessage.id,
                  ),
                );

                toast.error(
                  "TJC AI could not complete the response",
                  {
                    description:
                      event.error.message,
                  },
                );
              }
            },
          },
        );

      if (result.error) {
        setMessages((current) =>
          current.filter(
            (message) =>
              message.id !==
              assistantMessage.id,
          ),
        );

        toast.error(
          "TJC AI could not complete the response",
          {
            description:
              result.error.message,
          },
        );
      }
    } catch (error) {
      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !==
            assistantMessage.id,
        ),
      );

      toast.error(
        "TJC AI could not complete the response",
        {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred.",
        },
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(content: string) {
    void navigator.clipboard.writeText(content).then(
      () => {
        toast.success(
          "Copied to clipboard",
        );
      },
      () => {
        toast.error(
          "Could not copy response",
        );
      },
    );
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (canSend) {
        void handleSubmit();
      }
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
              TJC AI
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Intelligence Layer
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              TJC AI is the intelligence layer inside
              TJC OS. External AI engines are internal
              infrastructure and are not the identity of
              this system.
            </p>
          </div>

          <button
            type="button"
            onClick={handleNewChat}
            disabled={loading || listening}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm backdrop-blur">
        <div
          ref={conversationRef}
          className="min-h-[420px] flex-1 space-y-5 overflow-y-auto p-5 sm:p-6"
        >
          {messages.length === 0 ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <div className="max-w-lg text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
                  <span className="text-lg font-bold">
                    TJC
                  </span>
                </div>

                <h2 className="mt-5 text-xl font-semibold">
                  Welcome to TJC AI
                </h2>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Ask TJC AI a question, explore an idea,
                  or work with your TJC OS knowledge and
                  systems.
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
                    className={`max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
                      isUser
                        ? "bg-foreground text-background"
                        : "border border-border/60 bg-background/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 whitespace-pre-wrap text-sm leading-6">
                        {message.content ||
                          (loading && !isUser
                            ? "…"
                            : "")}
                      </div>

                      {!isUser &&
                      message.content ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              message.content,
                            )
                          }
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label="Copy response"
                          title="Copy response"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border/60 p-4 sm:p-5">
          <div className="flex items-end gap-3 rounded-2xl border border-border/70 bg-background/70 p-2">
            <textarea
              value={prompt}
              onChange={(event) =>
                setPrompt(event.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              placeholder={
                listening
                  ? "Listening..."
                  : "Message TJC AI..."
              }
              className="min-h-[46px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={loading}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 ${
                listening
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "border border-border bg-background text-foreground hover:bg-muted"
              }`}
              aria-label={
                listening
                  ? "Stop listening"
                  : "Start voice input"
              }
              title={
                listening
                  ? "Stop listening"
                  : "Voice input"
              }
            >
              {listening ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                void handleSubmit()
              }
              disabled={!canSend}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" />

              <span className="hidden sm:inline">
                {loading
                  ? "Streaming…"
                  : "Ask TJC AI"}
              </span>
            </button>
          </div>

          <p className="mt-2 px-2 text-xs text-muted-foreground">
            {listening
              ? "TJC AI is listening. Tap the microphone again to stop."
              : "Press Enter to send. Shift + Enter for a new line. Tap the microphone to speak."}
          </p>
        </div>
      </div>
    </div>
  );
}
