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

  /*
   * Text that existed in the textbox before voice mode started.
   * This is preserved so voice input can be added to an existing draft.
   */
  const voiceBasePromptRef =
    useRef("");

  /*
   * Permanent transcript for the current user voice session.
   *
   * IMPORTANT:
   * This survives browser recognition restarts.
   */
  const voiceFinalTranscriptRef =
    useRef("");

  /*
   * Temporary speech currently being recognized.
   *
   * This must NEVER be permanently appended until it becomes final.
   */
  const voiceInterimTranscriptRef =
    useRef("");

  /*
   * True only when the user explicitly pressed the microphone
   * to stop the entire voice session.
   */
  const voiceUserStopRef =
    useRef(false);

  const voiceRestartTimerRef =
    useRef<number | null>(null);

  const voiceRecognitionRunningRef =
    useRef(false);

  const voiceInitialStartRef =
    useRef(false);

  /*
   * Each browser recognition object receives a unique session id.
   * This prevents callbacks from an old recognition object from
   * modifying the new recognition session.
   */
  const voiceRecognitionSessionIdRef =
    useRef(0);

  useEffect(() => {
    const element = conversationRef.current;

    if (!element) return;

    element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      voiceUserStopRef.current = true;

      if (voiceRestartTimerRef.current !== null) {
        window.clearTimeout(
          voiceRestartTimerRef.current,
        );
        voiceRestartTimerRef.current = null;
      }

      recognitionRef.current?.abort();
      recognitionRef.current = null;
      voiceRecognitionRunningRef.current = false;
      voiceRecognitionSessionIdRef.current += 1;
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

  function buildVoicePrompt(
    finalTranscript: string,
    interimTranscript: string,
  ) {
    return [
      voiceBasePromptRef.current.trim(),
      finalTranscript.trim(),
      interimTranscript.trim(),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function updateVoicePrompt() {
    setPrompt(
      buildVoicePrompt(
        voiceFinalTranscriptRef.current,
        voiceInterimTranscriptRef.current,
      ),
    );
  }

  function finalizeVoiceInput() {
    const finalText = buildVoicePrompt(
      voiceFinalTranscriptRef.current,
      voiceInterimTranscriptRef.current,
    );

    setPrompt(finalText);

    voiceInitialStartRef.current = false;

    voiceBasePromptRef.current = "";
    voiceFinalTranscriptRef.current = "";
    voiceInterimTranscriptRef.current = "";
  }

  function clearVoiceRestartTimer() {
    if (voiceRestartTimerRef.current !== null) {
      window.clearTimeout(
        voiceRestartTimerRef.current,
      );

      voiceRestartTimerRef.current = null;
    }
  }

  function handleVoiceError(
    error: SpeechRecognitionErrorEventLike,
  ) {
    /*
     * These errors do not mean the user intentionally stopped.
     *
     * "no-speech" commonly occurs when the browser hears nothing
     * for a period of time. The continuous session should therefore
     * remain alive and onend will restart recognition.
     */
    if (error.error === "no-speech") {
      return;
    }

    /*
     * "aborted" is expected when the user explicitly stops or when
     * the recognition object is replaced.
     */
    if (error.error === "aborted") {
      return;
    }

    /*
     * Permission and hardware failures are different from a normal
     * browser recognition timeout. These should end the session.
     */
    if (
      error.error === "not-allowed" ||
      error.error === "service-not-allowed"
    ) {
      voiceUserStopRef.current = true;
      clearVoiceRestartTimer();
      setListening(false);

      toast.error("Microphone permission denied", {
        description:
          "Allow microphone access for TJC OS and try again.",
      });

      return;
    }

    if (error.error === "audio-capture") {
      voiceUserStopRef.current = true;
      clearVoiceRestartTimer();
      setListening(false);

      toast.error("Microphone unavailable", {
        description:
          "Check that your device microphone is available.",
      });

      return;
    }

    /*
     * For other recoverable browser recognition errors, the user's
     * voice session remains conceptually active. The recognition
     * lifecycle will be allowed to reach onend and restart.
     */
  }

  function startVoiceRecognitionSession() {
    if (voiceUserStopRef.current) {
      return;
    }

    const SpeechRecognition =
      getSpeechRecognition();

    if (!SpeechRecognition) {
      voiceUserStopRef.current = true;
      setListening(false);

      toast.error(
        "Voice input is not supported in this browser",
        {
          description:
            "Try a browser with speech recognition support.",
        },
      );

      return;
    }

    const sessionId =
      voiceRecognitionSessionIdRef.current + 1;

    voiceRecognitionSessionIdRef.current =
      sessionId;

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;

    /*
     * Interim results are required so the textbox can display
     * speech progressively.
     *
     * Interim text is stored separately and is NEVER appended
     * permanently until the browser marks it as final.
     */
    recognition.interimResults = true;

    recognition.lang = "en-ZA";

    recognition.onstart = () => {
      if (
        voiceUserStopRef.current ||
        voiceRecognitionSessionIdRef.current !==
          sessionId ||
        recognitionRef.current !== recognition
      ) {
        return;
      }

      voiceRecognitionRunningRef.current = true;
      setListening(true);

      if (!voiceInitialStartRef.current) {
        voiceInitialStartRef.current = true;

        toast.success("TJC AI is listening", {
          description:
            "Speak naturally. Pause whenever you need. Tap the microphone again when you are completely finished.",
        });
      }
    };

    recognition.onresult = (
      event: SpeechRecognitionEventLike,
    ) => {
      if (
        voiceUserStopRef.current ||
        voiceRecognitionSessionIdRef.current !==
          sessionId ||
        recognitionRef.current !== recognition
      ) {
        return;
      }

      /*
       * Only process results from resultIndex onward.
       *
       * Browser speech recognition maintains historical results
       * inside event.results. Processing the entire collection
       * every time would duplicate previously committed speech.
       */
      let newFinalText = "";
      let newInterimText = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result =
          event.results[index];

        if (!result) {
          continue;
        }

        const transcript =
          result[0]?.transcript?.trim() ?? "";

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          newFinalText = [
            newFinalText,
            transcript,
          ]
            .filter(Boolean)
            .join(" ");
        } else {
          newInterimText = [
            newInterimText,
            transcript,
          ]
            .filter(Boolean)
            .join(" ");
        }
      }

      /*
       * Any final result belongs permanently in the session
       * transcript. It is committed exactly once because we only
       * process the newly changed result range.
       */
      if (newFinalText) {
        voiceFinalTranscriptRef.current = [
          voiceFinalTranscriptRef.current.trim(),
          newFinalText.trim(),
        ]
          .filter(Boolean)
          .join(" ");
      }

      /*
       * Interim speech represents the CURRENT unfinished phrase.
       * It replaces the previous interim text instead of being
       * appended to it.
       */
      voiceInterimTranscriptRef.current =
        newInterimText;

      updateVoicePrompt();
    };

    recognition.onerror = (
      event: SpeechRecognitionErrorEventLike,
    ) => {
      if (
        voiceRecognitionSessionIdRef.current !==
          sessionId ||
        recognitionRef.current !== recognition
      ) {
        return;
      }

      handleVoiceError(event);
    };

    recognition.onend = () => {
      if (
        voiceRecognitionSessionIdRef.current !==
          sessionId ||
        recognitionRef.current !== recognition
      ) {
        return;
      }

      voiceRecognitionRunningRef.current = false;

      /*
       * If the user explicitly stopped the voice session,
       * recognition ending here is the expected final lifecycle
       * event. Do NOT restart.
       */
      if (voiceUserStopRef.current) {
        finalizeVoiceInput();

        setListening(false);

        recognitionRef.current = null;

        return;
      }

      /*
       * Browser recognition ended by itself.
       *
       * This is NOT the end of the user's voice session.
       *
       * Any interim speech that did not become final cannot safely
       * be treated as a permanent phrase across recognition
       * connections, so it is folded into the visible transcript
       * before restarting.
       */
      const interim =
        voiceInterimTranscriptRef.current.trim();

      if (interim) {
        voiceFinalTranscriptRef.current = [
          voiceFinalTranscriptRef.current.trim(),
          interim,
        ]
          .filter(Boolean)
          .join(" ");
      }

      voiceInterimTranscriptRef.current = "";

      updateVoicePrompt();

      /*
       * Keep the microphone UI ON.
       */
      setListening(true);

      clearVoiceRestartTimer();

      /*
       * Create a NEW recognition object on restart rather than
       * reusing the ended object. This prevents old browser
       * event.results from being replayed and duplicated.
       */
      voiceRestartTimerRef.current =
        window.setTimeout(() => {
          voiceRestartTimerRef.current = null;

          if (voiceUserStopRef.current) {
            return;
          }

          /*
           * Invalidate the old recognition session before creating
           * the next one.
           */
          if (
            recognitionRef.current === recognition
          ) {
            recognitionRef.current = null;
          }

          startVoiceRecognitionSession();
        }, 150);
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch {
      /*
       * A browser can reject start() when a previous recognition
       * lifecycle is still settling. Retry invisibly while the
       * user's microphone state remains ON.
       */
      voiceRecognitionRunningRef.current =
        false;

      if (
        voiceUserStopRef.current ||
        voiceRecognitionSessionIdRef.current !==
          sessionId
      ) {
        return;
      }

      clearVoiceRestartTimer();

      voiceRestartTimerRef.current =
        window.setTimeout(() => {
          voiceRestartTimerRef.current = null;

          if (voiceUserStopRef.current) {
            return;
          }

          if (
            recognitionRef.current === recognition
          ) {
            recognitionRef.current = null;
          }

          startVoiceRecognitionSession();
        }, 300);
    }
  }

  function toggleVoiceInput() {
    if (loading) return;

    /*
     * MICROPHONE ON -> OFF
     *
     * This is the ONLY normal action that ends the complete
     * user voice session.
     */
    if (listening) {
      voiceUserStopRef.current = true;

      clearVoiceRestartTimer();

      /*
       * Invalidate callbacks belonging to the current recognition
       * object so an asynchronous browser callback cannot restart
       * the voice session after the user has stopped it.
       */
      voiceRecognitionSessionIdRef.current += 1;

      const recognition =
        recognitionRef.current;

      if (recognition) {
        try {
          if (
            voiceRecognitionRunningRef.current
          ) {
            recognition.stop();
          } else {
            recognition.abort();
          }
        } catch {
          // The recognition lifecycle may already have ended.
        }
      }

      recognitionRef.current = null;
      voiceRecognitionRunningRef.current = false;

      /*
       * Preserve final + interim speech in the textbox.
       * Nothing is submitted here.
       */
      finalizeVoiceInput();

      setListening(false);

      return;
    }

    /*
     * MICROPHONE OFF -> ON
     */
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

    /*
     * Capture the existing draft exactly once at the beginning
     * of the complete user voice session.
     */
    voiceBasePromptRef.current =
      prompt.trim();

    voiceFinalTranscriptRef.current = "";
    voiceInterimTranscriptRef.current = "";

    voiceUserStopRef.current = false;
    voiceInitialStartRef.current = false;

    clearVoiceRestartTimer();

    /*
     * Make the UI immediately show that the user's continuous
     * microphone session is active.
     */
    setListening(true);

    startVoiceRecognitionSession();
  }

  function handleNewChat() {
    if (loading || listening) return;

    setMessages([]);
    setPrompt("");
  }

  async function handleSubmit() {
    const content = prompt.trim();

    if (!content || loading) return;

    /*
     * Ask TJC AI is always a manual submission.
     *
     * If the user presses Send while voice mode is active, stop
     * the microphone session first, but do not send a partial
     * transcript accidentally.
     */
    if (listening) {
      voiceUserStopRef.current = true;
      clearVoiceRestartTimer();

      voiceRecognitionSessionIdRef.current += 1;

      const recognition =
        recognitionRef.current;

      if (recognition) {
        try {
          if (
            voiceRecognitionRunningRef.current
          ) {
            recognition.stop();
          } else {
            recognition.abort();
          }
        } catch {
          // Recognition may already have ended.
        }
      }

      recognitionRef.current = null;
      voiceRecognitionRunningRef.current = false;

      finalizeVoiceInput();
      setListening(false);
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
              ? "TJC AI is listening. Pause or breathe naturally. Tap the microphone again to stop."
              : "Press Enter to send. Shift + Enter for a new line. Tap the microphone to speak."}
          </p>
        </div>
      </div>
    </div>
  );
}
