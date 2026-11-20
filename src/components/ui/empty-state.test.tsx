import { render, screen } from "@testing-library/react";
import { Heart } from "lucide-react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("shows a heading, body, one action and a secondary link", () => {
    render(
      <EmptyState
        icon={Heart}
        title="ยังไม่มีรายการโปรด"
        body="กดรูปหัวใจเพื่อบันทึกประกาศ"
        action={<Button>เริ่มค้นหา</Button>}
        secondary={<Link href="/projects">ดูโครงการใหม่</Link>}
      />,
    );
    expect(screen.getByRole("heading", { name: "ยังไม่มีรายการโปรด" })).toBeInTheDocument();
    expect(screen.getByText("กดรูปหัวใจเพื่อบันทึกประกาศ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เริ่มค้นหา" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ดูโครงการใหม่" })).toHaveAttribute("href", "/projects");
  });
});
