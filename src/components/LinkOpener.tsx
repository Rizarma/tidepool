"use client";

import { type AnchorHTMLAttributes } from "react";

interface LinkOpenerProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
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
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`bg-transparent border-0 p-0 cursor-pointer${className ? ` ${className}` : ""}`}
      {...rest}
    >
      {children}
    </a>
  );
}
