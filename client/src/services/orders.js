import { apiFetch } from "../lib/api";

export function confirmOrder({ contactEmail, paymentMethod, notes }) {
  return apiFetch("/orders/confirm", {
    method: "POST",
    body: { contactEmail, paymentMethod, notes }
  });
}

export function getOrder(id) {
  return apiFetch(`/orders/${id}`);
}
