export interface WhatsAppOrderDetails {
  orderRef: string;
  customerName: string;
  phone: string;
  address: string;
  city?: string;
  items: Array<{
    productName: string;
    quantity: number;
    selectedToppings?: string[];
    itemTotal: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  transactionId?: string;
  notes?: string;
}

/**
 * Clean phone number to international format without + or spaces
 * e.g., "03001234567" -> "923001234567"
 * e.g., "+92 300 1234567" -> "923001234567"
 */
export function formatPhoneNumberForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '92' + digits.slice(1);
  }
  if (digits.startsWith('92')) {
    return digits;
  }
  return digits;
}

/**
 * Generate a pre-filled WhatsApp click-to-chat URL for order confirmation
 */
export function generateWhatsAppOrderUrl(
  whatsappNumber: string,
  details: WhatsAppOrderDetails
): string {
  const cleanPhone = formatPhoneNumberForWhatsApp(whatsappNumber || '923000000000');

  const itemsList = details.items
    .map((item) => {
      const toppingsStr =
        item.selectedToppings && item.selectedToppings.length > 0
          ? ` (+ ${item.selectedToppings.join(', ')})`
          : '';
      return `• ${item.quantity}x *${item.productName}*${toppingsStr} - Rs. ${item.itemTotal.toLocaleString('en-PK')}`;
    })
    .join('\n');

  const message = `*Mina Cafe - Order Confirmation* 🍹

*Order Reference:* ${details.orderRef}
*Customer Name:* ${details.customerName}
*Contact Phone:* ${details.phone}
*Delivery Address:* ${details.address}, ${details.city || 'Karachi'}

*Order Items:*
${itemsList}

*Subtotal:* Rs. ${details.subtotal.toLocaleString('en-PK')}
*Delivery Fee (Karachi):* Rs. ${details.deliveryFee.toLocaleString('en-PK')}
*Grand Total:* Rs. ${details.totalAmount.toLocaleString('en-PK')}

${details.transactionId ? `*EasyPaisa TRX ID:* ${details.transactionId}\n` : ''}*Status:* Verification Pending

${details.notes ? `*Notes:* ${details.notes}\n` : ''}Hello! I have placed my order and submitted payment details. Please verify and confirm my order. Thank you!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
