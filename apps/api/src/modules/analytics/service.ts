import { apiErrorCodes, type DashboardResponse } from "@orchid/shared";

import { AuthError, type AuthContext } from "../auth/service.js";
import { getDashboardData } from "./repository.js";

const resaleTypes = new Set(["MATERIAL", "PART", "STRINGS", "OTHER"]);

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function dateTimeFormatter(timeZone: string) {
  const existing = dateTimeFormatters.get(timeZone);

  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    calendar: "gregory",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    numberingSystem: "latn",
    second: "2-digit",
    timeZone,
    year: "numeric"
  });

  dateTimeFormatters.set(timeZone, formatter);

  return formatter;
}

function localDateTimeParts(date: Date, timeZone: string): LocalDateTimeParts {
  const parts = dateTimeFormatter(timeZone).formatToParts(date);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(valueByType.get("year")),
    month: Number(valueByType.get("month")),
    day: Number(valueByType.get("day")),
    hour: Number(valueByType.get("hour")),
    minute: Number(valueByType.get("minute")),
    second: Number(valueByType.get("second"))
  };
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = localDateTimeParts(date, timeZone);
  const localAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    date.getUTCMilliseconds()
  );

  return localAsUtcMs - date.getTime();
}

function zonedDateTimeToUtc(parts: LocalDateTimeParts, timeZone: string, millisecond = 0) {
  const utcGuessMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    millisecond
  );
  const firstOffset = timeZoneOffsetMs(new Date(utcGuessMs), timeZone);
  const firstUtcMs = utcGuessMs - firstOffset;
  const secondOffset = timeZoneOffsetMs(new Date(firstUtcMs), timeZone);

  return new Date(utcGuessMs - secondOffset);
}

function nextMonth(year: number, month: number) {
  return month === 12
    ? {
        year: year + 1,
        month: 1
      }
    : {
        year,
        month: month + 1
      };
}

export function monthPeriod(now = new Date(), timeZone = "UTC") {
  const localNow = localDateTimeParts(now, timeZone);
  const from = zonedDateTimeToUtc(
    {
      year: localNow.year,
      month: localNow.month,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0
    },
    timeZone
  );
  const next = nextMonth(localNow.year, localNow.month);
  const nextFrom = zonedDateTimeToUtc(
    {
      year: next.year,
      month: next.month,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0
    },
    timeZone
  );
  const to = new Date(nextFrom.getTime() - 1);

  return { from, to };
}

export async function getDashboard(auth: AuthContext): Promise<DashboardResponse> {
  if (!["OWNER", "ADMIN", "MANAGER"].includes(auth.role)) {
    throw new AuthError(apiErrorCodes.forbidden, "Forbidden", 403);
  }

  const period = monthPeriod(new Date(), auth.user.organization.timezone);
  const data = await getDashboardData(auth.organizationId, period);

  const paidRevenueCents = data.acceptedPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const paidCostCents = data.paidOrders.reduce((sum, order) => sum + order.totalCostCents, 0);
  const grossProfitCents = data.paidOrders.reduce((sum, order) => sum + order.grossProfitCents, 0);
  const resale = data.paidOrders.reduce(
    (totals, order) => {
      const orderResale = order.lineItems
        .filter((item) => resaleTypes.has(item.type))
        .reduce(
          (itemTotals, item) => ({
            revenueCents: itemTotals.revenueCents + item.priceCents,
            costCents: itemTotals.costCents + item.costCents
          }),
          { revenueCents: 0, costCents: 0 }
        );

      return {
        revenueCents: totals.revenueCents + orderResale.revenueCents,
        costCents: totals.costCents + orderResale.costCents
      };
    },
    { revenueCents: 0, costCents: 0 }
  );
  const resaleGrossProfitCents = resale.revenueCents - resale.costCents;
  const accruedRevenueCents = data.orders.reduce((sum, order) => sum + order.totalAmountCents, 0);
  const unpaidOrdersCount = data.orders.filter((order) => order.paymentStatus !== "PAID").length;
  const commissionTotals = data.accruedCommissionItems.reduce(
    (sum, item) => {
      const amountCents = item.commissionAmountCents ?? 0;

      return {
        accruedCents: sum.accruedCents + amountCents,
        paidCents: sum.paidCents + (item.commissionPayoutStatus === "PAID" ? amountCents : 0),
        unpaidCents: sum.unpaidCents + (item.commissionPayoutStatus === "UNPAID" ? amountCents : 0)
      };
    },
    {
      accruedCents: 0,
      paidCents: 0,
      unpaidCents: 0
    }
  );
  const paidCommissionCents = data.paidCommissionItems.reduce(
    (sum, item) => sum + (item.commissionAmountCents ?? 0),
    0
  );
  const netCashCents = paidRevenueCents - data.confirmedExpensesCents - commissionTotals.unpaidCents;

  return {
    period: {
      from: period.from.toISOString(),
      to: period.to.toISOString()
    },
    kpis: {
      paidRevenueCents,
      paidCostCents,
      grossProfitCents,
      accruedRevenueCents,
      confirmedExpensesCents: data.confirmedExpensesCents,
      accruedCommissionsCents: commissionTotals.accruedCents,
      paidCommissionsCents: paidCommissionCents,
      payableCommissionsCents: commissionTotals.unpaidCents,
      netCashCents,
      repairOrdersCount: data.orders.length,
      paidOrdersCount: data.paidOrders.length,
      unpaidOrdersCount,
      averagePaidTicketCents:
        data.acceptedPayments.length > 0 ? Math.round(paidRevenueCents / data.acceptedPayments.length) : 0
    },
    resale: {
      revenueCents: resale.revenueCents,
      costCents: resale.costCents,
      grossProfitCents: resaleGrossProfitCents,
      marginPercent: resale.revenueCents > 0 ? (resaleGrossProfitCents / resale.revenueCents) * 100 : 0
    },
    repairsByStatus: data.statusGroups.map((group) => ({
      status: group.repairStatus,
      count: group._count._all
    }))
  };
}
