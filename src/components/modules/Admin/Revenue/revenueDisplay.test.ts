import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/currency";
import { type FillValues, fillText } from "@/lib/i18n/fill";
import { inEnglish } from "@/lib/i18n/message";
import { translate } from "@/lib/i18n/translate";
import { compactAmount, mrrChartLabel, paymentsMrrNow, shortMonthKey } from "./revenueDisplay";

// The admin panel's Bangla, as the Translate a Bangla reader's pages get.
const bangla = (key: string, values?: FillValues) => {
  const text = translate("bn", key, undefined, "admin");
  return values ? fillText(text, values) : text;
};

describe("compactAmount", () => {
  it("keeps small amounts whole", () => {
    expect(compactAmount(0)).toBe("0");
    expect(compactAmount(849.6)).toBe("850");
  });

  it("writes thousands in k, with a decimal only below ten thousand", () => {
    expect(compactAmount(6214.5)).toBe("6.2k");
    expect(compactAmount(6000)).toBe("6k");
    expect(compactAmount(9960)).toBe("10k");
    expect(compactAmount(60_400)).toBe("60k");
    expect(compactAmount(125_400)).toBe("125k");
    expect(compactAmount(999_499)).toBe("999k");
  });

  it("writes millions in M", () => {
    expect(compactAmount(999_500)).toBe("1M");
    expect(compactAmount(1_250_000)).toBe("1.3M");
  });
});

describe("shortMonthKey", () => {
  it("reads as the short month in English and in Bangla", () => {
    expect(inEnglish(shortMonthKey("2026-10"))).toBe("Oct");
    expect(bangla(shortMonthKey("2026-10"))).toBe("অক্টো");
    expect(bangla(shortMonthKey("2026-01"))).toBe("জানু");
  });
});

describe("mrrChartLabel", () => {
  const history = [
    { month: "2026-09", mrr: 58_200 },
    { month: "2026-10", mrr: 60_400.4 },
  ];

  // Whole taka, written as every amount is ("৳" and a no-break space).
  const september = formatCurrency(58_200, undefined, 0);
  const october = formatCurrency(60_400, undefined, 0);

  it("names every month with its MRR", () => {
    expect(mrrChartLabel(history, inEnglish)).toBe(`MRR at the end of each month: September ${september}, October ${october}`);
  });

  it("names the months in Bangla for a Bangla reader", () => {
    expect(mrrChartLabel(history, bangla)).toBe(`প্রতি মাসের শেষে MRR: সেপ্টেম্বর ${september}, অক্টোবর ${october}`);
  });
});

describe("paymentsMrrNow", () => {
  it("is the history's last month", () => {
    expect(paymentsMrrNow([{ month: "2026-09", mrr: 1 }, { month: "2026-10", mrr: 2 }])).toBe(2);
    expect(paymentsMrrNow([])).toBe(0);
  });
});
