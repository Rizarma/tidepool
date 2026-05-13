import Link from "next/link";

export default function NotFound() {
  return (
    <div className="h-full grid place-items-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-base font-semibold text-zinc-200">Page Not Found</h2>
        <p className="mt-2 text-xs text-zinc-500">The requested page does not exist.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-xs text-[var(--accent)] hover:underline"
        >
          Return to Tidepool
        </Link>
      </div>
    </div>
  );
}
