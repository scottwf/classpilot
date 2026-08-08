"use client";

import Link from "next/link";
import { AlertTriangle, Bot, Send, Wrench } from "lucide-react";
import { useState } from "react";
import { sendChatMessageAction } from "@/app/assistant/chat-actions";
import type { OrchestratorMessage, ToolCallRecord } from "@/src/lib/assistant/chat";

type ChatTurn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls: ToolCallRecord[] };

type AssistantChatPageProps = {
  aiConfigured: boolean;
  aiLocalConfigured: boolean;
};

const toolLabels: Record<string, (record: ToolCallRecord) => string> = {
  create_class: (record) => `Created class: ${record.arguments.name ?? ""}`,
  set_class_schedule: (record) => `Set the schedule for class ${record.arguments.classId ?? ""}`,
  create_unit: (record) => `Created unit: ${record.arguments.title ?? ""}`,
  create_lesson: (record) => `Added lesson: ${record.arguments.title ?? ""}`,
  draft_unit_outline: () => "Drafted a unit outline",
  save_unit_from_outline: () => "Saved the unit from the drafted outline",
  draft_lesson_sections: () => "Drafted lesson sections",
  list_classes: () => "Looked up classes",
  list_units: () => "Looked up units",
  list_outcomes: () => "Looked up curriculum outcomes",
  list_students: () => "Looked up the student roster",
  get_student_profile: () => "Looked up a student profile",
  create_student: (record) =>
    `Added student: ${record.arguments.firstName ?? ""} ${record.arguments.lastName ?? ""}`.trim(),
  create_student_note: () => "Added a student note",
};

function summarizeToolCall(record: ToolCallRecord): string {
  const label = toolLabels[record.name]?.(record) ?? record.name.replace(/_/g, " ");
  return record.result.ok ? label : `${label} — failed: ${record.result.error ?? "unknown error"}`;
}

export function AssistantChatPage({ aiConfigured, aiLocalConfigured }: AssistantChatPageProps) {
  const configured = aiConfigured || aiLocalConfigured;
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [history, setHistory] = useState<OrchestratorMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string>();
  const [lastDriver, setLastDriver] = useState<"local" | "hosted">();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setInput("");
    setError(undefined);
    setTurns((previous) => [...previous, { content: text, role: "user" }]);
    setIsSending(true);

    const result = await sendChatMessageAction(history, text);

    setIsSending(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setHistory(result.newMessages);
    setLastDriver(result.driver);
    setTurns((previous) => [
      ...previous,
      { content: result.reply, role: "assistant", toolCalls: result.toolCalls },
    ]);
  }

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">Assistant</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Chat with your planning assistant.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Ask it to create and schedule classes, draft and save units and
          lessons, or look up and log student records. It can see and change
          real data in ClassPilot — review what it did in the transcript
          below each reply.
        </p>
      </section>

      {!configured ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          The assistant isn&apos;t configured yet. Set up a local model or a
          hosted provider on the{" "}
          <Link className="underline" href="/settings">
            Settings
          </Link>{" "}
          page.
        </p>
      ) : !aiLocalConfigured ? (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            No local model configured — student-record tools are unavailable
            in this chat. Add one on the{" "}
            <Link className="underline" href="/settings">
              Settings
            </Link>{" "}
            page to enable them.
          </span>
        </p>
      ) : null}

      <div className="flex min-h-[28rem] flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {turns.length === 0 ? (
            <p className="text-sm text-slate-500">
              Try: &quot;Create a Grade 6 ELA class and schedule it 9:00–10:05
              on days 1 through 6&quot; or &quot;Create a Diversity of Life
              unit in Science with all the outcomes, starting Monday, for 12
              lesson periods.&quot;
            </p>
          ) : null}

          {turns.map((turn, index) => (
            <div
              className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
              key={index}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6 ${
                  turn.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-950"
                }`}
              >
                {turn.role === "assistant" ? (
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Bot aria-hidden="true" className="size-3.5" />
                    Assistant
                  </div>
                ) : null}
                <p className="whitespace-pre-wrap">{turn.content}</p>
                {turn.role === "assistant" && turn.toolCalls.length > 0 ? (
                  <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2">
                    {turn.toolCalls.map((record, callIndex) => (
                      <li
                        className={`flex items-start gap-1.5 text-xs ${
                          record.result.ok ? "text-slate-500" : "text-rose-600"
                        }`}
                        key={callIndex}
                      >
                        <Wrench aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                        {summarizeToolCall(record)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ))}

          {isSending ? (
            <div className="flex justify-start">
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
                Thinking…
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {lastDriver ? (
          <p className="border-t border-slate-100 px-4 py-1.5 text-xs text-slate-400">
            {lastDriver === "local"
              ? "Using the local model — student records available."
              : "Using the hosted provider — no student-record access."}
          </p>
        ) : null}

        <form className="flex gap-2 border-t border-slate-200 p-3" onSubmit={handleSubmit}>
          <input
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            disabled={!configured || isSending}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask the assistant to do something…"
            value={input}
          />
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
            disabled={!configured || isSending || !input.trim()}
            type="submit"
          >
            <Send aria-hidden="true" className="size-4" />
            Send
          </button>
        </form>
      </div>
    </>
  );
}
