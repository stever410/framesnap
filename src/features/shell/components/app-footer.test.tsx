import { fireEvent, render, screen } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { AppFooter } from "./app-footer";

const mockUseAppController = vi.fn();

vi.mock("../../../app/providers/app-controller.provider", () => ({
  useAppController: () => mockUseAppController(),
}));

describe("AppFooter", () => {
  it("should call locale change handler when switching to Vietnamese", () => {
    const onSelectLocale = vi.fn();

    mockUseAppController.mockReturnValue({
      t: (key: string, params?: { version?: string }) => {
        if (key === "footer.version") {
          return `v${params?.version}`;
        }
        return key;
      },
      locale: "en",
      onSelectLocale,
      currentLocaleCode: "EN",
      localeDropdownRef: { current: null },
      appVersion: "0.5.0",
    });

    render(<AppFooter />);

    const viOption = screen.getByRole("menuitemradio", {
      name: "common.switchToVietnamese",
    });
    fireEvent.click(viOption);

    expect(onSelectLocale).toHaveBeenCalledWith("vi");
  });
});
