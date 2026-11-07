// Pure money math — all amounts are integer cents.

export type Player = { id: number; name: string };

export type Session = {
  id: number;
  date: string;
  venue: string;
  courts: number;
  hours: number;
  costCents: number;
  paidBy: number;
  notes: string | null;
  playerIds: number[];
  /** Attendees who have paid their share back to the host (paidBy). */
  paidIds: number[];
};

export type Payment = {
  id: number;
  fromId: number;
  toId: number;
  amountCents: number;
  date: string;
  note: string | null;
};

/** Split cost evenly; leftover cents go to the first players so shares sum exactly. */
export function splitCost(costCents: number, playerIds: number[]): Map<number, number> {
  const shares = new Map<number, number>();
  if (playerIds.length === 0) return shares;
  const sorted = [...playerIds].sort((a, b) => a - b);
  const base = Math.floor(costCents / sorted.length);
  let remainder = costCents - base * sorted.length;
  for (const id of sorted) {
    shares.set(id, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder--;
  }
  return shares;
}

export type Balance = {
  player: Player;
  paidCents: number; // court fees fronted
  shareCents: number; // their portion of court fees
  sentCents: number; // repayments sent
  receivedCents: number; // repayments received
  netCents: number; // > 0: is owed money, < 0: owes money
  sessions: number;
};

export function computeBalances(
  players: Player[],
  sessions: Session[],
  payments: Payment[],
): Balance[] {
  const map = new Map<number, Balance>(
    players.map((p) => [
      p.id,
      { player: p, paidCents: 0, shareCents: 0, sentCents: 0, receivedCents: 0, netCents: 0, sessions: 0 },
    ]),
  );

  for (const s of sessions) {
    const payer = map.get(s.paidBy);
    if (payer) payer.paidCents += s.costCents;
    for (const [id, share] of splitCost(s.costCents, s.playerIds)) {
      const b = map.get(id);
      if (b) {
        b.shareCents += share;
        b.sessions++;
      }
      // A ticked "Paid" box is a repayment of that share to the host.
      if (id !== s.paidBy && s.paidIds.includes(id)) {
        if (b) b.sentCents += share;
        if (payer) payer.receivedCents += share;
      }
    }
  }
  for (const p of payments) {
    const from = map.get(p.fromId);
    const to = map.get(p.toId);
    if (from) from.sentCents += p.amountCents;
    if (to) to.receivedCents += p.amountCents;
  }
  for (const b of map.values()) {
    b.netCents = b.paidCents - b.shareCents + b.sentCents - b.receivedCents;
  }
  return [...map.values()].sort((a, b) => b.netCents - a.netCents);
}

export type Transfer = { from: Player; to: Player; amountCents: number };

/** Greedy minimal-ish set of transfers that zeroes everyone out. */
export function settleUp(balances: Balance[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.netCents > 0)
    .map((b) => ({ player: b.player, amt: b.netCents }))
    .sort((a, b) => b.amt - a.amt);
  const debtors = balances
    .filter((b) => b.netCents < 0)
    .map((b) => ({ player: b.player, amt: -b.netCents }))
    .sort((a, b) => b.amt - a.amt);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].amt, creditors[j].amt);
    if (amt > 0) transfers.push({ from: debtors[i].player, to: creditors[j].player, amountCents: amt });
    debtors[i].amt -= amt;
    creditors[j].amt -= amt;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return transfers;
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
