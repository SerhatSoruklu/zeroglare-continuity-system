import { SCALE_NAME_BUDGET_MS, SCALE_NAME_SANITY_SAMPLES } from "../shared/constants.js";
import { getScaleNameWithBudget, resolveScaleDescriptorFromValue } from "../shared/scale.js";
import { getScaleNamingElements } from "../dom/selectors.js";

function renderSanityRow(sample, container, doc = document) {
  const item = doc.createElement("div");
  item.className = "check-row";

  const left = doc.createElement("div");
  const title = doc.createElement("strong");
  title.textContent = sample.label;
  const detail = doc.createElement("small");
  detail.textContent = `expected: ${sample.expected}`;

  left.appendChild(title);
  left.appendChild(detail);

  const resolved = getScaleNameWithBudget(sample.index, sample.budgetMs ?? SCALE_NAME_BUDGET_MS);
  const badge = doc.createElement("span");
  const pass = resolved.label === sample.expected && resolved.source === sample.source;
  badge.className = "badge";
  badge.dataset.tone = pass ? "good" : "bad";
  badge.textContent = pass ? "PASS" : "FAIL";

  item.appendChild(left);
  item.appendChild(badge);
  container.appendChild(item);
}

export function bindScaleNamingTool(doc = document) {
  const { input, resultName, resultDetail, resultSource, resultSourceDetail, sanityList } = getScaleNamingElements(doc);
  if (!input && !resultName && !resultDetail && !resultSource && !resultSourceDetail && !sanityList) {
    return () => {};
  }

  let currentBudgetMs = SCALE_NAME_BUDGET_MS;

  function updateScaleDisplay() {
    const descriptor = resolveScaleDescriptorFromValue(input ? input.value : "", currentBudgetMs);
    if (resultName) {
      resultName.textContent = descriptor.label;
    }
    if (resultSource) {
      resultSource.textContent = descriptor.source;
    }
    if (resultDetail) {
      resultDetail.textContent =
        descriptor.scaleIndex != null ? `scale index ${descriptor.scaleIndex} · ${descriptor.boundaryStatus || "boundary unknown"}` : "Example output";
    }
    if (resultSourceDetail) {
      resultSourceDetail.textContent =
        descriptor.sourceLabel ||
        (descriptor.source === "real" ? "verified real table" : descriptor.source === "generated" ? "generated helper" : "unresolved beyond verified real scale table");
    }
  }

  if (sanityList) {
    sanityList.innerHTML = "";
    SCALE_NAME_SANITY_SAMPLES.forEach((sample) => renderSanityRow(sample, sanityList, doc));
  }

  const inputHandler = () => updateScaleDisplay();
  if (input) {
    input.addEventListener("input", inputHandler);
  }

  const presetButtons = Array.from(doc.querySelectorAll("[data-scale-preset]"));
  const presetHandlers = [];
  presetButtons.forEach((button) => {
    const handler = () => {
      if (!input) return;
      const preset = button.getAttribute("data-scale-preset");
      if (preset === "__limit__") {
        currentBudgetMs = 0;
        input.value = (10n ** 3006n).toString();
      } else {
        currentBudgetMs = SCALE_NAME_BUDGET_MS;
        input.value = preset || "";
      }
      updateScaleDisplay();
    };
    presetHandlers.push([button, handler]);
    button.addEventListener("click", handler);
  });

  updateScaleDisplay();

  return () => {
    if (input) {
      input.removeEventListener("input", inputHandler);
    }
    presetHandlers.forEach(([button, handler]) => {
      button.removeEventListener("click", handler);
    });
  };
}
