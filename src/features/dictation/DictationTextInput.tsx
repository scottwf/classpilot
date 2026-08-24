"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square } from "lucide-react";

// The Web Speech API isn't in TS's standard DOM lib and is still
// vendor-prefixed in the one browser family that supports it well
// (Chrome/Edge) -- this is the minimal shape this component actually uses,
// not a full type definition.
type SpeechRecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Browser support for speech recognition doesn't change during a session,
// so there's nothing to subscribe to -- this just needs the SSR/hydration
// story right (server and the client's first pass both see "unsupported",
// then the real client value takes over), which useSyncExternalStore
// gives for free without a setState-in-effect anti-pattern.
function subscribeToNothing() {
  return () => {};
}

function getSpeechSupportSnapshot(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

function getServerSpeechSupportSnapshot(): boolean {
  return false;
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

type DictationTextInputProps = {
  action: (formData: FormData) => void | Promise<void>;
};

/**
 * An alternative to uploading an audio file: paste text directly, or use
 * the browser's built-in speech recognition (Chrome/Edge; silently absent
 * elsewhere -- feature-detected, not polyfilled) to dictate into the same
 * textarea. Submits straight to submitTextDictationAction, which skips
 * the transcription step entirely (there's nothing to transcribe) and
 * goes straight to draft generation.
 */
export function DictationTextInput({ action }: DictationTextInputProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const speechSupported = useSyncExternalStore(
    subscribeToNothing,
    getSpeechSupportSnapshot,
    getServerSpeechSupportSnapshot,
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      if (finalTranscript) {
        setText((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
      }
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Date this happened</span>
        <input
          className={inputClass}
          defaultValue={new Date().toISOString().slice(0, 10)}
          name="recordedDate"
          type="date"
        />
      </label>

      <label className="block">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-700">Paste or dictate text</span>
          {speechSupported ? (
            <button
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
                isListening
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
              onClick={toggleListening}
              type="button"
            >
              {isListening ? (
                <Square aria-hidden="true" className="size-3" />
              ) : (
                <Mic aria-hidden="true" className="size-3" />
              )}
              {isListening ? "Stop" : "Dictate"}
            </button>
          ) : null}
        </div>
        <textarea
          className={`${inputClass} mt-2`}
          name="transcript"
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste text here, or click Dictate to use your browser's speech recognition..."
          rows={6}
          value={text}
        />
      </label>

      <button
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
        type="submit"
      >
        Submit
      </button>
    </form>
  );
}
