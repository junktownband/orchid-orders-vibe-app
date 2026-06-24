import { useEffect, useState } from "react";

import type { AuthUser, OrganizationSettingsResponse } from "@orchid/shared";

import { authHeaders, request, taxRatePercent, taxSubjectOptions, type Screen } from "../../app/app-core";
import { ConfirmDialog, GlassPanel, PageToolbar, PrimaryButton } from "../../app/ui";

export function TaxSettingsPage({
  accessToken,
  navigate,
  user
}: {
  accessToken: string;
  navigate: (screen: Screen) => void;
  user: AuthUser;
}) {
  const [settings, setSettings] = useState<OrganizationSettingsResponse | null>(null);
  const [taxMode, setTaxMode] = useState<OrganizationSettingsResponse["taxMode"]>("NONE");
  const [isSaving, setIsSaving] = useState(false);
  const [showTaxModeConfirm, setShowTaxModeConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEditTaxSettings = user.role === "OWNER";

  useEffect(() => {
    request<OrganizationSettingsResponse>("/api/v1/settings", {
      headers: authHeaders(accessToken)
    })
      .then((response) => {
        setSettings(response);
        setTaxMode(response.taxMode);
      })
      .catch(() => setError("Не удалось загрузить настройки налогов."));
  }, [accessToken]);

  async function saveTaxSettings() {
    if (!canEditTaxSettings) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await request<OrganizationSettingsResponse>("/api/v1/settings/tax", {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ taxMode })
      });

      setSettings(response);
      setTaxMode(response.taxMode);
    } catch {
      setError("Не удалось сохранить налоговые настройки.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <PageToolbar back={() => navigate({ section: "settings", view: "profile" })} title="Налоги" />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <GlassPanel className="p-5">
          <div className="grid gap-4">
            <div>
              <p className="text-sm text-white/48">Режим налогообложения</p>
              <h2 className="mt-1 text-2xl font-semibold">Самозанятость</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Orchid пока не интегрируется с сервисом «Мой налог», но может считать налог и автоматически записывать его в расходы при выдаче заказа.
              </p>
            </div>
            <div className="grid gap-2">
              <label
                className={`grid gap-1 rounded-md border p-3 text-sm transition-[background-color,border-color] ${
                  taxMode === "NONE" ? "border-mint/40 bg-mint/10" : "border-white/10 bg-black/10 hover:bg-white/[0.055]"
                } ${canEditTaxSettings ? "cursor-pointer" : "cursor-not-allowed opacity-72"}`}
              >
                <span className="flex items-center gap-3">
                  <input
                    checked={taxMode === "NONE"}
                    className="h-4 w-4 accent-mint"
                    disabled={!canEditTaxSettings}
                    name="taxMode"
                    onChange={() => setTaxMode("NONE")}
                    type="radio"
                  />
                  <span className="font-medium">Без налогового учета</span>
                </span>
                <span className="pl-7 text-xs text-white/48">Заказы закрываются без расчета налогового расхода.</span>
              </label>
              <label
                className={`grid gap-1 rounded-md border p-3 text-sm transition-[background-color,border-color] ${
                  taxMode === "SELF_EMPLOYED" ? "border-mint/40 bg-mint/10" : "border-white/10 bg-black/10 hover:bg-white/[0.055]"
                } ${canEditTaxSettings ? "cursor-pointer" : "cursor-not-allowed opacity-72"}`}
              >
                <span className="flex items-center gap-3">
                  <input
                    checked={taxMode === "SELF_EMPLOYED"}
                    className="h-4 w-4 accent-mint"
                    disabled={!canEditTaxSettings}
                    name="taxMode"
                    onChange={() => setTaxMode("SELF_EMPLOYED")}
                    type="radio"
                  />
                  <span className="font-medium">Самозанятость</span>
                </span>
                <span className="pl-7 text-xs text-white/48">При выдаче заказа выбирается тип клиента, налог пишется в расходы.</span>
              </label>
            </div>
            {!canEditTaxSettings ? (
              <div className="rounded-lg border border-amber/20 bg-amber/10 p-3 text-sm leading-6 text-amber">
                Режим налогообложения меняет только владелец. Администратор может видеть текущую настройку, но не включает и не отключает самозанятость.
              </div>
            ) : null}
            {error ? <p className="text-sm text-coral">{error}</p> : null}
            <PrimaryButton
              disabled={!canEditTaxSettings || isSaving || !settings || settings.taxMode === taxMode}
              onClick={() => setShowTaxModeConfirm(true)}
            >
              {isSaving ? "Сохраняем..." : "Сохранить"}
            </PrimaryButton>
          </div>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-sm text-white/48">Ставки</p>
          <h3 className="mt-1 text-2xl font-semibold">Налоговый расчет</h3>
          <div className="mt-5 grid gap-3">
            {taxSubjectOptions.map((option) => (
              <div key={option.value} className="rounded-lg bg-white/[0.055] p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
                <p className="text-lg font-semibold text-mint">{taxRatePercent(option.rateBps)}</p>
                <p className="mt-1 text-sm text-white/55">{option.description}</p>
              </div>
            ))}
            <div className="rounded-lg bg-amber/10 p-3 text-sm leading-6 text-amber ring-1 ring-amber/20">
              Интеграция с «Мой налог» заложена в дальний план, но сейчас ничего во внешние сервисы не отправляется.
            </div>
          </div>
        </GlassPanel>
      </div>
      {showTaxModeConfirm ? (
        <ConfirmDialog
          confirmLabel="Изменить режим"
          isBusy={isSaving}
          onCancel={() => setShowTaxModeConfirm(false)}
          onConfirm={() => {
            setShowTaxModeConfirm(false);
            void saveTaxSettings();
          }}
          title="Изменить налоговый режим?"
        >
          <p>Новый режим будет применяться к следующим выдачам заказов и системным налоговым расходам.</p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
