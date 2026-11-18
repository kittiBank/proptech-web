import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { setPendingAction } from "@/lib/auth-gate";
import { DEMO_ACCOUNT, MOCK_RESET_TOKEN } from "@/mocks/constants";
import { router, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { ForgotPasswordView, ResetPasswordView } from "./account-recovery";
import { LoginModal } from "./login-modal";
import { LoginView, RegisterView } from "./login-view";

describe("LoginView", () => {
  it("validates, reports a wrong password, then signs in and goes to next", async () => {
    const user = userEvent.setup();
    setSearchParams("next=/account/favorites");
    renderWithClient(<LoginView />);

    await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    expect(screen.getByText("กรอกอีเมล")).toBeInTheDocument();
    expect(screen.getByLabelText("อีเมล")).toHaveFocus();

    await user.type(screen.getByLabelText("อีเมล"), "somying@gmail");
    await user.tab();
    expect(await screen.findByText(/อีเมลไม่ครบ/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("อีเมล"));
    await user.type(screen.getByLabelText("อีเมล"), DEMO_ACCOUNT.email);
    await user.type(screen.getByLabelText("รหัสผ่าน"), "wrong-pass");
    await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("อีเมลหรือรหัสผ่านไม่ถูกต้อง");

    await user.clear(screen.getByLabelText("รหัสผ่าน"));
    await user.type(screen.getByLabelText("รหัสผ่าน"), DEMO_ACCOUNT.password);
    await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/account/favorites"));
  });

  it("toggles password visibility", async () => {
    const user = userEvent.setup();
    renderWithClient(<LoginView />);
    const input = screen.getByLabelText("รหัสผ่าน");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "แสดงรหัสผ่าน" }));
    expect(input).toHaveAttribute("type", "text");
  });

  it("sends new Google users to onboarding first", async () => {
    const user = userEvent.setup();
    renderWithClient(<LoginView />);
    await user.click(screen.getByRole("button", { name: "ดำเนินการต่อด้วย Google" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/onboarding?next=%2F"));
  });
});

describe("RegisterView", () => {
  it("checks the password rules and terms, then goes to verify email", async () => {
    const user = userEvent.setup();
    renderWithClient(<RegisterView />);
    await user.type(screen.getByLabelText("ชื่อ"), "ทดสอบ");
    await user.type(screen.getByLabelText("นามสกุล"), "ระบบ");
    await user.type(screen.getByLabelText("อีเมล"), "new@example.com");
    await user.type(screen.getByLabelText("รหัสผ่าน"), "abcdefgh");
    expect(screen.getByRole("meter", { name: "ความแข็งแรงของรหัสผ่าน" })).toHaveAttribute("aria-valuenow", "2");

    await user.click(screen.getByRole("button", { name: "สร้างบัญชี" }));
    expect(screen.getByText("รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว")).toBeInTheDocument();
    expect(screen.getByText("ต้องยอมรับข้อกำหนดและนโยบายก่อนสมัคร")).toBeInTheDocument();

    await user.type(screen.getByLabelText("รหัสผ่าน"), "1");
    await user.click(screen.getByRole("checkbox", { name: /ฉันยอมรับ/ }));
    await user.click(screen.getByRole("button", { name: "สร้างบัญชี" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/verify-email?email=new%40example.com&next=%2F"));
  });

  it("flags an email that already has an account", async () => {
    const user = userEvent.setup();
    renderWithClient(<RegisterView />);
    await user.type(screen.getByLabelText("ชื่อ"), "สมหญิง");
    await user.type(screen.getByLabelText("นามสกุล"), "ใจดี");
    await user.type(screen.getByLabelText("อีเมล"), DEMO_ACCOUNT.email);
    await user.type(screen.getByLabelText("รหัสผ่าน"), "Another123");
    await user.click(screen.getByRole("checkbox", { name: /ฉันยอมรับ/ }));
    await user.click(screen.getByRole("button", { name: "สร้างบัญชี" }));
    expect(await screen.findByText("อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ")).toBeInTheDocument();
  });
});

describe("LoginModal", () => {
  it("shows the listing being saved and steps back after signing in", async () => {
    const user = userEvent.setup();
    setSearchParams("intent=favorite&next=/search");
    setPendingAction({
      intent: "favorite",
      key: "p-1",
      path: "/search",
      preview: { title: "2 ห้องนอน ใกล้ EmQuartier" },
    });
    renderWithClient(<LoginModal />);

    expect(screen.getByRole("dialog", { name: "เข้าสู่ระบบเพื่อบันทึกประกาศนี้" })).toBeInTheDocument();
    expect(screen.getByText("2 ห้องนอน ใกล้ EmQuartier")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบด้วยอีเมล" }));
    await user.type(screen.getByLabelText("อีเมล"), DEMO_ACCOUNT.email);
    await user.type(screen.getByLabelText("รหัสผ่าน"), DEMO_ACCOUNT.password);
    await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it("closes with the close button", async () => {
    const user = userEvent.setup();
    renderWithClient(<LoginModal />);
    await user.click(screen.getByRole("button", { name: "ปิด" }));
    expect(router.back).toHaveBeenCalled();
  });
});

describe("password recovery", () => {
  it("sends a reset link and sets a new password", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithClient(<ForgotPasswordView />);
    await user.type(screen.getByLabelText("อีเมล"), DEMO_ACCOUNT.email);
    await user.click(screen.getByRole("button", { name: "ส่งลิงก์ตั้งรหัสผ่าน" }));
    expect(await screen.findByRole("heading", { name: "ส่งลิงก์แล้ว" })).toBeInTheDocument();
    unmount();

    setSearchParams(`token=${MOCK_RESET_TOKEN}`);
    renderWithClient(<ResetPasswordView />);
    await user.type(screen.getByLabelText("รหัสผ่านใหม่"), "newpass123");
    await user.type(screen.getByLabelText("ยืนยันรหัสผ่าน"), "newpass124");
    await user.click(screen.getByRole("button", { name: "บันทึกรหัสผ่านใหม่" }));
    expect(screen.getByText("รหัสผ่านทั้งสองช่องไม่ตรงกัน")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("ยืนยันรหัสผ่าน"));
    await user.type(screen.getByLabelText("ยืนยันรหัสผ่าน"), "newpass123");
    await user.click(screen.getByRole("button", { name: "บันทึกรหัสผ่านใหม่" }));
    expect(await screen.findByRole("heading", { name: "ตั้งรหัสผ่านใหม่แล้ว" })).toBeInTheDocument();
  });

  it("explains an expired link", () => {
    setSearchParams("");
    renderWithClient(<ResetPasswordView />);
    expect(screen.getByRole("heading", { name: "ลิงก์ตั้งรหัสผ่านใช้ไม่ได้" })).toBeInTheDocument();
  });
});
