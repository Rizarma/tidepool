"use client";

import { type ButtonHTMLAttributes } from "react";

interface LinkOpenerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href: string;
}

export function LinkOpener({
  href,
  children,
  onClick,
  className,
  ...rest
}: LinkOpenerProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        const win = window.open(href, "_blank");
        if (win) win.opener = null;
        onClick?.(e);
      }}
      className={`bg-transparent border-0 p-0 cursor-pointer${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
