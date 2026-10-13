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
  const m = isoStr.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(\.\d+)?(?:(Z)|([+-])(\d{2})(?::?(\d{2}))?)?$/
  );
  if (!m) {
    return isoStr;
  }

  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  const day = Number.parseInt(m[3], 10);
  const hour = Number.parseInt(m[4], 10);
  const minute = Number.parseInt(m[5], 10);
  const second = m[6] != null ? Number.parseInt(m[6], 10) : 0;
  const frac = m[7] ?? "";

  // 解析输入自带的偏移（Z 或 ±hh[:mm]）；无偏移时按 UTC 处理。
  let sourceOffsetMinutes = 0;
  if (m[9] != null) {
    const sign = m[9] === "-" ? -1 : 1;
    const offH = Number.parseInt(m[10], 10);
    const offM = m[11] != null ? Number.parseInt(m[11], 10) : 0;
    sourceOffsetMinutes = sign * (offH * 60 + offM);
  }

  // 先把 wall-clock 换算成绝对时刻，再叠加目标时区偏移得到目标 wall-clock。
  const instantMs =
    Date.UTC(year, month - 1, day, hour, minute, second) -
    sourceOffsetMinutes * 60000;
  const target = new Date(instantMs + offsetMinutes * 60000);

  const y = target.getUTCFullYear();
  const mo = String(target.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(target.getUTCDate()).padStart(2, "0");
  const hh = String(target.getUTCHours()).padStart(2, "0");
  const mm = String(target.getUTCMinutes()).padStart(2, "0");
  const ss = String(target.getUTCSeconds()).padStart(2, "0");

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const oh = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
  const om = String(Math.abs(offsetMinutes) % 60).padStart(2, "0");

  return `${y}-${mo}-${dd}T${hh}:${mm}:${ss}${frac}${sign}${oh}:${om}`;
};
