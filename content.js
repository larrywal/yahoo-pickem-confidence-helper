(() => {
  "use strict";

  const SELECT_CLASS = "ycf-confidence-select";
  const DUPLICATE_CLASS = "ycf-duplicate-confidence";
  const USED_SUFFIX = " — USED";
  const MIN_CONFIDENCE_OPTIONS = 4;

  const optionState = new WeakMap();
  let syncQueued = false;

  function exactPositiveInteger(value) {
    const text = String(value ?? "").trim();
    if (!/^\d+$/.test(text)) return null;

    const number = Number(text);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
  }

  function rememberOption(option) {
    let state = optionState.get(option);

    if (!state) {
      state = {
        baseLabel: option.textContent.trim(),
        appliedLabel: null
      };
      optionState.set(option, state);
      return state;
    }

    // If Yahoo rewrites an existing option, adopt its new state as the baseline.
    if (state.appliedLabel !== null && option.textContent.trim() !== state.appliedLabel) {
      state.baseLabel = option.textContent.trim();
      state.appliedLabel = null;
    }

    return state;
  }

  function optionNumber(option) {
    if (!option) return null;

    const fromValue = exactPositiveInteger(option.value);
    if (fromValue !== null) return fromValue;

    const state = rememberOption(option);
    return exactPositiveInteger(state.baseLabel);
  }

  function numericOptions(select) {
    const values = [];

    for (const option of select.options) {
      const value = optionNumber(option);
      if (value !== null) values.push(value);
    }

    return [...new Set(values)].sort((a, b) => a - b);
  }

  function isContiguousConfidenceRange(values) {
    if (values.length < MIN_CONFIDENCE_OPTIONS || values[0] !== 1) return false;
    return values.every((value, index) => value === index + 1);
  }

  function hasConfidenceContext(select) {
    const ownText = [
      select.id,
      select.name,
      select.className,
      select.getAttribute("aria-label"),
      select.getAttribute("title")
    ]
      .filter(Boolean)
      .join(" ");

    if (/confidence/i.test(ownText)) return true;

    const cell = select.closest("td, th");
    const table = select.closest("table");
    const nearbyText = [cell?.getAttribute("data-title"), table?.querySelector("thead")?.textContent]
      .filter(Boolean)
      .join(" ");

    return /confidence\s*(points?)?/i.test(nearbyText);
  }

  function findConfidenceSelects() {
    const candidates = [...document.querySelectorAll("select")]
      .map((select) => ({
        select,
        values: numericOptions(select)
      }))
      .filter(({ values }) => isContiguousConfidenceRange(values));

    const signatureCounts = new Map();
    for (const candidate of candidates) {
      const signature = candidate.values.join(",");
      signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
    }

    return candidates
      .filter(({ select, values }) => {
        return hasConfidenceContext(select) || (signatureCounts.get(values.join(",")) ?? 0) >= 2;
      })
      .map(({ select }) => select);
  }

  function selectedConfidence(select) {
    return optionNumber(select.selectedOptions[0]);
  }

  function updateOption(option, usedElsewhere) {
    const state = rememberOption(option);
    const targetLabel = usedElsewhere ? `${state.baseLabel}${USED_SUFFIX}` : state.baseLabel;

    if (option.textContent.trim() !== targetLabel) {
      option.textContent = targetLabel;
    }
    state.appliedLabel = usedElsewhere ? targetLabel : null;

  }

  function synchronize() {
    syncQueued = false;

    const selects = findConfidenceSelects();
    if (selects.length === 0) return;

    const selections = new Map();
    for (const select of selects) {
      const value = selectedConfidence(select);
      if (value === null) continue;

      const owners = selections.get(value) ?? [];
      owners.push(select);
      selections.set(value, owners);
    }

    for (const select of selects) {
      select.classList.add(SELECT_CLASS);
      const currentValue = selectedConfidence(select);
      const duplicates = currentValue !== null && (selections.get(currentValue)?.length ?? 0) > 1;
      select.classList.toggle(DUPLICATE_CLASS, duplicates);

      const unavailableHere = [];
      for (const option of select.options) {
        const value = optionNumber(option);
        if (value === null) continue;

        const usedElsewhere = (selections.get(value) ?? []).some((owner) => owner !== select);
        updateOption(option, usedElsewhere);
        if (usedElsewhere) unavailableHere.push(value);
      }

      select.dataset.ycfUnavailable = unavailableHere.join(",");
    }
  }

  function queueSynchronization() {
    if (syncQueued) return;
    syncQueued = true;
    queueMicrotask(synchronize);
  }

  document.addEventListener("input", queueSynchronization, true);
  document.addEventListener("change", queueSynchronization, true);

  const observer = new MutationObserver(queueSynchronization);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled", "selected", "value"]
  });

  queueSynchronization();
})();
