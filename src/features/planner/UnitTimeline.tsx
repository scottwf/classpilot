"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { createLessonAction } from "@/app/lessons/new/actions";
import { moveUnitAction } from "@/app/units/actions";
import { getUnitTimelinePosition } from "./timeline";
import type { ClassSection, InstructionalDay, UnitPlan } from "./types";

const colorClass: Record<UnitPlan["color"], string> = {
  amber: "bg-amber-300 text-amber-950 border-amber-400",
  blue: "bg-blue-300 text-blue-950 border-blue-400",
  emerald: "bg-emerald-300 text-emerald-950 border-emerald-400",
  rose: "bg-rose-300 text-rose-950 border-rose-400",
  violet: "bg-violet-300 text-violet-950 border-violet-400",
};

type UnitTimelineProps = {
  classes: ClassSection[];
  units: UnitPlan[];
  instructionalDays: InstructionalDay[];
};

type DragMode = "move" | "resize-start" | "resize-end";

type DragState = {
  mode: DragMode;
  unit: UnitPlan;
  startX: number;
  originalStartIndex: number;
  originalEndIndex: number;
  liveStartIndex: number;
  liveEndIndex: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const labelColumnWidth = 180;

export function UnitTimeline({
  classes,
  units,
  instructionalDays,
}: UnitTimelineProps) {
  const [modalUnit, setModalUnit] = useState<UnitPlan | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function columnWidth(): number {
    const el = containerRef.current;
    if (!el || instructionalDays.length === 0) return 0;
    return (el.clientWidth - labelColumnWidth) / instructionalDays.length;
  }

  function startDrag(
    event: React.PointerEvent<HTMLElement>,
    unit: UnitPlan,
    mode: DragMode,
  ) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = getUnitTimelinePosition(unit, instructionalDays);
    const startIndex = position.gridColumnStart - 1;
    const endIndex = startIndex + position.gridColumnSpan - 1;

    setDrag({
      liveEndIndex: endIndex,
      liveStartIndex: startIndex,
      mode,
      originalEndIndex: endIndex,
      originalStartIndex: startIndex,
      startX: event.clientX,
      unit,
    });
  }

  function handleDragMove(event: React.PointerEvent<HTMLElement>) {
    if (!drag) return;
    const width = columnWidth();
    if (!width) return;
    const deltaDays = Math.round((event.clientX - drag.startX) / width);
    const span = drag.originalEndIndex - drag.originalStartIndex;

    if (drag.mode === "move") {
      const nextStart = clamp(
        drag.originalStartIndex + deltaDays,
        0,
        Math.max(0, instructionalDays.length - 1 - span),
      );
      setDrag({ ...drag, liveEndIndex: nextStart + span, liveStartIndex: nextStart });
    } else if (drag.mode === "resize-start") {
      const nextStart = clamp(drag.originalStartIndex + deltaDays, 0, drag.originalEndIndex);
      setDrag({ ...drag, liveStartIndex: nextStart });
    } else {
      const nextEnd = clamp(
        drag.originalEndIndex + deltaDays,
        drag.originalStartIndex,
        instructionalDays.length - 1,
      );
      setDrag({ ...drag, liveEndIndex: nextEnd });
    }
  }

  async function handleDragEnd(event: React.PointerEvent<HTMLElement>) {
    if (!drag) return;
    event.currentTarget.releasePointerCapture(event.pointerId);

    const newStartDate = instructionalDays[drag.liveStartIndex]?.key;
    const newEndDate = instructionalDays[drag.liveEndIndex]?.key;
    const changed =
      newStartDate !== undefined &&
      newEndDate !== undefined &&
      (newStartDate !== drag.unit.startDate || newEndDate !== drag.unit.endDate);
    const { unit } = drag;
    setDrag(null);

    if (changed && newStartDate && newEndDate) {
      await moveUnitAction(unit.id, newStartDate, newEndDate);
    }
  }

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Unit Planner Timeline
          </h2>
          <p className="text-sm text-slate-600">
            Drag a unit to move it, or drag its edges to resize.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm"
          href="/units/new"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add unit
        </Link>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px]" ref={containerRef}>
          <div
            className="grid border-b border-slate-200 bg-slate-50"
            style={{
              gridTemplateColumns: `180px repeat(${instructionalDays.length}, minmax(28px, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50 p-3 text-xs font-semibold uppercase text-slate-500">
              Class
            </div>
            {instructionalDays.map((day) => (
              <div
                className="border-r border-slate-200 px-1 py-2 text-center text-[0.68rem] leading-tight text-slate-500"
                key={day.key}
              >
                <div>{day.monthLabel}</div>
                <div className="font-semibold text-slate-700">
                  {day.date.getUTCDate()}
                </div>
              </div>
            ))}
          </div>

          {classes.map((classSection) => {
            const classUnits = units.filter(
              (unit) => unit.classId === classSection.id,
            );

            return (
              <div
                className="grid min-h-24 border-b border-slate-200 last:border-b-0"
                key={classSection.id}
                style={{
                  gridTemplateColumns: `180px repeat(${instructionalDays.length}, minmax(28px, 1fr))`,
                }}
              >
                <div className="sticky left-0 z-10 border-r border-slate-200 bg-white p-3">
                  <h3 className="font-semibold text-slate-950">
                    {classSection.name}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {classSection.meetingPattern}
                  </p>
                </div>

                <div
                  className="relative col-span-full col-start-2 grid min-h-24"
                  style={{
                    gridTemplateColumns: `repeat(${instructionalDays.length}, minmax(28px, 1fr))`,
                  }}
                >
                  {instructionalDays.map((day) => (
                    <div
                      className="border-r border-slate-100"
                      key={`${classSection.id}-${day.key}`}
                    />
                  ))}

                  {classUnits.map((unit) => {
                    const isDragging = drag !== null && drag.unit.id === unit.id;
                    const position = isDragging && drag
                      ? {
                          gridColumnSpan: drag.liveEndIndex - drag.liveStartIndex + 1,
                          gridColumnStart: drag.liveStartIndex + 1,
                          instructionalDays: drag.liveEndIndex - drag.liveStartIndex + 1,
                        }
                      : getUnitTimelinePosition(unit, instructionalDays);

                    return (
                      <div
                        className={`relative z-10 mx-1 mt-5 h-11 ${isDragging ? "cursor-grabbing opacity-90" : "cursor-grab"}`}
                        key={unit.id}
                        onPointerDown={(event) => startDrag(event, unit, "move")}
                        onPointerMove={handleDragMove}
                        onPointerUp={handleDragEnd}
                        style={{
                          gridColumn: `${position.gridColumnStart} / span ${position.gridColumnSpan}`,
                          gridRow: "1",
                        }}
                      >
                        <Link
                          className={`block size-full rounded-md border px-3 py-2 text-sm font-semibold shadow-sm ${colorClass[unit.color]}`}
                          href={`/units/${unit.id}`}
                          title={`${unit.title}: ${position.instructionalDays} instructional days`}
                        >
                          <div className="truncate px-1.5 pr-5">{unit.title}</div>
                          <div className="mt-1 flex gap-1 px-1.5">
                            {unit.lessons.map((lesson) => (
                              <span
                                aria-label={lesson.title}
                                className="size-1.5 rounded-full bg-current opacity-60"
                                key={lesson.id}
                              />
                            ))}
                          </div>
                        </Link>
                        <button
                          aria-label={`Add lesson to ${unit.title}`}
                          className="absolute right-1 top-1 z-20 rounded-full bg-white/70 p-0.5 text-current hover:bg-white"
                          onClick={(event) => {
                            event.preventDefault();
                            setModalUnit(unit);
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                          type="button"
                        >
                          <Plus aria-hidden="true" className="size-3.5" />
                        </button>
                        <div
                          aria-label={`Resize ${unit.title} start date`}
                          className="absolute inset-y-0 left-0 z-30 w-1.5 cursor-col-resize"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            startDrag(event, unit, "resize-start");
                          }}
                          onPointerMove={handleDragMove}
                          onPointerUp={handleDragEnd}
                          role="separator"
                        />
                        <div
                          aria-label={`Resize ${unit.title} end date`}
                          className="absolute inset-y-0 right-0 z-30 w-1.5 cursor-col-resize"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            startDrag(event, unit, "resize-end");
                          }}
                          onPointerMove={handleDragMove}
                          onPointerUp={handleDragEnd}
                          role="separator"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    {modalUnit ? (
      <AddLessonModal onClose={() => setModalUnit(null)} unit={modalUnit} />
    ) : null}
    </>
  );
}

function AddLessonModal({
  onClose,
  unit,
}: {
  onClose: () => void;
  unit: UnitPlan;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-950">
          Add lesson to {unit.title}
        </h3>
        <form action={createLessonAction} className="mt-4 space-y-4">
          <input name="unitId" type="hidden" value={unit.id} />
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Lesson title
            </span>
            <input
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              name="title"
              required
              type="text"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Date</span>
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                defaultValue={unit.startDate}
                min={unit.startDate}
                max={unit.endDate}
                name="date"
                required
                type="date"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Duration minutes
              </span>
              <input
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                defaultValue={55}
                min={1}
                name="durationMinutes"
                required
                type="number"
              />
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
              type="submit"
            >
              Save lesson
            </button>
          </div>
        </form>
        <Link
          className="mt-3 inline-block text-sm text-blue-700 underline"
          href={`/units/${unit.id}`}
        >
          Open full unit page for more options
        </Link>
      </div>
    </div>
  );
}
