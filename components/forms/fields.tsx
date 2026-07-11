"use client";

import type { ReactNode } from "react";

const GOLD = "#b08d57";

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {children}
      {required && <span className="text-rose-500 ml-1">*</span>}
    </label>
  );
}

export function TextField({
  label, value, onChange, placeholder, required, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#b08d57] focus:ring-1 focus:ring-[#b08d57] transition-colors"
      />
    </div>
  );
}

export function TextAreaField({
  label, value, onChange, placeholder, required, rows = 4,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; rows?: number;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#b08d57] focus:ring-1 focus:ring-[#b08d57] transition-colors resize-none leading-relaxed"
      />
    </div>
  );
}

// 複数選択（チップトグル）
export function ChipCheckboxGroup({
  label, options, selected, onToggle, required,
}: {
  label: string; options: string[]; selected: string[];
  onToggle: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`px-3.5 py-2 rounded-full text-sm border transition-all ${
                on
                  ? "text-white border-transparent"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#d8c39c]"
              }`}
              style={on ? { background: GOLD } : undefined}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 単一選択（チップトグル）
export function ChipRadioGroup({
  label, options, value, onChange, required,
}: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-3.5 py-2 rounded-full text-sm border transition-all ${
                on
                  ? "text-white border-transparent"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#d8c39c]"
              }`}
              style={on ? { background: GOLD } : undefined}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
