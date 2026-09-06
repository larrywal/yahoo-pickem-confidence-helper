const assert = require("node:assert/strict");
const test = require("node:test");

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(value) {
    this.values.add(value);
  }

  toggle(value, force) {
    if (force) this.values.add(value);
    else this.values.delete(value);
  }

  contains(value) {
    return this.values.has(value);
  }
}

function makeOption(label, selected = false) {
  return {
    value: label === "-" ? "" : label,
    textContent: label,
    disabled: false,
    selected
  };
}

function makeSelect(id, selectedValue = null) {
  const options = ["-", "1", "2", "3", "4"].map((label) => {
    return makeOption(label, label === selectedValue);
  });

  return {
    id,
    name: "confidence",
    className: "",
    options,
    classList: new FakeClassList(),
    dataset: {},
    get selectedOptions() {
      return [this.options.find((option) => option.selected) ?? this.options[0]];
    },
    getAttribute(name) {
      if (name === "aria-label") return `${id} confidence`;
      return null;
    },
    closest() {
      return null;
    }
  };
}

function choose(select, value) {
  for (const option of select.options) {
    option.selected = option.value === value;
  }
}

function option(select, value) {
  return select.options.find((candidate) => candidate.value === value);
}

test("used confidence points are labeled, selectable, and released", async () => {
  const selects = [makeSelect("game-1", "3"), makeSelect("game-2"), makeSelect("game-3")];
  const listeners = {};

  global.document = {
    documentElement: {},
    querySelectorAll(selector) {
      assert.equal(selector, "select");
      return selects;
    },
    addEventListener(type, listener) {
      listeners[type] = listener;
    }
  };

  global.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {}
  };

  require("../content.js");
  await Promise.resolve();

  assert.equal(option(selects[0], "3").textContent, "3");
  assert.equal(option(selects[1], "3").textContent, "3 — USED");
  assert.equal(option(selects[1], "3").disabled, false);
  assert.equal(selects[1].dataset.ycfUnavailable, "3");

  choose(selects[0], "4");
  listeners.change();
  await Promise.resolve();

  assert.equal(option(selects[1], "3").textContent, "3");
  assert.equal(option(selects[1], "3").disabled, false);
  assert.equal(option(selects[1], "4").textContent, "4 — USED");
  assert.equal(option(selects[1], "4").disabled, false);

  choose(selects[1], "4");
  listeners.change();
  await Promise.resolve();

  assert.equal(selects[0].classList.contains("ycf-duplicate-confidence"), true);
  assert.equal(selects[1].classList.contains("ycf-duplicate-confidence"), true);
});
