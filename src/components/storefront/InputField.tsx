"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
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
  type = "text",
  autoComplete,
}: {
  id?: string;
  label: string;
  helperText?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: "text" | "email" | "tel" | "password";
  autoComplete?: string;
}) {
  const tCommon = useTranslations("Common");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const fieldClassName = cn(
    "w-full rounded-2xl border-[1.5px] bg-bg-surface p-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none",
    error ? "border-red-500 focus:border-red-500" : "border-border-default focus:border-brand-secondary",
    type === "password" && "pe-11",
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
        <div className="relative w-full">
          <input
            type={type === "password" && passwordVisible ? "text" : type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            className={fieldClassName}
          />
          {type === "password" && (
            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              aria-label={passwordVisible ? tCommon("hidePassword") : tCommon("showPassword")}
              className="absolute inset-y-0 end-3 flex items-center text-text-secondary"
            >
              {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
      )}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        helperText && <p className="text-xs text-text-secondary">{helperText}</p>
      )}
    </div>
  );
}
