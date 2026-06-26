import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatPhoneInput,
  navItemsForUser,
  ordersQueryFromSearch,
  pathForScreen,
  phoneTelHref,
  phoneValueForApi,
  requestPathForOrders,
  screenForUser,
  screenFromLocation
} from "./app-core";

afterEach(() => {
  vi.useRealTimers();
});

function locationFor(pathname: string, search = "") {
  return { pathname, search } as Location;
}

describe("app routing helpers", () => {
  it("keeps settings views in shareable URLs", () => {
    const settingsPaths = [
      "/settings",
      "/settings/audit",
      "/settings/members",
      "/settings/payment-methods",
      "/settings/expense-categories",
      "/settings/tax",
      "/settings/services",
      "/settings/services/new"
    ];

    for (const path of settingsPaths) {
      expect(pathForScreen(screenFromLocation(locationFor(path)))).toBe(path);
    }
  });

  it("keeps expense create context in URL query params", () => {
    const screen = screenFromLocation(locationFor("/expenses/new", "?orderId=order-1&itemId=item-1"));

    expect(screen).toEqual({
      section: "expenses",
      view: "create",
      orderId: "order-1",
      itemId: "item-1"
    });
    expect(pathForScreen(screen)).toBe("/expenses/new?orderId=order-1&itemId=item-1");
  });

  it("keeps money as the finance entry point and limits sensitive views", () => {
    expect(pathForScreen(screenFromLocation(locationFor("/money")))).toBe("/money");
    expect(pathForScreen(screenFromLocation(locationFor("/money/expenses")))).toBe("/money/expenses");
    expect(pathForScreen(screenFromLocation(locationFor("/money/expenses/new")))).toBe("/money/expenses/new");
    expect(pathForScreen(screenFromLocation(locationFor("/money/expenses/new", "?month=2026-06")))).toBe(
      "/money/expenses/new?month=2026-06"
    );
    expect(pathForScreen(screenFromLocation(locationFor("/money/payouts")))).toBe("/money/payouts");
    expect(pathForScreen(screenFromLocation(locationFor("/money/ledger")))).toBe("/money/ledger");
    expect(pathForScreen(screenFromLocation(locationFor("/money/ledger", "?month=2026-06")))).toBe(
      "/money/ledger?month=2026-06"
    );
    expect(pathForScreen(screenFromLocation(locationFor("/money/receivables")))).toBe("/money/receivables");
    expect(pathForScreen(screenFromLocation(locationFor("/money/audit")))).toBe("/money/audit");
    expect(navItemsForUser({ role: "OWNER" }).map((item) => item.section)).toContain("money");
    expect(navItemsForUser({ role: "ADMIN" }).map((item) => item.section)).toContain("money");
    expect(navItemsForUser({ role: "MANAGER" }).map((item) => item.section)).toContain("money");
    expect(navItemsForUser({ role: "MASTER" }).map((item) => item.section)).not.toContain("money");
    expect(screenForUser({ role: "MANAGER" }, { section: "money", view: "overview" })).toEqual({
      section: "money",
      view: "expenses"
    });
    expect(screenForUser({ role: "MANAGER" }, { section: "money", view: "expenses" })).toEqual({
      section: "money",
      view: "expenses"
    });
    expect(screenForUser({ role: "MANAGER" }, { section: "money", view: "expense-create" })).toEqual({
      section: "money",
      view: "expense-create"
    });
    expect(screenForUser({ role: "MANAGER" }, { section: "money", view: "ledger" })).toEqual({
      section: "money",
      view: "expenses"
    });
    expect(screenForUser({ role: "MANAGER" }, { section: "money", view: "receivables" })).toEqual({
      section: "money",
      view: "expenses"
    });
    expect(screenForUser({ role: "MANAGER" }, { section: "money", view: "audit" })).toEqual({
      section: "money",
      view: "expenses"
    });
  });

  it("defaults order list filters to the last 60 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-25T12:00:00.000Z"));

    const query = ordersQueryFromSearch("");

    expect(query.createdFrom).toBe("2026-04-27");
    expect(query.createdTo).toBe("2026-06-25");
    expect(requestPathForOrders(query)).toBe(
      "/api/v1/repair-orders?createdFrom=2026-04-27&createdTo=2026-06-25&limit=20"
    );
  });

  it("formats partial phone input without placeholder fragments", () => {
    expect(formatPhoneInput("+7")).toBe("+7");
    expect(formatPhoneInput("999")).toBe("+7 (999)");
    expect(formatPhoneInput("+7 (666", "+7 (66")).toBe("+7 (666)");
    expect(formatPhoneInput("+7 (999", "+7 (999)")).toBe("+7 (99");
    expect(formatPhoneInput("+7 (999) ", "+7 (999) 1")).toBe("+7 (999)");
    expect(formatPhoneInput("+7 () 123-45-67")).toBe("+7");
    expect(formatPhoneInput("")).toBe("+7");
    expect(formatPhoneInput("9991234567")).toBe("+7 (999) 123-45-67");
    expect(formatPhoneInput("+7 (undefined) undefined")).toBe("+7");
    expect(
      formatPhoneInput(
        "+7 (undefined) undefined-undefined-undefined+7 (undefined) undefined-undefined-undefined"
      )
    ).toBe("+7");
    expect(formatPhoneInput("89991234567")).toBe("+7 (999) 123-45-67");
    expect(phoneTelHref("+7 (999) 123-45-67")).toBe("tel:+79991234567");
    expect(phoneValueForApi("+7")).toBeUndefined();
    expect(phoneValueForApi("+7 (999) 123-45-67")).toBe("+7 (999) 123-45-67");
  });
});
