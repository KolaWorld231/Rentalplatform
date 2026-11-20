import { describe, expect, it } from "vitest";
import { vacancyState } from "@/lib/properties/availability";

const MARCH_10 = new Date(2026, 2, 10);

describe("vacancyState", () => {
  it("reports a free property as vacant now", () => {
    const s = vacancyState("available", null, MARCH_10);
    expect(s.kind).toBe("vacant");
    expect(s.tone).toBe("success");
  });

  it("reports an occupied property with no date as occupied", () => {
    const s = vacancyState("rented", null, MARCH_10);
    expect(s.kind).toBe("occupied");
    expect(s.tone).toBe("error");
  });

  it("reports an occupied property with a future date as vacant soon", () => {
    const s = vacancyState("rented", "2026-03-25", MARCH_10);
    expect(s.kind).toBe("vacant-soon");
    expect(s.tone).toBe("warning");
    expect(s.daysAway).toBe(15);
    expect(s.label).toMatch(/Vacant from/);
  });

  /**
   * The case this function exists to get right. An owner who set "vacant
   * from 1 January" and then stopped touching the listing must not still
   * be advertising a vacancy in March -- a stale date says nothing about
   * today, so it is ignored rather than trusted.
   */
  it("ignores a vacant-from date that has already passed", () => {
    const s = vacancyState("rented", "2026-01-01", MARCH_10);
    expect(s.kind).toBe("occupied");
    expect(s.daysAway).toBeNull();
  });

  it("treats a property free from today as occupied-until-today, not vacant-soon", () => {
    // Zero days away is not "soon", and the switch -- not the date -- is
    // what says a property is free now.
    const s = vacancyState("rented", "2026-03-10", MARCH_10);
    expect(s.kind).toBe("occupied");
  });

  it("counts whole days regardless of the time of day", () => {
    const lateEvening = new Date(2026, 2, 10, 23, 45);
    expect(vacancyState("rented", "2026-03-11", lateEvening).daysAway).toBe(1);
  });

  it("lets the owner's switch win over a stray future date", () => {
    // Marked free *and* carrying a date: the switch is the authority, so
    // the listing does not tell a renter to wait.
    expect(vacancyState("available", "2026-06-01", MARCH_10).kind).toBe("vacant");
  });

  it("keeps the other two statuses distinct rather than collapsing them", () => {
    expect(vacancyState("pending_rental", null, MARCH_10).kind).toBe("pending");
    expect(vacancyState("temporarily_unavailable", null, MARCH_10).kind).toBe("unavailable");
  });

  it("ignores an unparseable date instead of throwing", () => {
    expect(vacancyState("rented", "not-a-date", MARCH_10).kind).toBe("occupied");
  });
});
