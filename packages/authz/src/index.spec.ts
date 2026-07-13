import { hasPermission, isWithinScope, permissions } from "./index";

describe("authz", () => {
  it("grants permissions defined for a role", () => {
    expect(hasPermission("globalAdmin", permissions.platform.manage)).toBe(true);
    expect(hasPermission("viewer", permissions.platform.manage)).toBe(false);
  });

  it("grants fleet access without exposing fleet management to read-only roles", () => {
    expect(hasPermission("viewer", permissions.fleet.read)).toBe(true);
    expect(hasPermission("viewer", permissions.fleet.manage)).toBe(false);
    expect(hasPermission("manager", permissions.fleet.transfer)).toBe(true);
  });

  it("keeps access inside the granted scope", () => {
    expect(isWithinScope({ companyId: "company-a" }, { companyId: "company-a" })).toBe(true);
    expect(isWithinScope({ companyId: "company-b" }, { companyId: "company-a" })).toBe(false);
  });
});
