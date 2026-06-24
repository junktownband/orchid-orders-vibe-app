export function allocateFinalRevenueByItem(
  items: Array<{ id: string; priceCents: number }>,
  finalAmountCents: number
) {
  const totalLinePriceCents = items.reduce((sum, item) => sum + item.priceCents, 0);
  const allocation = new Map<string, number>();

  if (totalLinePriceCents <= 0) {
    for (const item of items) {
      allocation.set(item.id, item.priceCents);
    }

    return allocation;
  }

  let remainingAmountCents = finalAmountCents;

  items.forEach((item, index) => {
    const allocatedCents =
      index === items.length - 1
        ? remainingAmountCents
        : Math.round((finalAmountCents * item.priceCents) / totalLinePriceCents);

    allocation.set(item.id, allocatedCents);
    remainingAmountCents -= allocatedCents;
  });

  return allocation;
}

export function allocateTaxByItem(
  items: Array<{ id: string; priceCents: number }>,
  revenueByItemId: Map<string, number>,
  finalAmountCents: number,
  taxAmountCents?: number | null
) {
  const allocation = new Map<string, number>();

  if (!taxAmountCents || taxAmountCents <= 0 || finalAmountCents <= 0 || items.length === 0) {
    for (const item of items) {
      allocation.set(item.id, 0);
    }

    return allocation;
  }

  let remainingTaxCents = taxAmountCents;

  items.forEach((item, index) => {
    const allocatedRevenueCents = revenueByItemId.get(item.id) ?? item.priceCents;
    const allocatedTaxCents =
      index === items.length - 1
        ? remainingTaxCents
        : Math.round((taxAmountCents * allocatedRevenueCents) / finalAmountCents);

    allocation.set(item.id, allocatedTaxCents);
    remainingTaxCents -= allocatedTaxCents;
  });

  return allocation;
}

export function calculateServiceCommissionBaseCents({
  allocatedRevenueCents,
  allocatedTaxCents,
  costCents,
  confirmedRegularExpenseCents
}: {
  allocatedRevenueCents: number;
  allocatedTaxCents: number;
  costCents: number;
  confirmedRegularExpenseCents: number;
}) {
  return Math.max(0, allocatedRevenueCents - allocatedTaxCents - costCents - confirmedRegularExpenseCents);
}
