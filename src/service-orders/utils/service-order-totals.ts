type DiscountLike = {
  amount?: number;
};

type ItemLike = {
  type?: 'service' | 'product';
  totalValue?: number;
  quantity?: number;
  unitValue?: number;
};

const roundCurrency = (value: number) => Math.ceil(Math.max(0, value) * 100) / 100;

export const calculateServiceOrderTotals = ({
  items,
  discount,
  otherDiscounts,
  applyServiceTax,
  serviceTaxPercent
}: {
  items?: ItemLike[];
  discount?: number;
  otherDiscounts?: DiscountLike[];
  applyServiceTax?: boolean;
  serviceTaxPercent?: number;
}) => {
  const normalizedItems = items || [];
  const servicesTotal = normalizedItems
    .filter((item) => item.type === 'service')
    .reduce((sum, item) => sum + (item.totalValue ?? (item.quantity || 0) * (item.unitValue || 0)), 0);
  const productsTotal = normalizedItems
    .filter((item) => item.type === 'product')
    .reduce((sum, item) => sum + (item.totalValue ?? (item.quantity || 0) * (item.unitValue || 0)), 0);
  const subtotal = roundCurrency(servicesTotal + productsTotal);
  const serviceTaxAmount = applyServiceTax && (serviceTaxPercent || 0) > 0 ? roundCurrency((servicesTotal * (serviceTaxPercent || 0)) / 100) : 0;
  const discountAmount = discount ? (subtotal * discount) / 100 : 0;
  const otherDiscountsTotal = (otherDiscounts || []).reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalValue = roundCurrency(subtotal + serviceTaxAmount - discountAmount - otherDiscountsTotal);

  return {
    servicesTotal,
    productsTotal,
    subtotal,
    serviceTaxAmount,
    discountAmount,
    otherDiscountsTotal,
    totalValue
  };
};
