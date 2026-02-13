import { describe, expect, it } from "vitest";
import { fileSafeTimestamp, formatFileSize, formatTimestamp, parseTimestampInput } from "./format";

describe("format utilities", () => {
  it("should format timestamp with minutes, seconds, and milliseconds", () => {
    expect(formatTimestamp(61.345)).toBe("01:01.344");
  });

  it("should clamp invalid timestamp input for formatting", () => {
    expect(formatTimestamp(Number.NaN)).toBe("00:00.000");
    expect(formatTimestamp(-10)).toBe("00:00.000");
  });

  it("should parse mm:ss.xxx and seconds-only inputs", () => {
    expect(parseTimestampInput("01:02.5")).toBe(62.5);
    expect(parseTimestampInput("12.25")).toBe(12.25);
  });

  it("should reject invalid timestamp input", () => {
    expect(parseTimestampInput("")).toBeNull();
    expect(parseTimestampInput("foo")).toBeNull();
    expect(parseTimestampInput("-1")).toBeNull();
    expect(parseTimestampInput("01:-2")).toBeNull();
    expect(parseTimestampInput("1:abc")).toBeNull();
  });

  it("should format file-safe timestamp", () => {
    expect(fileSafeTimestamp(12.3456)).toBe("12-346");
    expect(fileSafeTimestamp(-2)).toBe("0-000");
  });

  it("should format file sizes across units", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1024)).toBe("1.00 KB");
    expect(formatFileSize(1024 * 1024 * 5)).toBe("5.00 MB");
  });
});
