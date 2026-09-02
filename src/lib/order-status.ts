export const ORDER_STATUS_LABELS = {
  // Utgången, men kvar för att order_status_event fortfarande har rader med
  // den och de ska gå att läsa i klartext. Se OrderStatus i schema.prisma.
  PENDING_PAYMENT: "Väntar på beviljande",

  AWAITING_APPROVAL: "Inväntar godkännande",
  APPROVED: "Beviljad",
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
