"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info, X } from "lucide-react";

type InfoTipProps = {
  /** What the tip is about, e.g. "the lesson bank" -- used to build the
   * button's accessible name ("More about the lesson bank"). Never shown
   * visually; the visible affordance is the (i) icon. */
  label: string;
  /** The usability note itself. Kept to a sentence or two -- anything
   * longer belongs on the page, not behind an (i). */
  children: React.ReactNode;
};

/**
 * The small (i) button from issue #27: a per-control usability note a busy
 * teacher can open on demand instead of us padding every page with
 * explanatory paragraphs.
 *
 * Deliberately click/Enter-toggled rather than hover-revealed -- hover
 * tips are unreachable on the tablets a lot of this gets used on, and
 * unreachable by keyboard. The button is a real <button> (so it's in the
 * tab order), reports its state via aria-expanded, and points at the
 * panel via aria-controls + aria-describedby so a screen reader announces
 * the note when it opens. Escape closes it and returns focus to the
 * button, matching the disclosure pattern used elsewhere in the app.
 */
export function InfoTip({ label, children }: InfoTipProps) {
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <span className="relative inline-flex align-middle">
      <button
        aria-controls={panelId}
        aria-describedby={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-label={`More about ${label}`}
        className="inline-flex size-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={() => setIsOpen((open) => !open)}
        ref={buttonRef}
        type="button"
      >
        <Info aria-hidden="true" className="size-4" />
      </button>

      {isOpen ? (
        <span
          className="absolute left-0 top-6 z-20 w-64 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-normal normal-case leading-5 tracking-normal text-slate-700 shadow-lg"
          id={panelId}
          role="note"
        >
          {children}
          <button
            aria-label="Close tip"
            className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() => {
              setIsOpen(false);
              buttonRef.current?.focus();
            }}
            type="button"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </span>
      ) : null}
    </span>
  );
}
