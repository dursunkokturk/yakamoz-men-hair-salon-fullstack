import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import weekday from "dayjs/plugin/weekday.js";
import "dayjs/locale/tr.js";

dayjs.extend(customParseFormat);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(weekday);
dayjs.locale("tr");

export const SLOT_INTERVAL_MINUTES = 30;
export const MAX_APPOINTMENTS_PER_SLOT = 2;

const DATE_FORMAT = "YYYY-MM-DD";
const TIME_FORMAT = "HH:mm";

/** "YYYY-MM-DD" formatında geçerli bir tarih mi? */
export function isValidDateISO(value) {
  return typeof value === "string" && dayjs(value, DATE_FORMAT, true).isValid();
}

/** "HH:mm" formatında geçerli bir saat mi? */
export function isValidTime(value) {
  return typeof value === "string" && dayjs(value, TIME_FORMAT, true).isValid();
}

/** Belirli bir tarihin haftalık kapalı güne denk gelip gelmediğini döner (varsayılan: Salı). */
export function isWorkingDay(dateISO, closedWeekday) {
  return dayjs(dateISO, DATE_FORMAT).weekday() !== closedWeekday;
}

/** workStartHour–workEndHour arası, SLOT_INTERVAL_MINUTES aralıklarla saat listesi üretir. */
export function generateTimeSlots(workStartHour, workEndHour) {
  const slots = [];
  let current = dayjs().hour(workStartHour).minute(0).second(0);
  const closing = dayjs().hour(workEndHour).minute(0).second(0);
  while (current.isBefore(closing)) {
    slots.push(current.format(TIME_FORMAT));
    current = current.add(SLOT_INTERVAL_MINUTES, "minute");
  }
  return slots;
}

/** Verilen tarih+saat şu andan önce mi? */
export function isPastDateTime(dateISO, time) {
  const dt = dayjs(`${dateISO} ${time}`, `${DATE_FORMAT} ${TIME_FORMAT}`);
  return dt.isBefore(dayjs());
}

/**
 * Bir tarihin randevuya açık olup olmadığını tek bir yerden belirler.
 * Hem haftalık kapalı günü hem de admin tarafından eklenen özel kapalı
 * günleri kontrol eder. Frontend'deki `scheduling.js` ile aynı mantık.
 */
export function getDateClosureInfo(dateISO, { closedWeekday, closedDaysMap }) {
  if (!isWorkingDay(dateISO, closedWeekday)) {
    return { isClosed: true, reason: "Haftalık kapalı gün" };
  }
  const closedDay = closedDaysMap.get(dateISO);
  if (closedDay) {
    return { isClosed: true, reason: closedDay.reason || "İşletme bu tarihte kapalı" };
  }
  return { isClosed: false, reason: null };
}

export { dayjs };
