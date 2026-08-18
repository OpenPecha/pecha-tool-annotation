import * as React from "react";
import { toast as sonnerToast } from "sonner";

/**
 * Thin bridge from the legacy shadcn `toast({ title, description })` API to
 * sonner, which is the toaster actually mounted in App.tsx. The previous
 * implementation dispatched into an in-memory store that no component
 * rendered, so every toast fired through this hook was silently dropped.
 */

type ToastVariant = "success" | "error" | "info" | "warning";

type Toast = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Maps to sonner's colored variants; omit for a neutral toast. */
  variant?: ToastVariant;
  /** Milliseconds the toast stays visible; sonner's default when omitted. */
  duration?: number;
};

function toast({ title, description, variant, duration }: Toast) {
  const show = variant ? sonnerToast[variant] : sonnerToast;
  const id = show(title, { description, duration });
  return {
    id,
    dismiss: () => sonnerToast.dismiss(id),
  };
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
  };
}

export { useToast, toast };
