// backend/utils/feeCalculator.js

/**
 * Calcula a decomposição financeira baseada na regra híbrida
 * @param {number} baseAmount - Valor nominal do ingresso
 * @param {Object|null} coupon - Objeto do cupom vindo do Prisma
 */
export const calculateOrderFees = (baseAmount, coupon = null) => {
  const STANDARD_FEE_RATE = 0.08; // 8% padrão
  const platformFeeOriginal = baseAmount * STANDARD_FEE_RATE;

  if (!coupon || !coupon.isActive) {
    return {
      baseAmount,
      platformFeeOriginal,
      platformFeeFinal: platformFeeOriginal,
      partnerCommission: 0,
      userDiscount: 0,
      totalPaid: baseAmount + platformFeeOriginal,
    };
  }

  // Regra Híbrida com Cupom:
  // Taxa total cai para 6% (User ganha 2% de "desconto" na taxa)
  // Plataforma fica com 4% e Parceiro com 2%
  const userDiscountValue = baseAmount * 0.02; // Redução de 8% para 6%
  const partnerCommissionValue = baseAmount * (coupon.partnerShare / 100); // 2%
  const platformFeeFinalValue = baseAmount * (coupon.platformFeeMin / 100); // 4%

  return {
    baseAmount,
    platformFeeOriginal,
    platformFeeFinal: platformFeeFinalValue,
    partnerCommission: partnerCommissionValue,
    userDiscount: userDiscountValue,
    totalPaid: baseAmount + platformFeeFinalValue + partnerCommissionValue,
  };
};