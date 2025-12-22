import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        // Primary brand button with ice-design glow
        default: "bg-[#0ea5e9] text-white shadow-[0_2px_8px_rgba(14,165,233,0.25)] hover:shadow-[0_8px_24px_rgba(14,165,233,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_8px_rgba(14,165,233,0.25)] duration-300",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 active:scale-[0.98]",
        // Outline with ice-design border
        outline: "border border-[#e2e8f0] bg-white hover:bg-[#f0f9ff] hover:border-[#0ea5e9]/30 active:bg-[#e0f2fe] active:scale-[0.98] duration-200",
        // Secondary with subtle ice tint
        secondary: "bg-[#f0f9ff] text-[#0284c7] hover:bg-[#e0f2fe] active:bg-[#bae6fd] active:scale-[0.98] duration-200",
        ghost: "hover:bg-[#f0f9ff] hover:text-[#0ea5e9] active:bg-[#e0f2fe] active:scale-[0.98] duration-200",
        link: "text-[#0ea5e9] underline-offset-4 hover:underline active:opacity-70",
        // Ice gradient button with enhanced glow
        ice: "bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] text-white shadow-[0_4px_16px_rgba(14,165,233,0.3)] hover:shadow-[0_8px_32px_rgba(14,165,233,0.45)] hover:-translate-y-1 active:translate-y-0 active:shadow-[0_2px_8px_rgba(14,165,233,0.25)] duration-300",
        // Frost glass effect
        frost: "bg-white/40 backdrop-blur-md border border-white/60 text-[#334155] hover:bg-white/60 hover:border-white/80 hover:-translate-y-0.5 active:bg-white/70 active:translate-y-0 duration-200",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
