import { describe, expect, it } from "vitest";

import { filterAnnouncementTargets } from "@/lib/events/announce";

describe("filterAnnouncementTargets", () => {
  const users = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  it("drops opted-out users", () => {
    expect(filterAnnouncementTargets(users, new Set(["b"]), new Set()).map((u) => u.id)).toEqual([
      "a",
      "c",
      "d",
    ]);
  });

  it("drops users a racing run already told", () => {
    expect(filterAnnouncementTargets(users, new Set(), new Set(["c"])).map((u) => u.id)).toEqual([
      "a",
      "b",
      "d",
    ]);
  });

  it("drops the union of both and keeps order", () => {
    expect(
      filterAnnouncementTargets(users, new Set(["a"]), new Set(["d", "a"])).map((u) => u.id)
    ).toEqual(["b", "c"]);
  });

  it("tells everyone when nothing is filtered", () => {
    expect(filterAnnouncementTargets(users, new Set(), new Set())).toHaveLength(4);
  });
});
