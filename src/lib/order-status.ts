/**
 * Statusar en order kan ha. Det här är den levande livscykeln, och enumet
 * OrderStatus i schema.prisma innehåller exakt de här värdena.
 */
export const ORDER_STATUS_LABELS = {
  AWAITING_APPROVAL: "Inväntar godkännande",
  APPROVED: "Beviljad",
  CANCELLED: "Avbruten",
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_LABELS;

/**
 * Statusar som funnits förr och ligger kvar i orderloggen
 * (order_status_event). De kan aldrig sättas på en order — de finns bara för
 * att gamla händelser ska gå att läsa i klartext i stället för som råa
 * versaler. Loggen lagras som text just för att den ska kunna innehålla
 * sådant här utan att enumet behöver bära på det.
 */
const HISTORICAL_STATUS_LABELS: Record<string, string> = {
  CREATED: "Skapad",
  PENDING_PAYMENT: "Väntar på beviljande",
  PAID: "Betald",
  COMPLETED: "Slutförd",
};

export function getOrderStatusLabel(
  status: string,
  overrides?: Partial<Record<OrderStatus, string>>,
) {
  if (Object.hasOwn(ORDER_STATUS_LABELS, status)) {
    const typedStatus = status as OrderStatus;
    return overrides?.[typedStatus] ?? ORDER_STATUS_LABELS[typedStatus];
  }

  return HISTORICAL_STATUS_LABELS[status] ?? status;
}
