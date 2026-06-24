import { describe, expect, it } from "vitest";

import { pathForScreen, screenFromLocation } from "./app-core";

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
});
