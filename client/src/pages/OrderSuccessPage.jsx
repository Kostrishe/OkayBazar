import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Background from "../components/ui/Background";
import { getOrder } from "../services/orders";
import { CheckCircle2, ArrowRight } from "lucide-react";

function Rub({ value }) {
  const n = Number(value || 0);
  return <>{n.toLocaleString("ru-RU")} ₽</>;
}

// детерминированно выбираем почту продавца по id заказа
function getSellerEmail(orderId) {
  const choices = [
    "auto-delivery-1@okaybazar.com",
    "auto-delivery-2@okaybazar.com",
    "auto-delivery-3@okaybazar.com",
    "auto-delivery-4@okaybazar.com",
  ];
  const i = Math.abs(Number(orderId)) % choices.length;
  return choices[i];
}

export default function OrderSuccessPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const o = await getOrder(id);
        setOrder(o);
      } catch (e) {
        setErr(e?.message || "Не удалось загрузить заказ");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const seller = getSellerEmail(id);

  return (
    <div className="relative">
      <Background />
      <div className="relative max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle2 size={28} className="text-emerald-400" />
          <h1 className="text-3xl font-bold text-white">Заказ создан</h1>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-6">
          {loading ? (
            <div className="h-24 rounded-xl bg-white/10 border border-white/20 animate-pulse" />
          ) : err ? (
            <div className="text-red-300">{err}</div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4 text-white">
                <div>
                  <div className="text-white/70 text-sm">Номер заказа</div>
                  <div className="text-xl font-semibold">#{order?.id}</div>
                </div>
                <div>
                  <div className="text-white/70 text-sm">Итоговая сумма</div>
                  <div className="text-xl font-semibold tabular-nums">
                    <Rub value={order?.total_amount} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-white/70 text-sm">E-mail продавца</div>
                  <div className="text-xl font-semibold">
                    <a className="underline underline-offset-4" href={`mailto:${seller}`}>{seller}</a>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-white/70 text-sm">
                Ключи будут отправлены продавцом на указанную вами почту. 
                При необходимости свяжитесь с продавцом по адресу выше.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white"
                >
                  На главную
                </Link>
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Мои заказы <ArrowRight size={18} />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
