import { clsx } from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-clay text-cream hover:bg-clay-dark active:bg-clay-dark disabled:bg-ink-faint",
  secondary:
    "bg-ink text-cream hover:bg-ink/90 active:bg-ink/90 disabled:bg-ink-faint",
  outline:
    "bg-transparent text-ink border border-line-strong hover:bg-cream-dark disabled:opacity-50",
  ghost: "bg-transparent text-ink hover:bg-cream-dark disabled:opacity-50",
  danger: "bg-clay-dark text-cream hover:bg-clay disabled:bg-ink-faint",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm gap-1.5",
  md: "px-5 py-3 text-[0.95rem] gap-2",
  lg: "px-7 py-4 text-base gap-2.5",
};

const shared =
  "inline-flex items-center justify-center rounded-full font-medium transition-colors duration-150 disabled:cursor-not-allowed select-none";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  fullWidth?: boolean;
}

interface ButtonAsButtonProps
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  href?: undefined;
}

interface ButtonAsLinkProps extends CommonProps {
  href: string;
  prefetch?: boolean;
}

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children, fullWidth } = props;
  const classes = clsx(
    shared,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className,
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} prefetch={props.prefetch} className={classes}>
        {children}
      </Link>
    );
  }

  const { href: _href, variant: _v, size: _s, className: _c, fullWidth: _fw, children: _ch, ...rest } =
    props as ButtonAsButtonProps;

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
