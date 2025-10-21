import { apiFetch } from "../lib/api";

// удалить одну позицию корзины по rowId (id элемента корзины, не id игры)
export function removeCartItem(rowId) {
  // у вас cart.routes реализует DELETE по id элемента корзины
  return apiFetch(`/cart/${rowId}`, { method: "DELETE" });
}
