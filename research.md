# Research: CTO (Community Takeover) Detection APIs & Heuristics for Solana Tokens

## Summary
No major public API that Tidepool already consumes (RugCheck, DexScreener, Jupiter, Birdeye) exposes a dedicated **CTO** boolean or tag. RugCheck surfaces risks that are *components* of a CTO (e.g., mint authority disabled, low holder concentration), but a low-risk score only tells you the token is not an *active* rug—it does not positively flag a community revival. DexScreener and Jupiter return social/metadata fields that often change after a takeover, yet neither API timestamps those changes or labels them as CTO. The most practical near-term approach is to build a composite **on-chain heuristic** from data Tidepool already fetches, label it as *"Likely CTO"*, and treat any future third-party CTO flag as a drop-in enhancement.

## Findings
1. **RugCheck API — No explicit CTO field, but related risk signals exist.** — The v1 `/tokens/{mint}/report` endpoint returns `score` (0–100+), `riskLevel` (`low` | `medium` | `high` | `critical`), and a `risks[]` array. Observed risk names include `"Mint Authority Enabled"`, `"Freeze Authority Enabled"`, `"Large Token Account"`, `"Single Holder Ownership"`, `"Mutable Metadata"`, and `"Low Liquidity"`. A classic CTO token typically scores *low* risk because the original dev has revoked authorities and dumped, which means RugCheck is useful for ruling out an active rug, but it does not *affirm* a community takeover. There is no documented risk name such as `"Community Takeover"` in the public schema. [Source: RugCheck API Docs (partial)](https://api.rugcheck.xyz/v1/tokens/{mint}/report) — *Already integrated in Tidepool; shape observed via community usage.*
2. **DexScreener API — No CTO flag in pair/token data.** — The `/latest/dex/tokens/{mint}` response includes `pairs[]` with `liquidity`, `fdv`, `marketCap`, and an optional `info` object (`socials[]`, `websites[]`, `image`, `labels?`). CTO projects often populate `info.socials` with new Twitter/Discord links after revival, but DexScreener does not flag *when* those links were added, nor does it provide a CTO label in the API payload. Reliability: **High** for liquidity/volume, **Low** for CTO detection. [Source: DexScreener API Reference](https://docs.dexscreener.com/)
3. **Jupiter API — Token metadata & tags, no CTO-specific tag.** — `https://tokens.jup.ag/token/{mint}` returns a `tags[]` array (e.g., `"verified"`, `"strict"`, `"community"`, `"wormhole"`). The `"community"` tag is generic and does not mean CTO. The Jupiter strict-list criteria (holder count, liquidity, age) are side effects that a healthy CTO may satisfy, but they are not exclusive. [Source: Jupiter Station — Token List API](https://station.jup.ag/docs/token-list/token-list-api)
4. **Birdeye API — Token metadata includes social extensions, no CTO field.** — `GET /defi/token_meta` returns `extensions` (website, twitter, discord). A CTO often updates these fields, but detecting a *change* requires historical snapshots, which Birdeye does not expose in standard endpoints. [Source: Birdeye API Docs](https://docs.birdeye.so/)
5. **GMGN, TrenchBot, Photon — Frontend shows CTO labels, but no stable public API.** — These scanners display "CTO" badges derived from deployer-wallet analysis and community reports. Their internal APIs are reverse-engineered, require session-level cookies/headers, and are subject to aggressive rate limits and breaking changes. Reliability: **Very Low** for a production integration. **Not recommended.** [Source: UI observation only — no public docs]
6. **On-chain heuristics — Best viable automated detection path with current data.** — Tidepool already fetches enough on-chain and off-chain data to build a probability model:
   - **Authorities revoked**: `mintAuthority === null` and `freezeAuthority === null` (from Solana RPC). A CTO usually revokes these to prove the new community cannot mint or freeze.
   - **Deployer wallet share ≈ 0%**: Use RugCheck `topHolders[]` (or Solana RPC account analysis) to see if the original minting wallet still holds supply. A CTO is usually preceded by a dev dump.
   - **Decentralized holders**: `holders` count above a threshold (e.g., >200–500) and `top 10 holders` owning <40–50% of supply. DexScreener/Jupiter liquidity data can proxy this.
   - **Token age + revived activity**: Token created >7–14 days ago (from Meteora pool `created_at` or on-chain `blockTime`) but showing a recent 24h volume or liquidity spike (from DexScreener/Meteora).
   - **Non-deployer liquidity injection**: The largest liquidity position owner is not the deployer wallet.
   - **Social metadata (optional)**: New `website`/`twitter` entries appear in Jupiter/Birdeye metadata after the initial launch window.
   
   Composite rule example:
   > `mintAuthority === null` **AND** `freezeAuthority === null` **AND** `deployerShare < 1%` **AND** `holders > 200` **AND** `tokenAgeDays > 7` **AND** `24hVolumeUSD > $10k` → label **"Likely CTO"**.

   Caveat: Fair-launches (e.g., Pump.fun tokens where the dev never held supply) will also match these signals, so the heuristic should exclude tokens that never showed prior dev concentration or are <48h old. [Source: Solana SPL Token Docs](https://solana.com/docs/core/tokens)

## Sources
- **Kept**: Solana SPL Token Docs (https://solana.com/docs/core/tokens) — authoritative reference for `mintAuthority`, `freezeAuthority`, and supply semantics we already read via RPC.
- **Kept**: DexScreener API Reference (https://docs.dexscreener.com/) — confirms pair/token response shape and absence of a CTO field.
- **Kept**: Jupiter Station Token List API (https://station.jup.ag/docs/token-list/token-list-api) — confirms metadata tags available and lack of a CTO-specific tag.
- **Kept**: RugCheck API (observed via community usage) — already integrated in Tidepool; partial docs confirm `risks[]` array but no CTO risk name.
- **Dropped**: GMGN / TrenchBot / Photon UI observations — no public API contract, not viable for production.

## Gaps
- **Undocumented RugCheck risks**: We could not verify via live API call whether some CTO tokens return an unlisted risk name such as `"Community Takeover"` or `"Dev Abandoned"`. A direct test call with a known CTO token mint would resolve this.
- **Historical metadata changes**: Neither Jupiter nor Birdeye exposes a changelog for `extensions` (social links). Detecting a post-launch update requires Tidepool to snapshot and diff this data itself.
- **Ground-truth dataset**: There is no public, labeled dataset of Solana CTO tokens with confirmed mint addresses, which makes it hard to tune heuristic thresholds and measure false-positive rates.

## Recommended Approach for Tidepool
1. **Immediate (no new API dependencies)**: Implement a **"Likely CTO"** badge on the pool detail page (`/pool/[address]`) using a composite heuristic computed from data Tidepool already fetches:
   - Use existing Solana RPC call for `mintAuthority` / `freezeAuthority`.
   - Use existing RugCheck `topHolders[]` to estimate deployer wallet share.
   - Use existing DexScreener / Meteora data for volume, liquidity, and token age.
   - Expose the logic in a small utility (e.g., `src/lib/cto-heuristics.ts`) that returns `{ isLikelyCto: boolean, reasons: string[] }`.
   - Display the badge in `TokenCard` or `PoolHeader` with a tooltip explaining the signals (e.g., "Mint authority revoked, original dev holds <1%, 500+ holders, revived volume").
2. **Short-term**: Add a lightweight metadata snapshot cache. When scanning a token, compare current Jupiter/Birdeye `extensions` against a cached version. If new social links appear >7 days after mint, raise CTO probability. This adds one extra cached request per token per day and fits the existing `cacheFirst` / `cacheableJson` patterns.
3. **Long-term**: Monitor RugCheck (and any new token-intelligence providers) for a formal CTO risk or label. Because RugCheck is already wired into Tidepool, adding a new field will be a one-line change in the report fetcher.
4. **Avoid**: Do not scrape GMGN, TrenchBot, or similar frontends. The legal/ToS risk, maintenance burden, and fragility outweigh the benefit.

## Caveats / Edge Cases
- **False positives**: Fair-launches (e.g., Pump.fun tokens where the dev never held supply) can satisfy every heuristic. Mitigate by requiring a *prior* period of high dev ownership or by excluding tokens whose age is <48h and whose metadata has never changed.
- **False negatives**: A CTO where the original developer retains a small bag (e.g., 2–5%) and remains inactive will not trigger the "deployer share ≈ 0%" rule. Consider using a "dev wallet inactive for N days" heuristic if transaction history is available.
- **Metadata spoofing**: A bad actor can update social links to fake a CTO signal. Cross-reference domain age or use only links that have been stable for a minimum period.
- **Rate limits & cost**: The heuristic reuses existing provider calls, so there is zero additional API cost. The optional metadata snapshot adds negligible traffic because it can piggyback on existing Jupiter/Birdeye fetches and be cached for 24h.
