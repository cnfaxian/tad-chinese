import { convertTimestampToTimezone } from "../src/timezoneUtils";

describe("convertTimestampToTimezone", () => {
  it("保留真实秒位，不再硬编码为 00", () => {
    expect(convertTimestampToTimezone("2022-02-11 12:15:03+00", 480)).toBe(
      "2022-02-11T20:15:03+08:00"
    );
    expect(convertTimestampToTimezone("2022-02-11 12:15:06+00", 480)).toBe(
      "2022-02-11T20:15:06+08:00"
    );
  });

  it("原样保留小数秒精度（微秒/纳秒）", () => {
    expect(
      convertTimestampToTimezone("2022-02-11 12:15:03.123456+00", 480)
    ).toBe("2022-02-11T20:15:03.123456+08:00");
    expect(
      convertTimestampToTimezone("2022-02-11 12:15:03.123456789+00", 0)
    ).toBe("2022-02-11T12:15:03.123456789+00:00");
  });

  it("支持 ISO Z 输入与半小时时区", () => {
    expect(convertTimestampToTimezone("2022-02-11T12:15:03.500Z", 330)).toBe(
      "2022-02-11T17:45:03.500+05:30"
    );
  });

  it("正确处理跨天回退", () => {
    expect(convertTimestampToTimezone("2022-02-11 23:30:00+00", 480)).toBe(
      "2022-02-12T07:30:00+08:00"
    );
    expect(convertTimestampToTimezone("2022-02-01 00:30:00+00", -60)).toBe(
      "2022-01-31T23:30:00-01:00"
    );
  });

  it("无法解析时原样返回", () => {
    expect(convertTimestampToTimezone("not-a-timestamp", 0)).toBe(
      "not-a-timestamp"
    );
  });
});
