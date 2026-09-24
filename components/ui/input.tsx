import type { InputHTMLAttributes, LabelHTMLAttributes, Ref, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-control border border-ink/15 bg-surface px-3 text-ink placeholder:text-muted/60 focus-visible:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-control border border-ink/15 bg-surface p-3 text-ink placeholder:text-muted/60 focus-visible:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block text-sm font-semibold text-ink", className)} {...props} />
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-sm font-medium text-danger">
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="status" className="mt-2 text-sm font-medium text-success">
      {message}
    </p>
  );
}
