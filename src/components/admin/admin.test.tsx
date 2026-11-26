import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { startAdminLogin, verifyAdminCode } from "@/mocks/admin";
import { DEMO_ADMIN } from "@/mocks/constants";
import { router, setPathname, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { AdminDashboard } from "./admin-dashboard";
import { AdminLogin } from "./admin-login";
import { AdminShell } from "./admin-shell";
import { RolesView } from "./roles-view";

function signInAs(email: string = DEMO_ADMIN.email) {
  const start = startAdminLogin(email, DEMO_ADMIN.password);
  if (!start.ok) throw new Error("bad mock admin");
  verifyAdminCode(start.challengeId, DEMO_ADMIN.code);
}

describe("AdminLogin (E11)", () => {
  it("asks for the password, then the authenticator code", async () => {
    setSearchParams("next=%2Fadmin%2Fsettings%2Froles");
    renderWithClient(<AdminLogin />);
    await userEvent.type(screen.getByLabelText("อีเมลบริษัท"), DEMO_ADMIN.email);
    await userEvent.type(screen.getByLabelText("รหัสผ่าน", { exact: true }), DEMO_ADMIN.password);
    await userEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

    expect(await screen.findByRole("heading", { name: "ยืนยันตัวตนขั้นที่ 2" })).toBeInTheDocument();
    const code = screen.getByLabelText("รหัส 6 หลักจากแอป Authenticator");
    await userEvent.type(code, "111111");
    await userEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("รหัสไม่ถูกต้อง ลองได้อีก 4 ครั้ง");

    await userEvent.type(code, DEMO_ADMIN.code);
    await userEvent.click(screen.getByRole("button", { name: "ยืนยัน" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin/settings/roles"));
  });

  it("rejects a wrong password", async () => {
    renderWithClient(<AdminLogin />);
    await userEvent.type(screen.getByLabelText("อีเมลบริษัท"), DEMO_ADMIN.email);
    await userEvent.type(screen.getByLabelText("รหัสผ่าน", { exact: true }), "nope");
    await userEvent.click(screen.getByRole("button", { name: "ถัดไป" }));
    expect(await screen.findByText("อีเมลหรือรหัสผ่านไม่ถูกต้อง")).toBeInTheDocument();
  });
});

describe("AdminShell", () => {
  it("sends signed-out visitors to the login page", async () => {
    setPathname("/admin/settings/roles");
    renderWithClient(<AdminShell>secret</AdminShell>);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin/login?next=%2Fadmin%2Fsettings%2Froles"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("shows the grouped nav with queue counts for a super admin", async () => {
    signInAs();
    setPathname("/admin");
    renderWithClient(<AdminShell>content</AdminShell>);
    const nav = await screen.findByRole("navigation", { name: "เมนูแอดมิน" });
    expect(within(nav).getByRole("link", { name: "แดชบอร์ด" })).toHaveAttribute("aria-current", "page");
    expect(await within(nav).findByRole("link", { name: /ตรวจประกาศ\s*38/ })).toHaveAttribute(
      "href",
      "/admin/moderation",
    );
    expect(within(nav).getByRole("link", { name: "สิทธิ์และบันทึกการใช้งาน" })).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("hides areas a moderator cannot open and blocks them by URL", async () => {
    signInAs("poom@propertyhub.co.th");
    setPathname("/admin/settings/roles");
    renderWithClient(<AdminShell>roles page</AdminShell>);
    const nav = await screen.findByRole("navigation", { name: "เมนูแอดมิน" });
    expect(within(nav).queryByRole("link", { name: "สิทธิ์และบันทึกการใช้งาน" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "รายได้และการชำระเงิน" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "บทบาทของคุณเปิดหน้านี้ไม่ได้" })).toBeInTheDocument();
    expect(screen.queryByText("roles page")).not.toBeInTheDocument();
  });

  it("signs out", async () => {
    signInAs();
    setPathname("/admin");
    renderWithClient(<AdminShell>content</AdminShell>);
    await userEvent.click(await screen.findByRole("button", { name: "ออกจากระบบ" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin/login"));
  });
});

describe("AdminDashboard (E1)", () => {
  it("shows today's KPIs, the hourly chart, alerts and the team", async () => {
    signInAs();
    renderWithClient(<AdminDashboard />);
    expect(await screen.findByRole("link", { name: /รอตรวจประกาศ\s*38/ })).toHaveAttribute("href", "/admin/moderation");
    expect(screen.getByText("฿48,320")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /ประกาศเข้าคิวรายชั่วโมงวันนี้/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /บัญชีต้องสงสัย/ })).toHaveAttribute("href", "/admin/users");
    expect(screen.getByRole("table", { name: "ทีมตรวจวันนี้" })).toHaveTextContent("นภัส");
  });
});

describe("RolesView (E10)", () => {
  it("lists roles and today's audit log, and records an invite", async () => {
    signInAs();
    renderWithClient(<RolesView />);
    const roles = await screen.findByRole("table", { name: "บทบาทแอดมิน" });
    expect(within(roles).getByText("KYC reviewer")).toBeInTheDocument();
    expect(await screen.findByText("เข้าสู่ระบบ")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "เชิญแอดมิน" }));
    const dialog = await screen.findByRole("dialog", { name: "เชิญแอดมิน" });
    await userEvent.type(within(dialog).getByLabelText("อีเมลบริษัท"), "mint@propertyhub.co.th");
    await userEvent.selectOptions(within(dialog).getByLabelText("บทบาท"), "editor");
    await userEvent.click(within(dialog).getByRole("button", { name: "ส่งคำเชิญ" }));

    expect(await screen.findByText("ส่งคำเชิญถึง mint@propertyhub.co.th แล้ว")).toBeInTheDocument();
    expect(await screen.findByText("เชิญ mint@propertyhub.co.th เป็น Editor")).toBeInTheDocument();
  });

  it("refuses to invite an existing admin", async () => {
    signInAs();
    renderWithClient(<RolesView />);
    await userEvent.click(await screen.findByRole("button", { name: "เชิญแอดมิน" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("อีเมลบริษัท"), "poom@propertyhub.co.th");
    await userEvent.click(within(dialog).getByRole("button", { name: "ส่งคำเชิญ" }));
    expect(await within(dialog).findByText("อีเมลนี้เป็นแอดมินหรือได้รับเชิญแล้ว")).toBeInTheDocument();
  });
});
