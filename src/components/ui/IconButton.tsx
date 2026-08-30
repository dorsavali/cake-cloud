import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonVariant = "primary" | "dark";

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  "aria-label": string;
  children: ReactNode;
  variant?: IconButtonVariant;
};

const variantClasses: Record<IconButtonVariant, string> = {
  primary: "text-primary hover:bg-primary/10",
  dark: "text-accent-dark hover:bg-accent-dark/10",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      "aria-label": ariaLabel,
      children,
      className = "",
      type = "button",
      variant = "dark",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        className={`grid size-10 shrink-0 place-items-center rounded-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
