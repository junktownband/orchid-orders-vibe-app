import { type FormEvent, useEffect, useState } from "react";

import type { OrganizationSettingsResponse, PaymentMethodListResponse, RepairOrderResponse } from "@orchid/shared";

import {
  authHeaders,
  displayOrderNumber,
  money,
  request,
  taxAmountFor,
  taxRatePercent,
  taxSubjectOptions,
  type Screen,
  type TaxSubject
} from "../../app/app-core";
import { ConfirmDialog, GlassPanel, InlineStat, PageToolbar, PrimaryButton } from "../../app/ui";
import { SelectField } from "../../app/ui";

export function IssueOrderPage({
  accessToken,
  orderId,
  navigate
}: {
  accessToken: string;
  orderId?: string;
  navigate: (screen: Screen) => void;
}) {
  const [order, setOrder] = useState<RepairOrderResponse | null>(null);
  const [settings, setSettings] = useState<OrganizationSettingsResponse | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodListResponse["items"]>([]);
  const [taxSubject, setTaxSubject] = useState<TaxSubject | "">("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showIssueConfirm, setShowIssueConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("Заказ не выбран.");
      return;
    }

    const headers = authHeaders(accessToken);

    Promise.all([
      request<RepairOrderResponse>(`/api/v1/repair-orders/${orderId}`, { headers }),
      request<OrganizationSettingsResponse>("/api/v1/settings", { headers }),
      request<PaymentMethodListResponse>("/api/v1/settings/payment-methods", { headers })
    ])
      .then(([orderResponse, settingsResponse, paymentMethodsResponse]) => {
        setOrder(orderResponse);
        setSettings(settingsResponse);
        setPaymentMethods(paymentMethodsResponse.items);
        setPaymentMethodId(paymentMethodsResponse.items[0]?.id ?? "");
      })
      .catch(() => setError("Не удалось загрузить заказ или настройки налогов."));
  }, [accessToken, orderId]);

  const finalAmountCents = order?.totalAmountCents ?? 0;
  const finalGrossProfitCents = finalAmountCents - (order?.totalCostCents ?? 0);
  const paymentDueCents = Math.max(order?.balanceDueCents ?? finalAmountCents, 0);
  const isSelfEmployedTaxEnabled = settings?.taxMode === "SELF_EMPLOYED";
  const selectedTaxOption = taxSubject
    ? taxSubjectOptions.find((option) => option.value === taxSubject)
    : undefined;
  const finalTaxAmountCents =
    isSelfEmployedTaxEnabled && selectedTaxOption ? taxAmountFor(finalAmountCents, selectedTaxOption.rateBps) : 0;

  function handleIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order) {
      return;
    }

    setError(null);

    if (finalAmountCents <= 0) {
      setError("Нельзя выдать заказ с нулевым итогом.");
      return;
    }

    if (isSelfEmployedTaxEnabled && !taxSubject) {
      setError("Выбери тип клиента для расчета налога.");
      return;
    }

    if (paymentDueCents > 0 && !paymentMethodId) {
      setError("Выбери способ оплаты для остатка.");
      return;
    }

    setShowIssueConfirm(true);
  }

  async function confirmIssue() {
    if (!order) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      if (finalAmountCents <= 0) {
        throw new Error("Invalid order total");
      }

      if (isSelfEmployedTaxEnabled && !taxSubject) {
        throw new Error("Tax subject is required");
      }

      if (paymentDueCents > 0 && !paymentMethodId) {
        throw new Error("Payment method is required");
      }

      await request<RepairOrderResponse>(`/api/v1/repair-orders/${order.id}/issue`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          paymentMethodId: paymentDueCents > 0 ? paymentMethodId : undefined,
          taxSubject: isSelfEmployedTaxEnabled ? taxSubject : undefined
        })
      });

      navigate({ section: "orders", view: "detail", orderId: order.id });
    } catch {
      setShowIssueConfirm(false);
      setError("Не удалось выдать заказ. Проверьте оплату остатка и тип клиента для налога.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <PageToolbar
        back={() => navigate({ section: "orders", view: "detail", orderId })}
        title="Выдача заказа"
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <GlassPanel className="p-5">
          <form className="grid gap-4" onSubmit={handleIssue}>
            <div>
              <p className="text-sm text-white/45">{order ? displayOrderNumber(order.orderNumber) : "Заказ"}</p>
              <h2 className="mt-1 text-2xl font-semibold">{order?.instrumentName || order?.description || "Загружаем..."}</h2>
            </div>
            <div className="rounded-lg bg-white/[0.055] p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
              <p className="text-sm text-white/48">Операция</p>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Выдача заказа и фиксация итоговых сумм.
              </p>
            </div>
            {paymentDueCents > 0 ? (
              <div className="grid gap-3 rounded-lg bg-white/[0.055] p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
                <div>
                  <p className="text-sm text-white/48">Платеж при выдаче</p>
                  <p className="mt-1 text-sm leading-6 text-white/55">
                    К оплате: {money(paymentDueCents)}. Оплачено ранее: {money(order?.paidAmountCents ?? 0)}.
                  </p>
                </div>
                <SelectField label="Способ оплаты" onChange={(event) => setPaymentMethodId(event.target.value)} value={paymentMethodId}>
                  <option value="">Выбери способ</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </SelectField>
              </div>
            ) : (
              <div className="rounded-lg bg-mint/10 p-3 text-sm leading-6 text-mint ring-1 ring-mint/20">
                Доплата не требуется.
              </div>
            )}
            {isSelfEmployedTaxEnabled ? (
              <div className="grid gap-3 rounded-lg bg-white/[0.055] p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
                <div>
                  <p className="text-sm text-white/48">Налог по самозанятости</p>
                  <p className="mt-1 text-sm leading-6 text-white/55">
                    Выбери, кому оказана услуга. Налог будет автоматически записан в расходы.
                  </p>
                </div>
                <div className="grid gap-2">
                  {taxSubjectOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`grid cursor-pointer gap-1 rounded-md border p-3 text-sm transition-[background-color,border-color,box-shadow] ${
                        taxSubject === option.value
                          ? "border-mint/40 bg-mint/10 text-white"
                          : "border-white/10 bg-black/10 text-white/68 hover:bg-white/[0.055]"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          checked={taxSubject === option.value}
                          className="h-4 w-4 accent-mint"
                          name="taxSubject"
                          onChange={() => setTaxSubject(option.value)}
                          type="radio"
                          value={option.value}
                        />
                        <span className="font-medium">{option.label}</span>
                      </span>
                      <span className="pl-7 text-xs text-white/48">{option.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {error ? <p className="text-sm text-coral">{error}</p> : null}
            <PrimaryButton disabled={!order || isSaving} type="submit">
              {isSaving ? "Подтверждаем..." : "Подтвердить выдачу"}
            </PrimaryButton>
          </form>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-sm text-white/48">После подтверждения</p>
          <h3 className="mt-1 text-2xl font-semibold">Заказ будет закрыт</h3>
          <div className="mt-5 grid gap-3">
            <InlineStat label="Итоговая сумма" tone="text-mint" value={money(finalAmountCents)} />
            <InlineStat label="Оплачено" tone="text-mint" value={money(order?.paidAmountCents ?? 0)} />
            <InlineStat label="К оплате" tone={paymentDueCents > 0 ? "text-amber" : "text-white"} value={money(paymentDueCents)} />
            <InlineStat label="Себестоимость" value={money(order?.totalCostCents ?? 0)} />
            <InlineStat label="Маржа" tone={finalGrossProfitCents < 0 ? "text-coral" : "text-lime-200"} value={money(finalGrossProfitCents)} />
            {isSelfEmployedTaxEnabled ? (
              <>
                <InlineStat
                  label="Ставка налога"
                  value={selectedTaxOption ? taxRatePercent(selectedTaxOption.rateBps) : "Выбери тип клиента"}
                />
                <InlineStat label="Налог в расходы" tone="text-coral" value={money(finalTaxAmountCents)} />
              </>
            ) : null}
            <div className="rounded-lg bg-amber/10 p-3 text-sm leading-6 text-amber ring-1 ring-amber/20">
              После выдачи нельзя менять позиции, ответственного, статус или оплату заказа.
            </div>
            <div className="rounded-lg bg-white/[0.055] p-3 text-sm leading-6 text-white/55 ring-1 ring-white/[0.08]">
              Если итог должен измениться, сначала вернись в карточку заказа и поправь позиции. Выдача не меняет сумму вручную.
            </div>
          </div>
        </GlassPanel>
      </div>
      {showIssueConfirm && order ? (
        <ConfirmDialog
          confirmLabel="Подтвердить выдачу"
          isBusy={isSaving}
          onCancel={() => setShowIssueConfirm(false)}
          onConfirm={() => void confirmIssue()}
          title="Выдать заказ?"
        >
          <div className="grid gap-3">
            <p>Заказ будет закрыт, а позиции, оплата, статус и ответственный станут недоступны для редактирования.</p>
            <div className="rounded-lg bg-white/[0.055] p-3 ring-1 ring-white/[0.08]">
              <p className="font-medium text-white">{displayOrderNumber(order.orderNumber)}</p>
              <p className="mt-1 text-white/55">{order.customerName ?? order.description}</p>
              <p className="mt-2 text-white">
                Итог: <strong>{money(finalAmountCents)}</strong>
              </p>
              <p className="mt-1 text-white/55">К оплате сейчас: {money(paymentDueCents)}</p>
              {isSelfEmployedTaxEnabled ? (
                <p className="mt-1 text-white/55">Налог в расходы: {money(finalTaxAmountCents)}</p>
              ) : null}
            </div>
          </div>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
