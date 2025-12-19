export type PaymentInitResult = {
  nextStatus: "PENDING_PAYMENT" | "AWAITING_APPROVAL";
  externalId?: string; // placeholder for PSP session/intent id
};

export interface PaymentProvider {
  name: string;
  initiate(params: {
    orderId: string;
    amount: number; // minor units or decimal number depending on currency policy
    currency: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentInitResult>;
}

// Invoice-only placeholder provider
export class InvoiceProvider implements PaymentProvider {
  name = "invoice";
  async initiate(): Promise<PaymentInitResult> {
    // For invoice flow, we do not auto-capture; teacher will approve manually
    return { nextStatus: "PENDING_PAYMENT" };
  }
}
