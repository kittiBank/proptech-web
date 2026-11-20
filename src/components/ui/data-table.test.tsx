import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { DataTable, type DataColumn } from "./data-table";

interface Row {
  id: string;
  title: string;
  views: number;
}

const rows: Row[] = [
  { id: "1", title: "คอนโดอโศก", views: 120 },
  { id: "2", title: "บ้านบางนา", views: 45 },
  { id: "3", title: "ทาวน์โฮมรามอินทรา", views: 9 },
];

const columns: DataColumn<Row>[] = [
  { id: "title", header: "ประกาศ", cell: (r) => r.title },
  { id: "views", header: "เข้าชม", cell: (r) => r.views, align: "right" },
];

function Table({ onBulk, onPage }: { onBulk?: (ids: string[]) => void; onPage?: (p: number) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <DataTable
      caption="ประกาศของฉัน"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      rowLabel={(r) => r.title}
      selection={{ selected, onChange: setSelected }}
      bulkActions={(ids) => <Button onClick={() => onBulk?.(ids)}>ปิดประกาศ</Button>}
      pagination={{ page: 1, pageCount: 3, onPageChange: onPage ?? (() => {}) }}
      footer="แสดง 1–3 จาก 9"
    />
  );
}

describe("DataTable", () => {
  it("renders a captioned table with column headers", () => {
    render(<Table />);
    const table = screen.getByRole("table", { name: "ประกาศของฉัน" });
    expect(within(table).getByRole("columnheader", { name: "เข้าชม" })).toBeInTheDocument();
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(screen.getByText("แสดง 1–3 จาก 9")).toBeInTheDocument();
  });

  it("selects rows, shows the bulk bar and selects all with a mixed header box", async () => {
    const user = userEvent.setup();
    const onBulk = vi.fn();
    render(<Table onBulk={onBulk} />);
    const all = screen.getByRole("checkbox", { name: "เลือกทั้งหมดในหน้านี้" }) as HTMLInputElement;

    await user.click(screen.getByRole("checkbox", { name: "เลือก บ้านบางนา" }));
    expect(screen.getByRole("region", { name: "การจัดการที่เลือก" })).toHaveTextContent("เลือก 1 รายการ");
    expect(all.indeterminate).toBe(true);

    await user.click(all);
    expect(all).toBeChecked();
    await user.click(screen.getByRole("button", { name: "ปิดประกาศ" }));
    expect(onBulk).toHaveBeenCalledWith(["2", "1", "3"]);

    await user.click(screen.getByRole("button", { name: "ยกเลิกการเลือก" }));
    expect(screen.queryByRole("region", { name: "การจัดการที่เลือก" })).not.toBeInTheDocument();
  });

  it("pages through the pagination footer and shows an empty message", async () => {
    const user = userEvent.setup();
    const onPage = vi.fn();
    const { unmount } = render(<Table onPage={onPage} />);
    await user.click(screen.getByRole("button", { name: "หน้า 2" }));
    expect(onPage).toHaveBeenCalledWith(2);
    unmount();

    render(<DataTable caption="ว่าง" columns={columns} rows={[]} getRowId={(r) => r.id} empty="ยังไม่มีประกาศ" />);
    expect(screen.getByText("ยังไม่มีประกาศ")).toBeInTheDocument();
  });
});
