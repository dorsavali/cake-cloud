import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "outline" | "dark" | "primary";
type ButtonSize = "sm" | "md" | "lg";
type ButtonFont = "sans" | "display";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  font?: ButtonFont;
  icon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  outline:
    "border border-luxury-accent bg-transparent text-accent-dark hover:bg-luxury-accent/10",
  dark: "border border-accent-dark bg-accent-dark text-accent hover:bg-accent-dark/90",
  primary:
    "border border-accent-dark bg-primary text-accent-dark hover:bg-primary/90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 min-w-[102px] gap-2 px-5 text-xs",
  md: "h-[60px] min-w-[178px] gap-3 px-8 text-base",
  lg: "h-[60px] min-w-[226px] gap-3 px-10 text-base",
};

const displayFontClasses: Record<ButtonSize, string> = {
  sm: "text-xl leading-none",
  md: "text-[28px] leading-none",
  lg: "text-[32px] leading-none",
};

export function Button({
  children,
  className = "",
  disabled,
  font = "sans",
  icon,
  size = "md",
  type = "button",
  variant = "outline",
  ...props
}: ButtonProps) {
  const fontClass =
    font === "display"
      ? `font-kalnia ${displayFontClasses[size]}`
      : "font-signika font-normal";

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-primary/35 disabled:text-accent-dark/20 ${variantClasses[variant]} ${sizeClasses[size]} ${fontClass} ${className}`}
      {...props}
    >
      {icon ? <span className="grid shrink-0 place-items-center">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
