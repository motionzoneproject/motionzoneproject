type ProductCapacitySnapshot = {
  maxCustomer: number;
  unlimitedCustomers: boolean;
  countCustomer: number;
};

export function getProductSpotsLeft(product: ProductCapacitySnapshot): number {
  if (product.unlimitedCustomers) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(product.maxCustomer - product.countCustomer, 0);
}

export function hasProductSpotsLeft(product: ProductCapacitySnapshot): boolean {
  return getProductSpotsLeft(product) > 0;
}
