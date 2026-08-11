export const DEFAULT_ORGANIZATION_TIMEZONE = "Europe/Moscow";

type Period = "today" | "week" | "month" | "previous-month";

const dateFormatter = (timeZone: string) => new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function localDate(date = new Date(), timeZone = DEFAULT_ORGANIZATION_TIMEZONE) {
  return dateFormatter(timeZone).format(date);
}

function calendarParts(date: Date, timeZone: string) {
  const parts = dateFormatter(timeZone).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function calendarDate(year: number, monthIndex: number, day: number) {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function periodRange(period: Period, now = new Date(), timeZone = DEFAULT_ORGANIZATION_TIMEZONE) {
  const current = calendarParts(now, timeZone);
  if (period === "previous-month") {
    return {
      dateFrom: calendarDate(current.year, current.month - 2, 1),
      dateTo: calendarDate(current.year, current.month - 1, 0),
    };
  }
  const dateTo = calendarDate(current.year, current.month - 1, current.day);
  if (period === "today") return { dateFrom: dateTo, dateTo };
  if (period === "week") return { dateFrom: calendarDate(current.year, current.month - 1, current.day - 6), dateTo };
  return { dateFrom: calendarDate(current.year, current.month - 1, 1), dateTo };
}

function zonedDateTimeToUtc(date: string, endOfDay: boolean, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const hour = endOfDay ? 23 : 0;
  const minute = endOfDay ? 59 : 0;
  const second = endOfDay ? 59 : 0;
  const millisecond = endOfDay ? 999 : 0;
  const desired = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  let candidate = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const represented = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"), millisecond);
    candidate += desired - represented;
  }
  return new Date(candidate).toISOString();
}

export function timestampBounds(dateFrom: string, dateTo: string, timeZone = DEFAULT_ORGANIZATION_TIMEZONE) {
  return {
    from: zonedDateTimeToUtc(dateFrom, false, timeZone),
    to: zonedDateTimeToUtc(dateTo, true, timeZone),
  };
}
