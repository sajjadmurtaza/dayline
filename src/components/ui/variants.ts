import { cva, type VariantProps } from "class-variance-authority";

export const button = cva(
  "type-button inline-flex min-h-11 items-center justify-center gap-1.5 px-3",
  {
    variants: {
      tone: {
        quiet: "text-muted hover:text-ink",
        solid: "rounded-full bg-ink text-paper",
        ghost: "rounded-full text-ink",
        accent: "rounded-full bg-now text-paper",
      },
    },
    defaultVariants: { tone: "quiet" },
  },
);

export const block = cva("relative", {
  variants: {
    kind: {
      event: "text-event",
      task: "text-task",
      personal: "text-personal",
      health: "text-health",
      notes: "text-notes",
    },
    band: {
      past: "band-past",
      now: "",
      next: "",
      later: "band-later",
    },
  },
});

export type ButtonVariants = VariantProps<typeof button>;
