import type { KeyboardEvent } from "react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bot,
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
  const [voiceAssistantEnabled, setVoiceAssistantEnabled] =
    useState(false);
  const [speakingMessageId, setSpeakingMessageId] =
    useState<string | null>(null);

  const loadingRef = useRef(false);

  const conversationRef =
    useRef<HTMLDivElement | null>(null);

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(null);

  const voiceBasePromptRef = useRef("");
  const voiceFinalTranscriptRef = useRef("");
  const voiceInterimTranscriptRef = useRef("");
  const voiceUserStopRef = useRef(false);
  const voiceRestartTimerRef =
    useRef<number | null>(null);
  const voiceRecognitionRunningRef =
    useRef(false);
  const voiceInitialStartRef = useRef(false);
  const voiceRecognitionSessionIdRef =
    useRef(0);

  const voiceAssistantEnabledRef =
    useRef(false);

  const voiceTurnSilenceTimerRef =
    useRef<number | null>(null);

  const voiceAssistantSubmittingRef =
    useRef(false);

  const speechUtteranceRef =
    useRef<SpeechSynthesisUtterance | null>(null);

  const speechSessionIdRef =
    useRef(0);

  useEffect(() => {
    const element = conversationRef.current;

    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    voiceAssistantEnabledRef.current =
      voiceAssistantEnabled;
  }, [voiceAssistantEnabled]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    return () => {
      voiceUserStopRef.current = true;
      voiceAssistantEnabledRef.current = false;

      if (voiceRestartTimerRef.current !== null) {
        window.clearTimeout(
          voiceRestartTimerRef.current,
        );
        voiceRestartTimerRef.current = null;
      }

      if (voiceTurnSilenceTimerRef.current !== null) {
        window.clearTimeout(
          voiceTurnSilenceTimerRef.current,
        );
        voiceTurnSilenceTimerRef.current = null;
      }

      recognitionRef.current?.abort();
      recognitionRef.current = null;
      voiceRecognitionRunningRef.current = false;
      voiceRecognitionSessionIdRef.current += 1;

      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }

      speechSessionIdRef.current += 1;
      speechUtteranceRef.current = null;
    };
  }, []);

  const canSend = useMemo(
    () =>
      prompt.trim().length > 0 &&
      !loading &&
      !voiceAssistantSubmittingRef.current,
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

  function normalizeSpeechText(text: string) {
    return text
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function appendSpeechDelta(
    existing: string,
    incoming: string,
  ) {
    const existingText = existing.trim();
    const incomingText = incoming.trim();

    if (!incomingText) {
      return existingText;
    }

    if (!existingText) {
      return incomingText;
    }

    const existingWords =
      existingText.split(/\s+/);

    const incomingWords =
      incomingText.split(/\s+/);

    const existingNormalized =
      normalizeSpeechText(existingText);

    const incomingNormalized =
      normalizeSpeechText(incomingText);

    if (
      incomingNormalized === existingNormalized ||
      existingNormalized.startsWith(
        incomingNormalized + " ",
      )
    ) {
      return existingText;
    }

    if (
      incomingNormalized.startsWith(
        existingNormalized + " ",
      )
    ) {
      return [
        existingText,
        ...incomingWords.slice(
          existingWords.length,
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    }

    const maxOverlap = Math.min(
      existingWords.length,
      incomingWords.length,
    );

    for (
      let overlap = maxOverlap;
      overlap > 0;
      overlap -= 1
    ) {
      const existingSuffix =
        normalizeSpeechText(
          existingWords
            .slice(
              existingWords.length - overlap,
            )
            .join(" "),
        );

      const incomingPrefix =
        normalizeSpeechText(
          incomingWords
            .slice(0, overlap)
            .join(" "),
        );

      if (existingSuffix === incomingPrefix) {
        return [
          existingText,
          ...incomingWords.slice(overlap),
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
      }
    }

    return [
      existingText,
      incomingText,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function extractSpeechDelta(
    committed: string,
    incoming: string,
  ) {
    const committedText = committed.trim();
    const incomingText = incoming.trim();

    if (!incomingText) {
      return "";
    }

    if (!committedText) {
      return incomingText;
    }

    const committedWords =
      committedText.split(/\s+/);

    const incomingWords =
      incomingText.split(/\s+/);

    const committedNormalized =
      normalizeSpeechText(committedText);

    const incomingNormalized =
      normalizeSpeechText(incomingText);

    if (
      incomingNormalized === committedNormalized ||
      committedNormalized.startsWith(
        incomingNormalized + " ",
      )
    ) {
      return "";
    }

    if (
      incomingNormalized.startsWith(
        committedNormalized + " ",
      )
    ) {
      return incomingWords
        .slice(committedWords.length)
        .join(" ")
        .trim();
    }

    return incomingText;
  }

  function updateVoicePrompt() {
    setPrompt(
      buildVoicePrompt(
        voiceFinalTranscriptRef.current,
        voiceInterimTranscriptRef.current,
      ),
    );
  }

  function clearVoiceRestartTimer() {
    if (voiceRestartTimerRef.current !== null) {
      window.clearTimeout(
        voiceRestartTimerRef.current,
      );

      voiceRestartTimerRef.current = null;
    }
  }

  function clearVoiceTurnSilenceTimer() {
    if (
      voiceTurnSilenceTimerRef.current !== null
    ) {
      window.clearTimeout(
        voiceTurnSilenceTimerRef.current,
      );

      voiceTurnSilenceTimerRef.current = null;
    }
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

  function stopRecognitionSession(
    preservePrompt = true,
  ) {
    clearVoiceRestartTimer();
    clearVoiceTurnSilenceTimer();

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

    if (preservePrompt) {
      finalizeVoiceInput();
    } else {
      voiceBasePromptRef.current = "";
      voiceFinalTranscriptRef.current = "";
      voiceInterimTranscriptRef.current = "";
    }

    setListening(false);
  }

  function stopSpeaking() {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      setSpeakingMessageId(null);
      speechUtteranceRef.current = null;
      return;
    }

    speechSessionIdRef.current += 1;

    window.speechSynthesis.cancel();

    speechUtteranceRef.current = null;
    setSpeakingMessageId(null);
  }

  function getPreferredSpeechVoice():
    SpeechSynthesisVoice | undefined {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return undefined;
    }

    const voices =
      window.speechSynthesis.getVoices();

    if (!voices.length) {
      return undefined;
    }

    return (
      voices.find(
        (voice) =>
          voice.lang.toLowerCase() ===
          "en-za",
      ) ??
      voices.find((voice) =>
        voice.lang
          .toLowerCase()
          .startsWith("en-gb"),
      ) ??
      voices.find((voice) =>
        voice.lang
          .toLowerCase()
          .startsWith("en-us"),
      ) ??
      voices.find((voice) =>
        voice.lang
          .toLowerCase()
          .startsWith("en"),
      ) ??
      voices.find(
        (voice) => voice.default,
      ) ??
      voices[0]
    );
  }

  function speakResponse(
    content: string,
    messageId: string,
  ) {
    const text = content.trim();

    if (!text) {
      return;
    }

    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      typeof SpeechSynthesisUtterance ===
        "undefined"
    ) {
      toast.error(
        "Voice playback is not supported",
        {
          description:
            "Your browser or device does not provide speech synthesis.",
        },
      );

      return;
    }

    /*
     * Critical feedback-loop protection:
     * stop the microphone before TJC AI speaks.
     */
    if (
      voiceAssistantEnabledRef.current
    ) {
      stopRecognitionSession(false);
    }

    speechSessionIdRef.current += 1;

    const sessionId =
      speechSessionIdRef.current;

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = "en-ZA";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const preferredVoice =
      getPreferredSpeechVoice();

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    speechUtteranceRef.current = utterance;
    setSpeakingMessageId(messageId);

    utterance.onend = () => {
      if (
        speechSessionIdRef.current !==
        sessionId
      ) {
        return;
      }

      if (
        speechUtteranceRef.current ===
        utterance
      ) {
        speechUtteranceRef.current = null;
      }

      setSpeakingMessageId(null);

      if (
        voiceAssistantEnabledRef.current
      ) {
        window.setTimeout(() => {
          if (
            voiceAssistantEnabledRef.current &&
            !loadingRef.current &&
            !voiceAssistantSubmittingRef.current
          ) {
            startAssistantListening();
          }
        }, 250);
      }
    };

    utterance.onerror = (event) => {
      if (
        speechSessionIdRef.current !==
        sessionId
      ) {
        return;
      }

      if (
        speechUtteranceRef.current ===
        utterance
      ) {
        speechUtteranceRef.current = null;
      }

      setSpeakingMessageId(null);

      if (
        event.error === "canceled" ||
        event.error === "interrupted"
      ) {
        return;
      }

      toast.error(
        "TJC AI could not play the voice response",
        {
          description:
            "Check your device audio output and try Listen again.",
        },
      );
    };

    window.speechSynthesis.speak(
      utterance,
    );
  }

  function handleVoiceError(
    error: SpeechRecognitionErrorEventLike,
  ) {
    if (
      error.error === "no-speech" ||
      error.error === "aborted"
    ) {
      return;
    }

    if (
      error.error === "not-allowed" ||
      error.error === "service-not-allowed"
    ) {
      voiceUserStopRef.current = true;

      clearVoiceRestartTimer();
      clearVoiceTurnSilenceTimer();

      setListening(false);

      toast.error(
        "Microphone permission denied",
        {
          description:
            "Allow microphone access for TJC OS and try again.",
        },
      );

      if (
        voiceAssistantEnabledRef.current
      ) {
        voiceAssistantEnabledRef.current =
          false;

        setVoiceAssistantEnabled(false);
      }

      return;
    }

    if (
      error.error === "audio-capture"
    ) {
      voiceUserStopRef.current = true;

      clearVoiceRestartTimer();
      clearVoiceTurnSilenceTimer();

      setListening(false);

      toast.error(
        "Microphone unavailable",
        {
          description:
            "Check that your device microphone is available.",
        },
      );

      if (
        voiceAssistantEnabledRef.current
      ) {
        voiceAssistantEnabledRef.current =
          false;

        setVoiceAssistantEnabled(false);
      }
    }
  }

  function scheduleAssistantTurnSubmit() {
    clearVoiceTurnSilenceTimer();

    if (
      !voiceAssistantEnabledRef.current ||
      voiceAssistantSubmittingRef.current
    ) {
      return;
    }

    voiceTurnSilenceTimerRef.current =
      window.setTimeout(() => {
        voiceTurnSilenceTimerRef.current =
          null;

        if (
          !voiceAssistantEnabledRef.current ||
          voiceAssistantSubmittingRef.current
        ) {
          return;
        }

        const content =
          buildVoicePrompt(
            voiceFinalTranscriptRef.current,
            voiceInterimTranscriptRef.current,
          ).trim();

        if (!content) {
          return;
        }

        voiceAssistantSubmittingRef.current =
          true;

        voiceUserStopRef.current = true;

        stopRecognitionSession(false);

        setPrompt("");

        void handleSubmitContent(
          content,
        ).finally(() => {
          voiceAssistantSubmittingRef.current =
            false;
        });
      }, 1600);
  }

  function startVoiceRecognitionSession(
    assistantMode = false,
  ) {
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

      if (assistantMode) {
        voiceAssistantEnabledRef.current =
          false;

        setVoiceAssistantEnabled(false);
      }

      return;
    }

    const sessionId =
      voiceRecognitionSessionIdRef.current +
      1;

    voiceRecognitionSessionIdRef.current =
      sessionId;

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;
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

      voiceRecognitionRunningRef.current =
        true;

      setListening(true);

      if (!voiceInitialStartRef.current) {
        voiceInitialStartRef.current = true;

        if (!assistantMode) {
          toast.success(
            "TJC AI is listening",
            {
              description:
                "Speak naturally. Tap the microphone again when you are completely finished.",
            },
          );
        }
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

      let nextInterim = "";

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
          result[0]?.transcript?.trim() ??
          "";

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          voiceFinalTranscriptRef.current =
            appendSpeechDelta(
              voiceFinalTranscriptRef.current,
              transcript,
            );
        } else {
          nextInterim =
            appendSpeechDelta(
              nextInterim,
              transcript,
            );
        }
      }

      voiceInterimTranscriptRef.current =
        extractSpeechDelta(
          voiceFinalTranscriptRef.current,
          nextInterim,
        );

      updateVoicePrompt();

      if (assistantMode) {
        scheduleAssistantTurnSubmit();
      }
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

      voiceRecognitionRunningRef.current =
        false;

      if (voiceUserStopRef.current) {
        if (!assistantMode) {
          finalizeVoiceInput();
        }

        setListening(false);
        recognitionRef.current = null;

        return;
      }

      const interim =
        voiceInterimTranscriptRef.current.trim();

      if (interim) {
        voiceFinalTranscriptRef.current =
          appendSpeechDelta(
            voiceFinalTranscriptRef.current,
            interim,
          );
      }

      voiceInterimTranscriptRef.current =
        "";

      updateVoicePrompt();

      if (
        assistantMode &&
        voiceAssistantEnabledRef.current
      ) {
        const content =
          buildVoicePrompt(
            voiceFinalTranscriptRef.current,
            "",
          ).trim();

        if (content) {
          scheduleAssistantTurnSubmit();
          return;
        }
      }

      setListening(true);

      clearVoiceRestartTimer();

      voiceRestartTimerRef.current =
        window.setTimeout(() => {
          voiceRestartTimerRef.current =
            null;

          if (
            voiceUserStopRef.current ||
            (assistantMode &&
              !voiceAssistantEnabledRef.current)
          ) {
            return;
          }

          if (
            recognitionRef.current ===
            recognition
          ) {
            recognitionRef.current = null;
          }

          startVoiceRecognitionSession(
            assistantMode,
          );
        }, 150);
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch {
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
          voiceRestartTimerRef.current =
            null;

          if (
            voiceUserStopRef.current ||
            (assistantMode &&
              !voiceAssistantEnabledRef.current)
          ) {
            return;
          }

          if (
            recognitionRef.current ===
            recognition
          ) {
            recognitionRef.current = null;
          }

          startVoiceRecognitionSession(
            assistantMode,
          );
        }, 300);
    }
  }

  function toggleVoiceInput() {
    if (
      loading ||
      voiceAssistantEnabled
    ) {
      return;
    }

    if (listening) {
      voiceUserStopRef.current = true;
      stopRecognitionSession(true);
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

    voiceBasePromptRef.current =
      prompt.trim();

    voiceFinalTranscriptRef.current = "";
    voiceInterimTranscriptRef.current = "";

    voiceUserStopRef.current = false;
    voiceInitialStartRef.current = false;

    clearVoiceRestartTimer();
    clearVoiceTurnSilenceTimer();

    setListening(true);

    startVoiceRecognitionSession(false);
  }

  function startAssistantListening() {
    if (
      !voiceAssistantEnabledRef.current ||
      loading ||
      voiceAssistantSubmittingRef.current ||
      speakingMessageId !== null
    ) {
      return;
    }

    const SpeechRecognition =
      getSpeechRecognition();

    if (!SpeechRecognition) {
      toast.error(
        "Voice assistant is not supported in this browser",
        {
          description:
            "Try a browser with speech recognition support.",
        },
      );

      voiceAssistantEnabledRef.current =
        false;

      setVoiceAssistantEnabled(false);

      return;
    }

    stopRecognitionSession(false);

    voiceBasePromptRef.current = "";
    voiceFinalTranscriptRef.current = "";
    voiceInterimTranscriptRef.current = "";

    voiceUserStopRef.current = false;
    voiceInitialStartRef.current = false;

    clearVoiceRestartTimer();
    clearVoiceTurnSilenceTimer();

    setPrompt("");
    setListening(true);

    startVoiceRecognitionSession(true);
  }

  function disableVoiceAssistant() {
    voiceAssistantEnabledRef.current =
      false;

    voiceUserStopRef.current = true;

    clearVoiceRestartTimer();
    clearVoiceTurnSilenceTimer();

    stopRecognitionSession(false);
    stopSpeaking();

    setVoiceAssistantEnabled(false);
  }

  function toggleVoiceAssistant() {
    if (voiceAssistantEnabled) {
      disableVoiceAssistant();
      return;
    }

    if (loading) {
      return;
    }

    const SpeechRecognition =
      getSpeechRecognition();

    if (!SpeechRecognition) {
      toast.error(
        "Voice assistant is not supported in this browser",
        {
          description:
            "Try a browser with speech recognition support.",
        },
      );

      return;
    }

    voiceAssistantEnabledRef.current =
      true;

    voiceUserStopRef.current = false;

    setVoiceAssistantEnabled(true);

    toast.success(
      "TJC AI voice assistant is ready",
      {
        description:
          "Speak naturally. TJC AI will answer aloud and listen again after it finishes speaking.",
      },
    );

    window.setTimeout(() => {
      if (
        voiceAssistantEnabledRef.current
      ) {
        startAssistantListening();
      }
    }, 150);
  }

  function handleNewChat() {
    if (loading) {
      return;
    }

    if (voiceAssistantEnabled) {
      disableVoiceAssistant();
    } else if (listening) {
      voiceUserStopRef.current = true;
      stopRecognitionSession(false);
    }

    stopSpeaking();

    setMessages([]);
    setPrompt("");
  }

  async function handleSubmitContent(
    content: string,
  ) {
    const cleanContent = content.trim();

    if (
      !cleanContent ||
      loading
    ) {
      return;
    }

    if (listening) {
      voiceUserStopRef.current = true;
      stopRecognitionSession(false);
    }

    stopSpeaking();

    const userMessage =
      createMessage(
        "user",
        cleanContent,
      );

    const assistantMessage =
      createMessage(
        "assistant",
        "",
      );

    const conversationMessages: AIMessage[] =
      [
        ...messages.map(
          ({
            role,
            content: messageContent,
          }) => ({
            role,
            content: messageContent,
          }),
        ),
        {
          role: userMessage.role,
          content:
            userMessage.content,
        },
      ];

    setPrompt("");

    setMessages((current) => [
      ...current,
      userMessage,
      assistantMessage,
    ]);

    setLoading(true);
    loadingRef.current = true;

    let assistantResponseText = "";

    try {
      const result =
        await streamTjcAi(
          conversationMessages,
          {
            onEvent: (event) => {
              if (
                event.type === "delta"
              ) {
                assistantResponseText +=
                  event.content;

                setMessages(
                  (current) =>
                    current.map(
                      (message) =>
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

              if (
                event.type === "error"
              ) {
                setMessages(
                  (current) =>
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
        setMessages(
          (current) =>
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
      } else if (
        assistantResponseText.trim()
      ) {
        speakResponse(
          assistantResponseText,
          assistantMessage.id,
        );
      }
    } catch (error) {
      setMessages(
        (current) =>
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
      loadingRef.current = false;
    }
  }

  async function handleSubmit() {
    const content = prompt.trim();

    if (
      !content ||
      loading
    ) {
      return;
    }

    if (listening) {
      voiceUserStopRef.current = true;
      stopRecognitionSession(true);
    }

    await handleSubmitContent(content);
  }

  function handleCopy(content: string) {
    void navigator.clipboard
      .writeText(content)
      .then(
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

  function handleListen(
    content: string,
    messageId: string,
  ) {
    if (
      speakingMessageId === messageId
    ) {
      stopSpeaking();
      return;
    }

    speakResponse(
      content,
      messageId,
    );
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
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
            disabled={loading}
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

              const isSpeaking =
                speakingMessageId ===
                message.id;

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
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleListen(
                                message.content,
                                message.id,
                              )
                            }
                            className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            aria-label={
                              isSpeaking
                                ? "Stop speaking"
                                : "Listen to response"
                            }
                            title={
                              isSpeaking
                                ? "Stop"
                                : "Listen"
                            }
                          >
                            {isSpeaking
                              ? "Stop"
                              : "Listen"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                message.content,
                              )
                            }
                            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                            aria-label="Copy response"
                            title="Copy response"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

                <div className="border-t border-border/60 p-4 sm:p-5">
          <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-background/70 p-2">
            <textarea
              value={prompt}
              onChange={(event) =>
                setPrompt(event.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={
                loading ||
                voiceAssistantEnabled
              }
              rows={1}
              placeholder={
                voiceAssistantEnabled
                  ? "Voice assistant is listening..."
                  : listening
                    ? "Listening..."
                    : "Message TJC AI..."
              }
              className="min-h-[46px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              onClick={
                toggleVoiceAssistant
              }
              disabled={loading}
              className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                voiceAssistantEnabled
                  ? "bg-gold text-background hover:opacity-90"
                  : "border border-border bg-background text-foreground hover:bg-muted"
              }`}
              aria-label={
                voiceAssistantEnabled
                  ? "Stop voice assistant"
                  : "Start voice assistant"
              }
              title={
                voiceAssistantEnabled
                  ? "Stop voice assistant"
                  : "Start voice assistant"
              }
            >
              <Bot className="h-5 w-5" />

              <span className="hidden lg:inline text-xs font-semibold">
                {voiceAssistantEnabled
                  ? "Voice on"
                  : "Voice"}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={
                loading ||
                voiceAssistantEnabled
              }
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 ${
                listening
                  ? "bg-gold text-background hover:opacity-90"
                  : "border border-border bg-background text-foreground hover:bg-muted"
              }`}
              aria-label={
                listening
                  ? "Stop microphone"
                  : "Start microphone"
              }
              title={
                listening
                  ? "Stop microphone"
                  : "Start microphone"
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
              onClick={() => {
                void handleSubmit();
              }}
              disabled={!canSend}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send message"
              title="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

          {voiceAssistantEnabled ? (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />

              <span>
                TJC AI voice assistant is active.
                Speak naturally — it will listen,
                respond, speak, and listen again.
              </span>
            </div>
          ) : listening ? (
            <div className="mt-3 text-center text-xs text-muted-foreground">
              TJC AI is listening. Tap the microphone
              when you are finished.
            </div>
          ) : (
            <div className="mt-3 text-center text-xs text-muted-foreground">
              Press Enter to send or Shift + Enter
              for a new line.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
