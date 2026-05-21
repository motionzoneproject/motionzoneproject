export const ORDER_STATUS_LABELS = {
  CREATED: "Skapad",
  AWAITING_APPROVAL: "Inväntar godkännande",
  PENDING_PAYMENT: "Väntar betalning",
  APPROVED: "Godkänd",
  PAID: "Betald",
  COMPLETED: "Slutförd",
  CANCELLED: "Avbruten",
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_LABELS;

export function getOrderStatusLabel(
  status: string,
  overrides?: Partial<Record<OrderStatus, string>>,
) {
  if (Object.hasOwn(ORDER_STATUS_LABELS, status)) {
    const typedStatus = status as OrderStatus;
    return overrides?.[typedStatus] ?? ORDER_STATUS_LABELS[typedStatus];
  }

  return status;
}
