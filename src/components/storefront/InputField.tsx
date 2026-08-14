"use client";

import { cn } from "@/lib/utils";

export function InputField({
  id,
  label,
  helperText,
  error,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  id?: string;
  label: string;
  helperText?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const fieldClassName = cn(
    "w-full rounded-2xl border-[1.5px] bg-bg-surface p-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none",
    error ? "border-red-500 focus:border-red-500" : "border-border-default focus:border-brand-secondary",
  );

  return (
    <div id={id} className="flex w-full scroll-mt-28 flex-col gap-1">
      <label className="text-[13px] font-medium text-text-primary">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className={cn(fieldClassName, "resize-none")}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={fieldClassName}
        />
      )}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        helperText && <p className="text-xs text-text-secondary">{helperText}</p>
      )}
    </div>
  );
}
