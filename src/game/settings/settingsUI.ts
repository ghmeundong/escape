export interface SettingsPreviewElements {
  scopeOverlay: HTMLDivElement;
  crosshairPreviewTargets: HTMLElement[];
  hitMarkerPreviewTargets: HTMLElement[];
}

export interface SettingsPreviewBindings {
  crosshairTargets: HTMLElement[];
  hitMarkerTargets: HTMLElement[];
  crosshairStyle: HTMLSelectElement;
  crosshairColor: HTMLInputElement;
  crosshairOutlineColor: HTMLInputElement;
  crosshairOutlineThickness: HTMLInputElement;
  crosshairOutlineThicknessValue: HTMLOutputElement;
  crosshairGap: HTMLInputElement;
  crosshairGapValue: HTMLOutputElement;
  crosshairLength: HTMLInputElement;
  crosshairLengthValue: HTMLOutputElement;
  crosshairThickness: HTMLInputElement;
  crosshairThicknessValue: HTMLOutputElement;
  crosshairDotSize: HTMLInputElement;
  crosshairDotSizeValue: HTMLOutputElement;
  crosshairCircleSize: HTMLInputElement;
  crosshairCircleSizeValue: HTMLOutputElement;
  crosshairOpacity: HTMLInputElement;
  crosshairOpacityValue: HTMLOutputElement;
  hitMarkerColor: HTMLInputElement;
  hitMarkerSize: HTMLInputElement;
  hitMarkerSizeValue: HTMLOutputElement;
  hitMarkerLength: HTMLInputElement;
  hitMarkerLengthValue: HTMLOutputElement;
  hitMarkerThickness: HTMLInputElement;
  hitMarkerThicknessValue: HTMLOutputElement;
  hitMarkerGap: HTMLInputElement;
  hitMarkerGapValue: HTMLOutputElement;
}

export function settingPixelsToRem(value: string): string {
  return `${Number(value) / 16}rem`;
}

export function syncSizeSettingLabels(
  settings: Array<[HTMLInputElement, HTMLOutputElement]>,
): void {
  settings.forEach(([setting, output]) => {
    output.value = `${(Number(setting.value) / 16).toFixed(4).replace(/\.?0+$/, "")}rem`;
  });
}

export function bindSettingsCategories(
  buttons: HTMLButtonElement[],
  panels: HTMLElement[],
): void {
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.category;
      buttons.forEach((categoryButton) =>
        categoryButton.classList.toggle("is-active", categoryButton === button),
      );
      panels.forEach((panel) =>
        panel.classList.toggle(
          "is-visible",
          panel.dataset.categoryPanel === category,
        ),
      );
    });
  });
}

export function createSettingsPreviews(params: {
  range: HTMLElement;
  crosshair: HTMLElement;
  hitMarker: HTMLElement;
  crosshairPanel: HTMLElement;
}): SettingsPreviewElements {
  const { range, crosshair, hitMarker, crosshairPanel } = params;
  const scopeOverlay = document.createElement("div");
  scopeOverlay.className = "scope-overlay";
  scopeOverlay.innerHTML =
    '<div class="scope-reticle"><span></span><i></i><b></b><em></em></div>';
  range.append(scopeOverlay);

  const crosshairPreview = crosshair.cloneNode(true) as HTMLElement;
  crosshairPreview.classList.remove("is-scope-hidden", "is-hipfire-hidden");
  crosshairPreview.classList.add("crosshair-preview");

  const scopePreview = document.createElement("div");
  scopePreview.className =
    "scope-overlay scope-preview-overlay scope-classic is-visible";
  scopePreview.innerHTML =
    '<div class="scope-reticle"><span></span><i></i><b></b><em></em></div>';

  const hitMarkerPreview = hitMarker.cloneNode(true) as HTMLElement;
  hitMarkerPreview.classList.add("hit-marker-preview");
  hitMarkerPreview.style.opacity = "1";

  const customPreview = document.createElement("div");
  customPreview.className = "custom-preview";
  customPreview.innerHTML =
    '<div class="custom-preview-item"><span>CROSSHAIR PREVIEW</span><div class="crosshair-preview-stage"></div></div>';
  customPreview
    .querySelector(".crosshair-preview-stage")
    ?.append(crosshairPreview);
  crosshairPanel.prepend(customPreview);

  const hitMarkerPreviewCard = document.createElement("div");
  hitMarkerPreviewCard.className = "custom-preview custom-preview-hit-marker";
  hitMarkerPreviewCard.innerHTML =
    '<div class="custom-preview-item"><span>HIT MARKER PREVIEW</span><div class="hit-marker-preview-stage"></div></div>';
  hitMarkerPreviewCard
    .querySelector(".hit-marker-preview-stage")
    ?.append(hitMarkerPreview);
  const hitMarkerHeading = [...crosshairPanel.querySelectorAll("h2")].find(
    (heading) => heading.textContent?.trim() === "HIT MARKER",
  );
  hitMarkerHeading?.before(hitMarkerPreviewCard);

  const scopePreviewCard = document.createElement("div");
  scopePreviewCard.className = "custom-preview custom-preview-scope";
  scopePreviewCard.innerHTML =
    '<div class="custom-preview-item"><span>SCOPE PREVIEW</span><div class="scope-preview-stage"></div></div>';
  scopePreviewCard.querySelector(".scope-preview-stage")?.append(scopePreview);

  return {
    scopeOverlay,
    crosshairPreviewTargets: [crosshair, crosshairPreview],
    hitMarkerPreviewTargets: [hitMarker, hitMarkerPreview],
  };
}

