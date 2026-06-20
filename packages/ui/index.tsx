import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary-site" | "secondary-site" | "primary-crm" | "secondary-crm" | "none";
}

export function Button({ children, variant = "primary-site", className = "", ...props }: ButtonProps) {
  const variantClass = variant !== "none" ? `btn-${variant}` : "";
  return (
    <button className={`btn ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
