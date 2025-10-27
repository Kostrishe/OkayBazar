import { apiFetch } from "../lib/api";

/**
 * Удалить одну позицию корзины по rowId (id элемента корзины, не id игры).
 * @param {number} rowId - ID строки корзины
 * @returns {Promise<any>}
 */
export function removeCartItem(rowId) {
  return apiFetch(`/cart/${rowId}`, { method: "DELETE" });
}

/**
 * Добавить товар в корзину.
 * @param {number} gameId - ID игры
 * @param {number} qty - Количество (по умолчанию 1)
 * @param {number} platformId - ID платформы (если необходимо)
 * @returns {Promise<any>}
 */
export function addToCart(gameId, qty = 1, platformId) {
  return apiFetch("/cart", {
    method: "POST",
    body: { gameId, quantity: qty, platformId },
  });
}