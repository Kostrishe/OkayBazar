import { apiFetch } from "../lib/api";

/**
 * Подтвердить заказ (создать финальный заказ из корзины).
 * @param {object} params - Параметры заказа
 * @param {string} params.contactEmail - Email для отправки ключей
 * @param {string} params.paymentMethod - Способ оплаты
 * @param {string} params.notes - Дополнительные заметки
 */
export function confirmOrder({ contactEmail, paymentMethod, notes }) {
  return apiFetch("/orders/confirm", {
    method: "POST",
    body: { contactEmail, paymentMethod, notes },
  });
}

/**
 * Получить детальную информацию о заказе по ID.
 * @param {number} id - ID заказа
 */
export function getOrder(id) {
  return apiFetch(`/orders/${id}`);
}