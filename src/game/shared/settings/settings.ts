export const settingsStorageKey = "escape-settings-v1";

export function saveSettings(
  controls: Array<HTMLInputElement | HTMLSelectElement>,
): void {
  const values: Record<string, string | boolean> = {};

  controls.forEach((control) => {
    values[control.id] =
      control instanceof HTMLInputElement && control.type === "checkbox"
        ? control.checked
        : control.value;
  });

  try {
    localStorage.setItem(settingsStorageKey, JSON.stringify(values));
  } catch {
    // Ignore persistence errors for restricted browser contexts.
  }
}

export function restoreSettings(
  controls: Array<HTMLInputElement | HTMLSelectElement>,
): void {
  try {
    const storedValues = JSON.parse(
      localStorage.getItem(settingsStorageKey) ?? "{}",
    ) as Record<string, string | boolean>;

    controls.forEach((control) => {
      const storedValue = storedValues[control.id];
      if (storedValue === undefined) return;

      if (control instanceof HTMLInputElement && control.type === "checkbox") {
        control.checked = storedValue === true;
      } else if (typeof storedValue === "string") {
        control.value = storedValue;
      }

      control.dispatchEvent(new Event("input"));
      control.dispatchEvent(new Event("change"));
    });
  } catch {
    // Ignore storage restore errors for restricted browser contexts.
  }
}

export function bindSettingsPersistence(
  controls: Array<HTMLInputElement | HTMLSelectElement>,
): void {
  controls.forEach((control) => {
    control.addEventListener("input", () => saveSettings(controls));
    control.addEventListener("change", () => saveSettings(controls));
  });
}
