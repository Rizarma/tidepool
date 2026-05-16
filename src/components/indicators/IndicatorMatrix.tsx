import type { IndicatorMatrixView } from "./indicator-view-model";
import { timeframeWeight } from "./indicator-view-model";
import { IndicatorMatrixCell } from "./IndicatorMatrixCell";

export function IndicatorMatrix({
  view,
  symbolY,
}: {
  view: IndicatorMatrixView;
  symbolY: string;
}) {
  return (
    <div
      className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 matrix-scroll"
      role="region"
      aria-label="Indicator matrix"
    >
      <table className="w-full border-collapse text-right min-w-[480px]">
        <caption className="sr-only">
          Technical indicator matrix by timeframe
        </caption>
        <colgroup>
          <col className="w-32 sm:w-36" />
          {view.timeframes.map((tf) => (
            <col key={tf} className="min-w-[100px]" />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--panel-border)]">
            <th
              scope="col"
              className="sticky left-0 bg-[var(--panel-bg)] z-10 text-left py-2 pr-4"
            >
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                Indicator
              </span>
            </th>
            {view.timeframes.map((tf) => (
              <th key={tf} scope="col" className="py-2 px-3 align-bottom">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                    {tf}
                  </span>
                  <span className="text-[9px] text-zinc-600">
                    {timeframeWeight(tf)}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--panel-border)]">
          {view.rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[var(--panel-border)] last:border-b-0 hover:bg-white/[0.02]"
            >
              <th
                scope="row"
                className="sticky left-0 bg-[var(--panel-bg)] z-10 text-left py-3 pr-4 pl-2"
              >
                <div className="text-xs font-medium text-zinc-300">
                  {row.label}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {row.description}
                </div>
              </th>
              {view.timeframes.map((tf) => (
                <td key={`${row.id}:${tf}`} className="py-2 px-3">
                  <IndicatorMatrixCell
                    cell={row.cells[tf]}
                    symbolY={symbolY}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
