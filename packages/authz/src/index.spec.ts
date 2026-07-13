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

  it("grants driver operations without exposing archival to operational roles", () => {
    expect(hasPermission("manager", permissions.drivers.assign)).toBe(true);
    expect(hasPermission("supervisor", permissions.drivers.documents)).toBe(true);
    expect(hasPermission("operator", permissions.drivers.archive)).toBe(false);
    expect(hasPermission("driver", permissions.drivers.read)).toBe(false);
    expect(hasPermission("viewer", permissions.drivers.read)).toBe(false);
  });

  it("separates contract operations from archival and financial visibility", () => {
    expect(hasPermission("manager", permissions.contracts.allocate)).toBe(true);
    expect(hasPermission("purchasing", permissions.contracts.amend)).toBe(true);
    expect(hasPermission("finance", permissions.contracts.read)).toBe(true);
    expect(hasPermission("operator", permissions.contracts.archive)).toBe(false);
    expect(hasPermission("viewer", permissions.contracts.read)).toBe(false);
  });
});
