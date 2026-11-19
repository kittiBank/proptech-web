import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouteError } from "./route-error";

describe("RouteError", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  afterEach(() => consoleError.mockClear());

  it("explains the failure, retries, and links home", async () => {
    const retry = vi.fn();
    render(<RouteError error={new Error("boom")} retry={retry} />);
    expect(screen.getByRole("heading", { name: "ระบบขัดข้องชั่วคราว" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "กลับหน้าแรก" })).toHaveAttribute("href", "/");
    await userEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalled();
  });

  it("shows the server digest as a reference code, and the section note", () => {
    const error = Object.assign(new Error("hidden"), { digest: "7F3A91C2" });
    render(<RouteError error={error} retry={() => {}} note="ข้อมูลที่กรอกไว้ในแบบร่างยังอยู่ครบ" />);
    expect(screen.getByText("7F3A91C2")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("ข้อมูลที่กรอกไว้ในแบบร่างยังอยู่ครบ");
  });

  it("hides the reference line when there is no digest", () => {
    render(<RouteError error="not an Error" retry={() => {}} />);
    expect(screen.queryByText(/รหัสอ้างอิง/)).not.toBeInTheDocument();
  });
});
