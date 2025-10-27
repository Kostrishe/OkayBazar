import React, { useEffect, useState } from "react";
import { Glass } from "../../components/ui/Glass";
import SectionHeader from "./_parts/SectionHeader";
import NoData from "./_parts/NoData";
import { apiFetch } from "../../lib/api";
import { Eye, XCircle, X } from "lucide-react";
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";

/*
  Модальное окно деталей заказа
 */
function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  const getStatusText = (status) => {
    const map = {
      pending: "В обработке",
      fulfilled: "Выполнен",
      captured: "Оплачен",
      failed: "Отменён",
      cancelled: "Отменён",
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
      fulfilled: "bg-green-500/20 text-green-300 border-green-400/30",
      captured: "bg-blue-500/20 text-blue-300 border-blue-400/30",
      failed: "bg-red-500/20 text-red-300 border-red-400/30",
      cancelled: "bg-red-500/20 text-red-300 border-red-400/30",
    };
    return colors[status] || "bg-gray-500/20 text-gray-300 border-gray-400/30";
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative max-w-3xl w-full max-h-[85vh] overflow-hidden"
      >
        <Glass className="relative" variant="liquid">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/30 text-white transition"
            type="button"
          >
            <X size={20} />
          </button>

          <div className="p-6 overflow-y-auto max-h-[80vh]">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Заказ #{order.id}
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="text-white/70">
                <span className="block text-white/90 font-medium mb-1">
                  Пользователь
                </span>
                {order.user_email || `ID: ${order.user_id}`}
              </div>
              <div className="text-white/70">
                <span className="block text-white/90 font-medium mb-1">
                  Сумма
                </span>
                {order.total_amount} ₽
              </div>
              <div className="text-white/70">
                <span className="block text-white/90 font-medium mb-1">
                  Статус заказа
                </span>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs border ${getStatusColor(
                    order.status
                  )}`}
                >
                  {getStatusText(order.status)}
                </span>
              </div>
              <div className="text-white/70">
                <span className="block text-white/90 font-medium mb-1">
                  Статус оплаты
                </span>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs border ${getStatusColor(
                    order.payment_status
                  )}`}
                >
                  {getStatusText(order.payment_status)}
                </span>
              </div>
              <div className="text-white/70">
                <span className="block text-white/90 font-medium mb-1">
                  Создан
                </span>
                {new Date(order.created_at).toLocaleString("ru-RU")}
              </div>
              <div className="text-white/70">
                <span className="block text-white/90 font-medium mb-1">
                  Обновлён
                </span>
                {order.updated_at
                  ? new Date(order.updated_at).toLocaleString("ru-RU")
                  : "—"}
              </div>
            </div>

            {order.notes && (
              <div className="mb-6">
                <div className="text-white/90 font-medium mb-2">Заметки</div>
                <div className="text-white/70 text-sm bg-white/5 rounded-lg p-3 border border-white/10">
                  {order.notes}
                </div>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-3">Товары</h3>
              <div className="space-y-2">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white/5 rounded-lg p-3 border border-white/10"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-white font-medium">
                          {item.game_title}
                        </div>
                        <div className="text-white/60 text-sm">
                          {item.platform}
                        </div>
                      </div>
                      <div className="text-white font-medium">
                        {item.unit_price} ₽
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
                      <div>Кол-во: {item.qty}</div>
                      <div>Сумма: {item.subtotal} ₽</div>
                      <div>Email: {item.delivered_to_email || "—"}</div>
                      <div>
                        Статус:{" "}
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded border ${getStatusColor(
                            item.fulfillment_status || "pending"
                          )}`}
                        >
                          {getStatusText(item.fulfillment_status || "pending")}
                        </span>
                      </div>
                    </div>
                    {item.delivered_at && (
                      <div className="mt-1 text-xs text-white/60">
                        Выдано:{" "}
                        {new Date(item.delivered_at).toLocaleString("ru-RU")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {order.payment && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">
                  Платёж
                </h3>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10 text-sm">
                  <div className="grid grid-cols-2 gap-2 text-white/70">
                    <div>
                      <span className="text-white/90">Провайдер:</span>{" "}
                      {order.payment.provider}
                    </div>
                    <div>
                      <span className="text-white/90">Сумма:</span>{" "}
                      {order.payment.amount} ₽
                    </div>
                    <div>
                      <span className="text-white/90">Статус:</span>{" "}
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-xs border ${getStatusColor(
                          order.payment.status
                        )}`}
                      >
                        {getStatusText(order.payment.status)}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/90">Создан:</span>{" "}
                      {new Date(order.payment.created_at).toLocaleString(
                        "ru-RU"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Glass>
      </motion.div>
    </div>
  );
}

/*
  GET /api/orders
  Админская страница управления заказами
 */
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const data = await apiFetch("/orders");

      // для каждого заказа получаем детали только для извлечения email доставки и даты выдачи
      const ordersWithDetails = await Promise.all(
        data.map(async (order) => {
          try {
            const details = await apiFetch(`/orders/${order.id}`);

            // извлекаем email доставки из первой позиции
            const deliveryEmail =
              details.items?.[0]?.delivered_to_email || null;

            // извлекаем дату выдачи (берём максимальную из всех позиций)
            const deliveredDates = details.items
              ?.map((item) => item.delivered_at)
              .filter(Boolean);
            const deliveredAt =
              deliveredDates?.length > 0
                ? deliveredDates.sort().reverse()[0]
                : null;

            return {
              ...order,
              delivered_to_email: deliveryEmail,
              delivered_at: deliveredAt,
            };
          } catch {
            return order;
          }
        })
      );

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error("Ошибка загрузки заказов:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOrder(orderId) {
    if (!window.confirm("Вы уверены, что хотите отменить этот заказ?")) return;

    try {
      await apiFetch(`/orders/${orderId}`, { method: "DELETE" });
      await loadOrders();
    } catch (error) {
      alert("Не удалось отменить заказ");
      console.error(error);
    }
  }

  async function viewOrderDetails(orderId) {
    setDetailsLoading(true);
    try {
      const order = await apiFetch(`/orders/${orderId}`);
      setSelectedOrder(order);
    } catch (error) {
      alert("Не удалось загрузить детали заказа");
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusText = (status) => {
    const map = {
      pending: "В обработке",
      fulfilled: "Выполнен",
      captured: "Оплачен",
      failed: "Отменён",
      cancelled: "Отменён",
    };
    return map[status] || status;
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
      fulfilled: "bg-green-500/20 text-green-300 border-green-400/30",
      captured: "bg-blue-500/20 text-blue-300 border-blue-400/30",
      failed: "bg-red-500/20 text-red-300 border-red-400/30",
      cancelled: "bg-red-500/20 text-red-300 border-red-400/30",
    };
    return colors[status] || "bg-gray-500/20 text-gray-300 border-gray-400/30";
  };

  return (
    <div className="text-white">
      <SectionHeader title="Все заказы" />

      <Glass className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <NoData note="Загрузка заказов..." />
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[1600px] w-full text-sm">
              <thead className="text-left">
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 font-medium">№ заказа</th>
                  <th className="px-4 py-3 font-medium">Email покупателя</th>
                  <th className="px-4 py-3 font-medium">Email доставки</th>
                  <th className="px-4 py-3 font-medium">Статус заказа</th>
                  <th className="px-4 py-3 font-medium">Статус оплаты</th>
                  <th className="px-4 py-3 font-medium">Сумма</th>
                  <th className="px-4 py-3 font-medium">Заметка</th>
                  <th className="px-4 py-3 font-medium">Создан</th>
                  <th className="px-4 py-3 font-medium">Обновлён</th>
                  <th className="px-4 py-3 font-medium">Выдан</th>
                  <th className="px-4 py-3 font-medium w-[140px]">Действия</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-6">
                      <NoData note="Заказов пока нет" />
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="px-4 py-3 font-medium">#{order.id}</td>
                      <td className="px-4 py-3 text-blue-300">
                        {order.user_email || `ID: ${order.user_id}`}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {order.delivered_to_email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs border ${getStatusBadge(
                            order.status
                          )}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs border ${getStatusBadge(
                            order.payment_status
                          )}`}
                        >
                          {getStatusText(order.payment_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-green-400">
                        {order.total_amount} ₽
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">
                        {order.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatDate(order.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatDate(order.delivered_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewOrderDetails(order.id)}
                            disabled={detailsLoading}
                            className="p-1.5 rounded hover:bg-white/10 transition text-blue-400 disabled:opacity-50"
                            title="Просмотр деталей"
                            type="button"
                          >
                            <Eye size={18} />
                          </button>
                          {order.status !== "cancelled" &&
                            order.status !== "failed" && (
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="p-1.5 rounded hover:bg-white/10 transition text-red-400"
                                title="Отменить заказ"
                                type="button"
                              >
                                <XCircle size={18} />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Glass>

      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}