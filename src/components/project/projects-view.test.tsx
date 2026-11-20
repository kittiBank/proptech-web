import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { renderWithClient } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { failingHandler } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { router, setPathname, setSearchParams } from "@/test/next-navigation";
import { makeQueryClient } from "@/providers/query-provider";
import type { ProjectDetail } from "@/types/property";
import { getProjectDetail } from "@/mocks/db";
import { resetMockSession } from "@/mocks/session";
import { ProjectsView } from "./projects-view";
import { ViewingForm } from "./viewing-form";

function renderWith(ui: ReactNode, query = "") {
  setSearchParams(query);
  const client = makeQueryClient();
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  setPathname("/projects");
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ProjectsView", () => {
  it("shows the featured project, counts and cards", async () => {
    renderWith(<ProjectsView />);
    expect(await screen.findByRole("heading", { level: 2, name: /แอสเตอร์ สาทร/ })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /โครงการทั้งหมด 20 โครงการ/ })).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar").length).toBeGreaterThan(0);
    expect(screen.getByRole("navigation", { name: "หน้ารายการโครงการ" })).toBeInTheDocument();
  });

  it("filters by status through the URL and hides the featured slot", async () => {
    const user = userEvent.setup();
    renderWith(<ProjectsView />);
    await user.click(await screen.findByRole("button", { name: /^พร้อมอยู่/ }));
    expect(router.replace).toHaveBeenCalledWith("/projects?status=ready", { scroll: false });
  });

  it("pages with push so Back works", async () => {
    const user = userEvent.setup();
    renderWith(<ProjectsView />, "status=under-construction");
    expect(await screen.findByRole("heading", { name: /ที่ตรงกับตัวกรอง/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "แอสเตอร์ สาทร" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "หน้า 2" }));
    expect(router.push).toHaveBeenCalledWith("/projects?status=under-construction&page=2", { scroll: false });
  });

  it("shows a retry panel when the list fails", async () => {
    server.use(failingHandler("/projects"));
    renderWith(<ProjectsView />, "type=condo");
    expect(await screen.findByRole("alert")).toHaveTextContent("โหลดรายการโครงการไม่สำเร็จ");
  });
});

describe("ViewingForm", () => {
  const project = getProjectDetail("aster-sathorn") as ProjectDetail;

  it("shows field errors on submit, then sends the request", async () => {
    resetMockSession({ signedIn: true });
    const user = userEvent.setup();
    renderWith(<ViewingForm project={project} instance="aside" />);
    await user.click(screen.getByRole("button", { name: "ส่งคำขอนัดชม" }));
    expect(screen.getByLabelText("ชื่อ")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("กรอกชื่อของคุณ")).toBeInTheDocument();
    expect(screen.getByText("เลือกวันที่สะดวก")).toBeInTheDocument();

    await user.type(screen.getByLabelText("ชื่อ"), "สมหญิง");
    await user.type(screen.getByLabelText("เบอร์โทร"), "12");
    await user.tab();
    expect(await screen.findByText(/กรอกเบอร์โทร 9–10 หลัก/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText("เบอร์โทร"));
    await user.type(screen.getByLabelText("เบอร์โทร"), "081-234-5678");
    await user.type(screen.getByLabelText("วันที่สะดวก"), "2099-01-15");
    await user.click(screen.getByRole("button", { name: "ส่งคำขอนัดชม" }));
    expect((await screen.findByText(/ส่งคำขอนัดชมแล้ว/)).closest("[role=status]")).toBeInTheDocument();
  });

  it("asks a signed-out visitor to log in, then sends the request after sign-in", async () => {
    const user = userEvent.setup();
    const { client } = renderWithClient(<ViewingForm project={project} instance="aside" />);
    await user.type(screen.getByLabelText("ชื่อ"), "สมหญิง");
    await user.type(screen.getByLabelText("เบอร์โทร"), "0812345678");
    await user.type(screen.getByLabelText("วันที่สะดวก"), "2099-01-15");
    await user.click(screen.getByRole("button", { name: "ส่งคำขอนัดชม" }));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(String(router.push.mock.lastCall?.[0])).toMatch(/^\/login\?intent=viewing&next=/);

    // Signing in (in the modal) resumes the request.
    resetMockSession({ signedIn: true });
    await client.invalidateQueries({ queryKey: ["auth", "session"] });
    expect((await screen.findByText(/ส่งคำขอนัดชมแล้ว/)).closest("[role=status]")).toBeInTheDocument();
  });
});
