import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { getAgentProfile, queryProperties } from "@/mocks/db";
import { resetMockSession } from "@/mocks/session";
import { router, setParams, setPathname, setSearchParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import { AgentProfileView } from "./agent-profile-view";

const SLUG = "kittipat-srisuk";

function renderAgent(query = "") {
  setParams({ slug: SLUG });
  setPathname(`/agents/${SLUG}`);
  setSearchParams(query);
  return renderWithClient(<AgentProfileView />);
}

describe("AgentProfileView", () => {
  it("shows the profile, areas served and tab counts from the agent's live listings", async () => {
    const agent = getAgentProfile(SLUG)!;
    renderAgent();

    expect(await screen.findByRole("heading", { level: 1, name: "กิตติพัฒน์ ศรีสุข" })).toBeInTheDocument();
    expect(screen.getByText("ยืนยันตัวตนแล้ว")).toBeInTheDocument();
    const areas = screen.getByRole("heading", { name: "ย่านที่ดูแล" }).parentElement!;
    expect(within(areas).getAllByRole("listitem")).toHaveLength(agent.areas.length);

    const tabs = screen.getByRole("group", { name: "ประเภทประกาศ" });
    expect(within(tabs).getByRole("button", { name: `ทั้งหมด ${agent.counts.all}` })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(tabs).getByRole("button", { name: `ขาย ${agent.counts.buy}` })).toBeInTheDocument();
    expect(within(tabs).getByRole("button", { name: `เช่า ${agent.counts.rent}` })).toBeInTheDocument();

    const first = queryProperties({ agent: SLUG, limit: 12 }).data[0];
    expect((await screen.findAllByRole("link", { name: first.title })).length).toBeGreaterThan(0);
  });

  it("keeps the tab in the URL and only lists that deal type", async () => {
    const user = userEvent.setup();
    renderAgent();
    await user.click(await screen.findByRole("button", { name: /^เช่า/ }));
    expect(router.replace).toHaveBeenCalledWith(`/agents/${SLUG}?mode=rent`, { scroll: false });
  });

  it("filters rent listings when the URL asks for them", async () => {
    renderAgent("mode=rent");
    const rent = queryProperties({ agent: SLUG, mode: "rent", limit: 12 }).data;
    await waitFor(() => expect(screen.getAllByRole("link", { name: rent[0].title }).length).toBeGreaterThan(0));
    const sale = queryProperties({ agent: SLUG, mode: "buy", limit: 1 }).data[0];
    expect(screen.queryByRole("link", { name: sale.title })).not.toBeInTheDocument();
  });

  it("reveals the phone number on request", async () => {
    const user = userEvent.setup();
    renderAgent();
    await user.click(await screen.findByRole("button", { name: "แสดงเบอร์โทร 02-000-11xx" }));
    expect(screen.getByRole("link", { name: "โทร 02-000-1102" })).toHaveAttribute("href", "tel:020001102");
  });

  it("asks a signed-out visitor to log in before messaging, then opens the chat", async () => {
    const user = userEvent.setup();
    const { client } = renderAgent();
    const [message] = await screen.findAllByRole("button", { name: /ส่งข้อความ/ });
    await user.click(message);
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        `/login?intent=message&next=%2Fagents%2F${SLUG}`,
        expect.objectContaining({ scroll: false }),
      ),
    );

    resetMockSession({ signedIn: true });
    await client.invalidateQueries({ queryKey: ["auth", "session"] });
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/messages?to=agent%3A${SLUG}`));
  });

  it("shows a not-found panel for an unknown agent", async () => {
    setParams({ slug: "nobody" });
    renderWithClient(<AgentProfileView />);
    expect(await screen.findByRole("heading", { name: "ไม่พบโปรไฟล์นายหน้านี้" })).toBeInTheDocument();
  });
});
