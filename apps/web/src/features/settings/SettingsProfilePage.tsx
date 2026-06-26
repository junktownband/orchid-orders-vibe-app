import { CreditCard, History, LogOut, SlidersHorizontal, Tags, Users, WalletCards } from "lucide-react";

import type { AuthUser } from "@orchid/shared";

import { canManageReferenceSettings, roleLabel, type Navigate } from "../../app/app-core";
import { GhostButton, GlassPanel } from "../../app/ui";

export function SettingsProfilePage({
  user,
  navigate,
  onLogout
}: {
  user: AuthUser;
  navigate: Navigate;
  onLogout: () => void;
}) {
  const canManageReferences = canManageReferenceSettings(user);

  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <GlassPanel className="p-5">
        <h2 className="text-2xl font-semibold">Настройки</h2>
        <div className="mt-5 rounded-lg bg-white/[0.06] p-4 shadow-inner-glass ring-1 ring-white/[0.08]">
          <p className="text-sm text-white/45">Пользователь</p>
          <p className="mt-1 text-xl font-semibold">{user.name}</p>
          <p className="mt-1 text-sm text-white/55">
            {user.organization.name} · {roleLabel(user.role)}
          </p>
        </div>
        <GhostButton className="mt-5" onClick={onLogout}>
          <LogOut size={18} />
          Выйти
        </GhostButton>
      </GlassPanel>

      <div className="grid gap-4">
        <button
          className="rounded-lg border border-white/[0.08] bg-panel/95 p-5 text-left shadow-glass transition-[background-color,border-color,box-shadow,transform] hover:border-mint/30 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
          onClick={() => navigate({ section: "settings", view: "tax" })}
          type="button"
        >
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-mint shadow-inner-glass ring-1 ring-white/10">
            <WalletCards aria-hidden="true" size={22} />
          </span>
          <span className="mt-5 block text-2xl font-semibold">Налоги</span>
          {user.role !== "OWNER" ? (
            <span className="mt-3 inline-flex rounded-md border border-amber/20 bg-amber/10 px-2.5 py-1 text-xs font-medium text-amber">
              Только владелец меняет режим
            </span>
          ) : null}
          <span className="mt-2 block max-w-xl text-sm leading-6 text-white/55">
            Самозанятость, ставки 4% и 6%, автоматическая запись налога в расходы при выдаче заказа.
          </span>
        </button>
        {canManageReferences ? (
          <>
            <button
              className="rounded-lg border border-white/[0.08] bg-panel/95 p-5 text-left shadow-glass transition-[background-color,border-color,box-shadow,transform] hover:border-mint/30 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
              onClick={() => navigate({ section: "settings", view: "payment-methods" })}
              type="button"
            >
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-mint shadow-inner-glass ring-1 ring-white/10">
                <CreditCard aria-hidden="true" size={22} />
              </span>
              <span className="mt-5 block text-2xl font-semibold">Способы оплаты</span>
              <span className="mt-2 block max-w-xl text-sm leading-6 text-white/55">
                Только два способа оплаты: наличные и перевод.
              </span>
            </button>
            <button
              className="rounded-lg border border-white/[0.08] bg-panel/95 p-5 text-left shadow-glass transition-[background-color,border-color,box-shadow,transform] hover:border-mint/30 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
              onClick={() => navigate({ section: "settings", view: "expense-categories" })}
              type="button"
            >
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-mint shadow-inner-glass ring-1 ring-white/10">
                <Tags aria-hidden="true" size={22} />
              </span>
              <span className="mt-5 block text-2xl font-semibold">Категории расходов</span>
              <span className="mt-2 block max-w-xl text-sm leading-6 text-white/55">
                Рабочие категории для ручных расходов. Налоги и зарплаты остаются системными строками.
              </span>
            </button>
          </>
        ) : null}
        <button
          className="rounded-lg border border-white/[0.08] bg-panel/95 p-5 text-left shadow-glass transition-[background-color,border-color,box-shadow,transform] hover:border-mint/30 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
          onClick={() => navigate({ section: "settings", view: "audit" })}
          type="button"
        >
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-mint shadow-inner-glass ring-1 ring-white/10">
            <History aria-hidden="true" size={22} />
          </span>
          <span className="mt-5 block text-2xl font-semibold">Журнал</span>
          <span className="mt-2 block max-w-xl text-sm leading-6 text-white/55">
            Статусы, оплаты, выдачи заказов, подтверждения расходов и изменения каталога.
          </span>
        </button>
        {canManageReferences ? (
          <button
            className="rounded-lg border border-white/[0.08] bg-panel/95 p-5 text-left shadow-glass transition-[background-color,border-color,box-shadow,transform] hover:border-mint/30 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
            onClick={() => navigate({ section: "settings", view: "members" })}
            type="button"
          >
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-mint shadow-inner-glass ring-1 ring-white/10">
              <Users aria-hidden="true" size={22} />
            </span>
            <span className="mt-5 block text-2xl font-semibold">Мастера</span>
            <span className="mt-2 block max-w-xl text-sm leading-6 text-white/55">
              Добавление, отключение и процент комиссии мастеров без доступа к админам и владельцам.
            </span>
          </button>
        ) : null}
        <button
          className="rounded-lg border border-white/[0.08] bg-panel/95 p-5 text-left shadow-glass transition-[background-color,border-color,box-shadow,transform] hover:border-mint/30 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/30 active:translate-y-px"
          onClick={() => navigate({ section: "settings", view: "services" })}
          type="button"
        >
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/10 text-mint shadow-inner-glass ring-1 ring-white/10">
            <SlidersHorizontal aria-hidden="true" size={22} />
          </span>
          <span className="mt-5 block text-2xl font-semibold">Каталог услуг</span>
          <span className="mt-2 block max-w-xl text-sm leading-6 text-white/55">
            Работы с ценой и себестоимостью по умолчанию.
          </span>
        </button>
      </div>
    </div>
  );
}
