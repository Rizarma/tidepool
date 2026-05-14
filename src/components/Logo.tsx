export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
