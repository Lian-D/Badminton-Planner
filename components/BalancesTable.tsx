import type { Balance } from "@/lib/split";
import { Avatar, Card, Empty, Money } from "./ui";

export function BalancesTable({ balances }: { balances: Balance[] }) {
  return (
    <Card title="Money owed" subtitle="Positive = is owed money · negative = owes money">
      {balances.length === 0 ? (
        <Empty>Add players to see balances.</Empty>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-white/45">
                <th className="px-2 py-2 font-medium">Player</th>
                <th className="px-2 py-2 text-right font-medium">Balance</th>
                <th className="px-2 py-2 text-right font-medium">Sessions</th>
                <th className="px-2 py-2 text-right font-medium">Paid for courts</th>
                <th className="px-2 py-2 text-right font-medium">Their share</th>
                <th className="px-2 py-2 text-right font-medium">Repaid / received</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.player.id} className="border-t border-white/6 hover:bg-white/[0.03]">
                  <td className="px-2 py-3 font-medium"><span className="flex items-center gap-2.5"><Avatar name={b.player.name} size="sm" />{b.player.name}</span></td>
                  <td className="px-2 py-3 text-right"><Money cents={b.netCents} signed /></td>
                  <td className="px-2 py-3 text-right tabular-nums text-white/70">{b.sessions}</td>
                  <td className="px-2 py-3 text-right"><Money cents={b.paidCents} /></td>
                  <td className="px-2 py-3 text-right"><Money cents={b.shareCents} /></td>
                  <td className="px-2 py-3 text-right text-white/70">
                    <Money cents={b.sentCents} /> / <Money cents={b.receivedCents} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
