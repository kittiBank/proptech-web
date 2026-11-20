import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HideBottomNav, activeBottomTab, bottomNavHiddenOn, useBottomNavSuppressed } from "./bottom-nav";

describe("activeBottomTab", () => {
  it("maps pages to their tab", () => {
    expect(activeBottomTab("/")).toBe("search");
    expect(activeBottomTab("/search")).toBe("search");
    expect(activeBottomTab("/account/favorites")).toBe("favorites");
    expect(activeBottomTab("/compare")).toBe("favorites");
    expect(activeBottomTab("/messages")).toBe("messages");
    expect(activeBottomTab("/account/profile")).toBe("account");
    expect(activeBottomTab("/notifications")).toBe("account");
    expect(activeBottomTab("/guides")).toBeUndefined();
  });
});

describe("bottomNavHiddenOn", () => {
  it("hides the bar in a chat room only", () => {
    expect(bottomNavHiddenOn("/messages/t-1")).toBe(true);
    expect(bottomNavHiddenOn("/messages")).toBe(false);
    expect(bottomNavHiddenOn("/search")).toBe(false);
  });
});

describe("useHideBottomNav", () => {
  it("suppresses the bar while any hider is mounted", () => {
    const { result } = renderHook(() => useBottomNavSuppressed());
    expect(result.current).toBe(false);

    const a = render(<HideBottomNav />);
    const b = render(<HideBottomNav />);
    expect(result.current).toBe(true);
    act(() => a.unmount());
    expect(result.current).toBe(true);
    act(() => b.unmount());
    expect(result.current).toBe(false);

    const inactive = render(<HideBottomNav active={false} />);
    expect(result.current).toBe(false);
    inactive.unmount();
  });
});