export function bindSettingsPreviewEvents(
  bindings: SettingsPreviewBindings,
): void {
  const formatSettingRem = (value: string): string =>
    `${(Number(value) / 16).toFixed(4).replace(/\.?0+$/, "")}rem`;
  const bindSizeSetting = (
    setting: HTMLInputElement,
    value: HTMLOutputElement,
    targets: HTMLElement[],
    property: string,
  ): void => {
    value.value = formatSettingRem(setting.value);
    setting.addEventListener("input", () => {
      targets.forEach((target) =>
        target.style.setProperty(property, settingPixelsToRem(setting.value)),
      );
      value.value = formatSettingRem(setting.value);
    });
  };

  bindings.crosshairStyle.addEventListener("change", () => {
    const styleClass =
      {
        "DOT + CROSS": "crosshair-dot-cross",
        DOT: "crosshair-dot",
        CROSS: "crosshair-cross",
        CIRCLE: "crosshair-circle",
      }[bindings.crosshairStyle.value] ?? "crosshair-dot-cross";
    bindings.crosshairTargets.forEach((target) => {
      target.classList.remove(
        "crosshair-dot-cross",
        "crosshair-dot",
        "crosshair-cross",
        "crosshair-circle",
      );
      target.classList.add(styleClass);
    });
  });

  bindings.crosshairColor.addEventListener("input", () => {
    bindings.crosshairTargets.forEach((target) =>
      target.style.setProperty(
        "--crosshair-color",
        bindings.crosshairColor.value,
      ),
    );
  });
  bindings.crosshairOutlineColor.addEventListener("input", () => {
    bindings.crosshairTargets.forEach((target) =>
      target.style.setProperty(
        "--crosshair-outline-color",
        bindings.crosshairOutlineColor.value,
      ),
    );
  });
  bindSizeSetting(
    bindings.crosshairOutlineThickness,
    bindings.crosshairOutlineThicknessValue,
    bindings.crosshairTargets,
    "--crosshair-outline-thickness",
  );
  bindSizeSetting(
    bindings.crosshairGap,
    bindings.crosshairGapValue,
    bindings.crosshairTargets,
    "--crosshair-gap",
  );
  bindSizeSetting(
    bindings.crosshairLength,
    bindings.crosshairLengthValue,
    bindings.crosshairTargets,
    "--crosshair-length",
  );
  bindSizeSetting(
    bindings.crosshairThickness,
    bindings.crosshairThicknessValue,
    bindings.crosshairTargets,
    "--crosshair-thickness",
  );
  bindSizeSetting(
    bindings.crosshairDotSize,
    bindings.crosshairDotSizeValue,
    bindings.crosshairTargets,
    "--crosshair-dot-size",
  );
  bindSizeSetting(
    bindings.crosshairCircleSize,
    bindings.crosshairCircleSizeValue,
    bindings.crosshairTargets,
    "--crosshair-circle-size",
  );
  bindings.crosshairOpacity.addEventListener("input", () => {
    bindings.crosshairTargets.forEach((target) => {
      target.style.opacity = `${Number(bindings.crosshairOpacity.value) / 100}`;
    });
    bindings.crosshairOpacityValue.value = `${bindings.crosshairOpacity.value}%`;
  });

  bindings.hitMarkerColor.addEventListener("input", () => {
    bindings.hitMarkerTargets.forEach((target) =>
      target.style.setProperty(
        "--hit-marker-color",
        bindings.hitMarkerColor.value,
      ),
    );
  });
  bindSizeSetting(
    bindings.hitMarkerSize,
    bindings.hitMarkerSizeValue,
    bindings.hitMarkerTargets,
    "--hit-marker-size",
  );
  bindSizeSetting(
    bindings.hitMarkerLength,
    bindings.hitMarkerLengthValue,
    bindings.hitMarkerTargets,
    "--hit-marker-length",
  );
  bindSizeSetting(
    bindings.hitMarkerThickness,
    bindings.hitMarkerThicknessValue,
    bindings.hitMarkerTargets,
    "--hit-marker-thickness",
  );
  bindSizeSetting(
    bindings.hitMarkerGap,
    bindings.hitMarkerGapValue,
    bindings.hitMarkerTargets,
    "--hit-marker-gap",
  );
}
