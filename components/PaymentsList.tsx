import { deletePayment } from "@/app/actions";
import type { Payment, Player } from "@/lib/split";
import { Card, Money } from "./ui";

export function PaymentsList({ payments, players, canEdit }: { payments: Payment[]; players: Player[]; canEdit: boolean }) {
  if (payments.length === 0) return null;
  const name = new Map(players.map((p) => [p.id, p.name]));
  return (
    <Card title="Payment history">
      <ul className="grouped text-[15px]">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <span className="font-medium">{name.get(p.fromId)}</span>
              <span className="text-white/50"> → </span>
              <span className="font-medium">{name.get(p.toId)}</span>
              <div className="text-xs text-white/45">
                {p.date}{p.note && ` · ${p.note}`}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Money cents={p.amountCents} />
              {canEdit && (
                <form action={deletePayment}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-xs text-white/40 hover:text-live">Undo</button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
