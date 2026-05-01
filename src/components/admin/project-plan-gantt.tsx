"use client";
import { useMemo, useRef, useState } from "react";

interface Task {
  id: string;
  name: string;
  dueDate: string | null;
  status: string;
}

interface Phase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  tasks: Task[];
}

const STATUS_COLORS: Record<string, string> = {
  complete: "bg-green-500",
  in_progress: "bg-blue-500",
  not_started: "bg-gray-300",
};

const STATUS_LABEL: Record<string, string> = {
  complete: "Complete",
  in_progress: "In Progress",
  not_started: "Not Started",
};

function toMs(dateStr: string) {
  return new Date(dateStr).getTime();
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function monthsBetween(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function ProjectPlanGantt({ phases }: { phases: Phase[] }) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const { chartStart, chartEnd, totalMs } = useMemo(() => {
    if (!phases.length) return { chartStart: new Date(), chartEnd: new Date(), totalMs: 1 };
    const starts = phases.map((p) => toMs(p.startDate));
    const ends = phases.map((p) => toMs(p.endDate));
    const minDate = new Date(Math.min(...starts));
    const maxDate = new Date(Math.max(...ends));
    // Pad by 1 month on each side
    const chartStart = addMonths(minDate, -1);
    chartStart.setDate(1);
    const chartEnd = addMonths(maxDate, 1);
    chartEnd.setDate(1);
    return { chartStart, chartEnd, totalMs: chartEnd.getTime() - chartStart.getTime() };
  }, [phases]);

  const months = useMemo(() => {
    const result: Date[] = [];
    const count = monthsBetween(chartStart, chartEnd) + 1;
    for (let i = 0; i < count; i++) result.push(addMonths(chartStart, i));
    return result;
  }, [chartStart, chartEnd]);

  const todayPct = useMemo(() => {
    const now = Date.now();
    const pct = ((now - chartStart.getTime()) / totalMs) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [chartStart, totalMs]);

  function pct(dateStr: string) {
    return ((toMs(dateStr) - chartStart.getTime()) / totalMs) * 100;
  }

  function width(startStr: string, endStr: string) {
    return ((toMs(endStr) - toMs(startStr)) / totalMs) * 100;
  }

  const togglePhase = (id: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const ROW_H = 36;
  const LABEL_W = 220;

  if (!phases.length) return null;

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-gray-50 text-xs text-gray-600">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${STATUS_COLORS[k]}`} />
            {v}
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-px h-3 bg-red-500" />
          <span>Today</span>
        </div>
      </div>

      <div className="flex">
        {/* Label column */}
        <div className="flex-shrink-0 border-r" style={{ width: LABEL_W }}>
          {/* Header */}
          <div className="h-8 border-b bg-gray-50 flex items-center px-3 text-xs font-medium text-gray-500">
            Phase / Task
          </div>
          {phases.map((phase) => {
            const isExpanded = expandedPhases.has(phase.id);
            return (
              <div key={phase.id}>
                <div
                  className="flex items-center gap-1.5 px-3 border-b cursor-pointer hover:bg-gray-50 select-none"
                  style={{ height: ROW_H }}
                  onClick={() => togglePhase(phase.id)}
                >
                  <span className="text-gray-400 text-xs">{isExpanded ? "▾" : "▸"}</span>
                  <span className="text-xs font-medium text-gray-800 truncate" title={phase.name}>
                    {phase.name.replace(/^Phase \d+ — /, "")}
                  </span>
                </div>
                {isExpanded && phase.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center pl-6 pr-2 border-b bg-gray-50/50"
                    style={{ height: ROW_H - 8 }}
                  >
                    <span className="text-xs text-gray-500 truncate" title={task.name}>{task.name}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Chart column */}
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          <div style={{ minWidth: Math.max(800, months.length * 80) }}>
            {/* Month headers */}
            <div className="h-8 border-b bg-gray-50 flex relative">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 border-r flex items-center justify-center text-xs text-gray-500 font-medium"
                  style={{ width: `${100 / months.length}%` }}
                >
                  {formatMonth(m)}
                </div>
              ))}
            </div>

            {/* Phase / task rows */}
            <div className="relative">
              {/* Vertical month grid lines */}
              {months.map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-gray-100"
                  style={{ left: `${(i / months.length) * 100}%` }}
                />
              ))}

              {/* Today line */}
              <div
                className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                style={{ left: `${todayPct}%` }}
              />

              {phases.map((phase) => {
                const isExpanded = expandedPhases.has(phase.id);
                const barLeft = pct(phase.startDate);
                const barW = width(phase.startDate, phase.endDate);
                const color = STATUS_COLORS[phase.status] ?? "bg-gray-300";

                return (
                  <div key={phase.id}>
                    {/* Phase row */}
                    <div className="relative border-b" style={{ height: ROW_H }}>
                      <div
                        className={`absolute top-2 h-8 rounded ${color} opacity-90 flex items-center px-2 overflow-hidden`}
                        style={{
                          left: `${Math.max(0, barLeft)}%`,
                          width: `${Math.min(barW, 100 - Math.max(0, barLeft))}%`,
                          height: ROW_H - 10,
                        }}
                        title={`${phase.name}: ${new Date(phase.startDate).toLocaleDateString()} – ${new Date(phase.endDate).toLocaleDateString()}`}
                      >
                        <span className="text-white text-xs font-medium truncate">
                          {new Date(phase.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" – "}
                          {new Date(phase.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>

                    {/* Task rows */}
                    {isExpanded && phase.tasks.map((task) => {
                      if (!task.dueDate) return (
                        <div key={task.id} className="border-b bg-gray-50/30" style={{ height: ROW_H - 8 }} />
                      );
                      const taskPct = pct(task.dueDate);
                      const taskColor = STATUS_COLORS[task.status] ?? "bg-gray-300";
                      return (
                        <div key={task.id} className="relative border-b bg-gray-50/30" style={{ height: ROW_H - 8 }}>
                          {/* Milestone diamond at due date */}
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                            style={{ left: `${Math.max(0, Math.min(99, taskPct))}%` }}
                            title={`${task.name}: due ${new Date(task.dueDate).toLocaleDateString()}`}
                          >
                            <div
                              className={`w-3 h-3 rotate-45 ${taskColor} border border-white`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
