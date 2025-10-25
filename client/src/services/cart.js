import { apiFetch } from "../lib/api";

// удалить одну позицию корзины по rowId (id элемента корзины, не id игры)
export function removeCartItem(rowId) {
  // у вас cart.routes реализует DELETE по id элемента корзины
  return apiFetch(`/cart/${rowId}`, { method: "DELETE" });
}

/**
 * Добавить товар в корзину
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