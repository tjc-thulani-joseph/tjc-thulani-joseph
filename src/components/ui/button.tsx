import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-lg text-sm font-semibold tracking-[0.01em]",
    "cursor-pointer select-none",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_10px_30px_-14px_color-mix(in_oklab,var(--gold)_60%,transparent)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_16px_40px_-16px_color-mix(in_oklab,var(--gold)_65%,transparent)]",

        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-0.5 hover:bg-destructive/90",

        outline:
          "border border-border bg-surface/60 text-foreground shadow-sm backdrop-blur-md hover:-translate-y-0.5 hover:border-gold/50 hover:bg-gold/5 hover:text-gold-soft hover:shadow-[0_12px_30px_-20px_color-mix(in_oklab,var(--gold)_50%,transparent)]",

        secondary:
          "border border-border bg-secondary text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:border-gold/25 hover:bg-secondary/80",

        ghost:
          "text-muted-foreground hover:bg-gold/5 hover:text-gold-soft",

        link:
          "text-gold underline-offset-4 hover:text-gold-soft hover:underline",
      },

      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
