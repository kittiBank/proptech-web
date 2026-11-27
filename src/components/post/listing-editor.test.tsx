import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { resetMockSession } from "@/mocks/session";
import { getListingForEdit, listSellerListings } from "@/mocks/seller";
import { router, setParams } from "@/test/next-navigation";
import { renderWithClient } from "@/test/render";
import type { PostStep, SellerListingStatus } from "@/types/api";
import { ListingEditor } from "./listing-editor";

const USER = "u-1";

/** The first seeded listing with this status, opened on `step` (the price step keeps the DOM small). */
function open(status: SellerListingStatus, step: PostStep = "publish") {
  const listing = listSellerListings(USER, { status, mode: "buy" }).data[0];
  setParams({ id: listing.id, step });
  renderWithClient(<ListingEditor />);
  return listing;
}

const priceField = () => screen.findByLabelText(/ราคาขาย/);

beforeEach(() => resetMockSession({ signedIn: true }));

describe("ListingEditor (FE-24)", () => {
  it("prefills the price step without the promotion picker or the publish confirmation", async () => {
    const listing = open("published");
    expect(await priceField()).toHaveValue(listing.price!.toLocaleString("en-US"));
    // Header (desktop) and the line above the step (phones) both name the listing.
    expect(screen.getAllByText(`แก้ไขประกาศ ${listing.code}`, { exact: false })).toHaveLength(2);
    expect(screen.queryByRole("radiogroup", { name: "เพิ่มการมองเห็น" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("ยังไม่มีการแก้ไข")).toBeInTheDocument();
  });

  it("saves a published listing, keeps it live and returns to the listings", async () => {
    const user = userEvent.setup();
    const listing = open("published");
    const price = await priceField();
    await user.clear(price);
    await user.type(price, "4250000");
    expect(screen.getByText("มีการแก้ไข 1 จุดที่ยังไม่บันทึก")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard/listings"));
    expect(getListingForEdit(USER, listing.id)).toMatchObject({
      listing: { status: "published", price: 4_250_000 },
      values: { price: 4_250_000 },
    });
  });

  it("shows why a listing was rejected and sends it back to review", async () => {
    const user = userEvent.setup();
    const listing = open("rejected");
    const banner = await screen.findByRole("note");
    expect(banner).toHaveTextContent("ประกาศนี้ไม่ผ่านการตรวจ");
    expect(banner).toHaveTextContent(listing.rejectReason!);

    await user.click(screen.getByRole("button", { name: "ส่งตรวจอีกครั้ง" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard/listings?status=pending_review"));
    expect(getListingForEdit(USER, listing.id)?.listing.status).toBe("pending_review");
  });

  it("offers to renew an expired listing once it is saved", async () => {
    const user = userEvent.setup();
    const listing = open("expired");
    expect(await screen.findByRole("note")).toHaveTextContent("ประกาศนี้หมดอายุแล้ว");
    await user.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));
    expect(await screen.findByRole("heading", { name: "บันทึกการแก้ไขแล้ว" })).toBeInTheDocument();
    expect(getListingForEdit(USER, listing.id)?.listing.status).toBe("expired");

    await user.click(screen.getByRole("button", { name: "ต่ออายุ 60 วัน" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard/listings?status=published"));
    expect(getListingForEdit(USER, listing.id)?.listing.status).toBe("published");
  });

  it("blocks saving while a step is incomplete and names that step", async () => {
    const user = userEvent.setup();
    open("published");
    await user.clear(await priceField());
    await user.click(screen.getByRole("button", { name: "บันทึกการแก้ไข" }));
    expect(document.getElementById("price-error") ?? screen.getByText("กรอกราคาขาย")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ราคาและเผยแพร่" })).toHaveAttribute(
      "href",
      expect.stringMatching(/\/edit\/publish$/),
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("asks before throwing away unsaved edits", async () => {
    const user = userEvent.setup();
    open("published");
    await user.type(await priceField(), "0");
    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    const dialog = await screen.findByRole("dialog", { name: "ทิ้งการแก้ไข?" });
    await user.click(within(dialog).getByRole("button", { name: "แก้ไขต่อ" }));
    expect(router.push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "ทิ้งการแก้ไข" }));
    expect(router.push).toHaveBeenCalledWith("/dashboard/listings");
  });

  it("does not open listings that are in review", async () => {
    open("pending_review");
    expect(await screen.findByRole("heading", { name: "แก้ไขประกาศนี้ไม่ได้" })).toBeInTheDocument();
    expect(screen.getByText(/กำลังรอทีมงานตรวจ/)).toBeInTheDocument();
  });
});
