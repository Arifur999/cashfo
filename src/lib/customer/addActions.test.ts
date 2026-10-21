import { describe, expect, it } from "vitest";
import { bnDictionary } from "@/lib/i18n/dictionary";
import { ADD_ACTIONS, addActionBlocks, addActionForKey, visibleAddActions } from "./addActions";

const keys = (blocks: { key: string }[][]) => blocks.map((block) => block.map((action) => action.key));
const allOn = () => true;
const loansOff = (key: string) => key !== "loan_management";

describe("ADD_ACTIONS", () => {
  it("gives every action its own key, letter and icon", () => {
    expect(new Set(ADD_ACTIONS.map((action) => action.key)).size).toBe(ADD_ACTIONS.length);
    expect(new Set(ADD_ACTIONS.map((action) => action.letter)).size).toBe(ADD_ACTIONS.length);
    expect(new Set(ADD_ACTIONS.map((action) => action.icon)).size).toBe(ADD_ACTIONS.length);
    for (const action of ADD_ACTIONS) expect(action.letter, action.key).toMatch(/^[A-Z]$/);
  });

  it("opens the drawer on its own tab for money in, out and between wallets", () => {
    const entries = ADD_ACTIONS.flatMap((action) => (action.run.kind === "drawer" ? [[action.key, action.run.entry]] : []));
    expect(entries).toEqual([
      ["income", "INCOME"],
      ["expense", "EXPENSE"],
      ["transfer", "TRANSFER"],
    ]);
  });

  it("sends the rest to a page of the app, or to Today's tasks", () => {
    for (const action of ADD_ACTIONS) {
      if (action.run.kind === "page") expect(action.run.href, action.key).toMatch(/^\/[a-z]/);
    }
    expect(ADD_ACTIONS.find((action) => action.key === "task")?.run).toEqual({ kind: "tasks" });
  });

  // A label without its Bangla would leave English in a Bangla menu (the
  // task's hint once had a straight apostrophe the dictionary didn't know).
  it("has Bangla for every label and hint", () => {
    for (const action of ADD_ACTIONS) {
      expect(bnDictionary[action.label], action.label).toBeTruthy();
      expect(bnDictionary[action.hint], action.hint).toBeTruthy();
    }
  });
});

describe("visibleAddActions", () => {
  it("offers everything while every flag is on", () => {
    expect(visibleAddActions(allOn).map((action) => action.key)).toEqual(["income", "expense", "transfer", "loan", "savings", "task", "vault"]);
  });

  it("drops Loan entry while loan management is off", () => {
    expect(visibleAddActions(loansOff).map((action) => action.key)).not.toContain("loan");
    expect(visibleAddActions(loansOff)).toHaveLength(ADD_ACTIONS.length - 1);
  });
});

describe("addActionBlocks", () => {
  it("keeps the menu's three blocks in order", () => {
    expect(keys(addActionBlocks(visibleAddActions(allOn)))).toEqual([
      ["income", "expense", "transfer"],
      ["loan", "savings"],
      ["task", "vault"],
    ]);
  });

  it("closes up a block a flag emptied", () => {
    const nothingKept = visibleAddActions(allOn).filter((action) => action.key !== "loan" && action.key !== "savings");
    expect(keys(addActionBlocks(nothingKept))).toEqual([
      ["income", "expense", "transfer"],
      ["task", "vault"],
    ]);
  });

  it("puts the lead first, inside its own block", () => {
    expect(keys(addActionBlocks(visibleAddActions(allOn), "expense"))).toEqual([
      ["expense", "income", "transfer"],
      ["loan", "savings"],
      ["task", "vault"],
    ]);
  });

  it("moves a later block to the front when it holds the lead", () => {
    expect(keys(addActionBlocks(visibleAddActions(allOn), "vault"))).toEqual([
      ["vault", "task"],
      ["income", "expense", "transfer"],
      ["loan", "savings"],
    ]);
  });

  it("ignores a lead that isn't offered", () => {
    expect(keys(addActionBlocks(visibleAddActions(loansOff), "loan"))).toEqual(keys(addActionBlocks(visibleAddActions(loansOff))));
  });
});

describe("addActionForKey", () => {
  const actions = visibleAddActions(loansOff);

  it("picks by letter, either case", () => {
    expect(addActionForKey(actions, "e")?.key).toBe("expense");
    expect(addActionForKey(actions, "D")?.key).toBe("task");
  });

  it("never picks with a named key or a letter nothing uses", () => {
    expect(addActionForKey(actions, "Enter")).toBeUndefined();
    expect(addActionForKey(actions, "x")).toBeUndefined();
  });

  it("doesn't pick an action that is hidden", () => {
    expect(addActionForKey(actions, "l")).toBeUndefined();
    expect(addActionForKey(visibleAddActions(allOn), "l")?.key).toBe("loan");
  });
});
