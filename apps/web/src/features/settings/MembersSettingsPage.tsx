import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import type { MemberListResponse, MemberResponse } from "@orchid/shared";

import {
  authHeaders,
  errorMessage,
  formatPhoneInput,
  memberPercentInput,
  parsePercentInput,
  percent,
  request,
  type Screen
} from "../../app/app-core";
import { ConfirmDialog, GhostButton, GlassPanel, PageToolbar, PrimaryButton, StatusPill, TextField } from "../../app/ui";

type MemberDraft = {
  name: string;
  email: string;
  phone: string;
  commissionPercent: string;
};

function memberDraft(member: MemberResponse): MemberDraft {
  return {
    name: member.name,
    email: member.email,
    phone: member.phone ?? "",
    commissionPercent: memberPercentInput(member.commissionPercent)
  };
}

export function MembersSettingsPage({
  accessToken,
  navigate
}: {
  accessToken: string;
  navigate: (screen: Screen) => void;
}) {
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [drafts, setDrafts] = useState<Record<string, MemberDraft>>({});
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCommissionPercent, setNewCommissionPercent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [memberToDeactivate, setMemberToDeactivate] = useState<MemberResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshMembers = useCallback(async () => {
    const response = await request<MemberListResponse>("/api/v1/settings/members", {
      headers: authHeaders(accessToken)
    });

    setMembers(response.items);
    setDrafts(Object.fromEntries(response.items.map((item) => [item.id, memberDraft(item)])));
  }, [accessToken]);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError(null);
    refreshMembers()
      .catch(() => {
        if (isActive) {
          setError("Не удалось загрузить мастеров.");
          setMembers([]);
          setDrafts({});
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [refreshMembers]);

  function updateDraft(id: string, patch: Partial<MemberDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch
      }
    }));
  }

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const commissionPercent = parsePercentInput(newCommissionPercent);

      if (Number.isNaN(commissionPercent)) {
        throw new Error("Invalid commission percent");
      }

      await request<MemberResponse>("/api/v1/settings/members", {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          phone: newPhone || undefined,
          commissionPercent
        })
      });

      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewCommissionPercent("");
      await refreshMembers();
    } catch (requestError) {
      setError(errorMessage(requestError, "Не удалось добавить мастера."));
    } finally {
      setIsCreating(false);
    }
  }

  async function saveMember(member: MemberResponse, isActive?: boolean) {
    const draft = drafts[member.id];

    if (!draft) {
      return;
    }

    setError(null);
    setSavingId(member.id);

    try {
      const commissionPercent = parsePercentInput(draft.commissionPercent);

      if (Number.isNaN(commissionPercent)) {
        throw new Error("Invalid commission percent");
      }

      const response = await request<MemberResponse>(`/api/v1/settings/members/${member.id}`, {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          phone: draft.phone || null,
          commissionPercent,
          isActive
        })
      });

      setMembers((current) => current.map((item) => (item.id === response.id ? response : item)));
      setDrafts((current) => ({
        ...current,
        [response.id]: memberDraft(response)
      }));
    } catch (requestError) {
      setError(errorMessage(requestError, "Не удалось сохранить мастера."));
    } finally {
      setSavingId(null);
    }
  }

  async function deactivateMember(member: MemberResponse) {
    setError(null);
    setSavingId(member.id);

    try {
      const response = await request<MemberResponse>(`/api/v1/settings/members/${member.id}`, {
        method: "DELETE",
        headers: authHeaders(accessToken)
      });

      setMembers((current) => current.map((item) => (item.id === response.id ? response : item)));
      setDrafts((current) => ({
        ...current,
        [response.id]: memberDraft(response)
      }));
    } catch (requestError) {
      setError(errorMessage(requestError, "Не удалось отключить мастера."));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <PageToolbar back={() => navigate({ section: "settings", view: "profile" })} count={members.length} title="Мастера" />
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <GlassPanel className="p-5">
          <p className="text-sm text-white/48">Новый мастер</p>
          <h3 className="mt-1 text-2xl font-semibold">Добавить в мастерскую</h3>
          <form className="mt-5 grid gap-3" onSubmit={(event) => void createMember(event)}>
            <TextField autoComplete="name" label="Имя" onChange={(event) => setNewName(event.target.value)} value={newName} />
            <TextField autoComplete="email" label="Email" onChange={(event) => setNewEmail(event.target.value)} type="email" value={newEmail} />
            <TextField
              autoComplete="tel"
              inputMode="tel"
              label="Телефон"
              onChange={(event) => setNewPhone(formatPhoneInput(event.target.value))}
              type="tel"
              value={newPhone}
            />
            <TextField
              inputMode="decimal"
              label="Комиссия, %"
              onChange={(event) => setNewCommissionPercent(event.target.value)}
              placeholder="30"
              value={newCommissionPercent}
            />
            <p className="text-xs leading-5 text-white/42">Dev пароль для новых мастеров: orchid12345.</p>
            {error ? <p className="text-sm text-coral">{error}</p> : null}
            <PrimaryButton disabled={isCreating || !newName || !newEmail} type="submit">
              <Plus size={17} />
              {isCreating ? "Добавляем..." : "Добавить мастера"}
            </PrimaryButton>
          </form>
        </GlassPanel>

        <div className="grid gap-3">
          {isLoading ? <p className="rounded-lg bg-white/[0.07] p-4 text-white/55">Загружаем мастеров...</p> : null}
          {!isLoading && members.length === 0 ? (
            <GlassPanel className="p-5">
              <p className="text-white/62">Мастеров пока нет.</p>
            </GlassPanel>
          ) : null}
          {members.map((member) => {
            const draft = drafts[member.id] ?? memberDraft(member);

            return (
              <GlassPanel key={member.id} as="article" className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{member.name}</h3>
                      <StatusPill label={member.isActive ? "Активен" : "Отключен"} tone={member.isActive ? "mint" : "neutral"} />
                    </div>
                    <p className="mt-1 text-sm text-white/45">
                      {member.email} · комиссия {member.commissionPercent === null ? "не задана" : `${percent(member.commissionPercent)}%`}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <TextField
                    autoComplete="name"
                    label="Имя"
                    onChange={(event) => updateDraft(member.id, { name: event.target.value })}
                    value={draft.name}
                  />
                  <TextField
                    autoComplete="email"
                    label="Email"
                    onChange={(event) => updateDraft(member.id, { email: event.target.value })}
                    type="email"
                    value={draft.email}
                  />
                  <TextField
                    autoComplete="tel"
                    inputMode="tel"
                    label="Телефон"
                    onChange={(event) => updateDraft(member.id, { phone: formatPhoneInput(event.target.value) })}
                    type="tel"
                    value={draft.phone}
                  />
                  <TextField
                    inputMode="decimal"
                    label="Комиссия, %"
                    onChange={(event) => updateDraft(member.id, { commissionPercent: event.target.value })}
                    value={draft.commissionPercent}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PrimaryButton disabled={savingId === member.id} onClick={() => void saveMember(member)}>
                    {savingId === member.id ? "Сохраняем..." : "Сохранить"}
                  </PrimaryButton>
                  {member.isActive ? (
                    <GhostButton disabled={savingId === member.id} onClick={() => setMemberToDeactivate(member)}>
                      <Trash2 size={16} />
                      Отключить
                    </GhostButton>
                  ) : (
                    <GhostButton disabled={savingId === member.id} onClick={() => void saveMember(member, true)}>
                      Вернуть
                    </GhostButton>
                  )}
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </div>
      {memberToDeactivate ? (
        <ConfirmDialog
          confirmLabel="Отключить мастера"
          destructive
          isBusy={savingId === memberToDeactivate.id}
          onCancel={() => setMemberToDeactivate(null)}
          onConfirm={() => {
            const member = memberToDeactivate;
            setMemberToDeactivate(null);
            void deactivateMember(member);
          }}
          title="Отключить мастера?"
        >
          <p>Пользователь потеряет активный доступ как мастер. Исторические заказы и начисления останутся в системе.</p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
