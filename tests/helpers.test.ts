import { describe, expect, it } from "vitest";
import {
  formatPrice,
  formatPct,
  formatSignalBadge,
  truncate,
  extractConfidence,
  extractSignalType,
  shortenAddress,
  solExplorerUrl,
} from "../src/helpers";

describe("formatPrice", () => {
  it("formats large prices", () => {
    expect(formatPrice(65000)).toBe("$65,000.00");
  });

  it("formats mid prices", () => {
    expect(formatPrice(1.5)).toBe("$1.50");
  });

  it("formats small prices", () => {
    expect(formatPrice(0.00012345)).toBe("$0.0001");
  });

  it("respects custom decimals", () => {
    expect(formatPrice(0.00012345, 6)).toBe("$0.000123");
  });
});

describe("formatPct", () => {
  it("formats positive", () => {
    expect(formatPct(3.5)).toBe("+3.50%");
  });

  it("formats negative", () => {
    expect(formatPct(-2.1)).toBe("-2.10%");
  });

  it("formats zero", () => {
    expect(formatPct(0)).toBe("+0.00%");
  });
});

describe("formatSignalBadge", () => {
  it("detects BUY", () => {
    expect(formatSignalBadge("SIGNAL: BUY")).toBe("🟢 BUY");
  });

  it("detects SELL", () => {
    expect(formatSignalBadge("SIGNAL: SELL")).toBe("🔴 SELL");
  });

  it("defaults to HOLD", () => {
    expect(formatSignalBadge("SIGNAL: HOLD")).toBe("🟡 HOLD");
  });

  it("is case insensitive", () => {
    expect(formatSignalBadge("signal: buy")).toBe("🟢 BUY");
  });
});

describe("truncate", () => {
  it("returns short text unchanged", () => {
    expect(truncate("hello", 280)).toBe("hello");
  });

  it("truncates long text", () => {
    const text = "a".repeat(300);
    const result = truncate(text, 280);
    expect(result.length).toBe(280);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("extractConfidence", () => {
  it("parses confidence", () => {
    expect(extractConfidence("Confidence: 85/100")).toBe(85);
  });

  it("returns null when missing", () => {
    expect(extractConfidence("No confidence here")).toBeNull();
  });
});

describe("extractSignalType", () => {
  it("parses BUY", () => {
    expect(extractSignalType("SIGNAL: BUY\nConfidence: 80")).toBe("BUY");
  });

  it("parses SELL", () => {
    expect(extractSignalType("SIGNAL: sell")).toBe("SELL");
  });

  it("returns null when missing", () => {
    expect(extractSignalType("nothing here")).toBeNull();
  });
});

describe("shortenAddress", () => {
  it("shortens long addresses", () => {
    const addr = "So11111111111111111111111111111111111111112";
    expect(shortenAddress(addr, 4)).toBe("So11...1112");
  });

  it("leaves short addresses unchanged", () => {
    expect(shortenAddress("abc")).toBe("abc");
  });
});

describe("solExplorerUrl", () => {
  it("returns solscan URL", () => {
    const addr = "So11111111111111111111111111111111111111112";
    const url = solExplorerUrl(addr);
    expect(url).toContain("solscan.io");
    expect(url).toContain(addr);
  });
});
