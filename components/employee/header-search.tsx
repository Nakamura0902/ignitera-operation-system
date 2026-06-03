"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Search, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getPriorityColor, getPriorityLabel, getProgressColor } from "@/lib/status-utils";

interface SearchResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  progress_rate: number;
  department_name: string;
}

export default function HeaderSearch({ userId }: { userId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // 外クリックで閉じる
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/search/tasks?q=${encodeURIComponent(value)}&userId=${userId}`);
          if (res.ok) {
            const data = await res.json();
            setResults(data.results ?? []);
            setOpen(true);
          }
        } catch {
          // silently fail
        }
      });
    }, 250);
  }

  function handleSelect(taskId: string) {
    setOpen(false);
    setQuery("");
    router.push(`/tasks/${taskId}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        {isPending ? (
          <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
        ) : (
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && results.length > 0 && setOpen(true)}
          placeholder="タスク・案件を検索..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-5">「{query}」に一致するタスクはありません</p>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium">{results.length}件のタスク</span>
              </div>
              {results.map((task) => {
                const progressColor = getProgressColor(task.progress_rate);
                const isCompleted = task.status === "completed";
                return (
                  <button
                    key={task.id}
                    onClick={() => handleSelect(task.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    ) : (
                      <Clock size={15} className="text-slate-400 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </span>
                        <span className="text-[10px] text-slate-400">{task.department_name}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-bold" style={{ color: progressColor }}>{task.progress_rate}%</span>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
