"use client";

interface ExternalIconLinksProps {
  poolAddress: string;
  primaryMint: string;
  className?: string;
  size?: "sm" | "md";
}

const GMGN_REFERRAL = "yr2NU5dr";
const LPAGENT_REFERRAL = "URq8gm4";

const SERVICES = [
  {
    id: "meteora",
    label: "Meteora",
    getHref: (poolAddress: string) =>
      `https://app.meteora.ag/dlmm/${poolAddress}`,
  },
  {
    id: "gmgn",
    label: "GMGN",
    getHref: (_poolAddress: string, primaryMint: string) =>
      `https://gmgn.ai/sol/token/${primaryMint}?ref=${GMGN_REFERRAL}`,
  },
  {
    id: "dextools",
    label: "DexTools",
    getHref: (poolAddress: string) =>
      `https://www.dextools.io/app/en/solana/pair-explorer/${poolAddress}`,
  },
  {
    id: "dexscreener",
    label: "DexScreener",
    getHref: (poolAddress: string) =>
      `https://dexscreener.com/solana/${poolAddress}`,
  },
  {
    id: "jupiter",
    label: "Jupiter",
    getHref: (_poolAddress: string, primaryMint: string) =>
      `https://jup.ag/tokens/${primaryMint}`,
  },
  {
    id: "lpagent",
    label: "LPAgent",
    getHref: (poolAddress: string) =>
      `https://app.lpagent.io/pools/${encodeURIComponent(poolAddress)}?referral=${LPAGENT_REFERRAL}`,
  },
];

export function ExternalIconLinks({
  poolAddress,
  primaryMint,
  className,
  size = "sm",
}: ExternalIconLinksProps) {
  const buttonClass =
    size === "md"
      ? "group grid size-6 place-items-center rounded border border-transparent opacity-55 transition cursor-pointer hover:opacity-100 hover:bg-white/[0.06] hover:border-white/10 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]"
      : "group grid size-5 place-items-center rounded border border-transparent opacity-55 transition cursor-pointer hover:opacity-100 hover:bg-white/[0.06] hover:border-white/10 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)]";

  const iconClass =
    size === "md"
      ? "size-4 object-contain grayscale saturate-0 transition group-hover:grayscale-0 group-hover:saturate-100 group-focus-visible:grayscale-0 group-focus-visible:saturate-100"
      : "size-3.5 object-contain grayscale saturate-0 transition group-hover:grayscale-0 group-hover:saturate-100 group-focus-visible:grayscale-0 group-focus-visible:saturate-100";

  return (
    <div className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      {SERVICES.map((service) => {
        const href = service.getHref(poolAddress, primaryMint);
        return (
          <button
            key={service.id}
            type="button"
            aria-label={`Open ${service.label}`}
            title={`Open ${service.label}`}
            className={buttonClass}
            onClick={(e) => {
              e.stopPropagation();
              const win = window.open(href, "_blank");
              if (win) win.opener = null;
            }}
          >
            <img
              src={`/icons/external/${service.id}.png`}
              alt=""
              aria-hidden="true"
              draggable={false}
              className={iconClass}
            />
          </button>
        );
      })}
    </div>
  );
}
