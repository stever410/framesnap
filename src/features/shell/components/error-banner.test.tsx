import { fireEvent, render, screen } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { ErrorBanner } from "./error-banner";

const mockUseAppStore = vi.fn();
const mockUseAppController = vi.fn();

vi.mock("../../../app/providers/app-store.provider", () => ({
  useAppStore: () => mockUseAppStore(),
}));

vi.mock("../../../app/providers/app-controller.provider", () => ({
  useAppController: () => mockUseAppController(),
}));

describe("ErrorBanner", () => {
  it("should dispatch error clear action when dismiss is clicked", () => {
    const dispatch = vi.fn();

    mockUseAppStore.mockReturnValue({ dispatch });
    mockUseAppController.mockReturnValue({
      errorMessage: "Boom",
      t: (key: string) => key,
    });

    render(<ErrorBanner />);

    const dismissButton = screen.getByRole("button", { name: "common.dismiss" });
    fireEvent.click(dismissButton);

    expect(dispatch).toHaveBeenCalledWith({ type: "error/clear" });
  });
});
