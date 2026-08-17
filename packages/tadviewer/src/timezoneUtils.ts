import { ColumnType } from "reltab";

export interface TimezoneOption {
  label: string;
  value: string | null;
  offsetMinutes: number;
}

export const getLocalTimezoneOffset = (): number => {
  return -new Date().getTimezoneOffset();
};

export const getLocalTimezoneLabel = (): string => {
  const offset = getLocalTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const h = String(Math.floor(abs / 60)).padStart(2, "0");
  const m = String(abs % 60).padStart(2, "0");
  return `本机时区 (UTC${sign}${h}:${m})`;
};

export const getTimezoneOptions = (): TimezoneOption[] => {
  const localOffset = getLocalTimezoneOffset();
  return [
    { label: getLocalTimezoneLabel(), value: null, offsetMinutes: localOffset },
    { label: "UTC-12:00", value: "UTC-12", offsetMinutes: -720 },
    { label: "UTC-11:00", value: "UTC-11", offsetMinutes: -660 },
    { label: "UTC-10:00", value: "UTC-10", offsetMinutes: -600 },
    { label: "UTC-09:00", value: "UTC-9", offsetMinutes: -540 },
    { label: "UTC-08:00", value: "UTC-8", offsetMinutes: -480 },
    { label: "UTC-07:00", value: "UTC-7", offsetMinutes: -420 },
    { label: "UTC-06:00", value: "UTC-6", offsetMinutes: -360 },
    { label: "UTC-05:00", value: "UTC-5", offsetMinutes: -300 },
    { label: "UTC-04:00", value: "UTC-4", offsetMinutes: -240 },
    { label: "UTC-03:00", value: "UTC-3", offsetMinutes: -180 },
    { label: "UTC-02:00", value: "UTC-2", offsetMinutes: -120 },
    { label: "UTC-01:00", value: "UTC-1", offsetMinutes: -60 },
    { label: "UTC+00:00", value: "UTC+0", offsetMinutes: 0 },
    { label: "UTC+01:00", value: "UTC+1", offsetMinutes: 60 },
    { label: "UTC+02:00", value: "UTC+2", offsetMinutes: 120 },
    { label: "UTC+03:00", value: "UTC+3", offsetMinutes: 180 },
    { label: "UTC+04:00", value: "UTC+4", offsetMinutes: 240 },
    { label: "UTC+05:00", value: "UTC+5", offsetMinutes: 300 },
    { label: "UTC+06:00", value: "UTC+6", offsetMinutes: 360 },
    { label: "UTC+07:00", value: "UTC+7", offsetMinutes: 420 },
    { label: "UTC+08:00", value: "UTC+8", offsetMinutes: 480 },
    { label: "UTC+09:00", value: "UTC+9", offsetMinutes: 540 },
    { label: "UTC+10:00", value: "UTC+10", offsetMinutes: 600 },
    { label: "UTC+11:00", value: "UTC+11", offsetMinutes: 660 },
    { label: "UTC+12:00", value: "UTC+12", offsetMinutes: 720 },
  ];
};

export const isTimezoneAwareColumn = (ct: ColumnType): boolean => {
  const name = ct.sqlTypeName.toUpperCase();
  return name === "TIMESTAMPTZ" || name.includes("TIME ZONE");
};

export const convertTimestampToTimezone = (
  isoStr: string,
  offsetMinutes: number
): string => {
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;

  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay = date.getUTCDate();
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcSeconds = date.getUTCSeconds();

  const totalMinutes = utcHours * 60 + utcMinutes + offsetMinutes;
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const remainder = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const newHours = Math.floor(remainder / 60);
  const newMinutes = remainder % 60;

  const result = new Date(
    Date.UTC(utcYear, utcMonth, utcDay + dayOffset, newHours, newMinutes, utcSeconds)
  );

  const y = result.getUTCFullYear();
  const m = String(result.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(result.getUTCDate()).padStart(2, "0");
  const hh = String(result.getUTCHours()).padStart(2, "0");
  const mm = String(result.getUTCMinutes()).padStart(2, "0");

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const oh = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const om = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");

  return `${y}-${m}-${dd}T${hh}:${mm}:00${sign}${oh}:${om}`;
};
