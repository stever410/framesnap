import { describe, expect, it } from "vitest";
import { AppError, toErrorCode } from "./errors";

describe("errors", () => {
  it("should preserve AppError code", () => {
    const error = new AppError("CAPTURE_FAILED", "Capture failed");

    expect(error.code).toBe("CAPTURE_FAILED");
    expect(error.message).toBe("Capture failed");
  });

  it("should map AppError to specific error code", () => {
    const code = toErrorCode(new AppError("SEEK_TIMEOUT", "timeout"));

    expect(code).toBe("SEEK_TIMEOUT");
  });

  it("should map unknown errors to UNKNOWN", () => {
    expect(toErrorCode(new Error("x"))).toBe("UNKNOWN");
    expect(toErrorCode("x")).toBe("UNKNOWN");
  });
});
