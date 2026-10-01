import RAPIER from "@dimforge/rapier3d-compat";
import { gsap } from "gsap";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  getStoredEpisodeId,
  setStoredEpisodeId,
  type EpisodeId,
} from "./episodes/episodes";
import { startEpisode, restoreEpisodeVisibility } from "./episodes/episodeFlow";
import {
  bindSettingsPersistence,
  restoreSettings,
  settingsStorageKey,
} from "./shared/settings/settings";
import {
  PLAYER_JUMP_STAMINA_COST,
  PLAYER_MAX_STAMINA,
  tickPlayerStaminaRuntime,
} from "./shared/runtime/commonRuntime";
import {
  calculateRecoilStrength,
  calculateShotDirection,
  calculateShotSpread,
  calculateSpreadPixels,
  createWeaponRig,
} from "./combat/weaponController";
import { createSharedPhysicsWorld } from "./runtime/physicsWorld";
import { calculateJumpMomentum } from "./runtime/playerMovement";
import {
  setupEpisodePreviewScenes,
  setupMatryoshkaPreview,
} from "./shared/rendering/sceneBootstrap";
import {
  bindEpisodeSelection,
  bindPauseMenuControls,
  bindScreenFlow,
} from "./shared/ui/ui";
import {
  bindSettingsCategories,
  bindSettingsPreviewEvents,
  createSettingsPreviews,
  settingPixelsToRem,
  syncSizeSettingLabels,
} from "./settings/settingsUI";
import {
  createHudOverlay,
  renderClassroomDoorProgress,
  renderInteractionPrompts,
} from "./ui/hudOverlay";
import {
  bindKeyInputHandlers,
  createKeyInputState,
  handleEscapeHotkey,
  handleInteractionHotkey,
  handleWeaponHotkey,
} from "./input/keyInput";
import {
  areAllClassroomStudentsWatching,
  knockDownClassroomStudent as knockDownClassroomStudentRuntime,
  updateClassroomStudentFacing,
  updateClassroomTeacherCloneTurn,
} from "./mobs/classroomTeacher";
import {
  chooseMatryoshkaTarget as chooseMatryoshkaMobTarget,
  determineMatryoshkaMobState,
  ensureMatryoshkaWanderMovement as ensureMatryoshkaMobWanderMovement,
  getMatryoshkaHorizontalDistanceSquared,
  knockDownMatryoshkaMob as knockDownMatryoshkaMobRuntime,
  type MatryoshkaMobState,
} from "./mobs/matryoshkaMob";
import {
  createPointerControls,
  lockPointerControls,
  setPointerSensitivity,
} from "./input/pointerControls";
import { createEpisodeEntryController } from "./episodes/episodeRuntime";
import {
  findNearestWaypoint,
  findRoute,
  getRouteDistance,
} from "./maps/parkingLot/matryoshkaNavigation";
import { prepareParkingLotScene } from "./maps/parkingLot/parkingLotScene";
import { prepareChessScene } from "./maps/chess/chessScene";
import { prepareClassroomScene } from "./maps/classroom/classroomScene";
import { placeClassroomStudents } from "./maps/classroom/classroomStudents";
import { findClassroomTeacherClonePosition } from "./maps/classroom/classroomTeacherClonePlacement";
import { findParkingLotClonePosition } from "./maps/parkingLot/matryoshkaClonePlacement";
import { findMapProjectileHits } from "./shared/combat/mapProjectileCollision";
import { gameState, type CurrentWeaponId } from "./runtime/gameState";
import {
  bindRendererResize,
  resizeRenderer as resizeGameRenderer,
  startGameLoop,
} from "./runtime/gameLoop";
import {
  analyzeRunningFootsteps,
  createBufferedSound,
  detectCarBreakPeaks,
  detectHeartbeatPeaks,
  getMasterVolumeMultiplier,
  loadSoundBuffer,
  setMasterVolumePercent,
} from "./audio/soundManager";
import { mountAppShell } from "./ui/appShell";

declare global {
  interface Window {
    electronAPI?: {
      quit: () => void;
    };
  }
}

if (window.electronAPI) document.documentElement.classList.add("electron-app");

const app = document.querySelector<HTMLDivElement>("#app")!;
mountAppShell(app);

const canvas = document.querySelector<HTMLCanvasElement>("#range-canvas")!;
const matryoshkaPreviewCanvas = document.querySelector<HTMLCanvasElement>(
  "#matryoshka-preview-canvas",
)!;
const startScreen = document.querySelector<HTMLElement>(".start-screen")!;
const loadingScreen = document.querySelector<HTMLElement>(".loading-screen")!;
const loadingTitle = document.querySelector<HTMLElement>("#loading-title")!;
const loadingStatus = document.querySelector<HTMLElement>("#loading-status")!;
const loadingBarFill =
  document.querySelector<HTMLElement>("#loading-bar-fill")!;
const startPlayButton =
  document.querySelector<HTMLButtonElement>("#start-play-button")!;
const episodeScreen = document.querySelector<HTMLElement>(".episode-screen")!;
const parkingLotEpisodeButton = document.querySelector<HTMLButtonElement>(
  "#parking-lot-episode-button",
)!;
const parkingPreviewCanvas = document.querySelector<HTMLCanvasElement>(
  "#parking-preview-canvas",
)!;
const classroomEpisodeButton = document.querySelector<HTMLButtonElement>(
  "#classroom-episode-button",
)!;
const classroomPreviewCanvas = document.querySelector<HTMLCanvasElement>(
  "#classroom-preview-canvas",
)!;
const chessEpisodeButton = document.querySelector<HTMLButtonElement>(
  "#chess-episode-button",
)!;
const chessPreviewCanvas = document.querySelector<HTMLCanvasElement>(
  "#chess-preview-canvas",
)!;
const crosshair = document.querySelector<HTMLElement>(".crosshair")!;
const hitMarker = document.querySelector<HTMLElement>(".hit-marker")!;
const fearOverlay = document.querySelector<HTMLElement>(".fear-overlay")!;
const deathOverlay = document.querySelector<HTMLElement>(".death-overlay")!;
const deathScreen = document.querySelector<HTMLElement>(".death-screen")!;
const deathRetryButton = document.querySelector<HTMLButtonElement>(
  "#death-retry-button",
)!;
const deathExitButton =
  document.querySelector<HTMLButtonElement>("#death-exit-button")!;
const range = document.querySelector<HTMLElement>(".range")!;
const hudOverlayElements = createHudOverlay(range);
const {
  vehicleSearchHint,
  staminaBarFill,
  weaponPickupPrompt,
  reloadPrompt,
  trueCarPrompt,
  trueCarSoundIndicator,
  classroomSeatPrompt,
  weaponModePrompt,
} = hudOverlayElements;
let reloadPromptFadeTimer: number | null = null;
const episodeFadeOverlay = document.querySelector<HTMLElement>(
  ".episode-fade-overlay",
)!;
const crosshairPanel = document.querySelector<HTMLElement>(
  '[data-category-panel="crosshair"]',
)!;
const { scopeOverlay, crosshairPreviewTargets, hitMarkerPreviewTargets } =
  createSettingsPreviews({ range, crosshair, hitMarker, crosshairPanel });
const settingsButton =
  document.querySelector<HTMLButtonElement>(".settings-button")!;
const settingsOverlay =
  document.querySelector<HTMLElement>(".settings-overlay")!;
const settingsClose =
  document.querySelector<HTMLButtonElement>(".settings-close")!;
const menuHome = document.querySelector<HTMLElement>(".menu-home")!;
const modeMenu = document.querySelector<HTMLElement>(".mode-menu")!;
modeMenu.remove();
const settingsContent =
  document.querySelector<HTMLElement>(".settings-content")!;
const resetSettingsButton = document.createElement("button");
resetSettingsButton.type = "button";
resetSettingsButton.className = "settings-reset-button";
resetSettingsButton.textContent = "RESET DEFAULTS";
settingsContent.querySelector(".settings-heading")?.append(resetSettingsButton);
resetSettingsButton.addEventListener("click", () => {
  localStorage.removeItem(settingsStorageKey);
  window.location.reload();
});
const menuSettingsButton = document.querySelector<HTMLButtonElement>(
  "#menu-settings-button",
)!;
const menuExitButton =
  document.querySelector<HTMLButtonElement>("#menu-exit-button")!;
const modeCategoryButtons = [
  ...document.querySelectorAll<HTMLButtonElement>(".mode-category-button"),
];
const modeCategoryPanels = [
  ...document.querySelectorAll<HTMLElement>("[data-mode-panel]"),
];
const _modeCategoryNav = modeCategoryButtons[0]?.parentElement;
const _modeCategoryContent = modeCategoryPanels[0]?.parentElement;
const weaponPreviewCanvas = document.querySelector<HTMLCanvasElement>(
  "#weapon-preview-canvas",
)!;
const fullscreenButton =
  document.querySelector<HTMLButtonElement>(".fullscreen-button")!;
const modeButtons = [
  ...document.querySelectorAll<HTMLButtonElement>(".mode-button"),
];
const settingsCategoryButtons = [
  ...document.querySelectorAll<HTMLButtonElement>(".settings-category"),
];
const settingsCategoryPanels = [
  ...document.querySelectorAll<HTMLElement>("[data-category-panel]"),
];
const weaponCategoryButton = settingsCategoryButtons.find(
  (button) => button.dataset.category === "weapon",
);
const displayCategoryButton = settingsCategoryButtons.find(
  (button) => button.dataset.category === "display",
);
const settingsCategoryNav = weaponCategoryButton?.parentElement;
if (weaponCategoryButton && displayCategoryButton && settingsCategoryNav)
  settingsCategoryNav.insertBefore(weaponCategoryButton, displayCategoryButton);
const weaponCategoryPanel = settingsCategoryPanels.find(
  (panel) => panel.dataset.categoryPanel === "weapon",
);
const displayCategoryPanel = settingsCategoryPanels.find(
  (panel) => panel.dataset.categoryPanel === "display",
);
const settingsCategoryContent = weaponCategoryPanel?.parentElement;
if (weaponCategoryPanel && displayCategoryPanel && settingsCategoryContent)
  settingsCategoryContent.insertBefore(
    weaponCategoryPanel,
    displayCategoryPanel,
  );
settingsCategoryButtons.forEach((button) =>
  button.classList.toggle("is-active", button === displayCategoryButton),
);
settingsCategoryPanels.forEach((panel) =>
  panel.classList.toggle("is-visible", panel === displayCategoryPanel),
);
const crosshairVisibilitySetting = document.createElement("input");
crosshairVisibilitySetting.id = "crosshair-visibility-setting";
crosshairVisibilitySetting.type = "checkbox";
crosshairVisibilitySetting.checked = false;
const crosshairVisibilityLabel = document.createElement("label");
crosshairVisibilityLabel.className = "toggle-row";
crosshairVisibilityLabel.textContent = "SHOW CROSSHAIR ";
crosshairVisibilityLabel.append(crosshairVisibilitySetting);
displayCategoryPanel?.append(crosshairVisibilityLabel);
crosshair.hidden = !crosshairVisibilitySetting.checked;
crosshairVisibilitySetting.addEventListener("change", () => {
  crosshair.hidden = !crosshairVisibilitySetting.checked;
});
const fovSetting = document.querySelector<HTMLInputElement>("#fov-setting")!;
const fovValue = document.querySelector<HTMLOutputElement>("#fov-value")!;
const bulletSpeedSetting = document.querySelector<HTMLInputElement>(
  "#bullet-speed-setting",
)!;
const bulletSpeedValue = document.querySelector<HTMLOutputElement>(
  "#bullet-speed-value",
)!;
const settingsSensitivity = document.querySelector<HTMLInputElement>(
  "#settings-sensitivity",
)!;
const settingsSensitivityValue = document.querySelector<HTMLOutputElement>(
  "#settings-sensitivity-value",
)!;
const renderDistanceSetting = document.querySelector<HTMLInputElement>(
  "#render-distance-setting",
)!;
const renderDistanceValue = document.querySelector<HTMLOutputElement>(
  "#render-distance-value",
)!;
const resolutionScaleSetting = document.querySelector<HTMLInputElement>(
  "#resolution-scale-setting",
)!;
const resolutionScaleValue = document.querySelector<HTMLOutputElement>(
  "#resolution-scale-value",
)!;
const antialiasingSetting = document.querySelector<HTMLInputElement>(
  "#antialiasing-setting",
)!;
const maxFpsSetting =
  document.querySelector<HTMLSelectElement>("#max-fps-setting")!;
const weaponSetting =
  document.querySelector<HTMLSelectElement>("#weapon-setting")!;
const currentWeaponName = document.querySelector<HTMLElement>(
  "#current-weapon-name",
)!;
currentWeaponName.textContent = "M1911";
weaponSetting.replaceChildren(new Option("M1911", "pistol"));
const recoilModeSetting = document.createElement("select");
recoilModeSetting.id = "recoil-mode-setting";
recoilModeSetting.innerHTML =
  '<option value="recover">KICK + RECOVER</option><option value="sustained">SUSTAINED</option>';
const recoilModeLabel = document.createElement("label");
recoilModeLabel.textContent = "RECOIL MODE ";
recoilModeLabel.append(recoilModeSetting);
bulletSpeedSetting.closest("label")?.before(recoilModeLabel);
const recoilSetting =
  document.querySelector<HTMLInputElement>("#recoil-setting")!;
const recoilValue = document.querySelector<HTMLOutputElement>("#recoil-value")!;
const spreadSetting =
  document.querySelector<HTMLInputElement>("#spread-setting")!;
const spreadValue = document.querySelector<HTMLOutputElement>("#spread-value")!;
const movementSpreadSetting = document.querySelector<HTMLInputElement>(
  "#movement-spread-setting",
)!;
const movementSpreadValue = document.querySelector<HTMLOutputElement>(
  "#movement-spread-value",
)!;
const aimingJumpSpreadSetting = document.querySelector<HTMLInputElement>(
  "#aiming-jump-spread-setting",
)!;
const aimingJumpSpreadValue = document.querySelector<HTMLOutputElement>(
  "#aiming-jump-spread-value",
)!;
const hipfireJumpSpreadSetting = document.querySelector<HTMLInputElement>(
  "#hipfire-jump-spread-setting",
)!;
const hipfireJumpSpreadValue = document.querySelector<HTMLOutputElement>(
  "#hipfire-jump-spread-value",
)!;
const bulletDropSetting = document.querySelector<HTMLInputElement>(
  "#bullet-drop-setting",
)!;
const bulletDropValue =
  document.querySelector<HTMLOutputElement>("#bullet-drop-value")!;
const trackingSpeedSetting = document.querySelector<HTMLInputElement>(
  "#tracking-speed-setting",
)!;
const trackingSpeedValue = document.querySelector<HTMLOutputElement>(
  "#tracking-speed-value",
)!;
const fallingHorizontalForceSetting = document.querySelector<HTMLInputElement>(
  "#falling-horizontal-force-setting",
)!;
const fallingHorizontalForceValue = document.querySelector<HTMLOutputElement>(
  "#falling-horizontal-force-value",
)!;
const fallingLaunchSetting = document.querySelector<HTMLInputElement>(
  "#falling-launch-setting",
)!;
const fallingLaunchValue = document.querySelector<HTMLOutputElement>(
  "#falling-launch-value",
)!;
const fallingGravitySetting = document.querySelector<HTMLInputElement>(
  "#falling-gravity-setting",
)!;
const fallingGravityValue = document.querySelector<HTMLOutputElement>(
  "#falling-gravity-value",
)!;
const fallingRespawnDelaySetting = document.querySelector<HTMLInputElement>(
  "#falling-respawn-delay-setting",
)!;
const fallingRespawnDelayValue = document.querySelector<HTMLOutputElement>(
  "#falling-respawn-delay-value",
)!;
const targetSizeSetting = document.querySelector<HTMLInputElement>(
  "#target-size-setting",
)!;
const targetSizeValue =
  document.querySelector<HTMLOutputElement>("#target-size-value")!;
const backgroundColorSetting = document.querySelector<HTMLInputElement>(
  "#background-color-setting",
)!;
const floorColorSetting = document.querySelector<HTMLInputElement>(
  "#floor-color-setting",
)!;
const gridColorSetting = document.querySelector<HTMLInputElement>(
  "#grid-color-setting",
)!;
const _targetColorSetting = document.querySelector<HTMLInputElement>(
  "#target-color-setting",
)!;
const masterVolumeSetting = document.querySelector<HTMLInputElement>(
  "#master-volume-setting",
)!;
const masterVolumeValue = document.querySelector<HTMLOutputElement>(
  "#master-volume-value",
)!;
const crosshairStyleSetting = document.querySelector<HTMLSelectElement>(
  "#crosshair-style-setting",
)!;
const crosshairColorSetting = document.querySelector<HTMLInputElement>(
  "#crosshair-color-setting",
)!;
const crosshairGapSetting = document.querySelector<HTMLInputElement>(
  "#crosshair-gap-setting",
)!;
const crosshairGapValue = document.querySelector<HTMLOutputElement>(
  "#crosshair-gap-value",
)!;
const crosshairLengthSetting = document.querySelector<HTMLInputElement>(
  "#crosshair-length-setting",
)!;
const crosshairLengthValue = document.querySelector<HTMLOutputElement>(
  "#crosshair-length-value",
)!;
const crosshairThicknessSetting = document.querySelector<HTMLInputElement>(
  "#crosshair-thickness-setting",
)!;
const crosshairThicknessValue = document.querySelector<HTMLOutputElement>(
  "#crosshair-thickness-value",
)!;
const crosshairDotSizeSetting = document.querySelector<HTMLInputElement>(
  "#crosshair-dot-size-setting",
)!;
const crosshairDotSizeValue = document.querySelector<HTMLOutputElement>(
  "#crosshair-dot-size-value",
)!;
const crosshairCircleSizeSetting = document.querySelector<HTMLInputElement>(
  "#crosshair-circle-size-setting",
)!;
const crosshairCircleSizeValue = document.querySelector<HTMLOutputElement>(
  "#crosshair-circle-size-value",
)!;
const crosshairOpacitySetting = document.querySelector<HTMLInputElement>(
  "#crosshair-opacity-setting",
)!;
const crosshairOpacityValue = document.querySelector<HTMLOutputElement>(
  "#crosshair-opacity-value",
)!;
const crosshairDynamicSetting = document.querySelector<HTMLInputElement>(
  "#crosshair-dynamic-setting",
)!;
const crosshairHideWhenNotAimingSetting = document.createElement("input");
crosshairHideWhenNotAimingSetting.id = "crosshair-hide-when-not-aiming-setting";
crosshairHideWhenNotAimingSetting.type = "checkbox";
crosshairHideWhenNotAimingSetting.checked = false;
const crosshairHideWhenNotAimingLabel = document.createElement("label");
crosshairHideWhenNotAimingLabel.className = "toggle-row";
crosshairHideWhenNotAimingLabel.textContent = "HIDE WHEN NOT AIMING ";
crosshairHideWhenNotAimingLabel.append(crosshairHideWhenNotAimingSetting);
crosshairDynamicSetting
  .closest("label")
  ?.before(crosshairHideWhenNotAimingLabel);
const crosshairDynamicStrengthSetting =
  document.querySelector<HTMLInputElement>(
    "#crosshair-dynamic-strength-setting",
  )!;
const crosshairDynamicStrengthValue = document.querySelector<HTMLOutputElement>(
  "#crosshair-dynamic-strength-value",
)!;
const hitMarkerColorSetting = document.querySelector<HTMLInputElement>(
  "#hit-marker-color-setting",
)!;
const hitMarkerSizeSetting = document.querySelector<HTMLInputElement>(
  "#hit-marker-size-setting",
)!;
const hitMarkerSizeValue = document.querySelector<HTMLOutputElement>(
  "#hit-marker-size-value",
)!;
const hitMarkerLengthSetting = document.querySelector<HTMLInputElement>(
  "#hit-marker-length-setting",
)!;
const hitMarkerLengthValue = document.querySelector<HTMLOutputElement>(
  "#hit-marker-length-value",
)!;
const hitMarkerThicknessSetting = document.querySelector<HTMLInputElement>(
  "#hit-marker-thickness-setting",
)!;
const hitMarkerThicknessValue = document.querySelector<HTMLOutputElement>(
  "#hit-marker-thickness-value",
)!;
const hitMarkerGapSetting = document.querySelector<HTMLInputElement>(
  "#hit-marker-gap-setting",
)!;
const hitMarkerGapValue = document.querySelector<HTMLOutputElement>(
  "#hit-marker-gap-value",
)!;
const hitMarkerDurationSetting = document.querySelector<HTMLInputElement>(
  "#hit-marker-duration-setting",
)!;
const hitMarkerDurationValue = document.querySelector<HTMLOutputElement>(
  "#hit-marker-duration-value",
)!;
const dpiSetting = document.querySelector<HTMLInputElement>("#dpi-setting")!;
const dpiValue = document.querySelector<HTMLOutputElement>("#dpi-value")!;
const adsRatioSetting =
  document.querySelector<HTMLInputElement>("#ads-ratio-setting")!;
const adsRatioValue =
  document.querySelector<HTMLOutputElement>("#ads-ratio-value")!;
const adsFovSetting =
  document.querySelector<HTMLInputElement>("#ads-fov-setting")!;
const adsFovValue =
  document.querySelector<HTMLOutputElement>("#ads-fov-value")!;
const rawInputSetting =
  document.querySelector<HTMLInputElement>("#raw-input-setting")!;
const domeGridPanel = document.querySelector<HTMLElement>(
  '[data-category-panel="targets"]',
)!;
const domeGridSetting = document.createElement("input");
domeGridSetting.id = "dome-grid-setting";
domeGridSetting.type = "checkbox";
domeGridSetting.checked = false;
const domeGridToggleLabel = document.createElement("label");
domeGridToggleLabel.className = "toggle-row";
domeGridToggleLabel.textContent = "NEON DOME GRID ";
domeGridToggleLabel.append(domeGridSetting);
const domeGridColorSetting = document.createElement("input");
domeGridColorSetting.id = "dome-grid-color-setting";
domeGridColorSetting.type = "color";
domeGridColorSetting.value = "#39ff88";
const domeGridColorLabel = document.createElement("label");
domeGridColorLabel.textContent = "DOME GRID COLOR ";
domeGridColorLabel.append(domeGridColorSetting);
domeGridPanel.insertBefore(
  domeGridToggleLabel,
  floorColorSetting.closest("label"),
);
domeGridPanel.insertBefore(
  domeGridColorLabel,
  floorColorSetting.closest("label"),
);
const hideAllCarsSetting = document.createElement("input");
hideAllCarsSetting.id = "hide-all-cars-setting";
hideAllCarsSetting.type = "checkbox";
hideAllCarsSetting.checked = false;
const hideAllCarsToggleLabel = document.createElement("label");
hideAllCarsToggleLabel.className = "toggle-row";
hideAllCarsToggleLabel.textContent = "HIDE ALL CARS ";
hideAllCarsToggleLabel.append(hideAllCarsSetting);
const keyEspSetting = document.createElement("input");
keyEspSetting.id = "key-esp-setting";
keyEspSetting.type = "checkbox";
keyEspSetting.checked = false;
const keyEspToggleLabel = document.createElement("label");
keyEspToggleLabel.className = "toggle-row";
keyEspToggleLabel.textContent = "KEY ESP OUTLINE ";
keyEspToggleLabel.append(keyEspSetting);
const trueCarEspSetting = document.createElement("input");
trueCarEspSetting.id = "true-car-esp-setting";
trueCarEspSetting.type = "checkbox";
trueCarEspSetting.checked = false;
const trueCarEspToggleLabel = document.createElement("label");
trueCarEspToggleLabel.className = "toggle-row";
trueCarEspToggleLabel.textContent = "TRUE CAR ESP OUTLINE ";
trueCarEspToggleLabel.append(trueCarEspSetting);
const carHitboxSetting = document.createElement("input");
carHitboxSetting.id = "car-hitbox-setting";
carHitboxSetting.type = "checkbox";
carHitboxSetting.checked = false;
const carHitboxToggleLabel = document.createElement("label");
carHitboxToggleLabel.className = "toggle-row";
carHitboxToggleLabel.textContent = "CAR HITBOXES ";
carHitboxToggleLabel.append(carHitboxSetting);
const matryoshkaHitboxSetting = document.createElement("input");
matryoshkaHitboxSetting.id = "matryoshka-hitbox-setting";
matryoshkaHitboxSetting.type = "checkbox";
matryoshkaHitboxSetting.checked = false;
const matryoshkaHitboxToggleLabel = document.createElement("label");
matryoshkaHitboxToggleLabel.className = "toggle-row";
matryoshkaHitboxToggleLabel.textContent = "MATRYOSHKA HITBOX ";
matryoshkaHitboxToggleLabel.append(matryoshkaHitboxSetting);
const matryoshkaVisionSetting = document.createElement("input");
matryoshkaVisionSetting.id = "matryoshka-vision-setting";
matryoshkaVisionSetting.type = "checkbox";
matryoshkaVisionSetting.checked = false;
const matryoshkaVisionToggleLabel = document.createElement("label");
matryoshkaVisionToggleLabel.className = "toggle-row";
matryoshkaVisionToggleLabel.textContent = "MATRYOSHKA VISION RANGE ";
matryoshkaVisionToggleLabel.append(matryoshkaVisionSetting);
const teacherAiSetting = document.createElement("input");
teacherAiSetting.id = "teacher-ai-setting";
teacherAiSetting.type = "checkbox";
teacherAiSetting.checked = false;
const teacherAiToggleLabel = document.createElement("label");
teacherAiToggleLabel.className = "toggle-row";
teacherAiToggleLabel.textContent = "TEACHER AI OFF ";
teacherAiToggleLabel.append(teacherAiSetting);
const mapPointSetting = document.createElement("input");
mapPointSetting.id = "map-point-setting";
mapPointSetting.type = "checkbox";
mapPointSetting.checked = false;
const mapPointToggleLabel = document.createElement("label");
mapPointToggleLabel.className = "toggle-row";
mapPointToggleLabel.textContent = "PLACE MAP POINTS WITH CLICK ";
mapPointToggleLabel.append(mapPointSetting);
const projectileHitLogSetting = document.createElement("input");
projectileHitLogSetting.id = "projectile-hit-log-setting";
projectileHitLogSetting.type = "checkbox";
projectileHitLogSetting.checked = false;
const projectileHitLogToggleLabel = document.createElement("label");
projectileHitLogToggleLabel.className = "toggle-row";
projectileHitLogToggleLabel.textContent = "PROJECTILE HIT LOG ";
projectileHitLogToggleLabel.append(projectileHitLogSetting);
const developerTestGroup = document.createElement("div");
developerTestGroup.className = "developer-test-group";
developerTestGroup.innerHTML = "<h2>DEVELOPER TEST OPTIONS</h2>";
developerTestGroup.append(
  hideAllCarsToggleLabel,
  keyEspToggleLabel,
  trueCarEspToggleLabel,
  carHitboxToggleLabel,
  matryoshkaHitboxToggleLabel,
  matryoshkaVisionToggleLabel,
  teacherAiToggleLabel,
  mapPointToggleLabel,
  projectileHitLogToggleLabel,
);
const developerCategoryButton = document.createElement("button");
developerCategoryButton.className = "settings-category";
developerCategoryButton.dataset.category = "developer";
developerCategoryButton.type = "button";
developerCategoryButton.textContent = "DEVELOPER TEST";
const developerCategoryPanel = document.createElement("section");
developerCategoryPanel.className = "settings-group settings-panel-group";
developerCategoryPanel.dataset.categoryPanel = "developer";
developerCategoryPanel.append(developerTestGroup);
settingsCategoryNav?.append(developerCategoryButton);
settingsCategoryContent?.append(developerCategoryPanel);
settingsCategoryButtons.push(developerCategoryButton);
settingsCategoryPanels.push(developerCategoryPanel);
const crosshairOutlineColorSetting = document.querySelector<HTMLInputElement>(
  "#crosshair-outline-color-setting",
)!;
const crosshairOutlineThicknessSetting =
  document.querySelector<HTMLInputElement>(
    "#crosshair-outline-thickness-setting",
  )!;
const crosshairOutlineThicknessValue =
  document.querySelector<HTMLOutputElement>(
    "#crosshair-outline-thickness-value",
  )!;
type ShootingMode =
  | "microshot"
  | "flickshot"
  | "gridshot"
  | "reflexshot"
  | "microshotprecision"
  | "flickshotprecision"
  | "gridshotprecision"
  | "reflexshotprecision"
  | "strafetrack"
  | "spheretrack"
  | "fallingtrack";
type WeaponId = CurrentWeaponId;
type RecoilMode = "recover" | "sustained";
type WeaponProfile = {
  bulletSpeed: number;
  recoil: number;
  spread: number;
  movementSpread: number;
  aimingJumpSpread: number;
  hipfireJumpSpread: number;
  bulletDrop: number;
  fireDelay: number;
  recoilMode: RecoilMode;
};
const weaponProfiles: Record<WeaponId, WeaponProfile> = {
  pistol: {
    bulletSpeed: 500,
    recoil: 50,
    spread: 75,
    movementSpread: 235,
    aimingJumpSpread: 350,
    hipfireJumpSpread: 250,
    bulletDrop: 100,
    fireDelay: 0,
    recoilMode: "recover",
  },
};
let shootingMode: ShootingMode = "flickshot";
let _weaponSelection: "auto" | WeaponId = "auto";
let recoilMode: RecoilMode = "recover";
let recoilMultiplier = 1;
let spreadMultiplier = 1;
let gravityMultiplier = 1;
let trackingSpeed = 4;
let fallingHorizontalForce = 3.4;
let fallingLaunchSpeed = 12;
let fallingGravity = 18;
let fallingRespawnDelay = 0.6;
let maxFps = 0;
let targetSizeMultiplier = 1;
const hitVfxEnabled = true;
let crosshairDynamicEnabled = true;
let crosshairHideWhenNotAiming = false;
let crosshairDynamicStrength = 1;
let hitMarkerDuration = 0.22;
let dpiMultiplier = 1;
let adsSensitivityRatio = 1;
let adsFov = 48;
let resolutionScale = 1;
let rawInputEnabled = true;

let restoringSettings = false;
const persistedSettings = [
  ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    ".settings-overlay input, .settings-overlay select",
  ),
];

function saveSettings(): void {
  const values: Record<string, string | boolean> = {};
  persistedSettings.forEach((control) => {
    values[control.id] =
      control instanceof HTMLInputElement && control.type === "checkbox"
        ? control.checked
        : control.value;
  });
  try {
    localStorage.setItem("escape-settings-v1", JSON.stringify(values));
  } catch {}
}

function restoreSettingsFromStorage(): void {
  restoringSettings = true;
  restoreSettings(persistedSettings);
  restoringSettings = false;
}

bindSettingsPersistence(persistedSettings);
restoreSettingsFromStorage();
try {
  const storedValues = JSON.parse(
    localStorage.getItem("escape-settings-v1") ?? "{}",
  ) as Record<string, string | boolean>;
  if (typeof storedValues["antialiasing-setting"] === "boolean")
    antialiasingSetting.checked = storedValues["antialiasing-setting"];
} catch {}
const scene = new THREE.Scene();
scene.background = new THREE.Color("#0b0e12");
scene.fog = new THREE.Fog("#0b0e12", 28, 600);
let parkingBounds: THREE.Box3 | null = null;
let parkingLotRoot: THREE.Object3D | null = null;
let classroomRoot: THREE.Object3D | null = null;
const classroomStudents: THREE.Object3D[] = [];
const classroomDeadStudents = new Set<THREE.Object3D>();
const classroomStudentInitialRotations = new Map<
  THREE.Object3D,
  THREE.Quaternion
>();
const classroomStudentKnockdownUntil = new Map<THREE.Object3D, number>();
let classroomBounds: THREE.Box3 | null = null;
let chessRoot: THREE.Object3D | null = null;
let chessBounds: THREE.Box3 | null = null;
const classroomLightRig = new THREE.Group();
classroomLightRig.visible = false;
scene.add(classroomLightRig);
const chessLightRig = new THREE.Group();
chessLightRig.visible = false;
scene.add(chessLightRig);
const parkingObstacles: THREE.Box3[] = [];
const classroomObstacles: THREE.Box3[] = [];
const matryoshkaObstacles: THREE.Box3[] = [];
const matryoshkaVehicleObstacles: THREE.Box3[] = [];
const carHitboxHelpers: THREE.Box3Helper[] = [];
const parkingObstacleCellSize = 8;
const parkingObstacleCells = new Map<string, THREE.Box3[]>();
const keyEspObjects: THREE.Object3D[] = [];
const trueCarEspObjects: THREE.Object3D[] = [];
let parkedCarsReady = false;
let keyPickupObject: THREE.Object3D | null = null;
let keyPickupCollected = false;
let weaponPickupObject: THREE.Object3D | null = null;
let trueCar: THREE.Object3D | null = null;
let trueCarEntered = false;
let trueCarSoundPlaying = false;
let classroomSeatActive = false;
let fearActive = false;
let parkingLotFearActive = false;
let classroomFearActive = false;
let carEndingShakeStartedAt = -Infinity;
let carEndingShakePeaks: number[] = [];
type MatryoshkaSoundSource = "player" | "car";
type MatryoshkaWaypointNetwork = "yellow" | "blue";
type MatryoshkaInvestigationPhase = "yellow" | "blue";
type MatryoshkaMob = {
  object: THREE.Object3D;
  classroomOnly: boolean;
  state: MatryoshkaMobState;
  soundSource: MatryoshkaSoundSource;
  isClone: boolean;
  cooldownScale: number;
  classroomTurned: boolean;
  classroomTurnUntil: number;
  classroomNextTurnAt: number;
  patrolDestination: THREE.Vector3 | null;
  physicsBody: RAPIER.RigidBody;
  physicsOffsetY: number;
  target: THREE.Vector3;
  velocity: THREE.Vector3;
  stationaryTime: number;
  slideDirection: THREE.Vector3;
  slideDirectionUntil: number;
  knockedDownAt: number;
  knockdownBaseY: number;
  routeSide: number;
  chaseNetwork: MatryoshkaWaypointNetwork;
  investigationPhase: MatryoshkaInvestigationPhase;
  lastSeenPlayerPosition: THREE.Vector3;
  pathRefreshAt: number;
  route: THREE.Vector3[];
  visionIndicator: THREE.LineLoop;
  hitboxHelper: THREE.Box3Helper;
  hitboxBounds: THREE.Box3;
  initialPosition: THREE.Vector3;
  initialQuaternion: THREE.Quaternion;
  heardSoundVersion: number;
  visibilityCheckAt: number;
  playerVisible: boolean;
};
const matryoshkaMobs: MatryoshkaMob[] = [];
let classroomTeacher: MatryoshkaMob | null = null;
let classroomTeacherTurned = false;
let classroomTeacherTurnUntil = -Infinity;
let classroomTeacherNextTurnAt = -Infinity;
let classroomTeacherTurnPendingAt = -Infinity;
let classroomTeacherStudentTurnAt = -Infinity;
let classroomTeacherReturning = false;
let classroomTeacherReturnStartedAt = -Infinity;
const classroomTeacherReturnDuration = 0.8;
const classroomTeacherReturnQuaternion = new THREE.Quaternion();
let classroomStudentsAlerted = false;
let classroomBellBuffer: AudioBuffer | null = null;
let classroomBellSource: AudioBufferSourceNode | null = null;
let classroomBellPlaying = false;
let classroomBellNextAt = -Infinity;
const classroomDeferredReloadSoundPosition = new THREE.Vector3();
let classroomDeferredReloadSoundUntil = -Infinity;
const classroomBellPlaybackRate = 1.35;
const classroomBellInterval = 20;
const classroomTeacherTurnDelayMin = 8;
const classroomTeacherTurnDelayMax = 12;
const classroomTeacherLookDurationMin = 1;
const classroomTeacherLookDurationMax = 3;
const matryoshkaWaypoints: THREE.Vector3[] = [];
const matryoshkaRecoveryWaypoints: THREE.Vector3[] = [];
const matryoshkaWaypointMarkers: THREE.Mesh[] = [];
const matryoshkaRecoveryWaypointMarkers: THREE.Mesh[] = [];
const mapPointMarkers: THREE.Mesh[] = [];
const matryoshkaPatrolWaypoints = [
  new THREE.Vector3(5.089, 0.015, -73.135),
  new THREE.Vector3(45.068, 3.304, -85.551),
  new THREE.Vector3(-37.101, 0.015, -72.049),
  new THREE.Vector3(-61.427, 0.015, -70.267),
  new THREE.Vector3(-69.494, 0.015, -17.804),
  new THREE.Vector3(-68.625, 0.015, 67.872),
  new THREE.Vector3(-36.869, 0.015, 67.121),
  new THREE.Vector3(3.986, 0.015, 69.305),
  new THREE.Vector3(79.959, 12.642, -65.004),
];
const matryoshkaDetectionRange = 34;
const matryoshkaSpeed = 8;
const matryoshkaChaseSpeed = 8;
const matryoshkaChaseMemoryDistance = 18;
const matryoshkaPathRefreshInterval = 0.6;
const matryoshkaEyeHeight = 2.5;
const matryoshkaModelYawOffset = -Math.PI / 2;
const matryoshkaMinWanderDistance = 35;
const matryoshkaObstaclePadding = 0.3;
const playerWalkSpeed = 3.8;
const playerRunSpeed = 11.5;
const playerMaxStamina = PLAYER_MAX_STAMINA;
const playerSprintThresholdRatio = 0.3;
const playerSprintThreshold = playerMaxStamina * playerSprintThresholdRatio;
let jumpMomentumSpeed = playerWalkSpeed;
let runningFootstepInterval = 0.5;
let runningFootstepSamples: AudioBuffer[] = [];
const runningFootstepSources = new Set<AudioBufferSourceNode>();
const runningFootstepGains = new Map<AudioBufferSourceNode, GainNode>();
let nextRunningFootstepIndex = 0;
let runningStepPhase = 0;
let runningFeedbackStrength = 1;
let nextRunningStepPhase = 1;

function getStaminaSprintFactor(): number {
  return gameState.playerStamina >= playerSprintThreshold
    ? 1
    : THREE.MathUtils.clamp(
        gameState.playerStamina / playerSprintThreshold,
        0,
        1,
      );
}

let _matryoshkaVehicleHeight = 20;
const matryoshkaMobPosition = new THREE.Vector3();
const matryoshkaPlayerPosition = new THREE.Vector3();
const matryoshkaToPlayer = new THREE.Vector3();
const matryoshkaMoveDirection = new THREE.Vector3();
const matryoshkaMovementStart = new THREE.Vector3();
const matryoshkaFullMobBounds = new THREE.Box3();
const matryoshkaBoundsCenter = new THREE.Vector3();
const matryoshkaBoundsSize = new THREE.Vector3();
const matryoshkaMobGroundPosition = new THREE.Vector3();
const matryoshkaRaycaster = new THREE.Raycaster();
const matryoshkaSoundTarget = new THREE.Vector3();
const matryoshkaCarSoundTarget = new THREE.Vector3();
let matryoshkaSoundVersion = 0;
let matryoshkaCarSoundVersion = 0;
let classroomContactDeathPending = false;
let classroomContactDeathAt = -Infinity;
const playerDeathStartPosition = new THREE.Vector3();
const playerDeathStartQuaternion = new THREE.Quaternion();
const playerDeathRotation = new THREE.Quaternion();
const _playerDeathAxis = new THREE.Vector3(0, 0, 1);
const classroomContactPosition = new THREE.Vector3();
const classroomContactDirection = new THREE.Vector3();

function triggerClassroomDangerDeath(
  teacher: MatryoshkaMob,
  now: number,
): void {
  if (gameState.playerDeathActive || classroomContactDeathPending) return;
  camera.getWorldDirection(classroomContactDirection);
  classroomContactPosition
    .copy(camera.position)
    .addScaledVector(classroomContactDirection, 1.5);
  classroomContactPosition.y = camera.position.y - 2.3;
  teacher.object.position.copy(classroomContactPosition);
  teacher.object.lookAt(
    camera.position.x,
    teacher.object.position.y,
    camera.position.z,
  );
  teacher.object.rotateY(Math.PI / 2);
  teacher.object.rotateY(Math.PI);
  teacher.object.updateMatrixWorld(true);
  const closeupBounds = new THREE.Box3().setFromObject(teacher.object);
  const closeupCenter = closeupBounds.getCenter(new THREE.Vector3());
  const closeupVerticalOffset = classroomSeatActive ? -1.0 : -1.35;
  teacher.object.position.y +=
    camera.position.y - 0.1 - closeupCenter.y + closeupVerticalOffset;
  teacher.velocity.set(0, 0, 0);
  teacher.route = [];
  teacher.physicsBody.setTranslation(
    {
      x: teacher.object.position.x,
      y: teacher.object.position.y + teacher.physicsOffsetY,
      z: teacher.object.position.z,
    },
    true,
  );
  teacher.physicsBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  classroomContactDeathPending = true;
  classroomContactDeathAt = now + 0.3;
}

function triggerPlayerDeath(): void {
  if (gameState.playerDeathActive) return;
  classroomContactDeathPending = false;
  classroomContactDeathAt = -Infinity;
  classroomBackDoorOpening = false;
  classroomBackDoorOpened = false;
  classroomBackDoorOpeningStartedAt = -Infinity;
  if (classroomBackDoorOpeningTimer !== null) {
    window.clearTimeout(classroomBackDoorOpeningTimer);
    classroomBackDoorOpeningTimer = null;
  }
  renderClassroomDoorProgress(hudOverlayElements, null);
  gameState.playerDeathActive = true;
  gameState.playerDeathElapsed = 0;
  playerDeathStartPosition.copy(camera.position);
  playerDeathStartQuaternion.copy(camera.quaternion);
  deathOverlay.classList.add("is-visible");
  deathScreen.classList.add("is-visible");
  fearOverlay.classList.remove("is-visible");
  controls.unlock();
  stopRunningSound();
  stopHeartbeatSound();
  void deathSoundReady.then(playDeathSound);
  keyInput.clear();
  matryoshkaMobs.forEach((mob) => {
    mob.velocity.set(0, 0, 0);
    mob.route = [];
  });
}

function exitApplication(): void {
  if (window.electronAPI) {
    window.electronAPI.quit();
    return;
  }
  window.close();
}

function returnToEpisodeSelect(): void {
  if (controls.isLocked) controls.unlock();
  stopHeartbeatSound();
  gameState.currentEpisode = setStoredEpisodeId("parking-lot");
  sessionStorage.setItem("escape-return-to-episode-select", "true");
  window.location.reload();
}

function updatePlayerStamina(delta: number): void {
  const nextStamina = tickPlayerStaminaRuntime({
    delta,
    isGrounded,
    controls,
    keys,
    trueCarEntered,
    startScreen,
    weaponReloading,
    playerStamina: gameState.playerStamina,
    playerSprintActive: gameState.playerSprintActive,
    staminaBarFill,
  });
  gameState.playerStamina = nextStamina.playerStamina;
  gameState.playerSprintActive = nextStamina.playerSprintActive;
}

function restartCurrentEpisode(): void {
  const currentEpisode = getStoredEpisodeId();
  gameState.currentEpisode = currentEpisode;
  gameState.episodeEntryLoading = false;
  range.classList.remove("is-loading", "is-enter-loading");
  gameState.playerDeathActive = false;
  gameState.playerDeathElapsed = 0;
  deathOverlay.classList.remove("is-visible");
  deathScreen.classList.remove("is-visible");
  episodeFadeOverlay.classList.remove("is-fading");
  episodeFadeOverlay.classList.remove("is-complete");
  controls.unlock();
  keyInput.clear();
  stopAutomaticFire();
  stopRunningSound();
  stopHeartbeatSound();
  setAiming(false);
  resetRecoilState();
  verticalVelocity = 0;
  isGrounded = false;
  jumpMomentumActive = false;
  cancelWeaponReload();
  gameState.weaponAmmo = 0;
  weapon.visible = false;
  gameState.weaponDrawn = false;
  gameState.weaponHolstering = false;
  gameState.weaponRaising = false;
  gsap.killTweensOf(weapon.position);
  gsap.killTweensOf(weapon.rotation);
  gameState.playerStamina = playerMaxStamina;
  gameState.playerSprintActive = false;
  gameState.playerSprintAcceleration = 0;
  keyPickupCollected = false;
  gameState.weaponPickupCollected = false;
  if (keyPickupObject) keyPickupObject.visible = true;
  if (weaponPickupObject) weaponPickupObject.visible = true;
  trueCarEntered = false;
  trueCarSoundPlaying = false;
  classroomSeatActive = false;
  classroomStudentKnockdownUntil.clear();
  classroomDeadStudents.clear();
  classroomStudentsAlerted = false;
  classroomTeacherTurned = false;
  classroomTeacherTurnUntil = -Infinity;
  classroomTeacherNextTurnAt = -Infinity;
  classroomTeacherTurnPendingAt = -Infinity;
  classroomTeacherStudentTurnAt = -Infinity;
  classroomBellNextAt = -Infinity;
  classroomBellPlaying = false;
  classroomDeferredReloadSoundUntil = -Infinity;
  if (classroomBellSource) {
    classroomBellSource.stop();
    classroomBellSource.disconnect();
    classroomBellSource = null;
  }
  classroomTeacherReturning = false;
  classroomTeacherReturnStartedAt = -Infinity;
  classroomContactDeathPending = false;
  classroomContactDeathAt = -Infinity;
  classroomTeacherStudentTurnAt = -Infinity;
  if (classroomTeacher) {
    gsap.killTweensOf(classroomTeacher.object.rotation);
    gsap.killTweensOf(classroomTeacher.object.quaternion);
    classroomTeacher.object.quaternion.copy(classroomTeacher.initialQuaternion);
  }
  classroomStudents.forEach((student) => {
    gsap.killTweensOf(student.rotation);
    gsap.killTweensOf(student.quaternion);
    student.quaternion.copy(
      classroomStudentInitialRotations.get(student) ?? student.quaternion,
    );
  });
  if (trueCar) trueCar.visible = true;
  keyEspObjects.forEach((outline) => {
    outline.visible = keyEspSetting.checked;
  });
  for (let index = matryoshkaMobs.length - 1; index >= 0; index -= 1) {
    const mob = matryoshkaMobs[index];
    if (mob.isClone) {
      physicsWorld.removeRigidBody(mob.physicsBody);
      scene.remove(mob.object, mob.visionIndicator, mob.hitboxHelper);
      mob.visionIndicator.geometry.dispose();
      (mob.visionIndicator.material as THREE.Material).dispose();
      mob.hitboxHelper.geometry.dispose();
      (mob.hitboxHelper.material as THREE.Material).dispose();
      matryoshkaMobs.splice(index, 1);
      continue;
    }
    mob.object.position.copy(mob.initialPosition);
    mob.object.quaternion.copy(mob.initialQuaternion);
    mob.object.updateMatrixWorld(true);
    mob.physicsBody.setTranslation(
      {
        x: mob.initialPosition.x,
        y: mob.initialPosition.y + mob.physicsOffsetY,
        z: mob.initialPosition.z,
      },
      true,
    );
    mob.physicsBody.setRotation(
      {
        x: mob.initialQuaternion.x,
        y: mob.initialQuaternion.y,
        z: mob.initialQuaternion.z,
        w: mob.initialQuaternion.w,
      },
      true,
    );
    mob.state = "wander";
    mob.soundSource = "player";
    mob.route = [];
    mob.pathRefreshAt = 0;
    mob.knockedDownAt = 0;
    mob.playerVisible = false;
    mob.velocity.set(0, 0, 0);
    mob.physicsBody.setGravityScale(0, true);
    mob.physicsBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    chooseMatryoshkaTarget(mob);
  }
  gameState.isInChess = currentEpisode === "chess";
  gameState.isInClassroom = currentEpisode === "classroom";
  if (gameState.isInClassroom) {
    camera.position.copy(classroomSpawnPosition);
    camera.lookAt(classroomEntryPosition);
  } else if (gameState.isInChess) {
    camera.position.copy(chessSpawnPosition);
    camera.lookAt(chessEntryPosition);
  } else {
    camera.position.set(0, playerHeight, 5);
    camera.rotation.set(0, 0, 0);
  }
  camera.updateMatrixWorld(true);
  startEpisode(currentEpisode, {
    parkingLotRoot,
    classroomRoot,
    chessRoot,
    parkedCars,
    camera,
    classroomSpawnPosition,
    classroomEntryPosition,
    chessSpawnPosition,
    chessEntryPosition,
    closeMenu,
    lockPointer,
    gunshotAudioContext,
    heartbeatSoundReady,
    playHeartbeatSound,
  });
  if (gameState.isInClassroom) sitAtClassroomSeat(true);
  syncEpisodeOnlyObjects();
}

deathRetryButton.addEventListener("click", restartCurrentEpisode);
deathExitButton.addEventListener("click", returnToEpisodeSelect);

function getMatryoshkaGroundHit(
  x: number,
  z: number,
  maxGroundY = Infinity,
): THREE.Intersection | undefined {
  if (!parkingBounds || !parkingLotRoot) return undefined;
  parkingGroundRaycaster.set(
    new THREE.Vector3(x, parkingBounds.max.y + 10, z),
    new THREE.Vector3(0, -1, 0),
  );
  return parkingGroundRaycaster
    .intersectObject(parkingLotRoot, true)
    .find((intersection) => {
      if (
        intersection.point.y < parkingBounds!.min.y - 0.25 ||
        intersection.point.y > maxGroundY
      )
        return false;
      return Boolean(
        intersection.face &&
        intersection.face.normal
          .clone()
          .transformDirection(intersection.object.matrixWorld).y > 0.08,
      );
    });
}

function isMatryoshkaWaypointValid(x: number, z: number): boolean {
  if (
    !parkingBounds ||
    !parkingLotRoot ||
    overlapsMatryoshkaVehicleObstacle(x, z, matryoshkaObstaclePadding)
  )
    return false;
  const hit = getMatryoshkaGroundHit(x, z);
  return Boolean(
    hit?.face &&
    hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y > 0.08,
  );
}

function rebuildMatryoshkaWaypoints(): void {
  if (!parkingBounds) return;
  matryoshkaWaypoints.length = 0;
  const validatedPatrolWaypoints = matryoshkaPatrolWaypoints
    .map((waypoint) => {
      const ground = getMatryoshkaGroundHit(
        waypoint.x,
        waypoint.z,
        waypoint.y + 2.5,
      );
      return ground
        ? new THREE.Vector3(waypoint.x, ground.point.y + 0.02, waypoint.z)
        : null;
    })
    .filter((waypoint): waypoint is THREE.Vector3 => waypoint !== null);
  matryoshkaWaypoints.push(...validatedPatrolWaypoints);
  const rampStart = validatedPatrolWaypoints[1];
  const rampEnd = validatedPatrolWaypoints[validatedPatrolWaypoints.length - 1];
  if (rampStart && rampEnd && rampStart.distanceTo(rampEnd) > 4) {
    const rampSteps = Math.ceil(rampStart.distanceTo(rampEnd) / 3);
    for (let step = 1; step < rampSteps; step += 1) {
      const progress = step / rampSteps;
      const x = THREE.MathUtils.lerp(rampStart.x, rampEnd.x, progress);
      const z = THREE.MathUtils.lerp(rampStart.z, rampEnd.z, progress);
      const expectedY = THREE.MathUtils.lerp(rampStart.y, rampEnd.y, progress);
      const ground = getMatryoshkaGroundHit(x, z, expectedY + 2.5);
      if (
        !ground ||
        overlapsMatryoshkaVehicleObstacle(x, z, matryoshkaObstaclePadding)
      )
        continue;
      matryoshkaWaypoints.push(new THREE.Vector3(x, ground.point.y + 0.02, z));
    }
  }
  matryoshkaRecoveryWaypoints.length = 0;
  syncMatryoshkaWaypointMarkers();
}

function getMatryoshkaWaypointNetwork(
  network: MatryoshkaWaypointNetwork,
): THREE.Vector3[] {
  return network === "yellow"
    ? matryoshkaWaypoints
    : matryoshkaRecoveryWaypoints;
}

function syncMatryoshkaWaypointMarkers(): void {
  matryoshkaWaypointMarkers.forEach((marker) => scene.remove(marker));
  matryoshkaWaypointMarkers.length = 0;
  matryoshkaRecoveryWaypointMarkers.forEach((marker) => scene.remove(marker));
  matryoshkaRecoveryWaypointMarkers.length = 0;
}

function _addMatryoshkaRowCorridorWaypoints(
  firstRowX: number,
  reversedRowX: number,
  startZ: number,
  endZ: number,
): void {
  const corridorX = (firstRowX + reversedRowX) * 0.5;
  const corridorOffsets = [0, -0.9, 0.9, -1.8, 1.8];
  const corridorStep = 2.5;
  for (
    let z = Math.min(startZ, endZ);
    z <= Math.max(startZ, endZ);
    z += corridorStep
  ) {
    let placed = false;
    for (const offset of corridorOffsets) {
      const x = corridorX + offset;
      if (!isMatryoshkaWaypointValid(x, z)) continue;
      const hit = getMatryoshkaGroundHit(x, z);
      if (!hit) continue;
      const waypoint = new THREE.Vector3(x, hit.point.y, z);
      if (
        !matryoshkaWaypoints.some(
          (existing) => existing.distanceToSquared(waypoint) < 1,
        )
      )
        matryoshkaWaypoints.push(waypoint);
      placed = true;
      break;
    }
    if (!placed)
      console.warn(`Matryoshka corridor waypoint skipped at z=${z.toFixed(1)}`);
  }
}

function _getMatryoshkaFreeRoamTarget(
  origin: THREE.Vector3,
): THREE.Vector3 | null {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (!parkingBounds || !parkingLotRoot) return null;
    const x = THREE.MathUtils.randFloat(
      parkingBounds.min.x + 1.5,
      parkingBounds.max.x - 1.5,
    );
    const z = THREE.MathUtils.randFloat(
      parkingBounds.min.z + 1.5,
      parkingBounds.max.z - 1.5,
    );
    if (overlapsMatryoshkaVehicleObstacle(x, z, matryoshkaObstaclePadding))
      continue;
    const hit = getMatryoshkaGroundHit(x, z, origin.y + 2.5);
    const candidate = hit ? new THREE.Vector3(x, hit.point.y + 0.02, z) : null;
    if (
      candidate &&
      candidate.distanceTo(origin) >= matryoshkaMinWanderDistance
    )
      return candidate;
  }
  return null;
}

function addMapPointFromAim(): void {
  const activeRoot = gameState.isInClassroom
    ? classroomRoot
    : gameState.isInChess
      ? chessRoot
      : parkingLotRoot;
  const activeBounds = gameState.isInClassroom
    ? classroomBounds
    : gameState.isInChess
      ? chessBounds
      : parkingBounds;
  if (!activeRoot || !activeBounds) return;
  camera.updateMatrixWorld(true);
  camera.getWorldDirection(matryoshkaMoveDirection);
  parkingGroundRaycaster.set(camera.position, matryoshkaMoveDirection);
  parkingGroundRaycaster.far = 600;
  const hit = parkingGroundRaycaster
    .intersectObject(activeRoot, true)
    .find(
      (intersection) =>
        intersection.point.y >= activeBounds!.min.y - 0.25 &&
        isCollisionSurface(intersection.object),
    );
  if (!hit || !hit.face) return;
  const floorNormal = hit.face.normal
    .clone()
    .transformDirection(hit.object.matrixWorld);
  if (floorNormal.y <= 0.2) return;
  const mapPoint = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 8),
    new THREE.MeshBasicMaterial({
      color: "#57e6ff",
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      fog: false,
    }),
  );
  mapPoint.position.copy(hit.point);
  mapPoint.position.y += 0.18;
  mapPoint.renderOrder = 1100;
  scene.add(mapPoint);
  mapPointMarkers.push(mapPoint);
  console.log("[Map point]", {
    x: Number(hit.point.x.toFixed(3)),
    y: Number(hit.point.y.toFixed(3)),
    z: Number(hit.point.z.toFixed(3)),
  });
}

let mapPointPointerDownHandled = false;

function turnClassroomTeacherTowardPlayer(now: number): void {
  if (!classroomTeacher || classroomTeacher.knockedDownAt > 0) return;
  classroomTeacherTurnPendingAt = -Infinity;
  classroomTeacher.object.quaternion.copy(classroomTeacher.initialQuaternion);
  classroomTeacher.object.rotateY(Math.PI);
  classroomTeacherTurned = true;
  classroomTeacherTurnUntil =
    now +
    classroomTeacherLookDurationMin +
    Math.random() *
      (classroomTeacherLookDurationMax - classroomTeacherLookDurationMin);
}

function scheduleClassroomTeacherTurn(now: number): void {
  if (!classroomTeacher || classroomTeacherTurned) return;
  classroomTeacherTurnPendingAt = now + 0.5;
}

function alertClassroomStudents(now: number): void {
  const hasStandingStudents = classroomStudents.some(
    (student) => !classroomDeadStudents.has(student),
  );
  if (!hasStandingStudents) {
    classroomStudentsAlerted = false;
    classroomTeacherStudentTurnAt = -Infinity;
    return;
  }
  if (classroomStudentsAlerted) return;
  classroomStudentsAlerted = true;
  classroomTeacherStudentTurnAt = now + 3;
}

function alertMatryoshkasToSound(
  position: THREE.Vector3,
  source: MatryoshkaSoundSource = "player",
  interruptChase = false,
  deferUntilBellEnds = 0,
): void {
  if (gameState.isInClassroom && source === "player" && classroomBellPlaying) {
    if (deferUntilBellEnds > performance.now() / 1000) {
      classroomDeferredReloadSoundPosition.copy(position);
      classroomDeferredReloadSoundUntil = deferUntilBellEnds;
    }
    return;
  }
  const soundTarget =
    source === "player" ? matryoshkaSoundTarget : matryoshkaCarSoundTarget;
  if (source === "player") matryoshkaSoundVersion += 1;
  else matryoshkaCarSoundVersion += 1;
  soundTarget.copy(position);

  const currentSoundVersion =
    source === "player" ? matryoshkaSoundVersion : matryoshkaCarSoundVersion;

  if (source === "player")
    scheduleClassroomTeacherTurn(performance.now() / 1000);

  matryoshkaMobs.forEach((mob) => {
    if (mob.state === "chase" && !interruptChase) return;

    mob.state = "investigate";
    mob.soundSource = source;
    mob.investigationPhase = "yellow";
    mob.heardSoundVersion = currentSoundVersion;
    mob.route = [];
    mob.pathRefreshAt = 0;

    if (source === "player") matryoshkaSoundTarget.copy(position);
    else matryoshkaCarSoundTarget.copy(position);
  });
}

function isMatryoshkaPathClear(
  start: THREE.Vector3,
  end: THREE.Vector3,
  padding = matryoshkaObstaclePadding,
): boolean {
  const minX = Math.min(start.x, end.x) - padding;
  const maxX = Math.max(start.x, end.x) + padding;
  const minZ = Math.min(start.z, end.z) - padding;
  const maxZ = Math.max(start.z, end.z) + padding;
  const directionX = end.x - start.x;
  const directionZ = end.z - start.z;
  for (const obstacle of matryoshkaVehicleObstacles) {
    if (
      obstacle.max.x < minX ||
      obstacle.min.x > maxX ||
      obstacle.max.z < minZ ||
      obstacle.min.z > maxZ
    )
      continue;
    const expandedMinX = obstacle.min.x - padding;
    const expandedMaxX = obstacle.max.x + padding;
    const expandedMinZ = obstacle.min.z - padding;
    const expandedMaxZ = obstacle.max.z + padding;
    const tx1 =
      directionX === 0
        ? start.x >= expandedMinX && start.x <= expandedMaxX
          ? -Infinity
          : Infinity
        : (expandedMinX - start.x) / directionX;
    const tx2 =
      directionX === 0
        ? start.x >= expandedMinX && start.x <= expandedMaxX
          ? Infinity
          : -Infinity
        : (expandedMaxX - start.x) / directionX;
    const tz1 =
      directionZ === 0
        ? start.z >= expandedMinZ && start.z <= expandedMaxZ
          ? -Infinity
          : Infinity
        : (expandedMinZ - start.z) / directionZ;
    const tz2 =
      directionZ === 0
        ? start.z >= expandedMinZ && start.z <= expandedMaxZ
          ? Infinity
          : -Infinity
        : (expandedMaxZ - start.z) / directionZ;
    if (
      Math.max(Math.min(tx1, tx2), Math.min(tz1, tz2), 0) <=
      Math.min(Math.max(tx1, tx2), Math.max(tz1, tz2), 1)
    )
      return false;
  }
  return true;
}

function getMatryoshkaRouteOverlapScore(
  mob: MatryoshkaMob,
  route: THREE.Vector3[],
): number {
  let overlapScore = 0;
  for (const otherMob of matryoshkaMobs) {
    if (
      otherMob === mob ||
      otherMob.knockedDownAt > 0 ||
      otherMob.route.length === 0
    )
      continue;
    for (const point of route) {
      for (const otherPoint of otherMob.route) {
        if (point.distanceToSquared(otherPoint) < 25) overlapScore += 1;
      }
    }
  }
  return overlapScore;
}

function _findMatryoshkaNonOverlappingRoute(
  mob: MatryoshkaMob,
  start: THREE.Vector3,
  end: THREE.Vector3,
  network: MatryoshkaWaypointNetwork = "yellow",
): THREE.Vector3[] {
  const candidateRoutes: THREE.Vector3[][] = [];
  const waypoints = getMatryoshkaWaypointNetwork(network);
  for (const waypoint of waypoints) {
    if (
      waypoint.distanceToSquared(start) < 64 ||
      waypoint.distanceToSquared(end) < 64
    )
      continue;
    const routeToWaypoint = findRoute(
      start,
      waypoint,
      waypoints,
      isMatryoshkaPathClear,
    );
    const routeFromWaypoint = findRoute(
      waypoint,
      end,
      waypoints,
      isMatryoshkaPathClear,
    );
    if (routeToWaypoint.length === 0 || routeFromWaypoint.length === 0)
      continue;
    candidateRoutes.push([...routeToWaypoint, ...routeFromWaypoint.slice(1)]);
  }
  candidateRoutes.sort((first, second) => {
    const overlapDifference =
      getMatryoshkaRouteOverlapScore(mob, first) -
      getMatryoshkaRouteOverlapScore(mob, second);
    return (
      overlapDifference ||
      getRouteDistance(start, first) - getRouteDistance(start, second)
    );
  });
  return (
    candidateRoutes[0] ??
    findRoute(start, end, waypoints, isMatryoshkaPathClear)
  );
}

function _findMatryoshkaRecoveryRoute(start: THREE.Vector3): THREE.Vector3[] {
  const recoveryCandidates = matryoshkaWaypoints
    .filter((waypoint) => waypoint.distanceToSquared(start) > 36)
    .sort(
      (first, second) =>
        first.distanceToSquared(start) - second.distanceToSquared(start),
    );
  const destination = findNearestWaypoint(
    start,
    recoveryCandidates,
    isMatryoshkaPathClear,
  );
  if (!destination) return [];
  const recoveryGraph = [
    ...matryoshkaRecoveryWaypoints,
    ...matryoshkaWaypoints,
  ];
  return findRoute(start, destination, recoveryGraph, isMatryoshkaPathClear);
}

function findMatryoshkaOpenDirection(
  mob: MatryoshkaMob,
  origin: THREE.Vector3,
): THREE.Vector3 | null {
  const desired = matryoshkaMoveDirection.subVectors(mob.target, origin);
  desired.y = 0;
  if (desired.lengthSq() < 0.01) desired.set(0, 0, 1);
  desired.normalize();
  let bestTarget: THREE.Vector3 | null = null;
  let bestScore = -Infinity;
  const probeDistance = 3.5;
  for (let index = 0; index < 8; index += 1) {
    const _angle = (index / 8) * Math.PI * 2;
    const direction = new THREE.Vector3(Math.cos(_angle), 0, Math.sin(_angle));
    const x = origin.x + direction.x * probeDistance;
    const z = origin.z + direction.z * probeDistance;
    if (overlapsMatryoshkaVehicleObstacle(x, z, matryoshkaObstaclePadding))
      continue;
    const ground = getMatryoshkaGroundHit(x, z);
    if (!ground) continue;
    const score = direction.dot(desired) * 4 + ground.point.y * 0.01;
    if (score <= bestScore) continue;
    bestScore = score;
    bestTarget = new THREE.Vector3(x, ground.point.y, z);
  }
  return bestTarget;
}

function getMatryoshkaSpawnPosition(): THREE.Vector3 | null {
  const randomSpawn = getRandomKeySpawnPosition();
  if (randomSpawn) return randomSpawn;
  if (!parkingBounds || !parkingLotRoot) return null;

  const bounds = parkingBounds;
  for (let x = bounds.min.x + 3; x <= bounds.max.x - 3; x += 3) {
    for (let z = bounds.min.z + 3; z <= bounds.max.z - 3; z += 3) {
      if (!isMatryoshkaWaypointValid(x, z)) continue;
      const hit = getMatryoshkaGroundHit(x, z);
      if (hit) return new THREE.Vector3(x, hit.point.y + 0.02, z);
    }
  }
  return null;
}

function getMatryoshkaRampSpawnPosition(): THREE.Vector3 | null {
  if (!parkingBounds || !parkingLotRoot) return null;
  const bounds = parkingBounds;
  let bestPosition: THREE.Vector3 | null = null;
  let bestSlope = 0;
  const sample = new THREE.Vector3();
  const neighbor = new THREE.Vector3();
  const sampleGround = (x: number, z: number): THREE.Vector3 | null => {
    if (!isMatryoshkaWaypointValid(x, z)) return null;
    const hit = getMatryoshkaGroundHit(x, z);
    return hit ? new THREE.Vector3(x, hit.point.y, z) : null;
  };

  for (let x = bounds.min.x + 4; x <= bounds.max.x - 4; x += 3) {
    for (let z = bounds.min.z + 4; z <= bounds.max.z - 4; z += 3) {
      const center = sampleGround(x, z);
      if (!center) continue;
      let slope = 0;
      for (const [offsetX, offsetZ] of [
        [3, 0],
        [-3, 0],
        [0, 3],
        [0, -3],
      ]) {
        neighbor.copy(center);
        neighbor.x += offsetX;
        neighbor.z += offsetZ;
        sample.copy(neighbor);
        const neighborGround = sampleGround(sample.x, sample.z);
        if (neighborGround)
          slope = Math.max(slope, Math.abs(center.y - neighborGround.y));
      }
      if (slope > bestSlope) {
        bestSlope = slope;
        bestPosition = center;
      }
    }
  }
  return bestPosition ? bestPosition.add(new THREE.Vector3(0, 0.02, 0)) : null;
}

function matryoshkaHasLineOfSight(
  mob: THREE.Object3D,
  player: THREE.Vector3,
): boolean {
  mob.getWorldPosition(matryoshkaMobPosition);
  matryoshkaMobGroundPosition.copy(matryoshkaMobPosition);
  matryoshkaMobPosition.y += matryoshkaEyeHeight;
  matryoshkaPlayerPosition.copy(player);
  matryoshkaPlayerPosition.y += 1.2;
  matryoshkaToPlayer.subVectors(
    matryoshkaPlayerPosition,
    matryoshkaMobPosition,
  );
  const distance = matryoshkaToPlayer.length();
  if (distance <= 0.01) return true;
  matryoshkaRaycaster.set(
    matryoshkaMobPosition,
    matryoshkaToPlayer.normalize(),
  );
  matryoshkaRaycaster.far = distance;
  if (
    parkingLotRoot &&
    matryoshkaRaycaster.intersectObject(parkingLotRoot, true).length > 0
  )
    return false;
  return isMatryoshkaPathClear(
    matryoshkaMobGroundPosition,
    player,
    matryoshkaObstaclePadding,
  );
}

function _getMatryoshkaSeparatedTarget(
  mob: MatryoshkaMob,
  destination: THREE.Vector3,
): THREE.Vector3 {
  const approachDirection = new THREE.Vector3(
    destination.x - matryoshkaMobPosition.x,
    0,
    destination.z - matryoshkaMobPosition.z,
  );
  if (approachDirection.lengthSq() < 0.01) approachDirection.set(1, 0, 0);
  approachDirection.normalize();
  return destination
    .clone()
    .add(
      new THREE.Vector3(
        -approachDirection.z,
        0,
        approachDirection.x,
      ).multiplyScalar(mob.routeSide * 3),
    );
}

function isMatryoshkaPatrolDestinationAvailable(
  mob: MatryoshkaMob,
  destination: THREE.Vector3,
): boolean {
  return !matryoshkaMobs.some(
    (otherMob) =>
      otherMob !== mob &&
      otherMob.state === "wander" &&
      otherMob.patrolDestination &&
      otherMob.patrolDestination.distanceToSquared(destination) < 144,
  );
}

function isMatryoshkaWallPathBlocked(
  start: THREE.Vector3,
  end: THREE.Vector3,
): boolean {
  if (!parkingLotRoot) return false;
  const direction = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const distance = direction.length();
  if (distance < 0.01) return false;
  direction.normalize();
  for (const height of [0.8, 1.8, 2.8]) {
    parkingWallRaycaster.set(
      new THREE.Vector3(start.x, start.y + height, start.z),
      direction,
    );
    parkingWallRaycaster.far = distance - 0.25;
    if (parkingWallRaycaster.intersectObject(parkingLotRoot, true).length > 0)
      return true;
  }
  return false;
}

function chooseMatryoshkaTarget(mob: MatryoshkaMob): void {
  chooseMatryoshkaMobTarget({
    mob,
    waypoints: matryoshkaWaypoints,
    positionScratch: matryoshkaMobPosition,
    playerSoundTarget: matryoshkaSoundTarget,
    carSoundTarget: matryoshkaCarSoundTarget,
    playerSoundVersion: matryoshkaSoundVersion,
    carSoundVersion: matryoshkaCarSoundVersion,
    isDestinationAvailable: isMatryoshkaPatrolDestinationAvailable,
    isWallPathBlocked: isMatryoshkaWallPathBlocked,
  });
}

function ensureMatryoshkaWanderMovement(mob: MatryoshkaMob): void {
  ensureMatryoshkaMobWanderMovement({
    mob,
    waypoints: matryoshkaWaypoints,
    positionScratch: matryoshkaMobPosition,
    isDestinationAvailable: isMatryoshkaPatrolDestinationAvailable,
    isWallPathBlocked: isMatryoshkaWallPathBlocked,
  });
}

function knockDownMatryoshkaMob(
  mob: MatryoshkaMob,
  now: number,
  impactDirection?: THREE.Vector3,
): void {
  knockDownMatryoshkaMobRuntime(mob, now, gravityMultiplier, impactDirection);
}

function createParkingLotMatryoshkaClone(sourceMob: MatryoshkaMob): void {
  const spawnPosition = findParkingLotClonePosition({
    source: sourceMob.object,
    existing: matryoshkaMobs.map((mob) => mob.object),
    overlapsVehicle: (x, z) =>
      overlapsMatryoshkaVehicleObstacle(x, z, matryoshkaObstaclePadding),
    getGround: getMatryoshkaGroundHit,
  });
  createMatryoshkaCloneObject(sourceMob, spawnPosition, false);
}

function createClassroomTeacherClone(sourceMob: MatryoshkaMob): void {
  sourceMob.object.updateMatrixWorld(true);
  const sourcePosition = sourceMob.object.getWorldPosition(new THREE.Vector3());
  const sourceFloorY = new THREE.Box3().setFromObject(sourceMob.object).min.y;
  const spawnPosition = findClassroomTeacherClonePosition({
    sourcePosition,
    floorY: sourceFloorY,
    bounds: classroomBounds,
    existingPositions: matryoshkaMobs.map((mob) =>
      mob.object.getWorldPosition(new THREE.Vector3()),
    ),
    routeSide: sourceMob.routeSide,
  });
  createMatryoshkaCloneObject(sourceMob, spawnPosition, true);
}

function createMatryoshkaCloneObject(
  sourceMob: MatryoshkaMob,
  spawnPosition: THREE.Vector3,
  classroomOnly: boolean,
): void {
  const cloneObject = sourceMob.object.clone(true);
  cloneObject.scale.multiplyScalar(0.8);
  cloneObject.rotation.set(0, sourceMob.object.rotation.y, 0);
  cloneObject.visible = true;
  cloneObject.traverse((object) => {
    object.visible = true;
  });
  cloneObject.position.set(spawnPosition.x, 0, spawnPosition.z);
  cloneObject.updateMatrixWorld(true);
  const cloneBounds = new THREE.Box3().setFromObject(cloneObject);
  cloneObject.position.y = spawnPosition.y - cloneBounds.min.y;
  cloneObject.updateMatrixWorld(true);
  const clonePhysics = createMatryoshkaPhysicsBody(cloneObject);
  const hitbox = new THREE.Box3().setFromObject(cloneObject);
  const hitboxBounds = hitbox
    .clone()
    .applyMatrix4(cloneObject.matrixWorld.clone().invert());
  const hitboxHelper = new THREE.Box3Helper(hitbox, "#ff00ff");
  hitboxHelper.visible = matryoshkaHitboxSetting.checked;
  hitboxHelper.renderOrder = 1006;
  const visionPoints = Array.from({ length: 160 }, (_, index) => {
    const angle = (index / 160) * Math.PI * 2;
    return new THREE.Vector3(
      Math.cos(angle) * matryoshkaDetectionRange,
      0,
      Math.sin(angle) * matryoshkaDetectionRange,
    );
  });
  const visionIndicator = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(visionPoints),
    new THREE.LineBasicMaterial({
      color: "#ff2020",
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
    }),
  );
  visionIndicator.renderOrder = 1005;
  visionIndicator.frustumCulled = false;
  visionIndicator.visible = matryoshkaVisionSetting.checked;
  scene.add(cloneObject, visionIndicator, hitboxHelper);
  const cloneMob: MatryoshkaMob = {
    object: cloneObject,
    state: sourceMob.state,
    soundSource: sourceMob.soundSource,
    classroomOnly,
    isClone: true,
    cooldownScale: classroomOnly ? 1 / 1.5 : 1,
    classroomTurned: false,
    classroomTurnUntil: -Infinity,
    classroomNextTurnAt:
      performance.now() / 1000 +
      classroomTeacherTurnDelayMin * (classroomOnly ? 1 / 1.5 : 1),
    patrolDestination: null,
    physicsBody: clonePhysics.body,
    physicsOffsetY: clonePhysics.offsetY,
    target: sourceMob.target.clone(),
    velocity: new THREE.Vector3(),
    stationaryTime: 0,
    slideDirection: new THREE.Vector3(),
    slideDirectionUntil: 0,
    knockedDownAt: 0,
    knockdownBaseY: cloneObject.position.y,
    routeSide: -sourceMob.routeSide,
    chaseNetwork: sourceMob.chaseNetwork === "blue" ? "yellow" : "blue",
    investigationPhase: "yellow",
    lastSeenPlayerPosition: sourceMob.lastSeenPlayerPosition.clone(),
    pathRefreshAt: 0,
    route: [],
    visionIndicator,
    hitboxHelper,
    hitboxBounds,
    initialPosition: cloneObject.position.clone(),
    initialQuaternion: cloneObject.quaternion.clone(),
    heardSoundVersion: sourceMob.heardSoundVersion,
    visibilityCheckAt: 0,
    playerVisible: false,
  };
  matryoshkaMobs.push(cloneMob);
  chooseMatryoshkaTarget(cloneMob);
}

function recoverMatryoshkaMob(mob: MatryoshkaMob): void {
  if (!mob.classroomOnly) syncMatryoshkaFromPhysics(mob);
  mob.physicsBody.setGravityScale(0, true);
  mob.physicsBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  mob.physicsBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  mob.knockedDownAt = 0;
  if (mob.classroomOnly) {
    mob.object.position.copy(mob.initialPosition);
    mob.object.quaternion.copy(mob.initialQuaternion);
  } else {
    mob.object.rotation.x = 0;
    mob.object.rotation.z = 0;
    mob.object.position.y = mob.knockdownBaseY;
  }
  mob.object.updateMatrixWorld(true);
  const uprightQuaternion = mob.object.quaternion.clone();
  mob.physicsBody.setTranslation(
    {
      x: mob.object.position.x,
      y: mob.object.position.y + mob.physicsOffsetY,
      z: mob.object.position.z,
    },
    true,
  );
  mob.physicsBody.setRotation(
    {
      x: uprightQuaternion.x,
      y: uprightQuaternion.y,
      z: uprightQuaternion.z,
      w: uprightQuaternion.w,
    },
    true,
  );
  mob.stationaryTime = 0;
  mob.pathRefreshAt = 0;
  mob.classroomTurned = false;
  mob.classroomTurnUntil = -Infinity;
  mob.classroomNextTurnAt =
    performance.now() / 1000 + classroomTeacherTurnDelayMin * mob.cooldownScale;
  if (mob.classroomOnly) createClassroomTeacherClone(mob);
  else createParkingLotMatryoshkaClone(mob);
  chooseMatryoshkaTarget(mob);
}

function updateClassroomTeacherClone(mob: MatryoshkaMob, now: number): void {
  updateClassroomTeacherCloneTurn({
    teacher: mob,
    now,
    turnDelayMin: classroomTeacherTurnDelayMin,
    turnDelayMax: classroomTeacherTurnDelayMax,
    lookDurationMin: classroomTeacherLookDurationMin,
    lookDurationMax: classroomTeacherLookDurationMax,
  });
}

function checkClassroomTeacherDanger(
  teacher: MatryoshkaMob,
  turned: boolean,
  now: number,
): void {
  if (!turned || gameState.playerDeathActive || classroomContactDeathPending)
    return;
  const teacherWorldPosition = teacher.object.getWorldPosition(
    new THREE.Vector3(),
  );
  const cameraToTeacher = teacherWorldPosition
    .clone()
    .sub(camera.position)
    .normalize();
  const playerForward = camera.getWorldDirection(new THREE.Vector3());
  const teacherScreenPosition = teacherWorldPosition.clone().project(camera);
  const teacherIsOnScreen =
    teacherScreenPosition.z >= 0 &&
    teacherScreenPosition.z <= 1 &&
    Math.abs(teacherScreenPosition.x) <= 1 &&
    Math.abs(teacherScreenPosition.y) <= 1;
  const playerIsLookingAtTeacher =
    teacherIsOnScreen &&
    playerForward.dot(cameraToTeacher) >=
      Math.cos(THREE.MathUtils.degToRad(45));
  if (
    gameState.weaponDrawn ||
    !classroomSeatActive ||
    !playerIsLookingAtTeacher
  )
    triggerClassroomDangerDeath(teacher, now);
}

function updateClassroomTeacher(now: number): void {
  if (
    teacherAiSetting.checked ||
    !classroomTeacher ||
    classroomTeacher.knockedDownAt > 0
  )
    return;
  if (classroomTeacherReturning) {
    const returnProgress = THREE.MathUtils.clamp(
      (now - classroomTeacherReturnStartedAt) / classroomTeacherReturnDuration,
      0,
      1,
    );
    classroomTeacher.object.quaternion
      .copy(classroomTeacherReturnQuaternion)
      .slerp(classroomTeacher.initialQuaternion, returnProgress);
    if (returnProgress >= 1) {
      classroomTeacherReturning = false;
      classroomStudentsAlerted = false;
      classroomTeacherStudentTurnAt = -Infinity;
      classroomStudents.forEach((student) => {
        if (classroomDeadStudents.has(student)) return;
        const initialRotation = classroomStudentInitialRotations.get(student);
        if (initialRotation) student.quaternion.copy(initialRotation);
      });
      classroomTeacherNextTurnAt =
        now +
        classroomTeacherTurnDelayMin +
        Math.random() *
          (classroomTeacherTurnDelayMax - classroomTeacherTurnDelayMin);
    }
    return;
  }
  if (classroomContactDeathPending) {
    if (now >= classroomContactDeathAt) triggerPlayerDeath();
    return;
  }
  if (
    Number.isFinite(classroomTeacherStudentTurnAt) &&
    now >= classroomTeacherStudentTurnAt
  ) {
    classroomTeacherStudentTurnAt = -Infinity;
    turnClassroomTeacherTowardPlayer(now);
    void chaseSoundReady.then(playChaseSound);
  }
  if (
    Number.isFinite(classroomTeacherTurnPendingAt) &&
    now >= classroomTeacherTurnPendingAt
  ) {
    turnClassroomTeacherTowardPlayer(now);
    void chaseSoundReady.then(playChaseSound);
  }
  if (!Number.isFinite(classroomTeacherNextTurnAt))
    classroomTeacherNextTurnAt =
      now +
      classroomTeacherTurnDelayMin +
      Math.random() *
        (classroomTeacherTurnDelayMax - classroomTeacherTurnDelayMin);

  if (classroomTeacherTurned) {
    if (now >= classroomTeacherTurnUntil) {
      classroomTeacherReturnQuaternion.copy(classroomTeacher.object.quaternion);
      classroomTeacherReturning = true;
      classroomTeacherReturnStartedAt = now;
      classroomTeacherTurned = false;
    }
  } else if (now >= classroomTeacherNextTurnAt) {
    turnClassroomTeacherTowardPlayer(now);
  }

  checkClassroomTeacherDanger(classroomTeacher, classroomTeacherTurned, now);
}

function updateMatryoshkaMobs(now: number, delta: number): void {
  if (gameState.isInChess) {
    parkingLotFearActive = false;
    fearActive = false;
    fearOverlay.classList.remove("is-visible");
    updateHeartbeatPlaybackRate();
    matryoshkaMobs.forEach((mob) => mob.velocity.set(0, 0, 0));
    return;
  }
  if (gameState.isInClassroom) {
    updateClassroomBell(now);
    updateClassroomTeacher(now);
    matryoshkaMobs.forEach((mob) => {
      mob.velocity.set(0, 0, 0);
      if (
        mob.classroomOnly &&
        mob !== classroomTeacher &&
        mob.knockedDownAt <= 0 &&
        classroomTeacher
      ) {
        updateClassroomTeacherClone(mob, now);
        if (!teacherAiSetting.checked)
          checkClassroomTeacherDanger(mob, mob.classroomTurned, now);
      }
      if (mob.knockedDownAt <= 0) return;
      syncMatryoshkaFromPhysics(mob);
      if (now - mob.knockedDownAt >= 3) recoverMatryoshkaMob(mob);
    });
    return;
  }
  if (!parkingLotRoot || matryoshkaWaypoints.length === 0) return;
  if (
    startScreen.classList.contains("is-visible") ||
    settingsOverlay.classList.contains("is-open")
  ) {
    parkingLotFearActive = false;
    fearActive = parkingLotFearActive;
    fearOverlay.classList.remove("is-visible");
    updateHeartbeatPlaybackRate();
    matryoshkaMobs.forEach((mob) => {
      mob.velocity.set(0, 0, 0);
    });
    return;
  }
  if (gameState.playerDeathActive) return;
  parkingLotFearActive = false;
  for (const mob of matryoshkaMobs) {
    if (mob.classroomOnly) continue;
    if (mob.knockedDownAt > 0) syncMatryoshkaFromPhysics(mob);
    mob.object.getWorldPosition(matryoshkaMobPosition);
    if (mob.knockedDownAt > 0) {
      if (now - mob.knockedDownAt >= 3) recoverMatryoshkaMob(mob);
      else continue;
    }
    matryoshkaMovementStart.copy(matryoshkaMobPosition);
    if (mob.hitboxHelper.visible) {
      mob.object.updateMatrixWorld(true);
      matryoshkaFullMobBounds
        .copy(mob.hitboxBounds)
        .applyMatrix4(mob.object.matrixWorld);
      matryoshkaFullMobBounds.getCenter(matryoshkaBoundsCenter);
      matryoshkaFullMobBounds.getSize(matryoshkaBoundsSize).multiplyScalar(0.7);
      mob.hitboxHelper.box.setFromCenterAndSize(
        matryoshkaBoundsCenter,
        matryoshkaBoundsSize,
      );
    }
    mob.hitboxHelper.visible = matryoshkaHitboxSetting.checked;
    mob.visionIndicator.position.set(
      matryoshkaMobPosition.x,
      matryoshkaMobPosition.y + 0.05,
      matryoshkaMobPosition.z,
    );
    if (
      Math.hypot(
        matryoshkaMobPosition.x - camera.position.x,
        matryoshkaMobPosition.z - camera.position.z,
      ) <= 1.35
    ) {
      triggerPlayerDeath();
      return;
    }
    const distanceToPlayer = matryoshkaMobPosition.distanceTo(camera.position);
    const playerInRedRange = distanceToPlayer <= matryoshkaDetectionRange;
    if (now >= mob.visibilityCheckAt) {
      mob.playerVisible =
        playerInRedRange ||
        matryoshkaHasLineOfSight(mob.object, camera.position);
      mob.visibilityCheckAt = now + 0.1 * mob.cooldownScale;
    }
    const playerVisible = playerInRedRange || mob.playerVisible;
    if (playerVisible) mob.lastSeenPlayerPosition.copy(camera.position);
    const currentSoundVersion =
      mob.soundSource === "player"
        ? matryoshkaSoundVersion
        : matryoshkaCarSoundVersion;
    if (playerInRedRange && mob.state !== "chase") {
      mob.state = "chase";
      mob.chaseNetwork = mob.isClone ? "yellow" : "blue";
      mob.route = [camera.position.clone()];
      mob.target.copy(camera.position);
      mob.pathRefreshAt = 0;
      mob.investigationPhase = "blue";
      mob.heardSoundVersion = currentSoundVersion;
      void chaseSoundReady.then(playChaseSound);
    }
    const chaseMemoryActive =
      mob.state === "chase" &&
      !playerVisible &&
      distanceToPlayer <= matryoshkaChaseMemoryDistance;
    const investigationTarget =
      mob.soundSource === "player"
        ? matryoshkaSoundTarget
        : matryoshkaCarSoundTarget;
    if (
      mob.state === "investigate" &&
      mob.investigationPhase === "yellow" &&
      investigationTarget.distanceToSquared(matryoshkaMobPosition) < 324
    ) {
      mob.investigationPhase = "blue";
      mob.route = [];
      mob.pathRefreshAt = 0;
    }
    const reachedSound =
      mob.state === "investigate" &&
      mob.heardSoundVersion === currentSoundVersion &&
      investigationTarget.distanceToSquared(matryoshkaMobPosition) < 16;
    // Visual contact always outranks an older gunshot or footstep target.
    const nextState = determineMatryoshkaMobState({
      playerVisible,
      chaseMemoryActive,
      reachedSound,
      currentState: mob.state,
    });
    const previousState = mob.state;
    if (nextState !== mob.state) {
      if (nextState === "chase") void chaseSoundReady.then(playChaseSound);
      mob.state = nextState;
      if (nextState === "chase")
        mob.chaseNetwork = mob.isClone ? "yellow" : "blue";
      mob.route = [];
      if (nextState === "wander" && previousState !== "wander")
        chooseMatryoshkaTarget(mob);
      if (mob.route.length > 0) mob.target.copy(mob.route[0]);
      mob.pathRefreshAt = 0;
    }
    if (
      nextState === "chase" ||
      (nextState === "investigate" && mob.soundSource === "player")
    )
      parkingLotFearActive = true;
    const targetHorizontalDistanceSquared =
      getMatryoshkaHorizontalDistanceSquared(mob.target, matryoshkaMobPosition);
    if (targetHorizontalDistanceSquared < 4 && mob.route.length > 1) {
      mob.route.shift();
      mob.target.copy(mob.route[0]);
      mob.pathRefreshAt =
        now + matryoshkaPathRefreshInterval * mob.cooldownScale;
    } else if (mob.route.length === 0 || targetHorizontalDistanceSquared < 4) {
      chooseMatryoshkaTarget(mob);
      mob.pathRefreshAt =
        now + matryoshkaPathRefreshInterval * mob.cooldownScale;
    }
    ensureMatryoshkaWanderMovement(mob);
    matryoshkaMoveDirection.subVectors(mob.target, matryoshkaMobPosition);
    matryoshkaMoveDirection.y = 0;
    if (matryoshkaMoveDirection.lengthSq() < 0.01) {
      groundMatryoshkaMob(mob);
      syncMatryoshkaToPhysics(mob);
      continue;
    }
    matryoshkaMoveDirection.normalize();
    const speed =
      (mob.state === "chase" || mob.state === "investigate"
        ? matryoshkaChaseSpeed * 1.2
        : matryoshkaSpeed) * (mob.isClone ? 1.5 : 1);
    mob.velocity.lerp(
      matryoshkaMoveDirection.multiplyScalar(speed),
      1 - Math.exp(-8 * delta),
    );
    moveMatryoshkaWithGroundSteps(mob, delta, now);
    syncMatryoshkaToPhysics(mob);
    mob.object.rotation.y =
      Math.atan2(mob.velocity.x, mob.velocity.z) + matryoshkaModelYawOffset;
    mob.object.getWorldPosition(matryoshkaMobPosition);
    const movedDistance = matryoshkaMobPosition.distanceTo(
      matryoshkaMovementStart,
    );
    if (movedDistance < 0.01 && mob.velocity.lengthSq() > 0.25)
      mob.stationaryTime += delta;
    else mob.stationaryTime = 0;
    if (mob.stationaryTime >= 0.35) {
      const escapeTarget = findMatryoshkaOpenDirection(
        mob,
        matryoshkaMovementStart,
      );
      if (escapeTarget) {
        mob.route = [escapeTarget];
        mob.target.copy(escapeTarget);
      } else {
        mob.route = [];
        chooseMatryoshkaTarget(mob);
      }
      mob.velocity.set(0, 0, 0);
      mob.stationaryTime = 0;
      mob.pathRefreshAt =
        now + matryoshkaPathRefreshInterval * mob.cooldownScale;
    }
  }
  fearActive = parkingLotFearActive;
  fearOverlay.classList.toggle("is-visible", fearActive);
  updateHeartbeatPlaybackRate();
}

const matryoshkaModelUrl = new URL(
  "../assets/matryoshka-doll/matryoshka_doll.glb",
  import.meta.url,
).href;
const matryoshkaModelReady = new Promise<THREE.Object3D>((resolve, reject) => {
  new GLTFLoader().load(
    matryoshkaModelUrl,
    (gltf) => resolve(gltf.scene),
    undefined,
    reject,
  );
});

function spawnMatryoshkaMob(
  requestedSpawn?: THREE.Vector3,
  classroomOnly = false,
): void {
  if ((!parkingBounds || !parkingLotRoot) && !requestedSpawn) return;
  const currentParkingBounds = parkingBounds;
  void matryoshkaModelReady
    .then((model) => {
      const mobObject = model.clone(true);
      mobObject.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(mobObject);
      const size = bounds.getSize(new THREE.Vector3());
      mobObject.scale.setScalar(5 / Math.max(size.y, 0.01));
      if (classroomOnly) mobObject.rotation.y = -Math.PI / 2;
      mobObject.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(mobObject);
      mobObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.visible = true;
          child.castShadow = false;
          child.receiveShadow = false;
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((material) => {
            material.side = THREE.DoubleSide;
            material.depthWrite = true;
            material.transparent = false;
            material.opacity = 1;
            material.needsUpdate = true;
          });
        }
      });
      const fallbackSpawn = currentParkingBounds
        ? currentParkingBounds.getCenter(new THREE.Vector3())
        : new THREE.Vector3();
      if (currentParkingBounds)
        fallbackSpawn.y = currentParkingBounds.min.y + 0.02;
      const spawn =
        requestedSpawn?.clone() ??
        getMatryoshkaRampSpawnPosition() ??
        getMatryoshkaSpawnPosition() ??
        matryoshkaWaypoints[0]?.clone() ??
        fallbackSpawn;
      mobObject.position.set(spawn.x, spawn.y - scaledBounds.min.y, spawn.z);
      const physics = createMatryoshkaPhysicsBody(mobObject);
      const matryoshkaHitbox = new THREE.Box3().setFromObject(mobObject);
      const hitboxBounds = matryoshkaHitbox
        .clone()
        .applyMatrix4(mobObject.matrixWorld.clone().invert());
      const matryoshkaHitboxHelper = new THREE.Box3Helper(
        matryoshkaHitbox,
        "#ff00ff",
      );
      matryoshkaHitboxHelper.visible = matryoshkaHitboxSetting.checked;
      matryoshkaHitboxHelper.renderOrder = 1006;
      const visionPoints = Array.from({ length: 160 }, (_, index) => {
        const angle = (index / 160) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * matryoshkaDetectionRange,
          0,
          Math.sin(angle) * matryoshkaDetectionRange,
        );
      });
      const visionIndicator = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(visionPoints),
        new THREE.LineBasicMaterial({
          color: "#ff2020",
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          fog: false,
          toneMapped: false,
        }),
      );
      visionIndicator.renderOrder = 1005;
      visionIndicator.frustumCulled = false;
      const mobVisible = classroomOnly
        ? gameState.isInClassroom
        : !gameState.isInChess && !gameState.isInClassroom;
      mobObject.visible = mobVisible;
      visionIndicator.visible = mobVisible && matryoshkaVisionSetting.checked;
      matryoshkaHitboxHelper.visible =
        mobVisible && matryoshkaHitboxSetting.checked;
      scene.add(mobObject, visionIndicator, matryoshkaHitboxHelper);
      const mob: MatryoshkaMob = {
        object: mobObject,
        state: "wander",
        soundSource: "player",
        classroomOnly,
        isClone: false,
        cooldownScale: 1,
        classroomTurned: false,
        classroomTurnUntil: -Infinity,
        classroomNextTurnAt: -Infinity,
        patrolDestination: null,
        physicsBody: physics.body,
        physicsOffsetY: physics.offsetY,
        target: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        stationaryTime: 0,
        slideDirection: new THREE.Vector3(),
        slideDirectionUntil: 0,
        knockedDownAt: 0,
        knockdownBaseY: mobObject.position.y,
        routeSide: matryoshkaMobs.length % 2 === 0 ? -1 : 1,
        chaseNetwork: matryoshkaMobs.length % 2 === 0 ? "blue" : "yellow",
        investigationPhase: "yellow",
        lastSeenPlayerPosition: spawn.clone(),
        pathRefreshAt: 0,
        route: [],
        visionIndicator,
        hitboxHelper: matryoshkaHitboxHelper,
        hitboxBounds,
        initialPosition: mobObject.position.clone(),
        initialQuaternion: mobObject.quaternion.clone(),
        heardSoundVersion: 0,
        visibilityCheckAt: 0,
        playerVisible: false,
      };
      matryoshkaMobs.push(mob);
      if (classroomOnly) {
        classroomTeacher = mob;
        classroomTeacherTurned = false;
        classroomTeacherNextTurnAt = -Infinity;
        classroomTeacherTurnPendingAt = -Infinity;
        classroomTeacherStudentTurnAt = -Infinity;
      } else chooseMatryoshkaTarget(mob);
    })
    .catch((error: unknown) =>
      console.error("Failed to load Matryoshka mob.", error),
    );
}

function addParkingObstacle(
  bounds: THREE.Box3,
  affectsMatryoshka = true,
): void {
  parkingObstacles.push(bounds);
  if (affectsMatryoshka) matryoshkaObstacles.push(bounds);

  const minCellX = Math.floor(bounds.min.x / parkingObstacleCellSize);
  const maxCellX = Math.floor(bounds.max.x / parkingObstacleCellSize);
  const minCellZ = Math.floor(bounds.min.z / parkingObstacleCellSize);
  const maxCellZ = Math.floor(bounds.max.z / parkingObstacleCellSize);

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      const key = `${cellX}:${cellZ}`;
      const existing = parkingObstacleCells.get(key);
      if (existing) existing.push(bounds);
      else parkingObstacleCells.set(key, [bounds]);
    }
  }
}

function getNearbyParkingObstacles(): THREE.Box3[] {
  const minCellX = Math.floor(
    (camera.position.x - 1.2) / parkingObstacleCellSize,
  );
  const maxCellX = Math.floor(
    (camera.position.x + 1.2) / parkingObstacleCellSize,
  );
  const minCellZ = Math.floor(
    (camera.position.z - 1.2) / parkingObstacleCellSize,
  );
  const maxCellZ = Math.floor(
    (camera.position.z + 1.2) / parkingObstacleCellSize,
  );
  const nearbyObstacles: THREE.Box3[] = [];
  const uniqueObstacles = new Set<THREE.Box3>();

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      const key = `${cellX}:${cellZ}`;
      const cellObstacles = parkingObstacleCells.get(key);
      if (!cellObstacles) continue;
      for (const obstacle of cellObstacles) {
        if (uniqueObstacles.has(obstacle)) continue;
        uniqueObstacles.add(obstacle);
        nearbyObstacles.push(obstacle);
      }
    }
  }

  return nearbyObstacles;
}

function overlapsParkingObstacle(
  x: number,
  z: number,
  padding = 0.45,
): boolean {
  for (const obstacle of parkingObstacles) {
    const overlapsX =
      x > obstacle.min.x - padding && x < obstacle.max.x + padding;
    const overlapsZ =
      z > obstacle.min.z - padding && z < obstacle.max.z + padding;
    if (overlapsX && overlapsZ) return true;
  }
  return false;
}

function _overlapsMatryoshkaObstacle(
  x: number,
  z: number,
  padding = matryoshkaObstaclePadding,
): boolean {
  for (const obstacle of matryoshkaObstacles) {
    const overlapsX =
      x > obstacle.min.x - padding && x < obstacle.max.x + padding;
    const overlapsZ =
      z > obstacle.min.z - padding && z < obstacle.max.z + padding;
    if (overlapsX && overlapsZ) return true;
  }
  return false;
}

function overlapsMatryoshkaVehicleObstacle(
  x: number,
  z: number,
  padding = matryoshkaObstaclePadding,
): boolean {
  for (const obstacle of matryoshkaVehicleObstacles) {
    const overlapsX =
      x > obstacle.min.x - padding && x < obstacle.max.x + padding;
    const overlapsZ =
      z > obstacle.min.z - padding && z < obstacle.max.z + padding;
    if (overlapsX && overlapsZ) return true;
  }
  return false;
}

function getMatryoshkaVehicleContactAxis(
  currentX: number,
  currentZ: number,
  nextX: number,
  nextZ: number,
  padding: number,
): "x" | "z" | null {
  let contactAxis: "x" | "z" | null = null;
  let closestFaceDistance = Infinity;
  for (const obstacle of matryoshkaVehicleObstacles) {
    const minX = obstacle.min.x - padding;
    const maxX = obstacle.max.x + padding;
    const minZ = obstacle.min.z - padding;
    const maxZ = obstacle.max.z + padding;
    if (nextX <= minX || nextX >= maxX || nextZ <= minZ || nextZ >= maxZ)
      continue;
    const distanceToXFace = Math.min(
      Math.abs(currentX - minX),
      Math.abs(currentX - maxX),
    );
    const distanceToZFace = Math.min(
      Math.abs(currentZ - minZ),
      Math.abs(currentZ - maxZ),
    );
    const candidateAxis = distanceToXFace <= distanceToZFace ? "x" : "z";
    const candidateDistance =
      candidateAxis === "x" ? distanceToXFace : distanceToZFace;
    if (candidateDistance < closestFaceDistance) {
      closestFaceDistance = candidateDistance;
      contactAxis = candidateAxis;
    }
  }
  return contactAxis;
}

function separateMatryoshkaFromVehicleCorner(mob: MatryoshkaMob): boolean {
  const x = mob.object.position.x;
  const z = mob.object.position.z;
  for (const obstacle of matryoshkaVehicleObstacles) {
    const minX = obstacle.min.x - matryoshkaObstaclePadding;
    const maxX = obstacle.max.x + matryoshkaObstaclePadding;
    const minZ = obstacle.min.z - matryoshkaObstaclePadding;
    const maxZ = obstacle.max.z + matryoshkaObstaclePadding;
    if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) continue;
    const pushLeft = x - minX;
    const pushRight = maxX - x;
    const pushFront = z - minZ;
    const pushBack = maxZ - z;
    const smallestPush = Math.min(pushLeft, pushRight, pushFront, pushBack);
    if (smallestPush === pushLeft) mob.object.position.x = minX - 0.02;
    else if (smallestPush === pushRight) mob.object.position.x = maxX + 0.02;
    else if (smallestPush === pushFront) mob.object.position.z = minZ - 0.02;
    else mob.object.position.z = maxZ + 0.02;
    mob.velocity.set(0, 0, 0);
    return true;
  }
  return false;
}

function moveMatryoshkaWithVehicleSlide(
  mob: MatryoshkaMob,
  delta: number,
  now: number,
): void {
  const stepX = mob.velocity.x * delta;
  const stepZ = mob.velocity.z * delta;
  const horizontalSpeed = Math.hypot(mob.velocity.x, mob.velocity.z);
  const currentX = mob.object.position.x;
  const currentZ = mob.object.position.z;
  const canMoveFull = !overlapsMatryoshkaVehicleObstacle(
    currentX + stepX,
    currentZ + stepZ,
    matryoshkaObstaclePadding,
  );
  if (
    canMoveFull &&
    mob.slideDirectionUntil > now &&
    mob.slideDirection.lengthSq() > 0.01
  ) {
    const slideStepX = mob.slideDirection.x * Math.hypot(stepX, stepZ);
    const slideStepZ = mob.slideDirection.z * Math.hypot(stepX, stepZ);
    if (
      !overlapsMatryoshkaVehicleObstacle(
        currentX + slideStepX,
        currentZ + slideStepZ,
        matryoshkaObstaclePadding,
      )
    ) {
      mob.object.position.x += slideStepX;
      mob.object.position.z += slideStepZ;
      mob.velocity.x = mob.slideDirection.x * horizontalSpeed;
      mob.velocity.z = mob.slideDirection.z * horizontalSpeed;
      return;
    }
  }
  if (canMoveFull) {
    mob.object.position.x += stepX;
    mob.object.position.z += stepZ;
    if (mob.slideDirectionUntil <= now) mob.slideDirection.set(0, 0, 0);
    return;
  }

  if (separateMatryoshkaFromVehicleCorner(mob)) {
    mob.slideDirection.set(0, 0, 0);
    mob.pathRefreshAt = 0;
    return;
  }

  const stepLength = Math.hypot(stepX, stepZ);
  if (stepLength > 0.0001) {
    const desiredX = stepX / stepLength;
    const desiredZ = stepZ / stepLength;
    const contactAxis = getMatryoshkaVehicleContactAxis(
      currentX,
      currentZ,
      currentX + stepX,
      currentZ + stepZ,
      matryoshkaObstaclePadding,
    );
    const slideCandidates =
      contactAxis === "x"
        ? [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]
        : contactAxis === "z"
          ? [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)]
          : [
              new THREE.Vector3(-desiredZ, 0, desiredX),
              new THREE.Vector3(desiredZ, 0, -desiredX),
            ];
    const targetDirection = matryoshkaMoveDirection
      .subVectors(mob.target, mob.object.position)
      .setY(0)
      .normalize();
    const clearSlides = slideCandidates.filter(
      (candidate) =>
        !overlapsMatryoshkaVehicleObstacle(
          currentX + candidate.x * stepLength,
          currentZ + candidate.z * stepLength,
          matryoshkaObstaclePadding,
        ),
    );
    if (clearSlides.length > 0) {
      clearSlides.sort((first, second) => {
        const firstStickyScore =
          mob.slideDirectionUntil > now ? first.dot(mob.slideDirection) * 8 : 0;
        const secondStickyScore =
          mob.slideDirectionUntil > now
            ? second.dot(mob.slideDirection) * 8
            : 0;
        const firstTargetScore = first.dot(targetDirection);
        const secondTargetScore = second.dot(targetDirection);
        return (
          secondTargetScore +
          secondStickyScore -
          (firstTargetScore + firstStickyScore)
        );
      });
      const slide = clearSlides[0];
      mob.object.position.x += slide.x * stepLength;
      mob.object.position.z += slide.z * stepLength;
      mob.velocity.x = slide.x * horizontalSpeed;
      mob.velocity.z = slide.z * horizontalSpeed;
      mob.slideDirection.copy(slide);
      mob.slideDirectionUntil = now + 0.35;
      return;
    }
  }

  const canSlideX =
    Math.abs(stepX) > 0.0001 &&
    !overlapsMatryoshkaVehicleObstacle(
      currentX + stepX,
      currentZ,
      matryoshkaObstaclePadding,
    );
  const canSlideZ =
    Math.abs(stepZ) > 0.0001 &&
    !overlapsMatryoshkaVehicleObstacle(
      currentX,
      currentZ + stepZ,
      matryoshkaObstaclePadding,
    );
  if (canSlideX) mob.object.position.x += stepX;
  if (canSlideZ) mob.object.position.z += stepZ;
  if (!canSlideX && !canSlideZ) {
    mob.velocity.set(0, 0, 0);
  } else {
    const slideX = canSlideX ? Math.sign(stepX) : 0;
    const slideZ = canSlideZ ? Math.sign(stepZ) : 0;
    const slideLength = Math.hypot(slideX, slideZ) || 1;
    mob.velocity.set(
      (slideX / slideLength) * horizontalSpeed,
      0,
      (slideZ / slideLength) * horizontalSpeed,
    );
  }
  if (!canSlideX && !canSlideZ) mob.pathRefreshAt = 0;
}

function groundMatryoshkaMob(mob: MatryoshkaMob): void {
  const mobBounds = new THREE.Box3().setFromObject(mob.object);
  const ground = getMatryoshkaGroundHit(
    mob.object.position.x,
    mob.object.position.z,
    mobBounds.min.y + 1.25,
  );
  if (!ground) return;
  mob.object.position.y += ground.point.y - mobBounds.min.y;
}

function moveMatryoshkaWithGroundSteps(
  mob: MatryoshkaMob,
  delta: number,
  now: number,
): void {
  const horizontalDistance = Math.hypot(
    mob.velocity.x * delta,
    mob.velocity.z * delta,
  );
  const stepCount = Math.max(1, Math.ceil(horizontalDistance / 0.08));
  const stepDelta = delta / stepCount;
  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    groundMatryoshkaMob(mob);
    const nextPosition = mob.object.position
      .clone()
      .add(
        new THREE.Vector3(
          mob.velocity.x * stepDelta,
          0,
          mob.velocity.z * stepDelta,
        ),
      );
    if (
      mob.state === "wander" &&
      isMatryoshkaWallPathBlocked(mob.object.position, nextPosition)
    ) {
      mob.velocity.set(0, 0, 0);
      mob.route = [];
      mob.pathRefreshAt = 0;
      return;
    }
    moveMatryoshkaWithVehicleSlide(mob, stepDelta, now + stepIndex * stepDelta);
    groundMatryoshkaMob(mob);
  }
}

function getRandomKeySpawnPosition(): THREE.Vector3 | null {
  if (!parkingBounds || !parkingLotRoot) return null;

  const bounds = parkingBounds;
  const minX = bounds.min.x + 2;
  const maxX = bounds.max.x - 2;
  const minZ = bounds.min.z + 2;
  const maxZ = bounds.max.z - 2;

  for (let attempt = 0; attempt < 1200; attempt += 1) {
    const x = THREE.MathUtils.randFloat(minX, maxX);
    const zDistribution =
      Math.random() < 0.75 ? Math.pow(Math.random(), 0.45) : Math.random();
    const z = THREE.MathUtils.lerp(minZ, maxZ, zDistribution);

    const nearChessEntry =
      Math.abs(x - chessEntryPosition.x) < 3 &&
      Math.abs(z - chessEntryPosition.z) < 3;
    if (nearChessEntry) continue;
    if (overlapsParkingObstacle(x, z, 1.1)) continue;

    const hit = getMatryoshkaGroundHit(x, z);
    if (!hit || !hit.face) continue;

    const worldFaceNormal = hit.face.normal
      .clone()
      .transformDirection(hit.object.matrixWorld);
    if (worldFaceNormal.y < 0.2) continue;

    return new THREE.Vector3(x, hit.point.y + 0.02, z);
  }

  return null;
}

const parkingGroundRaycaster = new THREE.Raycaster();
const parkingWallRaycaster = new THREE.Raycaster();
const parkingProjectileRaycaster = new THREE.Raycaster();
const parkingLotLoader = new FBXLoader();
const classroomSpawnPosition = new THREE.Vector3();
const classroomEntryPosition = new THREE.Vector3();
const chessSpawnPosition = new THREE.Vector3();
const chessEntryPosition = new THREE.Vector3();
const _keyPickupPosition = new THREE.Vector3();
const parkingLotUrl = new URL(
  "../assets/parkingLot/parking.fbx",
  import.meta.url,
).href;
showLoadingScreen("LOADING OBJECTS...", 12);
parkingLotLoader.load(
  parkingLotUrl,
  (parkingLot) => {
    parkingBounds = prepareParkingLotScene(
      parkingLot,
      isCollisionSurface,
      addParkingObstacle,
    );
    parkingLotRoot = parkingLot;
    scene.add(parkingLot);
    showLoadingScreen("LOADING OBJECTS...", 36);

    const carLoader = new FBXLoader();
    const carUrl = new URL("../assets/car/vwkaferhlowered.fbx", import.meta.url)
      .href;
    carLoader.load(
      carUrl,
      (car) => {
        car.updateMatrixWorld(true);
        const carBounds = new THREE.Box3().setFromObject(car);
        const carSize = carBounds.getSize(new THREE.Vector3());
        const carScale = 14.8 / Math.max(carSize.x, carSize.z, 1);
        car.scale.setScalar(carScale);
        car.updateMatrixWorld(true);

        const carTemplateBounds = new THREE.Box3().setFromObject(car);
        _matryoshkaVehicleHeight = carTemplateBounds.getSize(
          new THREE.Vector3(),
        ).y;
        const slotMarker = parkingLot.getObjectByName("A");
        const slotBounds = slotMarker
          ? new THREE.Box3().setFromObject(slotMarker)
          : new THREE.Box3();

        const fixedBaseX = slotMarker ? slotBounds.min.x - 3 : 0;
        const secondRowBaseX = fixedBaseX - 42;
        const reversedRowBaseX = secondRowBaseX + 31;
        const secondReversedRowBaseX = reversedRowBaseX - 42;
        const fifthRowBaseX = secondReversedRowBaseX - 16;
        const fifthRowRotationY = Math.PI / 2;
        const sixthRowBaseX = fifthRowBaseX - 16;
        const sixthRowRotationY = Math.PI / 2;
        const carRows = [
          {
            x: fixedBaseX,
            startZ: -60,
            endZ: 79,
            count: 15,
            zOffsets: [0, 0.75, 1, 1.25, 1.5, 2.5, 3, 3.5, 4, 5, 4, 3, 2, 1, 0],
            rotationY: 0,
          },
          {
            x: secondRowBaseX,
            startZ: -60,
            endZ: 60,
            count: 13,
            zOffsets: [0, 0.75, 1, 1.25, 1.5, 2.5, 3, 3.5, 4, 5, 4, 3, 2, 1, 0],
            rotationY: 0,
          },
          {
            x: reversedRowBaseX,
            startZ: -65,
            endZ: 53,
            count: 13,
            zOffsets: [0, 0.75, 1, 1.25, 1.5, 2.5, 3, 3.5, 4, 5, 4, 3, 2, 1, 0],
            rotationY: Math.PI,
          },
          {
            x: secondReversedRowBaseX,
            startZ: -65,
            endZ: 53,
            count: 13,
            zOffsets: [0, 0.75, 1, 1.25, 1.5, 2.5, 3, 3.5, 4, 5, 4, 3, 2, 1, 0],
            rotationY: Math.PI,
          },
          {
            x: fifthRowBaseX,
            startZ: 0,
            endZ: 60,
            count: 5,
            zOffsets: [0, 0, 0, 0, 0],
            rotationY: fifthRowRotationY,
          },
          {
            x: sixthRowBaseX,
            startZ: 0,
            endZ: 79,
            count: 6,
            zOffsets: [0, 0, 0, 0, 0, 0],
            rotationY: sixthRowRotationY,
          },
        ];
        const trueCarSlotIndex = Math.floor(
          Math.random() * carRows.reduce((total, row) => total + row.count, 0),
        );
        car.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = false;
            object.receiveShadow = false;
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            materials.forEach((material) => {
              if (material) {
                const meshMaterial = material as THREE.Material & {
                  side?: THREE.Side;
                };
                meshMaterial.side = THREE.DoubleSide;
              }
            });
          }
        });
        let parkedCarIndex = 0;

        for (const [rowIndex, row] of carRows.entries()) {
          const rowZStep = (row.endZ - row.startZ) / (row.count - 1);

          for (let index = 0; index < row.count; index += 1) {
            const parkedCar =
              rowIndex === 0 && index === 0 ? car : car.clone(true);
            if (parkedCarIndex === trueCarSlotIndex) trueCar = parkedCar;
            parkedCarIndex += 1;
            parkedCar.updateMatrixWorld(true);
            const parkedCarBottomY = carTemplateBounds.min.y;

            if (slotMarker) {
              parkedCar.position.x = row.x;
              parkedCar.position.z =
                row.startZ + index * rowZStep + (row.zOffsets[index] ?? 0);
              parkedCar.position.y = -parkedCarBottomY + 0.01;
            } else {
              const parkedCarCenter = carTemplateBounds.getCenter(
                new THREE.Vector3(),
              );
              const parkingCenterX =
                (parkingBounds!.min.x + parkingBounds!.max.x) / 2;
              const parkingCenterZ =
                (parkingBounds!.min.z + parkingBounds!.max.z) / 2;
              parkedCar.position.x = parkingCenterX - parkedCarCenter.x;
              parkedCar.position.z = parkingCenterZ - parkedCarCenter.z + 8;
              parkedCar.position.y -= carTemplateBounds.min.y;
            }
            parkedCar.rotation.set(0, row.rotationY, 0);
            parkedCar.updateMatrixWorld(true);

            if (parkedCar === trueCar) {
              const outlineMaterial = new THREE.LineBasicMaterial({
                color: "#d6dde0",
                transparent: true,
                opacity: 0.95,
                blending: THREE.AdditiveBlending,
                depthTest: false,
                depthWrite: false,
                fog: false,
                toneMapped: false,
              });
              parkedCar.traverse((object) => {
                if (!(object instanceof THREE.Mesh)) return;
                const outline = new THREE.LineSegments(
                  new THREE.EdgesGeometry(object.geometry, 20),
                  outlineMaterial,
                );
                outline.position.copy(object.position);
                outline.rotation.copy(object.rotation);
                outline.scale.copy(object.scale);
                outline.frustumCulled = false;
                outline.renderOrder = 1000;
                parkedCar.add(outline);
                trueCarEspObjects.push(outline);
              });
              trueCarEspObjects.forEach((outline) => {
                outline.visible = trueCarEspSetting.checked;
              });
            }

            const carWorldBounds = new THREE.Box3().setFromObject(parkedCar);
            const carCollisionBounds = carWorldBounds
              .clone()
              .expandByScalar(0.04);
            addParkingObstacle(carCollisionBounds, false);
            matryoshkaVehicleObstacles.push(carCollisionBounds);
            const carHitboxHelper = new THREE.Box3Helper(
              carCollisionBounds,
              "#00ffff",
            );
            carHitboxHelper.visible = carHitboxSetting.checked;
            carHitboxHelper.renderOrder = 1006;
            carHitboxHelpers.push(carHitboxHelper);
            carHitboxHelper.visible = carHitboxSetting.checked;
            parkedCar.traverse((object) => {
              if (object instanceof THREE.Light) object.visible = false;
              if (object instanceof THREE.Mesh) {
                object.castShadow = false;
                object.receiveShadow = false;
              }
            });
            scene.add(carHitboxHelper);
            parkedCar.visible = !hideAllCarsSetting.checked;
            parkedCars.push(parkedCar);
            scene.add(parkedCar);
          }
        }
        rebuildMatryoshkaWaypoints();
        spawnMatryoshkaMob();
        parkedCarsReady = true;
        showLoadingScreen("LOADING OBJECTS...", 72);
      },
      undefined,
      (error) => {
        console.error("Failed to load car model.", error);
      },
    );

    function _createKeyPickup(): THREE.Group {
      const keyGroup = new THREE.Group();

      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = 128;
      glowCanvas.height = 128;
      const glowContext = glowCanvas.getContext("2d");
      const glowTexture = glowContext
        ? (() => {
            const gradient = glowContext.createRadialGradient(
              64,
              64,
              8,
              64,
              64,
              64,
            );
            gradient.addColorStop(0, "rgba(255,247,200,1)");
            gradient.addColorStop(0.18, "rgba(255,214,105,0.95)");
            gradient.addColorStop(0.45, "rgba(255,166,70,0.45)");
            gradient.addColorStop(1, "rgba(255,166,70,0)");
            glowContext.fillStyle = gradient;
            glowContext.fillRect(0, 0, glowCanvas.width, glowCanvas.height);
            const texture = new THREE.CanvasTexture(glowCanvas);
            texture.needsUpdate = true;
            return texture;
          })()
        : null;

      const keyMaterial = new THREE.MeshStandardMaterial({
        color: "#d6cdb9",
        metalness: 0.85,
        roughness: 0.28,
        emissive: "#ffcc66",
        emissiveIntensity: 2.5,
        fog: false,
        toneMapped: false,
      });

      const keyOutlineMaterial = new THREE.LineBasicMaterial({
        color: "#ffd36b",
        transparent: true,
        opacity: 1,
        depthTest: false,
        depthWrite: false,
      });

      const addOutline = (mesh: THREE.Mesh) => {
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(mesh.geometry),
          keyOutlineMaterial,
        );
        outline.position.copy(mesh.position);
        outline.rotation.copy(mesh.rotation);
        outline.scale.copy(mesh.scale);
        outline.renderOrder = 3;
        keyGroup.add(outline);
      };

      const bow = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.028, 10, 28),
        keyMaterial,
      );
      bow.rotation.x = Math.PI / 2;
      bow.position.y = 0.06;
      keyGroup.add(bow);
      addOutline(bow);

      const shaft = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.03, 0.04),
        keyMaterial,
      );
      shaft.position.set(0.34, 0.04, 0);
      keyGroup.add(shaft);
      addOutline(shaft);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.05, 0.05),
        keyMaterial,
      );
      head.position.set(0.73, 0.04, 0);
      keyGroup.add(head);
      addOutline(head);

      const toothMaterial = new THREE.MeshStandardMaterial({
        color: "#f0e5d2",
        metalness: 0.9,
        roughness: 0.22,
        emissive: "#ffbf5a",
        emissiveIntensity: 1.1,
        fog: false,
        toneMapped: false,
      });
      for (let index = 0; index < 4; index += 1) {
        const tooth = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.02, 0.03),
          toothMaterial,
        );
        tooth.position.set(0.56 + index * 0.06, 0.03, 0);
        keyGroup.add(tooth);
        addOutline(tooth);
      }

      const keyGlow = new THREE.PointLight("#ffcc66", 5, 8, 2);
      keyGlow.position.set(0.25, 0.28, 0);
      keyGroup.add(keyGlow);

      const keyHalo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture ?? undefined,
          color: "#ffbc5c",
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      );
      keyHalo.position.set(0.22, 0.18, 0);
      keyHalo.scale.set(1.6, 1.0, 1);
      keyGroup.add(keyHalo);

      keyGroup.rotation.y = Math.PI / 2;
      return keyGroup;
    }

    showLoadingScreen("LOADING OBJECTS...", 54);
    const classroomLoader = new GLTFLoader();
    const classroomUrl = new URL(
      "../assets/classroom/classroom.glb",
      import.meta.url,
    ).href;
    classroomLoader.load(
      classroomUrl,
      (gltf) => {
        const classroom = gltf.scene;
        const classroomSetup = prepareClassroomScene(
          classroom,
          scene,
          classroomLightRig,
          playerHeight,
          isCollisionSurface,
        );
        classroomObstacles.length = 0;
        classroomObstacles.push(...classroomSetup.obstacles);

        classroomRoot = classroom;
        classroomBounds = classroomSetup.bounds;
        classroomSpawnPosition.copy(classroomSetup.spawnPosition);
        classroomEntryPosition.copy(classroomSetup.entryPosition);
        spawnMatryoshkaMob(classroomSetup.matryoshkaSpawn, true);

        const studentLoader = new FBXLoader();
        const studentUrl = new URL(
          "../assets/student/marble_bust_01_4k.fbx",
          import.meta.url,
        ).href;
        studentLoader.load(
          studentUrl,
          (student) => {
            student.updateMatrixWorld(true);
            const studentBounds = new THREE.Box3().setFromObject(student);
            const studentSize = studentBounds.getSize(new THREE.Vector3());
            student.scale.setScalar(2.2 / Math.max(studentSize.y, 0.01));
            student.updateMatrixWorld(true);
            student.traverse((object) => {
              if (object instanceof THREE.Mesh) {
                object.castShadow = false;
                object.receiveShadow = false;
                object.material = new THREE.MeshStandardMaterial({
                  color: "#ffffff",
                  roughness: 0.72,
                  metalness: 0,
                  side: THREE.DoubleSide,
                });
              }
            });
            const placement = placeClassroomStudents(
              student,
              scene,
              gameState.isInClassroom,
            );
            classroomStudents.push(...placement.students);
            placement.initialRotations.forEach((rotation, studentObject) => {
              classroomStudentInitialRotations.set(studentObject, rotation);
            });
          },
          undefined,
          (error) => {
            console.error("Failed to load classroom student model.", error);
          },
        );
      },
      undefined,
      (error) => {
        console.error("Failed to load classroom model.", error);
      },
    );

    const chessLoader = new GLTFLoader();
    const chessUrl = new URL(
      "../assets/chess/eyes-dream_core.glb",
      import.meta.url,
    ).href;
    chessLoader.load(
      chessUrl,
      (gltf) => {
        const chess = gltf.scene;
        const chessSetup = prepareChessScene(
          chess,
          chessLightRig,
          playerHeight,
        );
        chessRoot = chess;
        chessBounds = chessSetup.bounds;
        chessSpawnPosition.copy(chessSetup.spawnPosition);
        chessEntryPosition.copy(chessSetup.entryPosition);

        const keyLoader = new GLTFLoader();
        const keyUrl = new URL(
          "../assets/key/lost_car_keys_tlou_inspired.glb",
          import.meta.url,
        ).href;
        showLoadingScreen("LOADING OBJECTS...", 78);
        keyLoader.load(
          keyUrl,
          (gltf) => {
            const keyModel = gltf.scene;
            keyPickupObject = keyModel;
            keyModel.updateMatrixWorld(true);
            const keyBounds = new THREE.Box3().setFromObject(keyModel);
            const keySize = keyBounds.getSize(new THREE.Vector3());
            keyModel.scale.setScalar(
              1.4 / Math.max(keySize.x, keySize.y, keySize.z, 0.01),
            );

            const keyMeshes: THREE.Mesh[] = [];
            keyModel.traverse((object) => {
              if (object instanceof THREE.Mesh) {
                keyMeshes.push(object);
                object.frustumCulled = true;
                object.castShadow = false;
                object.receiveShadow = false;

                const materials = Array.isArray(object.material)
                  ? object.material
                  : [object.material];

                materials.forEach((material) => {
                  material.side = THREE.DoubleSide;
                  material.needsUpdate = true;
                });
              }
            });

            const keyOutlineMaterial = new THREE.LineBasicMaterial({
              color: "#ffcf52",
              transparent: true,
              opacity: 1,
              blending: THREE.AdditiveBlending,
              depthTest: false,
              depthWrite: false,
              fog: false,
              toneMapped: false,
            });
            const keyOuterOutlineMaterial = new THREE.LineBasicMaterial({
              color: "#ff7a18",
              transparent: true,
              opacity: 0.65,
              blending: THREE.AdditiveBlending,
              depthTest: false,
              depthWrite: false,
              fog: false,
              toneMapped: false,
            });

            for (const mesh of keyMeshes) {
              const outline = new THREE.LineSegments(
                new THREE.EdgesGeometry(mesh.geometry, 18),
                keyOutlineMaterial,
              );
              outline.position.copy(mesh.position);
              outline.rotation.copy(mesh.rotation);
              outline.scale.copy(mesh.scale);
              outline.frustumCulled = false;
              outline.renderOrder = 1000;
              keyModel.add(outline);
              keyEspObjects.push(outline);

              const outerOutline = new THREE.LineSegments(
                new THREE.EdgesGeometry(mesh.geometry, 30),
                keyOuterOutlineMaterial,
              );
              outerOutline.position.copy(mesh.position);
              outerOutline.rotation.copy(mesh.rotation);
              outerOutline.scale.set(
                mesh.scale.x * 1.035,
                mesh.scale.y * 1.035,
                mesh.scale.z * 1.035,
              );
              outerOutline.frustumCulled = false;
              outerOutline.renderOrder = 999;
              keyModel.add(outerOutline);
              keyEspObjects.push(outerOutline);
            }
            keyEspObjects.forEach((outline) => {
              outline.visible = keyEspSetting.checked;
            });

            const placeKeyWhenReady = () => {
              if (!parkedCarsReady) {
                requestAnimationFrame(placeKeyWhenReady);
                return;
              }

              const keySpawnPosition = getRandomKeySpawnPosition();
              if (!keySpawnPosition) {
                requestAnimationFrame(placeKeyWhenReady);
                return;
              }

              keyModel.position.copy(keySpawnPosition);
              keyModel.updateMatrixWorld(true);
              scene.add(keyModel);
            };
            placeKeyWhenReady();
            showLoadingScreen("LOADING OBJECTS...", 90);
            void Promise.allSettled([
              audioAssetsReady,
              matryoshkaModelReady,
            ]).then(() => {
              showLoadingScreen("LOADING OBJECTS...", 100);
              _hideLoadingScreen();
            });
          },
          undefined,
          (error) => {
            console.error("Failed to load key pickup model.", error);
          },
        );
        scene.add(chess);
      },
      undefined,
      (error) => {
        console.error("Failed to load chess model.", error);
      },
    );
  },
  undefined,
  (error) => {
    console.error("Failed to load parking lot model.", error);
  },
);
const domeGridRadius = 260;
const domeGridSegments = 48;
const domeGridRings = 18;
const domeGridVertices: number[] = [];
const domeGridPoint = new THREE.Vector3();
for (let ring = 0; ring <= domeGridRings; ring += 1) {
  const theta = (ring / domeGridRings) * Math.PI * 0.5;
  const ringRadius = Math.sin(theta) * domeGridRadius;
  const ringHeight = Math.cos(theta) * domeGridRadius;
  for (let segment = 0; segment < domeGridSegments; segment += 1) {
    const nextSegment = (segment + 1) % domeGridSegments;
    domeGridPoint.set(
      Math.cos((segment / domeGridSegments) * Math.PI * 2) * ringRadius,
      ringHeight,
      Math.sin((segment / domeGridSegments) * Math.PI * 2) * ringRadius,
    );
    domeGridVertices.push(domeGridPoint.x, domeGridPoint.y, domeGridPoint.z);
    domeGridPoint.set(
      Math.cos((nextSegment / domeGridSegments) * Math.PI * 2) * ringRadius,
      ringHeight,
      Math.sin((nextSegment / domeGridSegments) * Math.PI * 2) * ringRadius,
    );
    domeGridVertices.push(domeGridPoint.x, domeGridPoint.y, domeGridPoint.z);
  }
}
for (let segment = 0; segment < domeGridSegments; segment += 1) {
  const longitude = (segment / domeGridSegments) * Math.PI * 2;
  for (let ring = 0; ring < domeGridRings; ring += 1) {
    const theta = (ring / domeGridRings) * Math.PI * 0.5;
    const nextTheta = ((ring + 1) / domeGridRings) * Math.PI * 0.5;
    domeGridPoint.set(
      Math.cos(longitude) * Math.sin(theta) * domeGridRadius,
      Math.cos(theta) * domeGridRadius,
      Math.sin(longitude) * Math.sin(theta) * domeGridRadius,
    );
    domeGridVertices.push(domeGridPoint.x, domeGridPoint.y, domeGridPoint.z);
    domeGridPoint.set(
      Math.cos(longitude) * Math.sin(nextTheta) * domeGridRadius,
      Math.cos(nextTheta) * domeGridRadius,
      Math.sin(longitude) * Math.sin(nextTheta) * domeGridRadius,
    );
    domeGridVertices.push(domeGridPoint.x, domeGridPoint.y, domeGridPoint.z);
  }
}
const domeGridGeometry = new THREE.BufferGeometry();
domeGridGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(domeGridVertices, 3),
);
const domeGrid = new THREE.LineSegments(
  domeGridGeometry,
  new THREE.LineBasicMaterial({
    color: "#39ff88",
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    fog: false,
  }),
);
domeGrid.position.y = 0;
domeGrid.visible = domeGridSetting.checked;
scene.add(domeGrid);
const domeGridMaterial = domeGrid.material as THREE.LineBasicMaterial;
domeGridSetting.addEventListener("change", () => {
  domeGrid.visible = domeGridSetting.checked;
});
domeGridColorSetting.addEventListener("input", () => {
  domeGridMaterial.color.set(domeGridColorSetting.value);
});
hideAllCarsSetting.addEventListener("change", () => {
  parkedCars.forEach((car) => {
    car.visible = !hideAllCarsSetting.checked;
  });
});
keyEspSetting.addEventListener("change", () => {
  keyEspObjects.forEach((outline) => {
    outline.visible = keyEspSetting.checked;
  });
});
trueCarEspSetting.addEventListener("change", () => {
  trueCarEspObjects.forEach((outline) => {
    outline.visible = trueCarEspSetting.checked;
  });
});
carHitboxSetting.addEventListener("change", () => {
  carHitboxHelpers.forEach((helper) => {
    helper.visible = carHitboxSetting.checked;
  });
});
matryoshkaHitboxSetting.addEventListener("change", () => {
  matryoshkaMobs.forEach((mob) => {
    mob.hitboxHelper.visible = matryoshkaHitboxSetting.checked;
  });
});
matryoshkaVisionSetting.addEventListener("change", () => {
  matryoshkaMobs.forEach((mob) => {
    mob.visionIndicator.visible = matryoshkaVisionSetting.checked;
  });
});
document.querySelector<HTMLElement>('[data-category="targets"]')?.remove();
document
  .querySelector<HTMLElement>('[data-category-panel="targets"]')
  ?.remove();
const physicsWorld = createSharedPhysicsWorld();
const matryoshkaPhysicsRadius = 0.3;

function createMatryoshkaPhysicsBody(object: THREE.Object3D): {
  body: RAPIER.RigidBody;
  offsetY: number;
} {
  const offsetY = matryoshkaPhysicsRadius;
  const body = physicsWorld.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(
      object.position.x,
      object.position.y + offsetY,
      object.position.z,
    ),
  );
  body.setGravityScale(0, true);
  physicsWorld.createCollider(
    RAPIER.ColliderDesc.ball(matryoshkaPhysicsRadius)
      .setDensity(6)
      .setFriction(1)
      .setRestitution(0.05),
    body,
  );
  return { body, offsetY };
}

function syncMatryoshkaFromPhysics(mob: MatryoshkaMob): void {
  const translation = mob.physicsBody.translation();
  const rotation = mob.physicsBody.rotation();
  mob.object.position.set(
    translation.x,
    translation.y - mob.physicsOffsetY,
    translation.z,
  );
  mob.object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
}

function syncMatryoshkaToPhysics(mob: MatryoshkaMob): void {
  mob.physicsBody.setTranslation(
    {
      x: mob.object.position.x,
      y: mob.object.position.y + mob.physicsOffsetY,
      z: mob.object.position.z,
    },
    true,
  );
}

const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 600);
let baseFov = camera.fov;
camera.position.set(0, 3.4, 5);
const controls = createPointerControls(camera, canvas);
scene.add(controls.object);

const {
  weapon,
  modelMuzzle,
  weaponPosition,
  weaponRotation,
  hipPosition,
  hipRotation,
  adsPosition,
  adsRotation,
  muzzleFlash,
} = createWeaponRig();
const _akHipRotation = new THREE.Euler(0.03, 0.04, 0.02);
const _akAdsPosition = new THREE.Vector3(0.025, -0.26, -0.54);
const _akAdsRotation = new THREE.Euler(0, 0, 0);
let coltModel: THREE.Object3D | null = null;
let currentWeaponModel: THREE.Object3D | null = null;
const weaponMuzzlePositions = new Map<WeaponId, THREE.Vector3>();
const coltLoader = new FBXLoader();
const coltModelUrl = new URL("../assets/Colt1911/colt1911.fbx", import.meta.url)
  .href;
coltLoader.load(
  coltModelUrl,
  (colt) => {
    colt.rotation.set(0, Math.PI, 0);
    colt.position.set(0, 0, 0);
    colt.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = false;
        object.frustumCulled = false;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        const blackMaterials = materials.map(
          (material) =>
            new THREE.MeshStandardMaterial({
              color: "#050505",
              metalness: 0.82,
              roughness: 0.3,
              side: material.side,
            }),
        );
        object.material = Array.isArray(object.material)
          ? blackMaterials
          : blackMaterials[0];
      }
    });
    colt.updateMatrixWorld(true);
    const coltBounds = new THREE.Box3().setFromObject(colt);
    const coltSize = coltBounds.getSize(new THREE.Vector3());
    colt.scale.setScalar(0.95 / Math.max(coltSize.x, coltSize.y, coltSize.z));
    colt.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(colt);
    const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
    colt.position.sub(scaledCenter);
    colt.updateMatrixWorld(true);
    const centeredBounds = new THREE.Box3().setFromObject(colt);
    modelMuzzle.position.set(
      (centeredBounds.min.x + centeredBounds.max.x) * 0.5,
      (centeredBounds.min.y + centeredBounds.max.y) * 0.5,
      Math.min(centeredBounds.min.z, centeredBounds.max.z) - 0.02,
    );
    muzzleFlash.position.copy(modelMuzzle.position);
    muzzleFlash.position.y += 0.22;
    muzzleFlash.position.z -= 0.08;
    colt.visible = false;
    coltModel = colt;
    weaponMuzzlePositions.set("pistol", modelMuzzle.position.clone());
    currentWeaponModel = colt;
    weapon.add(colt);
    const pickup = colt.clone(true);
    pickup.visible = true;
    pickup.scale.multiplyScalar(0.72);
    weaponPickupObject = pickup;
    placeWeaponPickupWhenReady();
    applyWeaponSelection();
  },
  undefined,
  (error) => {
    console.error("Failed to load Colt 1911 model or textures.", error);
  },
);
weapon.scale.setScalar(0.72);
weapon.position.copy(weaponPosition);
weapon.rotation.copy(weaponRotation);
weapon.visible = false;
camera.add(weapon);

const muzzleLocalPosition = new THREE.Vector3();
const pistolSoundUrl = new URL(
  "../assets/sounds/freesound_community-9mm-pistol-shoot-short-reverb-7152.mp3",
  import.meta.url,
).href;
const gunshotAudioContext = new AudioContext();
let gunshotBuffer: AudioBuffer | null = null;
let knockSoundBuffer: AudioBuffer | null = null;
let trueCarSoundBuffer: AudioBuffer | null = null;
let chaseSoundBuffer: AudioBuffer | null = null;
let lastChaseSoundAt = -Infinity;
let deathSoundBuffer: AudioBuffer | null = null;
const weaponMagazineSize = 7;
let weaponReloading = false;
let weaponReloadStartedAt = -Infinity;
let weaponReloadDuration = 1;
let reloadSoundBuffer: AudioBuffer | null = null;
let reloadSoundSource: AudioBufferSourceNode | null = null;
let reloadGeneration = 0;
let dryFireSoundBuffer: AudioBuffer | null = null;
let heartbeatSoundBuffer: AudioBuffer | null = null;
let heartbeatSoundSource: AudioBufferSourceNode | null = null;
let heartbeatSoundGain: GainNode | null = null;
let heartbeatStartPending = false;
let heartbeatFearLoopStart = 0;
let heartbeatFearLoopEnd = 0;
const heartbeatNormalPlaybackRate = 1;
const heartbeatFearPlaybackRate = 1.35;
const gunshotSoundReady = loadSoundBuffer(gunshotAudioContext, pistolSoundUrl)
  .then((buffer) => {
    gunshotBuffer = buffer;
  })
  .catch((error: unknown) =>
    console.error("Gunshot audio failed to load.", error),
  );
const knockSoundUrl = new URL(
  "../assets/sounds/universfield-door-knock-291150.mp3",
  import.meta.url,
).href;
const knockSoundReady = loadSoundBuffer(gunshotAudioContext, knockSoundUrl)
  .then((buffer) => {
    knockSoundBuffer = buffer;
  })
  .catch((error: unknown) =>
    console.error("Knock audio failed to load.", error),
  );
const carBreakSoundUrl = new URL(
  "../assets/sounds/soumages-iron-smash-with-debris-351841.mp3",
  import.meta.url,
).href;
let carBreakSoundBuffer: AudioBuffer | null = null;
const carBreakSoundReady = loadSoundBuffer(
  gunshotAudioContext,
  carBreakSoundUrl,
)
  .then((buffer) => {
    carBreakSoundBuffer = buffer;
    carEndingShakePeaks = detectCarBreakPeaks(buffer);
  })
  .catch((error: unknown) =>
    console.error("Car break audio failed to load.", error),
  );
const heartbeatSoundUrl = new URL(
  "../assets/sounds/freesound_community-heart-beating-128bpm-38384.mp3",
  import.meta.url,
).href;
const heartbeatSoundReady = loadSoundBuffer(
  gunshotAudioContext,
  heartbeatSoundUrl,
)
  .then((buffer) => {
    heartbeatSoundBuffer = buffer;
    const peaks = detectHeartbeatPeaks(buffer);
    if (peaks.length >= 2) {
      heartbeatFearLoopStart = Math.max(0, peaks[0] - 0.45);
      heartbeatFearLoopEnd = Math.min(buffer.duration, peaks[1] + 0.45);
    } else {
      heartbeatFearLoopStart = 0;
      heartbeatFearLoopEnd = buffer.duration;
    }
  })
  .catch((error: unknown) =>
    console.error("Heartbeat audio failed to load.", error),
  );
const reloadSoundUrl = new URL(
  "../assets/sounds/freesound_community-9mm-pistol-load-and-chamber-98830.mp3",
  import.meta.url,
).href;
const reloadSoundReady = loadSoundBuffer(gunshotAudioContext, reloadSoundUrl)
  .then((buffer) => {
    reloadSoundBuffer = buffer;
  })
  .catch((error: unknown) =>
    console.error("Reload audio failed to load.", error),
  );
const dryFireSoundUrl = new URL(
  "../assets/sounds/spinopel-dry-fire-364846.mp3",
  import.meta.url,
).href;
const dryFireSoundReady = loadSoundBuffer(gunshotAudioContext, dryFireSoundUrl)
  .then((buffer) => {
    dryFireSoundBuffer = buffer;
  })
  .catch((error: unknown) =>
    console.error("Dry fire audio failed to load.", error),
  );
const chaseSoundUrl = new URL(
  "../assets/sounds/universfield-scary-string-tension-454849.mp3",
  import.meta.url,
).href;
const chaseSoundReady = loadSoundBuffer(gunshotAudioContext, chaseSoundUrl)
  .then((buffer) => {
    chaseSoundBuffer = buffer;
  })
  .catch((error: unknown) =>
    console.error("Chase audio failed to load.", error),
  );
const classroomBellUrl = new URL(
  "../assets/sounds/u_7t06dkcgzk-japanese-school-bell-sound-488954.mp3",
  import.meta.url,
).href;
const classroomBellReady = loadSoundBuffer(
  gunshotAudioContext,
  classroomBellUrl,
)
  .then((buffer) => {
    classroomBellBuffer = buffer;
  })
  .catch((error: unknown) =>
    console.error("Classroom bell audio failed to load.", error),
  );
const deathSoundUrl = new URL(
  "../assets/sounds/universfield-horror-impact-454854.mp3",
  import.meta.url,
).href;
const deathSoundReady = loadSoundBuffer(gunshotAudioContext, deathSoundUrl)
  .then((buffer) => {
    deathSoundBuffer = buffer;
  })
  .catch((error: unknown) =>
    console.error("Death audio failed to load.", error),
  );
const trueCarSoundUrl = new URL(
  "../assets/sounds/universfield-car-horn-02-153260.mp3",
  import.meta.url,
).href;
const trueCarSoundReady = loadSoundBuffer(gunshotAudioContext, trueCarSoundUrl)
  .then((buffer) => {
    trueCarSoundBuffer = buffer;
  })
  .catch((error: unknown) =>
    console.error("True car audio failed to load.", error),
  );
const runningSoundUrl = new URL(
  "../assets/sounds/freeeverythingxx-running-on-concrete-268478.mp3",
  import.meta.url,
).href;
const runningSoundReady = loadSoundBuffer(gunshotAudioContext, runningSoundUrl)
  .then((buffer) => {
    const analysis = analyzeRunningFootsteps(
      buffer,
      gunshotAudioContext,
      runningFootstepInterval,
    );
    runningFootstepInterval = analysis.interval;
    runningFootstepSamples = analysis.samples;
  })
  .catch((error: unknown) =>
    console.error("Running audio failed to load.", error),
  );
const audioAssetsReady = Promise.all([
  gunshotSoundReady,
  knockSoundReady,
  carBreakSoundReady,
  heartbeatSoundReady,
  reloadSoundReady,
  dryFireSoundReady,
  chaseSoundReady,
  classroomBellReady,
  deathSoundReady,
  trueCarSoundReady,
  runningSoundReady,
]);

function resolveWeaponForMode(_mode: ShootingMode): WeaponId {
  return "pistol";
}

function saveCurrentWeaponProfile(): void {
  if (restoringSettings) return;
  const profile = weaponProfiles[gameState.currentWeapon];
  profile.bulletSpeed = Number(bulletSpeedSetting.value);
  profile.recoil = Number(recoilSetting.value);
  profile.spread = Number(spreadSetting.value);
  profile.movementSpread = Number(movementSpreadSetting.value);
  profile.aimingJumpSpread = Number(aimingJumpSpreadSetting.value);
  profile.hipfireJumpSpread = Number(hipfireJumpSpreadSetting.value);
  profile.bulletDrop = Number(bulletDropSetting.value);
  profile.recoilMode = recoilModeSetting.value as RecoilMode;
}

function applyWeaponProfile(weaponId: WeaponId): void {
  const profile = weaponProfiles[weaponId];
  recoilMode = profile.recoilMode;
  recoilModeSetting.value = profile.recoilMode;
  bulletSpeedSetting.max = "1000";
  bulletSpeedSetting.value = profile.bulletSpeed.toString();
  bulletSpeedValue.value = profile.bulletSpeed.toString();
  recoilSetting.value = profile.recoil.toString();
  recoilValue.value = `${profile.recoil}%`;
  spreadSetting.value = profile.spread.toString();
  spreadValue.value = `${profile.spread}%`;
  movementSpreadSetting.value = profile.movementSpread.toString();
  movementSpreadValue.value = `${profile.movementSpread}%`;
  aimingJumpSpreadSetting.value = profile.aimingJumpSpread.toString();
  aimingJumpSpreadValue.value = `${profile.aimingJumpSpread}%`;
  hipfireJumpSpreadSetting.value = profile.hipfireJumpSpread.toString();
  hipfireJumpSpreadValue.value = `${profile.hipfireJumpSpread}%`;
  bulletDropSetting.value = profile.bulletDrop.toString();
  bulletDropValue.value = `${profile.bulletDrop}%`;
  projectileVelocity = profile.bulletSpeed;
  recoilMultiplier = profile.recoil / 50;
  spreadMultiplier = profile.spread / 50;
  movementSpreadMultiplier = profile.movementSpread / 100;
  aimingJumpSpreadMultiplier = profile.aimingJumpSpread / 100;
  hipfireJumpSpreadMultiplier = profile.hipfireJumpSpread / 100;
  gravityMultiplier = profile.bulletDrop / 100;
}

function applyWeaponSelection(): void {
  gameState.currentWeapon = resolveWeaponForMode(shootingMode);
  applyWeaponProfile(gameState.currentWeapon);
  stopAutomaticFire();
  scopeOverlay.classList.remove("is-visible");
  if (coltModel) coltModel.visible = gameState.currentWeapon === "pistol";
  currentWeaponModel = coltModel;
  const muzzlePosition = weaponMuzzlePositions.get(gameState.currentWeapon);
  if (muzzlePosition) {
    modelMuzzle.position.copy(muzzlePosition);
    muzzleFlash.position.copy(modelMuzzle.position);
    muzzleFlash.position.y += 0.22;
    muzzleFlash.position.z -= 0.2;
  }
  currentWeaponName.textContent = "M1911";
  resetRecoilState();
  resetCameraView();
  if (aiming) setAiming(true);
  else weaponRotation.copy(hipRotation);
  refreshWeaponRender();
}

function playGunshot(): void {
  if (!gunshotBuffer) return;
  const buffer = gunshotBuffer;
  const startGunshot = (): void => {
    const { source } = createBufferedSound({
      context: gunshotAudioContext,
      buffer,
      volume: getMasterVolumeMultiplier(),
    });
    source.start();
  };
  if (gunshotAudioContext.state === "running") startGunshot();
  else
    void gunshotAudioContext
      .resume()
      .then(startGunshot)
      .catch((error: unknown) =>
        console.error("Gunshot audio playback failed.", error),
      );
}

function playDryFire(): void {
  if (!dryFireSoundBuffer) return;
  const { source } = createBufferedSound({
    context: gunshotAudioContext,
    buffer: dryFireSoundBuffer,
    volume: getMasterVolumeMultiplier(),
  });
  source.start();
}

function playChaseSound(): void {
  if (!chaseSoundBuffer) return;
  const now = performance.now() / 1000;
  if (now - lastChaseSoundAt < 0.35) return;
  lastChaseSoundAt = now;
  const { source } = createBufferedSound({
    context: gunshotAudioContext,
    buffer: chaseSoundBuffer,
    volume: getMasterVolumeMultiplier(),
  });
  source.start();
}

function playClassroomBell(): void {
  if (
    !gameState.isInClassroom ||
    gameState.isPaused ||
    classroomBellPlaying ||
    !classroomBellBuffer
  )
    return;
  const { source } = createBufferedSound({
    context: gunshotAudioContext,
    buffer: classroomBellBuffer,
    volume: getMasterVolumeMultiplier(),
    playbackRate: classroomBellPlaybackRate,
  });
  classroomBellSource = source;
  classroomBellPlaying = true;
  classroomTeacherTurnPendingAt = -Infinity;
  source.onended = () => {
    if (classroomBellSource !== source) return;
    classroomBellSource = null;
    classroomBellPlaying = false;
    classroomBellNextAt = performance.now() / 1000 + classroomBellInterval;
    if (classroomDeferredReloadSoundUntil > performance.now() / 1000) {
      const deferredPosition = classroomDeferredReloadSoundPosition.clone();
      classroomDeferredReloadSoundUntil = -Infinity;
      alertMatryoshkasToSound(deferredPosition);
    } else {
      classroomDeferredReloadSoundUntil = -Infinity;
    }
  };
  source.start();
}

function updateClassroomBell(now: number): void {
  if (!gameState.isInClassroom || gameState.isPaused || !controls.isLocked)
    return;
  if (!Number.isFinite(classroomBellNextAt)) {
    void classroomBellReady.then(playClassroomBell);
    classroomBellNextAt = now;
    return;
  }
  if (now >= classroomBellNextAt) {
    void classroomBellReady.then(playClassroomBell);
    classroomBellNextAt = Infinity;
  }
}

function playDeathSound(): void {
  if (!deathSoundBuffer) return;
  const { source } = createBufferedSound({
    context: gunshotAudioContext,
    buffer: deathSoundBuffer,
    volume: getMasterVolumeMultiplier(),
  });
  if (gunshotAudioContext.state === "suspended") {
    void gunshotAudioContext
      .resume()
      .then(() => source.start())
      .catch((error: unknown) =>
        console.error("Death audio playback failed.", error),
      );
  } else source.start();
}

function startWeaponReload(): void {
  if (
    weaponReloading ||
    !gameState.weaponPickupCollected ||
    !gameState.weaponDrawn ||
    gameState.weaponHolstering ||
    gameState.weaponRaising ||
    trueCarEntered
  )
    return;
  reloadPrompt.hidden = true;
  reloadPrompt.classList.remove("is-fading");
  if (reloadPromptFadeTimer !== null) {
    window.clearTimeout(reloadPromptFadeTimer);
    reloadPromptFadeTimer = null;
  }
  weaponReloading = true;
  const generation = ++reloadGeneration;
  setAiming(false);
  const beginReload = (): void => {
    if (
      !reloadSoundBuffer ||
      !weaponReloading ||
      generation !== reloadGeneration ||
      !gameState.weaponDrawn ||
      gameState.weaponHolstering ||
      gameState.weaponRaising
    )
      return;
    camera.getWorldPosition(cameraOrigin);
    alertMatryoshkasToSound(
      cameraOrigin,
      "player",
      false,
      performance.now() / 1000 + reloadSoundBuffer.duration,
    );
    weaponReloadDuration = reloadSoundBuffer.duration;
    weaponReloadStartedAt = gunshotAudioContext.currentTime;
    const { source } = createBufferedSound({
      context: gunshotAudioContext,
      buffer: reloadSoundBuffer,
      volume: getMasterVolumeMultiplier(),
    });
    reloadSoundSource = source;
    source.onended = () => {
      if (reloadSoundSource !== source || generation !== reloadGeneration)
        return;
      reloadSoundSource = null;
      gameState.weaponAmmo = weaponMagazineSize;
      weaponReloading = false;
      weaponReloadStartedAt = -Infinity;
      reloadPrompt.hidden = true;
    };
    source.start();
  };
  const readyToReload = reloadSoundBuffer
    ? Promise.resolve()
    : reloadSoundReady;
  void readyToReload
    .then(() => {
      if (gunshotAudioContext.state === "running") beginReload();
      else return gunshotAudioContext.resume().then(beginReload);
    })
    .catch((error: unknown) => {
      weaponReloading = false;
      console.error("Reload audio playback failed.", error);
    });
}

function cancelWeaponReload(): void {
  reloadGeneration += 1;
  if (reloadSoundSource) {
    reloadSoundSource.onended = null;
    reloadSoundSource.stop();
    reloadSoundSource.disconnect();
    reloadSoundSource = null;
  }
  weaponReloading = false;
  weaponReloadStartedAt = -Infinity;
  reloadPrompt.hidden = true;
  reloadPrompt.classList.remove("is-fading");
  if (reloadPromptFadeTimer !== null) {
    window.clearTimeout(reloadPromptFadeTimer);
    reloadPromptFadeTimer = null;
  }
}

function playKnockSound(onEnded?: () => void): void {
  if (!knockSoundBuffer) return;
  const startKnock = (): void => {
    if (!knockSoundBuffer) return;
    const { source } = createBufferedSound({
      context: gunshotAudioContext,
      buffer: knockSoundBuffer,
      volume: getMasterVolumeMultiplier(),
    });
    if (onEnded) source.addEventListener("ended", onEnded, { once: true });
    source.start();
  };
  if (gunshotAudioContext.state === "running") startKnock();
  else
    void gunshotAudioContext
      .resume()
      .then(startKnock)
      .catch((error: unknown) =>
        console.error("Knock audio playback failed.", error),
      );
}

function playCarBreakSound(): void {
  if (!carBreakSoundBuffer) return;
  const startCarBreak = (): void => {
    if (!carBreakSoundBuffer) return;
    const { source } = createBufferedSound({
      context: gunshotAudioContext,
      buffer: carBreakSoundBuffer,
      volume: getMasterVolumeMultiplier(),
    });
    carEndingShakeStartedAt = performance.now() / 1000;
    source.start();
  };
  if (gunshotAudioContext.state === "running") startCarBreak();
  else
    void gunshotAudioContext
      .resume()
      .then(startCarBreak)
      .catch((error: unknown) =>
        console.error("Car break audio playback failed.", error),
      );
}

function playHeartbeatSound(): void {
  if (
    !heartbeatSoundBuffer ||
    heartbeatSoundSource ||
    gameState.isPaused ||
    !controls.isLocked ||
    document.hidden ||
    settingsOverlay.classList.contains("is-open")
  )
    return;
  const startHeartbeat = (): void => {
    if (
      !heartbeatSoundBuffer ||
      heartbeatSoundSource ||
      gameState.isPaused ||
      !controls.isLocked ||
      document.hidden ||
      settingsOverlay.classList.contains("is-open")
    )
      return;
    const source = gunshotAudioContext.createBufferSource();
    const gain = gunshotAudioContext.createGain();
    source.buffer = heartbeatSoundBuffer;
    source.loop = true;
    source.loopStart = fearActive ? heartbeatFearLoopStart : 0;
    source.loopEnd = fearActive
      ? heartbeatFearLoopEnd
      : heartbeatSoundBuffer.duration;
    source.playbackRate.value = fearActive
      ? heartbeatFearPlaybackRate
      : heartbeatNormalPlaybackRate;
    gain.gain.value = getMasterVolumeMultiplier() * 2;
    source.connect(gain);
    gain.connect(gunshotAudioContext.destination);
    source.onended = () => {
      if (heartbeatSoundSource === source) heartbeatSoundSource = null;
    };
    heartbeatSoundSource = source;
    heartbeatSoundGain = gain;
    source.start();
  };
  if (gunshotAudioContext.state === "running") startHeartbeat();
  else
    void gunshotAudioContext
      .resume()
      .then(startHeartbeat)
      .catch((error: unknown) =>
        console.error("Heartbeat audio playback failed.", error),
      );
}

function updateHeartbeatPlaybackRate(): void {
  if (!heartbeatSoundSource) return;
  heartbeatSoundSource.loopStart = fearActive ? heartbeatFearLoopStart : 0;
  heartbeatSoundSource.loopEnd = fearActive
    ? heartbeatFearLoopEnd
    : (heartbeatSoundBuffer?.duration ?? heartbeatFearLoopEnd);
  heartbeatSoundSource.playbackRate.value = fearActive
    ? heartbeatFearPlaybackRate
    : heartbeatNormalPlaybackRate;
}

function stopHeartbeatSound(): void {
  if (!heartbeatSoundSource) return;
  heartbeatSoundSource.stop();
  heartbeatSoundSource.disconnect();
  heartbeatSoundSource = null;
  heartbeatSoundGain = null;
}

function ensureHeartbeatSound(): void {
  if (heartbeatSoundSource || heartbeatStartPending || gameState.isPaused)
    return;
  heartbeatStartPending = true;
  void heartbeatSoundReady.then(() => {
    heartbeatStartPending = false;
    playHeartbeatSound();
  });
}

function warmGunshotAudio(): void {
  if (gunshotAudioContext.state === "suspended")
    void gunshotAudioContext.resume();
}

function resumeGameplayAudio(): void {
  const restartHeartbeat = (): void => {
    ensureHeartbeatSound();
  };
  void gunshotAudioContext.resume().then(restartHeartbeat);
}

function playRunningFootstep(): void {
  const play = (): void => {
    if (runningFootstepSamples.length === 0) return;
    const sample =
      runningFootstepSamples[
        nextRunningFootstepIndex % runningFootstepSamples.length
      ];
    nextRunningFootstepIndex += 1;
    const { source, gain } = createBufferedSound({
      context: gunshotAudioContext,
      buffer: sample,
      volume: getMasterVolumeMultiplier() * runningFeedbackStrength,
    });
    runningFootstepSources.add(source);
    runningFootstepGains.set(source, gain);
    source.onended = () => {
      runningFootstepSources.delete(source);
      runningFootstepGains.delete(source);
      source.disconnect();
    };
    source.start();
  };
  if (gunshotAudioContext.state === "running") play();
  else
    void gunshotAudioContext
      .resume()
      .then(play)
      .catch((error: unknown) =>
        console.error("Running audio playback failed.", error),
      );
}

function stopRunningSound(): void {
  runningFootstepSources.forEach((source) => {
    source.onended = null;
    source.stop();
    source.disconnect();
  });
  runningFootstepSources.clear();
  runningFootstepGains.clear();
  nextRunningFootstepIndex = 0;
  runningStepPhase = 0;
  nextRunningStepPhase = 1;
}

function playTrueCarSound(): void {
  if (!trueCar || !keyPickupCollected) return;
  trueCarBounds.setFromObject(trueCar);
  trueCarBounds.getCenter(trueCarWorldPosition);
  alertMatryoshkasToSound(trueCarWorldPosition, "car");
  if (!trueCarSoundBuffer) return;

  const source = gunshotAudioContext.createBufferSource();
  const gain = gunshotAudioContext.createGain();
  const panner = gunshotAudioContext.createPanner();
  panner.panningModel = "HRTF";
  panner.distanceModel = "inverse";
  panner.refDistance = 4;
  panner.maxDistance = 120;
  panner.rolloffFactor = 1;
  panner.positionX.value = trueCarWorldPosition.x;
  panner.positionY.value = trueCarWorldPosition.y;
  panner.positionZ.value = trueCarWorldPosition.z;
  source.buffer = trueCarSoundBuffer;
  gain.gain.value = getMasterVolumeMultiplier();
  source.connect(gain);
  gain.connect(panner);
  panner.connect(gunshotAudioContext.destination);
  trueCarSoundPlaying = true;
  trueCarSoundIndicator.hidden = false;
  source.onended = () => {
    trueCarSoundPlaying = false;
    trueCarSoundIndicator.hidden = true;
  };
  source.start();
}

masterVolumeSetting.addEventListener("input", () => {
  setMasterVolumePercent(Number(masterVolumeSetting.value));
  masterVolumeValue.value = `${masterVolumeSetting.value}%`;
  if (heartbeatSoundGain)
    heartbeatSoundGain.gain.value = getMasterVolumeMultiplier() * 2;
});

function getMuzzleWorldPosition(): THREE.Vector3 {
  camera.updateWorldMatrix(true, true);
  muzzleLocalPosition.set(0, 0.12, 0);
  return modelMuzzle.localToWorld(muzzleLocalPosition.clone());
}

let aiming = false;
crosshair.classList.toggle(
  "is-hipfire-hidden",
  crosshairHideWhenNotAiming && !aiming,
);
let _aimButtonHeld = false;
let recoilPitch = 0;
let appliedRecoilPitch = 0;
let weaponRecoilPitch = 0;
let weaponRecoilVisual = 0;
const recoilLocalAxis = new THREE.Vector3(1, 0, 0);
const recoilRotation = new THREE.Quaternion();
const aimingSpread = 0.004;
const hipfireSpread = 0.02;
let movementSpreadMultiplier = 2.25;
const sprintSpreadMultiplier = 1.2;
let aimingJumpSpreadMultiplier = 5.5;
let hipfireJumpSpreadMultiplier = 4.5;
function getShotSpread(moving: boolean, airborne: boolean): number {
  return calculateShotSpread({
    aiming,
    moving,
    sprinting: keys.has("ShiftLeft") || keys.has("ShiftRight"),
    airborne,
    aimingSpread,
    hipfireSpread,
    spreadMultiplier,
    movementSpreadMultiplier,
    sprintSpreadMultiplier,
    aimingJumpSpreadMultiplier,
    hipfireJumpSpreadMultiplier,
  });
}

function getSpreadPixels(moving: boolean, airborne: boolean): number {
  return calculateSpreadPixels(
    getShotSpread(moving, airborne),
    camera.fov,
    canvas.clientHeight || 1,
  );
}

function triggerMuzzleFlash(): void {
  muzzleFlash.scale.set(
    0.7 + Math.random() * 0.3,
    0.8 + Math.random() * 0.35,
    0.7 + Math.random() * 0.3,
  );
  const muzzleMaterial = muzzleFlash.material as THREE.MeshBasicMaterial;
  gsap.killTweensOf(muzzleMaterial);
  muzzleMaterial.opacity = 0.78;
  gsap.to(muzzleMaterial, {
    opacity: 0,
    duration: 0.07,
    ease: "power2.out",
  });
}

function applyRecoil(): void {
  const strength = calculateRecoilStrength(aiming, recoilMultiplier);
  recoilPitch += strength;
  weaponRecoilPitch += strength * 0.9;
  triggerMuzzleFlash();
}

function resetRecoilState(): void {
  if (Math.abs(appliedRecoilPitch) > 0.000001) {
    recoilRotation.setFromAxisAngle(recoilLocalAxis, -appliedRecoilPitch);
    camera.quaternion.multiply(recoilRotation).normalize();
  }
  recoilPitch = 0;
  appliedRecoilPitch = 0;
  weaponRecoilPitch = 0;
  weaponRecoilVisual = 0;
}

function resetCameraView(): void {
  camera.rotation.x = 0;
  camera.rotation.z = 0;
  camera.updateMatrixWorld(true);
}

function getActiveAdsFov(): number {
  return THREE.MathUtils.clamp(baseFov * (adsFov / 65), 1, 179);
}

function setAiming(nextAiming: boolean): void {
  if (
    nextAiming &&
    (!controls.isLocked ||
      !gameState.weaponPickupCollected ||
      !gameState.weaponDrawn ||
      trueCarEntered)
  )
    return;
  aiming = nextAiming;
  updatePointerSensitivity();
  const position = aiming ? adsPosition : hipPosition;
  const rotation = aiming ? adsRotation : hipRotation;
  gsap.to(weaponPosition, {
    x: position.x,
    y: position.y,
    z: position.z,
    duration: 0.18,
    ease: "power2.out",
  });
  gsap.to(weaponRotation, {
    x: rotation.x,
    y: rotation.y,
    z: rotation.z,
    duration: 0.18,
    ease: "power2.out",
  });
  scopeOverlay.classList.toggle("is-visible", false);
  crosshair.classList.toggle("is-scope-hidden", false);
  crosshair.classList.toggle(
    "is-hipfire-hidden",
    crosshairHideWhenNotAiming && !aiming,
  );
  gsap.to(camera, {
    fov: aiming ? getActiveAdsFov() : baseFov,
    duration: 0.2,
    ease: "power2.out",
    onUpdate: () => camera.updateProjectionMatrix(),
  });
}

function updatePointerSensitivity(): void {
  const baseSensitivity = Number(settingsSensitivity.value) * dpiMultiplier;
  setPointerSensitivity(controls, baseSensitivity, adsSensitivityRatio, aiming);
}

function handlePointerDown(event: PointerEvent): void {
  if (event.button === 0 && controls.isLocked && mapPointSetting.checked) {
    event.preventDefault();
    mapPointPointerDownHandled = true;
    addMapPointFromAim();
    leftButtonHeld = true;
    return;
  }
  if (
    event.button === 0 &&
    controls.isLocked &&
    !trueCarEntered &&
    gameState.weaponPickupCollected &&
    gameState.weaponDrawn &&
    !weaponReloading
  ) {
    event.preventDefault();
    warmGunshotAudio();
    leftButtonHeld = true;
    fireShot();
  }
}

function handleMouseDown(event: MouseEvent): void {
  if (event.button === 0 && controls.isLocked && mapPointSetting.checked) {
    event.preventDefault();
    if (mapPointPointerDownHandled) {
      mapPointPointerDownHandled = false;
      return;
    }
    addMapPointFromAim();
    leftButtonHeld = true;
    return;
  }
  if (
    event.button === 0 &&
    controls.isLocked &&
    !trueCarEntered &&
    gameState.weaponPickupCollected &&
    gameState.weaponDrawn &&
    !weaponReloading &&
    !leftButtonHeld
  ) {
    event.preventDefault();
    warmGunshotAudio();
    leftButtonHeld = true;
    fireShot();
  }
  if (event.button !== 2 || !controls.isLocked) return;
  event.preventDefault();
  _aimButtonHeld = true;
  setAiming(true);
}

function handlePointerUp(event: PointerEvent): void {
  if (event.button === 2) {
    _aimButtonHeld = false;
    setAiming(false);
  }
}

function releaseAim(): void {
  if (aiming) setAiming(false);
}

let automaticFireTimer: number | null = null;
let leftButtonHeld = false;

function stopAutomaticFire(): void {
  if (automaticFireTimer === null) return;
  window.clearInterval(automaticFireTimer);
  automaticFireTimer = null;
}

document.addEventListener("pointerdown", handlePointerDown);
document.addEventListener("mousedown", handleMouseDown);
window.addEventListener("focus", () => {
  warmGunshotAudio();
  if (controls.isLocked) {
    gameState.isPaused = false;
    resumeGameplayAudio();
  }
});
document.addEventListener("pointerup", (event) => {
  handlePointerUp(event);
  if (event.button === 0) {
    leftButtonHeld = false;
    stopAutomaticFire();
  }
});
document.addEventListener("pointercancel", () => {
  _aimButtonHeld = false;
  stopAutomaticFire();
  releaseAim();
});
window.addEventListener("mouseup", (event) => {
  if (event.button === 2) {
    _aimButtonHeld = false;
    releaseAim();
  }
  if (event.button === 0) {
    leftButtonHeld = false;
    stopAutomaticFire();
  }
});
window.addEventListener("blur", () => {
  cancelClassroomBackDoorOpening();
  gameState.isPaused = true;
  _aimButtonHeld = false;
  leftButtonHeld = false;
  stopAutomaticFire();
  releaseAim();
  stopHeartbeatSound();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelClassroomBackDoorOpening();
    gameState.isPaused = true;
    stopAutomaticFire();
    releaseAim();
    stopHeartbeatSound();
  } else if (controls.isLocked) {
    gameState.isPaused = false;
    resumeGameplayAudio();
  }
});
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
settingsSensitivity.addEventListener("input", () => {
  settingsSensitivityValue.value = Number(settingsSensitivity.value).toFixed(2);
  updatePointerSensitivity();
});
dpiSetting.addEventListener("input", () => {
  dpiMultiplier = Number(dpiSetting.value) / 800;
  dpiValue.value = dpiSetting.value;
  updatePointerSensitivity();
});
adsRatioSetting.addEventListener("input", () => {
  adsSensitivityRatio = Number(adsRatioSetting.value);
  adsRatioValue.value = adsRatioSetting.value;
  updatePointerSensitivity();
});
adsFovSetting.addEventListener("input", () => {
  adsFov = Number(adsFovSetting.value);
  adsFovValue.value = adsFovSetting.value;
  if (aiming) {
    camera.fov = getActiveAdsFov();
    camera.updateProjectionMatrix();
  }
});
rawInputSetting.addEventListener("change", () => {
  rawInputEnabled = rawInputSetting.checked;
});

renderDistanceSetting.addEventListener("input", () => {
  const distance = Number(renderDistanceSetting.value);
  camera.far = distance;
  scene.fog = new THREE.Fog(
    backgroundColorSetting.value,
    Math.max(28, distance * 0.15),
    distance,
  );
  renderDistanceValue.value = renderDistanceSetting.value;
  camera.updateProjectionMatrix();
});
maxFpsSetting.addEventListener("change", () => {
  maxFps = Number(maxFpsSetting.value);
});
recoilModeSetting.addEventListener("change", () => {
  recoilMode = recoilModeSetting.value as RecoilMode;
  saveCurrentWeaponProfile();
});
weaponSetting.addEventListener("change", () => {
  _weaponSelection = weaponSetting.value as "auto" | WeaponId;
  applyWeaponSelection();
});
recoilSetting.addEventListener("input", () => {
  recoilMultiplier = Number(recoilSetting.value) / 50;
  recoilValue.value = `${recoilSetting.value}%`;
  if (!restoringSettings)
    weaponProfiles[gameState.currentWeapon].recoil = Number(
      recoilSetting.value,
    );
});
spreadSetting.addEventListener("input", () => {
  spreadMultiplier = Number(spreadSetting.value) / 50;
  spreadValue.value = `${spreadSetting.value}%`;
  if (!restoringSettings)
    weaponProfiles[gameState.currentWeapon].spread = Number(
      spreadSetting.value,
    );
});
movementSpreadSetting.addEventListener("input", () => {
  movementSpreadMultiplier = Number(movementSpreadSetting.value) / 100;
  movementSpreadValue.value = `${movementSpreadSetting.value}%`;
  if (!restoringSettings)
    weaponProfiles[gameState.currentWeapon].movementSpread = Number(
      movementSpreadSetting.value,
    );
});
aimingJumpSpreadSetting.addEventListener("input", () => {
  aimingJumpSpreadMultiplier = Number(aimingJumpSpreadSetting.value) / 100;
  aimingJumpSpreadValue.value = `${aimingJumpSpreadSetting.value}%`;
  if (!restoringSettings)
    weaponProfiles[gameState.currentWeapon].aimingJumpSpread = Number(
      aimingJumpSpreadSetting.value,
    );
});
hipfireJumpSpreadSetting.addEventListener("input", () => {
  hipfireJumpSpreadMultiplier = Number(hipfireJumpSpreadSetting.value) / 100;
  hipfireJumpSpreadValue.value = `${hipfireJumpSpreadSetting.value}%`;
  if (!restoringSettings)
    weaponProfiles[gameState.currentWeapon].hipfireJumpSpread = Number(
      hipfireJumpSpreadSetting.value,
    );
});
bulletDropSetting.addEventListener("input", () => {
  gravityMultiplier = Number(bulletDropSetting.value) / 100;
  bulletDropValue.value = `${bulletDropSetting.value}%`;
  if (!restoringSettings)
    weaponProfiles[gameState.currentWeapon].bulletDrop = Number(
      bulletDropSetting.value,
    );
});
trackingSpeedSetting.addEventListener("input", () => {
  trackingSpeed = Number(trackingSpeedSetting.value);
  trackingSpeedValue.value = trackingSpeed.toFixed(1);
  if (shootingMode === "strafetrack")
    trackingVelocity.x = strafetrackDirection * trackingSpeed;
});
fallingHorizontalForceSetting.addEventListener("input", () => {
  fallingHorizontalForce = Number(fallingHorizontalForceSetting.value);
  fallingHorizontalForceValue.value = fallingHorizontalForce.toFixed(1);
});
fallingLaunchSetting.addEventListener("input", () => {
  fallingLaunchSpeed = Number(fallingLaunchSetting.value);
  fallingLaunchValue.value = fallingLaunchSpeed.toFixed(1);
});
fallingGravitySetting.addEventListener("input", () => {
  fallingGravity = Number(fallingGravitySetting.value);
  fallingGravityValue.value = fallingGravity.toFixed(1);
});
fallingRespawnDelaySetting.addEventListener("input", () => {
  fallingRespawnDelay = Number(fallingRespawnDelaySetting.value);
  fallingRespawnDelayValue.value = `${fallingRespawnDelay.toFixed(2)}s`;
});
targetSizeSetting.addEventListener("input", () => {
  targetSizeMultiplier = Number(targetSizeSetting.value) / 100;
  updatePrecisionTargetScale();
  targetSizeValue.value = `${targetSizeSetting.value}%`;
});
backgroundColorSetting.addEventListener("input", () => {
  scene.background = new THREE.Color(backgroundColorSetting.value);
  scene.fog = new THREE.Fog(
    backgroundColorSetting.value,
    Math.max(28, camera.far * 0.15),
    camera.far,
  );
});
floorColorSetting.addEventListener("input", () => {
  floor.material.color.set(floorColorSetting.value);
});
gridColorSetting.addEventListener("input", () => {
  gridMaterials.forEach((material) =>
    material.color.set(gridColorSetting.value),
  );
});
bindSettingsPreviewEvents({
  crosshairTargets: crosshairPreviewTargets,
  hitMarkerTargets: hitMarkerPreviewTargets,
  crosshairStyle: crosshairStyleSetting,
  crosshairColor: crosshairColorSetting,
  crosshairOutlineColor: crosshairOutlineColorSetting,
  crosshairOutlineThickness: crosshairOutlineThicknessSetting,
  crosshairOutlineThicknessValue,
  crosshairGap: crosshairGapSetting,
  crosshairGapValue,
  crosshairLength: crosshairLengthSetting,
  crosshairLengthValue,
  crosshairThickness: crosshairThicknessSetting,
  crosshairThicknessValue,
  crosshairDotSize: crosshairDotSizeSetting,
  crosshairDotSizeValue,
  crosshairCircleSize: crosshairCircleSizeSetting,
  crosshairCircleSizeValue,
  crosshairOpacity: crosshairOpacitySetting,
  crosshairOpacityValue,
  hitMarkerColor: hitMarkerColorSetting,
  hitMarkerSize: hitMarkerSizeSetting,
  hitMarkerSizeValue,
  hitMarkerLength: hitMarkerLengthSetting,
  hitMarkerLengthValue,
  hitMarkerThickness: hitMarkerThicknessSetting,
  hitMarkerThicknessValue,
  hitMarkerGap: hitMarkerGapSetting,
  hitMarkerGapValue,
});
crosshairDynamicSetting.addEventListener("change", () => {
  crosshairDynamicEnabled = crosshairDynamicSetting.checked;
});
crosshairHideWhenNotAimingSetting.addEventListener("change", () => {
  crosshairHideWhenNotAiming = crosshairHideWhenNotAimingSetting.checked;
  crosshair.classList.toggle(
    "is-hipfire-hidden",
    crosshairHideWhenNotAiming && !aiming,
  );
});
crosshairDynamicStrengthSetting.addEventListener("input", () => {
  crosshairDynamicStrength =
    Number(crosshairDynamicStrengthSetting.value) / 100;
  crosshairDynamicStrengthValue.value = `${crosshairDynamicStrengthSetting.value}%`;
});
hitMarkerDurationSetting.addEventListener("input", () => {
  hitMarkerDuration = Number(hitMarkerDurationSetting.value);
  hitMarkerDurationValue.value = `${hitMarkerDuration.toFixed(2)}s`;
});

bindSettingsCategories(settingsCategoryButtons, settingsCategoryPanels);

fovSetting.addEventListener("input", () => {
  baseFov = Number(fovSetting.value);
  camera.fov = aiming ? getActiveAdsFov() : baseFov;
  fovValue.value = fovSetting.value;
  camera.updateProjectionMatrix();
});

resolutionScaleSetting.addEventListener("input", () => {
  resolutionScale = Number(resolutionScaleSetting.value) / 100;
  resolutionScaleValue.value = `${resolutionScaleSetting.value}%`;
  renderer.setPixelRatio(getRenderPixelRatio());
  resizeGameRenderer(renderer, camera, canvas);
});

const keyInput = createKeyInputState();
const { keys } = keyInput;
const movement = new THREE.Vector3();
const direction = new THREE.Vector3();
const jumpMomentumDirection = new THREE.Vector3();
const playerHeight = 3.4;
const playerCollisionRadius = 0.18;
const gravity = 18;
const jumpVelocity = 5.5;
const keyPickupDistance = 4;
const keyPickupWorldPosition = new THREE.Vector3();
const keyPickupLookDirection = new THREE.Vector3();
const keyPickupToPlayerDirection = new THREE.Vector3();
const trueCarWorldPosition = new THREE.Vector3();
const trueCarLookDirection = new THREE.Vector3();
const trueCarToPlayerDirection = new THREE.Vector3();
const trueCarIndicatorForward = new THREE.Vector3();
const trueCarIndicatorRight = new THREE.Vector3();
const trueCarIndicatorDirection = new THREE.Vector3();
const trueCarBounds = new THREE.Box3();
const trueCarClosestPoint = new THREE.Vector3();
const driverSeatPosition = new THREE.Vector3();
const driverSeatLookAt = new THREE.Vector3();
const trueCarWorldQuaternion = new THREE.Quaternion();
const carEndingBasePosition = new THREE.Vector3();
const carEndingBaseQuaternion = new THREE.Quaternion();
const carEndingShakeQuaternion = new THREE.Quaternion();
const carEndingShakeAxis = new THREE.Vector3(0, 0, 1);
const driverSeatLeft = new THREE.Vector3(-0.75, 0, 0);
const driverSeatBack = new THREE.Vector3(0, 0, 0.8);
const driverSeatViewDistance = 10;
const driverSeatInitialView = new THREE.Vector3(-1, 0, 0);
const trueCarInteractionDistance = 4.5;
const trueCarInteractionAngle = 45;
const classroomSeatPosition = new THREE.Vector3(1.32, 3.1, -2.241);
const classroomSeatExitPosition = new THREE.Vector3(3.038, 0.125, -1.781);
const classroomWeaponSpawnPosition = new THREE.Vector3(1.307, 2.36, -1.086);
const classroomSeatExitCameraPosition = new THREE.Vector3();
const classroomFrontDirection = new THREE.Vector3(0, 0, 1);
const classroomSeatLookAt = new THREE.Vector3();
const classroomSeatInteractionDistance = 2;
const classroomSeatInteractionAngle = 55;
const classroomBackDoorHandlePosition = new THREE.Vector3(-7.666, 0.125, 5.587);
const classroomBackDoorInteractionDistance = 2.0;
const classroomBackDoorInteractionAngle = 45;
let classroomBackDoorOpening = false;
let classroomBackDoorOpened = false;
let classroomBackDoorOpeningStartedAt = -Infinity;
let classroomBackDoorOpeningTimer: number | null = null;
const classroomBackDoorOpeningDuration = 3500;
const classroomStudentLookDirection = new THREE.Vector3();
const classroomStudentToPlayerDirection = new THREE.Vector3();
const weaponPickupDistance = 4;
const weaponHolsterPosition = new THREE.Vector3(0.44, -1.45, -0.58);
const weaponHolsterRotation = new THREE.Euler(0.72, 0.04, 0.02);
const weaponPickupWorldPosition = new THREE.Vector3();
const weaponPickupToPlayerDirection = new THREE.Vector3();
let verticalVelocity = 0;
let isGrounded = false;
let jumpMomentumActive = false;

function isKeyWithinPickupRange(): boolean {
  if (
    !controls.isLocked ||
    !keyPickupObject ||
    keyPickupCollected ||
    !keyPickupObject.visible
  )
    return false;
  keyPickupObject.getWorldPosition(keyPickupWorldPosition);
  const horizontalDistance = Math.hypot(
    camera.position.x - keyPickupWorldPosition.x,
    camera.position.z - keyPickupWorldPosition.z,
  );
  if (horizontalDistance > keyPickupDistance) return false;

  camera.getWorldDirection(keyPickupLookDirection);
  keyPickupToPlayerDirection
    .copy(keyPickupWorldPosition)
    .sub(camera.position)
    .normalize();
  const lookDot = keyPickupLookDirection.dot(keyPickupToPlayerDirection);
  return lookDot >= Math.cos(THREE.MathUtils.degToRad(32));
}

function updateKeyInteractionPrompt(): void {
  const mode = gameState.isInClassroom
    ? "classroom"
    : gameState.isInChess
      ? "chess"
      : "parking-lot";
  renderInteractionPrompts({
    elements: hudOverlayElements,
    mode,
    controlsLocked: controls.isLocked,
    weaponPickupCollected: gameState.weaponPickupCollected,
    weaponInRange: mode !== "chess" && isWeaponWithinPickupRange(),
    classroomBackDoorOpening,
    backDoorInRange:
      mode === "classroom" && isClassroomBackDoorWithinInteractionRange(),
    classroomSeatActive,
    classroomSeatInRange:
      mode !== "chess" && isClassroomSeatWithinInteractionRange(),
    keyInRange: mode === "parking-lot" && isKeyWithinPickupRange(),
    keyPickupCollected,
    trueCarInRange: mode === "parking-lot" && isTrueCarWithinInteractionRange(),
  });
}

function isClassroomBackDoorWithinInteractionRange(): boolean {
  if (
    !controls.isLocked ||
    !gameState.isInClassroom ||
    classroomSeatActive ||
    classroomBackDoorOpened
  )
    return false;
  const horizontalDistance = Math.hypot(
    camera.position.x - classroomBackDoorHandlePosition.x,
    camera.position.z - classroomBackDoorHandlePosition.z,
  );
  if (horizontalDistance > classroomBackDoorInteractionDistance) return false;
  const horizontalLookDirection = camera.getWorldDirection(new THREE.Vector3());
  horizontalLookDirection.y = 0;
  horizontalLookDirection.normalize();
  keyPickupToPlayerDirection
    .copy(classroomBackDoorHandlePosition)
    .sub(camera.position);
  keyPickupToPlayerDirection.y = 0;
  keyPickupToPlayerDirection.normalize();
  return (
    horizontalLookDirection.dot(keyPickupToPlayerDirection) >=
    Math.cos(THREE.MathUtils.degToRad(classroomBackDoorInteractionAngle))
  );
}

function isClassroomSeatWithinInteractionRange(): boolean {
  if (!controls.isLocked || !gameState.isInClassroom || classroomSeatActive)
    return false;
  if (
    camera.position.distanceTo(classroomSeatPosition) >
    classroomSeatInteractionDistance
  )
    return false;
  camera.getWorldDirection(keyPickupLookDirection);
  keyPickupToPlayerDirection
    .copy(classroomSeatPosition)
    .sub(camera.position)
    .normalize();
  return (
    keyPickupLookDirection.dot(keyPickupToPlayerDirection) >=
    Math.cos(THREE.MathUtils.degToRad(classroomSeatInteractionAngle))
  );
}

function sitAtClassroomSeat(force = false): void {
  if (!force && !isClassroomSeatWithinInteractionRange()) return;
  classroomStudents.forEach((student) => {
    if (classroomDeadStudents.has(student)) return;
    const initialRotation = classroomStudentInitialRotations.get(student);
    if (initialRotation) {
      gsap.killTweensOf(student.rotation);
      student.quaternion.copy(initialRotation);
    }
  });
  gameState.playerSprintActive = false;
  keyInput.delete("ShiftLeft");
  keyInput.delete("ShiftRight");
  classroomStudentKnockdownUntil.clear();
  classroomStudentsAlerted = false;
  classroomTeacherStudentTurnAt = -Infinity;
  classroomSeatLookAt.copy(classroomSeatPosition).add(classroomFrontDirection);
  camera.position.copy(classroomSeatPosition);
  camera.lookAt(classroomSeatLookAt);
  camera.updateMatrixWorld(true);
  classroomSeatActive = true;
  classroomSeatPrompt.hidden = true;
  movementBobPhase = 0;
  weaponSwayFactor = 0;
  cameraBobOffset = 0;
  cameraBobQuaternion.identity();
  weapon.position.copy(weaponPosition);
  weapon.rotation.copy(weaponRotation);
  verticalVelocity = 0;
  isGrounded = true;
  lastSafePlayerPosition.copy(classroomSeatPosition);
  hasSafePlayerPosition = true;
}

function updateClassroomStudentsFacingPlayer(): void {
  updateClassroomStudentFacing({
    classroomActive: gameState.isInClassroom,
    seatActive: classroomSeatActive,
    studentsAlerted: classroomStudentsAlerted,
    students: classroomStudents,
    deadStudents: classroomDeadStudents,
    cameraPosition: camera.position,
    now: performance.now() / 1000,
    alertStudents: alertClassroomStudents,
  });
}

function knockDownClassroomStudent(
  student: THREE.Object3D,
  now: number,
  impactDirection?: THREE.Vector3,
): void {
  knockDownClassroomStudentRuntime({
    student,
    now,
    deadStudents: classroomDeadStudents,
    knockdownUntil: classroomStudentKnockdownUntil,
    alertStudents: alertClassroomStudents,
    impactDirection,
  });
}

function updateClassroomFearState(): void {
  if (
    !gameState.isInClassroom ||
    classroomSeatActive ||
    classroomStudents.length === 0
  ) {
    if (gameState.isInClassroom || classroomSeatActive) {
      classroomFearActive = false;
      fearActive = classroomFearActive;
      fearOverlay.classList.remove("is-visible");
      updateHeartbeatPlaybackRate();
    }
    return;
  }
  const allStudentsWatching = areAllClassroomStudentsWatching({
    students: classroomStudents,
    cameraPosition: camera.position,
    maxDistance: 45,
    lookDirection: classroomStudentLookDirection,
    toPlayerDirection: classroomStudentToPlayerDirection,
  });
  classroomFearActive = allStudentsWatching;
  fearActive = classroomFearActive;
  fearOverlay.classList.toggle("is-visible", fearActive);
  updateHeartbeatPlaybackRate();
}

function isWeaponWithinPickupRange(): boolean {
  if (
    !controls.isLocked ||
    !weaponPickupObject ||
    gameState.weaponPickupCollected ||
    !weaponPickupObject.visible
  )
    return false;
  weaponPickupObject.getWorldPosition(weaponPickupWorldPosition);
  if (
    camera.position.distanceTo(weaponPickupWorldPosition) > weaponPickupDistance
  )
    return false;
  camera.getWorldDirection(keyPickupLookDirection);
  weaponPickupToPlayerDirection
    .copy(weaponPickupWorldPosition)
    .sub(camera.position)
    .normalize();
  return (
    keyPickupLookDirection.dot(weaponPickupToPlayerDirection) >=
    Math.cos(THREE.MathUtils.degToRad(40))
  );
}

function collectWeaponPickup(): void {
  if (!isWeaponWithinPickupRange() || !weaponPickupObject) return;
  gameState.weaponPickupCollected = true;
  weaponPickupObject.visible = false;
  weapon.visible = true;
  weaponPickupPrompt.hidden = true;
  gameState.weaponDrawn = true;
}

function setWeaponDrawn(drawn: boolean): void {
  if (!gameState.weaponPickupCollected || trueCarEntered) return;
  if (drawn) {
    if (gameState.weaponDrawn && !gameState.weaponHolstering) return;
    gameState.weaponHolstering = false;
    gameState.weaponRaising = true;
    gameState.weaponDrawn = true;
    weapon.visible = true;
    gsap.killTweensOf(weapon.position);
    gsap.killTweensOf(weapon.rotation);
    weapon.position.copy(weaponHolsterPosition);
    weapon.rotation.copy(weaponHolsterRotation);
    gsap.to(weapon.position, {
      x: weaponPosition.x,
      y: weaponPosition.y,
      z: weaponPosition.z,
      duration: 0.3,
      ease: "power2.out",
      onComplete: () => {
        gameState.weaponRaising = false;
      },
    });
    gsap.to(weapon.rotation, {
      x: weaponRotation.x,
      y: weaponRotation.y,
      z: weaponRotation.z,
      duration: 0.3,
      ease: "power2.out",
    });
  } else {
    if (gameState.weaponHolstering || !gameState.weaponDrawn) return;
    if (weaponReloading) cancelWeaponReload();
    gameState.weaponHolstering = true;
    gameState.weaponRaising = false;
    setAiming(false);
    stopAutomaticFire();
    gsap.killTweensOf(weapon.position);
    gsap.killTweensOf(weapon.rotation);
    gsap.to(weapon.position, {
      x: weaponHolsterPosition.x,
      y: weaponHolsterPosition.y,
      z: weaponHolsterPosition.z,
      duration: 0.3,
      ease: "power2.in",
    });
    gsap.to(weapon.rotation, {
      x: weaponHolsterRotation.x,
      y: weaponHolsterRotation.y,
      z: weaponHolsterRotation.z,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        if (!gameState.weaponHolstering) return;
        gameState.weaponHolstering = false;
        gameState.weaponDrawn = false;
        weapon.visible = false;
      },
    });
  }
  weaponModePrompt.innerHTML = drawn
    ? '<span class="weapon-key-hint is-active"><b>1</b> DRAW</span><span class="weapon-key-hint"><b>2</b> HOLSTER</span><span><b>F</b> INTERACT</span>'
    : '<span class="weapon-key-hint"><b>1</b> DRAW</span><span class="weapon-key-hint is-active"><b>2</b> HOLSTER</span><span><b>F</b> INTERACT</span>';
  weaponModePrompt
    .querySelectorAll<HTMLElement>(".weapon-key-hint")
    .forEach((hint) => {
      hint.hidden = !gameState.weaponPickupCollected;
    });
}

function placeWeaponPickupWhenReady(): void {
  if (!weaponPickupObject) return;
  const activeRoot = gameState.isInClassroom ? classroomRoot : parkingLotRoot;
  const activeBounds = gameState.isInClassroom
    ? classroomBounds
    : parkingBounds;
  if (
    !activeRoot ||
    !activeBounds ||
    (!gameState.isInClassroom && !parkedCarsReady)
  ) {
    requestAnimationFrame(placeWeaponPickupWhenReady);
    return;
  }
  if (gameState.isInClassroom) {
    weaponPickupObject.position.copy(classroomWeaponSpawnPosition);
    weaponPickupObject.rotation.set(
      0,
      Math.random() * Math.PI * 2,
      Math.PI / 2,
    );
    weaponPickupObject.visible = !gameState.weaponPickupCollected;
    scene.add(weaponPickupObject);
    return;
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = gameState.isInClassroom
      ? THREE.MathUtils.randFloat(1.2, 2.8)
      : THREE.MathUtils.randFloat(3, 8);
    const origin = gameState.isInClassroom
      ? classroomSeatPosition
      : camera.position;
    const x = origin.x + Math.cos(angle) * distance;
    const z = origin.z + Math.sin(angle) * distance;
    if (
      x < activeBounds.min.x + 1 ||
      x > activeBounds.max.x - 1 ||
      z < activeBounds.min.z + 1 ||
      z > activeBounds.max.z - 1
    )
      continue;
    if (
      !gameState.isInClassroom &&
      overlapsMatryoshkaVehicleObstacle(x, z, matryoshkaObstaclePadding)
    )
      continue;
    parkingGroundRaycaster.set(
      new THREE.Vector3(x, activeBounds.max.y + 5, z),
      new THREE.Vector3(0, -1, 0),
    );
    const ground = parkingGroundRaycaster
      .intersectObject(activeRoot, true)
      .find((intersection) => isCollisionSurface(intersection.object));
    if (!ground) continue;
    weaponPickupObject.position.set(x, ground.point.y + 0.35, z);
    weaponPickupObject.rotation.set(
      0,
      Math.random() * Math.PI * 2,
      Math.PI / 2,
    );
    weaponPickupObject.visible = !gameState.weaponPickupCollected;
    scene.add(weaponPickupObject);
    return;
  }
  if (gameState.isInClassroom) {
    weaponPickupObject.position.set(
      classroomSeatExitPosition.x,
      classroomSeatExitPosition.y + 0.35,
      classroomSeatExitPosition.z,
    );
    weaponPickupObject.rotation.set(
      0,
      Math.random() * Math.PI * 2,
      Math.PI / 2,
    );
    weaponPickupObject.visible = !gameState.weaponPickupCollected;
    scene.add(weaponPickupObject);
    return;
  }
  requestAnimationFrame(placeWeaponPickupWhenReady);
}

function collectKeyPickup(): void {
  if (!isKeyWithinPickupRange() || !keyPickupObject) return;
  keyPickupCollected = true;
  keyPickupObject.visible = false;
  keyEspObjects.forEach((outline) => {
    outline.visible = false;
  });
  updateKeyInteractionPrompt();
}

function isTrueCarWithinInteractionRange(): boolean {
  if (!controls.isLocked || !keyPickupCollected || !trueCar || trueCarEntered)
    return false;
  trueCarBounds.setFromObject(trueCar);
  trueCarBounds.getCenter(trueCarWorldPosition);
  trueCarBounds.clampPoint(camera.position, trueCarClosestPoint);
  const horizontalDistance = Math.hypot(
    camera.position.x - trueCarClosestPoint.x,
    camera.position.z - trueCarClosestPoint.z,
  );
  if (horizontalDistance > trueCarInteractionDistance) return false;

  camera.getWorldDirection(trueCarLookDirection);
  trueCarLookDirection.y = 0;
  trueCarLookDirection.normalize();
  trueCarToPlayerDirection.copy(trueCarClosestPoint).sub(camera.position);
  trueCarToPlayerDirection.y = 0;
  trueCarToPlayerDirection.normalize();
  return (
    trueCarLookDirection.dot(trueCarToPlayerDirection) >=
    Math.cos(THREE.MathUtils.degToRad(trueCarInteractionAngle))
  );
}

function enterTrueCar(): void {
  if (!isTrueCarWithinInteractionRange() || !trueCar) return;
  trueCar.getWorldQuaternion(trueCarWorldQuaternion);
  trueCarBounds.setFromObject(trueCar);
  trueCarBounds.getCenter(driverSeatPosition);
  driverSeatPosition.y = THREE.MathUtils.lerp(
    trueCarBounds.min.y,
    trueCarBounds.max.y,
    0.65,
  );
  driverSeatPosition.add(
    driverSeatLeft.clone().applyQuaternion(trueCarWorldQuaternion),
  );
  driverSeatPosition.add(
    driverSeatBack.clone().applyQuaternion(trueCarWorldQuaternion),
  );
  driverSeatLookAt
    .copy(driverSeatInitialView)
    .applyQuaternion(trueCarWorldQuaternion)
    .multiplyScalar(driverSeatViewDistance)
    .add(driverSeatPosition);
  camera.position.copy(driverSeatPosition);
  camera.lookAt(driverSeatLookAt);
  camera.updateMatrixWorld(true);
  trueCarEntered = true;
  carEndingBasePosition.copy(trueCar.position);
  carEndingBaseQuaternion.copy(trueCar.quaternion);
  trueCarPrompt.hidden = true;
  episodeFadeOverlay.classList.add("is-fading");
  window.setTimeout(() => {
    void knockSoundReady.then(() =>
      playKnockSound(() => {
        window.setTimeout(() => {
          void knockSoundReady.then(() =>
            playKnockSound(() => {
              window.setTimeout(() => {
                void carBreakSoundReady.then(playCarBreakSound);
              }, 2000);
            }),
          );
        }, 1000);
      }),
    );
  }, 1000);
  let endingReturnScheduled = false;
  const finishTrueCarEnding = (): void => {
    if (!trueCarEntered || endingReturnScheduled) return;
    endingReturnScheduled = true;
    window.setTimeout(returnToEpisodeSelect, 1000);
  };
  episodeFadeOverlay.addEventListener(
    "transitionend",
    (event) => {
      if (event.propertyName === "opacity") finishTrueCarEnding();
    },
    { once: true },
  );
  window.setTimeout(finishTrueCarEnding, 10000);
}

function openClassroomBackDoor(): void {
  if (classroomBackDoorOpening || !isClassroomBackDoorWithinInteractionRange())
    return;
  classroomBackDoorOpening = true;
  classroomBackDoorOpeningStartedAt = performance.now();
  renderClassroomDoorProgress(hudOverlayElements, 0);
  updateKeyInteractionPrompt();
  classroomBackDoorOpeningTimer = window.setTimeout(() => {
    if (!gameState.isInClassroom || !classroomBackDoorOpening) return;
    classroomBackDoorOpeningTimer = null;
    classroomBackDoorOpening = false;
    classroomBackDoorOpened = true;
    renderClassroomDoorProgress(hudOverlayElements, null);
    classroomBackDoorOpeningStartedAt = -Infinity;
    episodeFadeOverlay.classList.add("is-complete");
    void deathSoundReady.then(playDeathSound);
    window.setTimeout(() => {
      void chaseSoundReady.then(playChaseSound);
    }, 500);
    window.setTimeout(returnToEpisodeSelect, 3000);
  }, classroomBackDoorOpeningDuration);
}

function cancelClassroomBackDoorOpening(): void {
  if (!classroomBackDoorOpening) return;
  classroomBackDoorOpening = false;
  classroomBackDoorOpeningStartedAt = -Infinity;
  renderClassroomDoorProgress(hudOverlayElements, null);
  if (classroomBackDoorOpeningTimer !== null) {
    window.clearTimeout(classroomBackDoorOpeningTimer);
    classroomBackDoorOpeningTimer = null;
  }
}

function updateClassroomBackDoorProgress(): void {
  if (!classroomBackDoorOpening) return;
  if (!isClassroomBackDoorWithinInteractionRange()) {
    cancelClassroomBackDoorOpening();
    return;
  }
  const progress = THREE.MathUtils.clamp(
    (performance.now() - classroomBackDoorOpeningStartedAt) /
      classroomBackDoorOpeningDuration,
    0,
    1,
  );
  renderClassroomDoorProgress(hudOverlayElements, progress);
}

function updateTrueCarSeatPosition(): void {
  if (!trueCarEntered || !trueCar) return;
  trueCar.getWorldQuaternion(trueCarWorldQuaternion);
  trueCarBounds.setFromObject(trueCar);
  trueCarBounds.getCenter(driverSeatPosition);
  driverSeatPosition.y = THREE.MathUtils.lerp(
    trueCarBounds.min.y,
    trueCarBounds.max.y,
    0.65,
  );
  driverSeatPosition.add(
    driverSeatLeft.clone().applyQuaternion(trueCarWorldQuaternion),
  );
  driverSeatPosition.add(
    driverSeatBack.clone().applyQuaternion(trueCarWorldQuaternion),
  );
  camera.position.copy(driverSeatPosition);
}

function updateTrueCarSoundIndicator(): void {
  if (!trueCarSoundPlaying || !trueCar) return;
  trueCarBounds.setFromObject(trueCar);
  trueCarBounds.getCenter(trueCarWorldPosition);
  camera.getWorldDirection(trueCarIndicatorForward);
  trueCarIndicatorForward.y = 0;
  trueCarIndicatorForward.normalize();
  trueCarIndicatorRight.setFromMatrixColumn(camera.matrixWorld, 0);
  trueCarIndicatorRight.y = 0;
  trueCarIndicatorRight.normalize();
  trueCarIndicatorDirection.copy(trueCarWorldPosition).sub(camera.position);
  trueCarIndicatorDirection.y = 0;
  trueCarIndicatorDirection.normalize();
  const bearing = THREE.MathUtils.radToDeg(
    Math.atan2(
      trueCarIndicatorDirection.dot(trueCarIndicatorRight),
      trueCarIndicatorDirection.dot(trueCarIndicatorForward),
    ),
  );
  trueCarSoundIndicator.style.setProperty(
    "--true-car-bearing",
    `${bearing}deg`,
  );
}

function lockPointer(): void {
  if (controls.isLocked) return;
  lockPointerControls(controls, rawInputEnabled);
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await range.requestFullscreen();
  }
}

function updateFullscreenButton(): void {
  const isFullscreen = document.fullscreenElement === range;
  fullscreenButton.textContent = isFullscreen ? "⛶" : "⛶";
  fullscreenButton.setAttribute(
    "aria-label",
    isFullscreen ? "Exit fullscreen" : "Enter fullscreen",
  );
  fullscreenButton.title = isFullscreen
    ? "Exit fullscreen"
    : "Enter fullscreen";
  resizeGameRenderer(renderer, camera, canvas);
}

function handleKeyDown(event: KeyboardEvent): void {
  if (gameState.playerDeathActive) {
    event.preventDefault();
    return;
  }
  if (
    handleEscapeHotkey(event, {
      startScreen,
      episodeScreen,
      settingsOverlay,
      controlsLocked: controls.isLocked,
      electronApp: Boolean(window.electronAPI),
      fullscreenActive: Boolean(document.fullscreenElement),
      unlockControls: () => {
        classroomSeatActive = false;
        controls.unlock();
      },
      confirmExit: () => {
        if (window.confirm("EXIT ESCAPE?")) exitApplication();
      },
      exitFullscreen: () => void document.exitFullscreen(),
      getActiveMenuView: screenFlow.getActiveMenuView,
      enterGame,
      openMenu,
      closeMenu,
      showMenuView,
    })
  )
    return;
  if (
    handleWeaponHotkey(event, {
      controlsLocked: controls.isLocked,
      keyPickupCollected,
      trueCarEntered,
      setWeaponDrawn,
      startWeaponReload,
      playTrueCarSound,
    })
  )
    return;
  if (
    handleInteractionHotkey(event, {
      isWeaponWithinPickupRange,
      collectWeaponPickup,
      isClassroomBackDoorWithinInteractionRange,
      openClassroomBackDoor,
      classroomSeatActive,
      isInClassroom: gameState.isInClassroom,
      standFromClassroomSeat: () => {
        classroomSeatActive = false;
        classroomSeatExitCameraPosition.copy(classroomSeatExitPosition);
        classroomSeatExitCameraPosition.y += playerHeight;
        camera.position.copy(classroomSeatExitCameraPosition);
        camera.updateMatrixWorld(true);
        verticalVelocity = 0;
        isGrounded = true;
        lastSafePlayerPosition.copy(camera.position);
        hasSafePlayerPosition = true;
        updateKeyInteractionPrompt();
      },
      isClassroomSeatWithinInteractionRange,
      sitAtClassroomSeat,
      keyPickupCollected,
      enterTrueCar,
      collectKeyPickup,
    })
  )
    return;
  keyInput.add(event.code);
  if (
    event.code === "Space" &&
    controls.isLocked &&
    !gameState.isInClassroom &&
    isGrounded &&
    gameState.playerStamina >= PLAYER_JUMP_STAMINA_COST
  ) {
    event.preventDefault();
    gameState.playerStamina -= PLAYER_JUMP_STAMINA_COST;
    jumpMomentumActive =
      keys.has("KeyW") ||
      keys.has("KeyA") ||
      keys.has("KeyS") ||
      keys.has("KeyD");
    const sprintJumpRequested =
      keys.has("KeyW") &&
      !weaponReloading &&
      (keys.has("ShiftLeft") || keys.has("ShiftRight")) &&
      gameState.playerSprintActive;
    const jumpMomentum = calculateJumpMomentum({
      camera,
      keys,
      sprintJumpRequested,
      walkSpeed: playerWalkSpeed,
      runSpeed: playerRunSpeed,
      sprintAcceleration: gameState.playerSprintAcceleration,
      staminaSprintFactor: getStaminaSprintFactor(),
    });
    jumpMomentumActive = jumpMomentum.active;
    jumpMomentumSpeed = jumpMomentum.speed;
    jumpMomentumDirection.copy(jumpMomentum.direction);
    verticalVelocity = jumpVelocity;
    isGrounded = false;
  }
}

function handleLockChange(): void {
  const locked = controls.isLocked;
  gameState.isPaused = !locked;
  if (!locked) releaseAim();
  if (locked) resumeGameplayAudio();
  range.classList.toggle("is-locked", locked);
  syncPauseMenu();
}

const screenFlow = bindScreenFlow(
  startScreen,
  episodeScreen,
  settingsOverlay,
  settingsContent,
  menuHome,
  modeMenu,
);

function showLoadingScreen(label: string, percent = 0): void {
  if (gameState.gameplayStarted && !gameState.episodeEntryLoading) return;
  range.classList.add("is-loading");
  loadingScreen.classList.add("is-visible");
  loadingTitle.textContent = "PREPARING ESCAPE";
  loadingStatus.textContent = label;
  loadingBarFill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function _hideLoadingScreen(force = false): void {
  if (gameState.gameplayStarted && !force) return;
  range.classList.remove("is-loading");
  loadingScreen.classList.remove("is-visible");
  loadingBarFill.style.width = "0%";
}

function showMenuView(view: "home" | "mode" | "settings"): void {
  screenFlow.showMenuView(view);
}

function openMenu(): void {
  if (gameState.playerDeathActive) return;
  cancelClassroomBackDoorOpening();
  gameState.isPaused = true;
  if (controls.isLocked) controls.unlock();
  if (gunshotAudioContext.state === "running")
    void gunshotAudioContext.suspend();
  stopHeartbeatSound();
  screenFlow.openMenu();
}

function syncPauseMenu(): void {
  if (gameState.playerDeathActive) {
    settingsOverlay.classList.remove("is-open");
    return;
  }
  const shouldShowPauseMenu = !controls.isLocked;
  gameState.isPaused = shouldShowPauseMenu || document.hidden;
  if (shouldShowPauseMenu) showMenuView("home");
  if (shouldShowPauseMenu) {
    if (gunshotAudioContext.state === "running")
      void gunshotAudioContext.suspend();
    stopHeartbeatSound();
  }
  settingsOverlay.classList.toggle("is-open", shouldShowPauseMenu);
  settingsOverlay.setAttribute(
    "aria-hidden",
    shouldShowPauseMenu ? "false" : "true",
  );
}

function closeMenu(): void {
  screenFlow.closeMenu();
}

function syncEpisodeOnlyObjects(): void {
  const parkingObjectsVisible =
    !gameState.isInChess && !gameState.isInClassroom;
  chessLightRig.visible = gameState.isInChess;
  classroomStudents.forEach((student) => {
    student.visible = gameState.isInClassroom;
  });
  if (keyPickupObject)
    keyPickupObject.visible = parkingObjectsVisible && !keyPickupCollected;
  if (weaponPickupObject)
    weaponPickupObject.visible =
      (gameState.isInClassroom || parkingObjectsVisible) &&
      !gameState.weaponPickupCollected;
  matryoshkaMobs.forEach((mob) => {
    const mobVisible = mob.classroomOnly
      ? gameState.isInClassroom
      : parkingObjectsVisible;
    mob.object.visible = mobVisible;
    mob.visionIndicator.visible = mobVisible && matryoshkaVisionSetting.checked;
    mob.hitboxHelper.visible = mobVisible && matryoshkaHitboxSetting.checked;
  });
}

const enterEpisode = createEpisodeEntryController({
  startScreen,
  episodeScreen,
  range,
  showLoadingScreen,
  hideLoadingScreen: _hideLoadingScreen,
  setEpisodeEntryLoading: (loading) => {
    gameState.episodeEntryLoading = loading;
  },
  setGameplayStarted: () => {
    gameState.gameplayStarted = true;
  },
  setEpisodeFlags: (episodeId) => {
    gameState.currentEpisode = episodeId;
    gameState.isInChess = episodeId === "chess";
    gameState.isInClassroom = episodeId === "classroom";
    jumpMomentumActive = false;
    parkingLotFearActive = false;
    classroomFearActive = false;
    fearActive = false;
    classroomSeatActive = false;
  },
  syncEpisodeOnlyObjects,
  onEpisodeStarted: (episodeId) => {
    if (episodeId === "classroom") {
      placeWeaponPickupWhenReady();
      sitAtClassroomSeat(true);
      vehicleSearchHint.textContent = "PRESS [F] TO STAND UP";
      updateKeyInteractionPrompt();
    } else if (episodeId === "parking-lot") {
      placeWeaponPickupWhenReady();
      vehicleSearchHint.textContent = "[P]: PANIC BUTTON";
    } else {
      vehicleSearchHint.textContent = "[P]: PANIC BUTTON";
    }
  },
  getStartEpisodeDeps: () => ({
    parkingLotRoot,
    classroomRoot,
    chessRoot,
    parkedCars,
    camera,
    classroomSpawnPosition,
    classroomEntryPosition,
    chessSpawnPosition,
    chessEntryPosition,
    closeMenu,
    lockPointer,
    gunshotAudioContext,
    heartbeatSoundReady,
    playHeartbeatSound,
  }),
});

function enterGame(): void {
  enterEpisode("parking-lot");
}

function enterClassroomGame(): void {
  enterEpisode("classroom");
}

function enterChessGame(): void {
  enterEpisode("chess");
}

function selectEpisode(episodeId: EpisodeId): void {
  if (episodeId === "classroom") {
    enterClassroomGame();
    return;
  }
  if (episodeId === "chess") {
    enterChessGame();
    return;
  }
  enterGame();
}

bindEpisodeSelection(
  startScreen,
  startPlayButton,
  episodeScreen,
  parkingLotEpisodeButton,
  classroomEpisodeButton,
  chessEpisodeButton,
  selectEpisode,
);
bindPauseMenuControls({
  startScreen,
  episodeScreen,
  settingsButton,
  settingsClose,
  settingsOverlay,
  menuSettingsButton,
  menuExitButton,
  fullscreenButton,
  showSettings: () => showMenuView("settings"),
  openMenu,
  closeMenu,
  isGameplayStarted: () => gameState.gameplayStarted,
  lockPointer,
  exitApplication,
  returnToEpisodeSelect,
  toggleFullscreen,
});
document.addEventListener("fullscreenchange", updateFullscreenButton);
bindKeyInputHandlers(keyInput, handleKeyDown);
document.addEventListener("pointerlockchange", syncPauseMenu);
controls.addEventListener("lock", handleLockChange);
controls.addEventListener("unlock", handleLockChange);
canvas.addEventListener("click", () => {
  if (
    gameState.gameplayStarted &&
    !controls.isLocked &&
    !startScreen.classList.contains("is-visible") &&
    !episodeScreen.classList.contains("is-visible") &&
    !settingsOverlay.classList.contains("is-open")
  )
    lockPointer();
});

function getRenderPixelRatio(): number {
  return Math.min(window.devicePixelRatio * resolutionScale, 1.5);
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: antialiasingSetting.checked,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(getRenderPixelRatio());
renderer.shadowMap.enabled = true;

setupEpisodePreviewScenes({
  episodeScreen,
  parkingLotEpisodeButton,
  parkingPreviewCanvas,
  classroomEpisodeButton,
  classroomPreviewCanvas,
  chessEpisodeButton,
  chessPreviewCanvas,
  parkingLotRoot: () => parkingLotRoot,
  parkedCars: () => parkedCars,
  classroomRoot: () => classroomRoot,
  classroomStudents: () => classroomStudents,
  chessRoot: () => chessRoot,
});

setupMatryoshkaPreview({
  canvas: matryoshkaPreviewCanvas,
  startScreen,
  model: matryoshkaModelReady,
});

function refreshWeaponRender(): void {
  currentWeaponModel?.updateMatrixWorld(true);
  weapon.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  renderer.clear();
  renderer.render(scene, camera);
}

let projectileVelocity = 710;
bulletSpeedSetting.addEventListener("input", () => {
  projectileVelocity = Number(bulletSpeedSetting.value);
  bulletSpeedValue.value = bulletSpeedSetting.value;
  if (!restoringSettings)
    weaponProfiles[gameState.currentWeapon].bulletSpeed = projectileVelocity;
});

const weaponPreviewScene = new THREE.Scene();
weaponPreviewScene.background = new THREE.Color("#11171d");
const weaponPreviewCamera = new THREE.PerspectiveCamera(35, 1, 0.01, 10);
weaponPreviewCamera.position.set(0, 0.05, 2.2);
weaponPreviewCamera.lookAt(0, 0, 0);
weaponPreviewScene.add(new THREE.HemisphereLight("#f4f6f5", "#10151c", 2.5));
const previewKeyLight = new THREE.DirectionalLight("#ffffff", 3);
previewKeyLight.position.set(-2, 3, 2);
weaponPreviewScene.add(previewKeyLight);
const weaponPreviewGroup = new THREE.Group();
weaponPreviewScene.add(weaponPreviewGroup);
const weaponPreviewRenderer = new THREE.WebGLRenderer({
  canvas: weaponPreviewCanvas,
  antialias: true,
  alpha: false,
});
weaponPreviewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
let previewSourceModel: THREE.Object3D | null = null;
let weaponPreviewDragging = false;
let weaponPreviewLastX = 0;
let lastWeaponPreviewFrameAt = 0;
weaponPreviewCanvas.addEventListener("pointerdown", (event) => {
  weaponPreviewDragging = true;
  weaponPreviewLastX = event.clientX;
  weaponPreviewCanvas.setPointerCapture(event.pointerId);
  weaponPreviewCanvas.classList.add("is-dragging");
});
weaponPreviewCanvas.addEventListener("pointermove", (event) => {
  if (!weaponPreviewDragging) return;
  const deltaX = event.clientX - weaponPreviewLastX;
  weaponPreviewLastX = event.clientX;
  weaponPreviewGroup.rotation.y += deltaX * 0.012;
});
const stopWeaponPreviewDrag = (event: PointerEvent) => {
  weaponPreviewDragging = false;
  if (weaponPreviewCanvas.hasPointerCapture(event.pointerId))
    weaponPreviewCanvas.releasePointerCapture(event.pointerId);
  weaponPreviewCanvas.classList.remove("is-dragging");
};
weaponPreviewCanvas.addEventListener("pointerup", stopWeaponPreviewDrag);
weaponPreviewCanvas.addEventListener("pointercancel", stopWeaponPreviewDrag);
weaponPreviewRenderer.setAnimationLoop(() => {
  if (!settingsOverlay.classList.contains("is-open")) return;
  const now = performance.now();
  if (now - lastWeaponPreviewFrameAt < 33) return;
  lastWeaponPreviewFrameAt = now;
  const width = weaponPreviewCanvas.clientWidth;
  const height = weaponPreviewCanvas.clientHeight;
  if (width && height) {
    weaponPreviewRenderer.setSize(width, height, false);
    weaponPreviewCamera.aspect = width / height;
    weaponPreviewCamera.updateProjectionMatrix();
    if (currentWeaponModel !== previewSourceModel) {
      weaponPreviewGroup.clear();
      previewSourceModel = currentWeaponModel;
      if (previewSourceModel) {
        const previewModel = previewSourceModel.clone(true);
        previewModel.visible = true;
        previewModel.updateMatrixWorld(true);
        const centeredBounds = new THREE.Box3().setFromObject(previewModel);
        previewModel.position.sub(
          centeredBounds.getCenter(new THREE.Vector3()),
        );
        weaponPreviewGroup.add(previewModel);
      }
    }
    if (!weaponPreviewDragging) weaponPreviewGroup.rotation.y += 0.008;
    weaponPreviewRenderer.render(weaponPreviewScene, weaponPreviewCamera);
  }
});

scene.add(new THREE.HemisphereLight("#8493a8", "#050709", 0.28));
const keyLight = new THREE.DirectionalLight("#b4a58f", 0.42);
keyLight.position.set(-4, 7, 4);
keyLight.castShadow = false;
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(3000, 3000),
  new THREE.MeshStandardMaterial({ color: "#171d24", roughness: 0.9 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = false;
floor.visible = false;
scene.add(floor);

const grid = new THREE.GridHelper(3000, 600, "#33404a", "#1d252d");
grid.position.y = 0.01;
grid.visible = false;
scene.add(grid);
const gridMaterials = (
  Array.isArray(grid.material) ? grid.material : [grid.material]
) as THREE.LineBasicMaterial[];
const floorTileSize = 1500;
const floorTilePosition = new THREE.Vector3();
const lastSafePlayerPosition = new THREE.Vector3();
let hasSafePlayerPosition = false;

function updateInfiniteFloor(): void {
  floorTilePosition.set(
    Math.floor(camera.position.x / floorTileSize + 0.5) * floorTileSize,
    0,
    Math.floor(camera.position.z / floorTileSize + 0.5) * floorTileSize,
  );
  floor.position.x = floorTilePosition.x;
  floor.position.z = floorTilePosition.z;
  grid.position.x = floorTilePosition.x;
  grid.position.z = floorTilePosition.z;
  domeGrid.position.x = camera.position.x;
  domeGrid.position.z = camera.position.z;
}

function isCollisionSurface(object: THREE.Object3D): boolean {
  if (!object.visible) return false;
  if (!(object instanceof THREE.Mesh)) return true;
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];
  return materials.some(
    (material) => !material.transparent || material.opacity >= 0.95,
  );
}

function getPlayerCollisionHeightBounds(): THREE.Vector2 {
  function mergeOverlappingClassroomObstacles(): void {
    for (let index = 0; index < classroomObstacles.length; index += 1) {
      const current = classroomObstacles[index];
      for (
        let otherIndex = classroomObstacles.length - 1;
        otherIndex > index;
        otherIndex -= 1
      ) {
        const other = classroomObstacles[otherIndex];
        const overlapsX =
          current.min.x <= other.max.x && current.max.x >= other.min.x;
        const overlapsY =
          current.min.y <= other.max.y && current.max.y >= other.min.y;
        const overlapsZ =
          current.min.z <= other.max.z && current.max.z >= other.min.z;
        if (!overlapsX || !overlapsY || !overlapsZ) continue;
        current.union(other);
        classroomObstacles.splice(otherIndex, 1);
      }
    }
  }
  if (gameState.isInClassroom) {
    return new THREE.Vector2(
      camera.position.y - playerHeight,
      camera.position.y + 0.2,
    );
    mergeOverlappingClassroomObstacles();
  }
  return new THREE.Vector2(camera.position.y - 0.8, camera.position.y + 0.8);
}

function resolveParkingCollision(): void {
  const activeBounds = gameState.isInChess
    ? chessBounds
    : gameState.isInClassroom
      ? classroomBounds
      : parkingBounds;
  const activeRoot = gameState.isInChess
    ? chessRoot
    : gameState.isInClassroom
      ? classroomRoot
      : parkingLotRoot;
  if (!activeBounds || !activeRoot) return;
  if (trueCarEntered) return;
  if (classroomSeatActive) return;
  isGrounded = false;
  const playerRadius = playerCollisionRadius;
  camera.position.x = THREE.MathUtils.clamp(
    camera.position.x,
    activeBounds.min.x + playerRadius,
    activeBounds.max.x - playerRadius,
  );
  camera.position.z = THREE.MathUtils.clamp(
    camera.position.z,
    activeBounds.min.z + playerRadius,
    activeBounds.max.z - playerRadius,
  );

  let hasGround = false;
  if (verticalVelocity <= 0) {
    parkingGroundRaycaster.set(
      new THREE.Vector3(
        camera.position.x,
        camera.position.y + 8,
        camera.position.z,
      ),
      new THREE.Vector3(0, -1, 0),
    );
    const groundHit = parkingGroundRaycaster
      .intersectObject(activeRoot, true)
      .find((intersection) => intersection.point.y <= camera.position.y + 0.7);
    if (groundHit) {
      const groundCameraHeight = groundHit.point.y + playerHeight;
      const groundGap = camera.position.y - groundCameraHeight;
      if (groundGap >= -0.3 && groundGap <= 0.08) {
        hasGround = true;
        camera.position.y = groundCameraHeight;
        verticalVelocity = 0;
        isGrounded = true;
        lastSafePlayerPosition.copy(camera.position);
        hasSafePlayerPosition = true;
      }
    }
  }
  if (
    !hasGround &&
    verticalVelocity < 0 &&
    gameState.isInChess &&
    camera.position.y < activeBounds.min.y + playerHeight &&
    activeBounds.min.y + playerHeight <= camera.position.y + 0.3
  ) {
    camera.position.y = activeBounds.min.y + playerHeight;
    verticalVelocity = 0;
    isGrounded = true;
    lastSafePlayerPosition.copy(camera.position);
    hasSafePlayerPosition = true;
    hasGround = true;
  }
  if (
    !hasGround &&
    verticalVelocity < 0 &&
    camera.position.y < playerHeight - 0.2 &&
    hasSafePlayerPosition
  ) {
    camera.position.copy(lastSafePlayerPosition);
    verticalVelocity = 0;
    isGrounded = true;
  }
  const playerHeightBounds = getPlayerCollisionHeightBounds();
  const collisionEpsilon = 0.01;
  const nearbyObstacles = gameState.isInChess
    ? []
    : gameState.isInClassroom
      ? classroomObstacles
      : getNearbyParkingObstacles();
  for (const obstacle of nearbyObstacles) {
    if (
      playerHeightBounds.x >= obstacle.max.y ||
      playerHeightBounds.y <= obstacle.min.y
    )
      continue;
    const overlapsX =
      camera.position.x > obstacle.min.x - playerRadius &&
      camera.position.x < obstacle.max.x + playerRadius;
    const overlapsZ =
      camera.position.z > obstacle.min.z - playerRadius &&
      camera.position.z < obstacle.max.z + playerRadius;
    if (!overlapsX || !overlapsZ) continue;
    const pushLeft = camera.position.x - (obstacle.min.x - playerRadius);
    const pushRight = obstacle.max.x + playerRadius - camera.position.x;
    const pushFront = camera.position.z - (obstacle.min.z - playerRadius);
    const pushBack = obstacle.max.z + playerRadius - camera.position.z;
    const smallestPush = Math.min(pushLeft, pushRight, pushFront, pushBack);
    if (smallestPush === pushLeft)
      camera.position.x = obstacle.min.x - playerRadius - collisionEpsilon;
    else if (smallestPush === pushRight)
      camera.position.x = obstacle.max.x + playerRadius + collisionEpsilon;
    else if (smallestPush === pushFront)
      camera.position.z = obstacle.min.z - playerRadius - collisionEpsilon;
    else camera.position.z = obstacle.max.z + playerRadius + collisionEpsilon;
  }
}

function movePlayerWithCollision(distance: THREE.Vector3): void {
  const distanceLength = distance.length();
  const stepCount = Math.max(1, Math.ceil(distanceLength / 0.08));
  const step = distance.clone().multiplyScalar(1 / stepCount);
  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    const rightStep = new THREE.Vector3(step.x, 0, 0);
    const forwardStep = new THREE.Vector3(0, 0, step.z);
    if (gameState.isInClassroom) {
      controls.moveRight(rightStep.x);
      controls.moveForward(forwardStep.z);
      resolveParkingCollision();
      continue;
    }
    if (!isParkingWallAhead(rightStep)) {
      controls.moveRight(rightStep.x);
      resolveParkingCollision();
    }
    if (!isParkingWallAhead(forwardStep)) {
      controls.moveForward(forwardStep.z);
      resolveParkingCollision();
    }
  }
}

function movePlayerWithJumpMomentum(delta: number): void {
  const distance = jumpMomentumSpeed * delta;
  const stepCount = Math.max(1, Math.ceil(distance / 0.08));
  const stepDistance = distance / stepCount;
  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    if (isWorldWallAhead(jumpMomentumDirection, stepDistance)) break;
    camera.position.addScaledVector(jumpMomentumDirection, stepDistance);
    resolveParkingCollision();
  }
}

function isWorldWallAhead(direction: THREE.Vector3, distance: number): boolean {
  const activeRoot = gameState.isInChess
    ? chessRoot
    : gameState.isInClassroom
      ? classroomRoot
      : parkingLotRoot;
  if (!activeRoot) return false;
  const horizontalDirection = direction.clone().setY(0);
  if (horizontalDirection.lengthSq() < 0.000001) return false;
  horizontalDirection.normalize();
  const sampleHeights = [
    camera.position.y - 1.8,
    camera.position.y - 0.8,
    camera.position.y + 0.2,
  ];
  for (const sampleHeight of sampleHeights) {
    parkingWallRaycaster.set(
      new THREE.Vector3(camera.position.x, sampleHeight, camera.position.z),
      horizontalDirection,
    );
    parkingWallRaycaster.far = distance + 0.42;
    const hit = parkingWallRaycaster
      .intersectObject(activeRoot, true)
      .find((intersection) => isCollisionSurface(intersection.object));
    if (hit && hit.distance <= distance + 0.18) return true;
  }
  return false;
}

function isParkingWallAhead(step: THREE.Vector3): boolean {
  const activeRoot = gameState.isInChess
    ? chessRoot
    : gameState.isInClassroom
      ? classroomRoot
      : parkingLotRoot;
  if (!activeRoot) return false;
  const cameraForward = new THREE.Vector3();
  const cameraRight = new THREE.Vector3();
  camera.getWorldDirection(cameraForward);
  cameraForward.y = 0;
  cameraForward.normalize();
  cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
  cameraRight.y = 0;
  cameraRight.normalize();
  const horizontalStep = cameraRight
    .multiplyScalar(step.x)
    .add(cameraForward.multiplyScalar(step.z));
  const distance = horizontalStep.length();
  if (distance === 0) return false;
  return isWorldWallAhead(horizontalStep, distance);
}

const targetRadius = 0.72;
const target = new THREE.Object3D();
const gridTargetA = new THREE.Object3D();
const gridTargetB = new THREE.Object3D();
const gridTargets: THREE.Object3D[] = [];
let currentTargetScaleMultiplier = targetSizeMultiplier;
function isSnipingMode(mode: ShootingMode = shootingMode): boolean {
  return mode.endsWith("precision");
}
function updatePrecisionTargetScale(): void {
  currentTargetScaleMultiplier =
    targetSizeMultiplier * (isSnipingMode() ? 0.55 : 1);
  gridTargets.forEach((gridTarget) =>
    gridTarget.scale.setScalar(currentTargetScaleMultiplier),
  );
}
const previousTargetPositions = gridTargets.map((gridTarget) =>
  gridTarget.position.clone(),
);
const _targetCollisionSample = new THREE.Vector3();
gridTargetA.visible = false;
gridTargetB.visible = false;

const targetPathCenter = new THREE.Vector3();
const targetPathSample = new THREE.Vector3();
const targetPath = new THREE.CatmullRomCurve3([], true, "catmullrom", 0.5);
let targetPathSeed = 0;
let targetPathStartedAt = 0;
let targetPathSpeed = 0.11;
const trackingCenter = new THREE.Vector3();
const trackingVelocity = new THREE.Vector3();
const fallingVelocity = new THREE.Vector3();
let strafetrackDirection = 1;
let strafetrackSwitchAt = 0;
let fallingRespawnAt = 0;
const trackingBounds = { x: 4.2, y: 0, z: 0 };
const microshotPositions = [
  new THREE.Vector3(-3, 2.2, -8),
  new THREE.Vector3(0, 3.4, -9),
  new THREE.Vector3(3, 2.4, -8),
  new THREE.Vector3(-2.5, 1.2, -10),
  new THREE.Vector3(2.4, 1.4, -10),
];
const targetSpawnForward = new THREE.Vector3();
const targetSpawnRight = new THREE.Vector3();
const targetSpawnUp = new THREE.Vector3();
const targetSpawnPosition = new THREE.Vector3();
const gridAnchor = new THREE.Group();
const gridCenter = new THREE.Vector3();
const gridLocalPosition = new THREE.Vector3();
const gridCellIndices = [0, 1, 2];
const gridCells = Array.from({ length: 9 }, (_, index) => index);
let reflexRespawnCall: gsap.core.Tween | null = null;
let reflexHideCall: gsap.core.Tween | null = null;
let reflexRespawnAt = 0;
let reflexHideAt = 0;
scene.add(gridAnchor);

function updateGridLayout(): void {
  gridAnchor.position.copy(gridCenter);
  camera.getWorldPosition(targetSpawnPosition);
  targetSpawnPosition.y = gridCenter.y;
  gridAnchor.lookAt(targetSpawnPosition);
  gridTargets.forEach((gridTarget, targetIndex) => {
    const cell = gridCellIndices[targetIndex];
    const column = (cell % 3) - 1;
    const row = 1 - Math.floor(cell / 3);
    gridLocalPosition.set(column * 2.1, row * 2.1, 0);
    gridTarget.position
      .copy(gridCenter)
      .add(gridLocalPosition.applyQuaternion(gridAnchor.quaternion));
  });
}

function resetGridTargets(): void {
  camera.getWorldDirection(targetSpawnForward);
  camera.getWorldPosition(gridCenter);
  gridCenter.addScaledVector(targetSpawnForward, isSnipingMode() ? 34 : 18);
  gridCenter.y = Math.max(gridCenter.y, targetRadius + 0.15 + 2.1);
  const shuffledCells = [...gridCells].sort(() => Math.random() - 0.5);
  gridCellIndices.splice(
    0,
    gridCellIndices.length,
    ...shuffledCells.slice(0, gridTargets.length),
  );
  updateGridLayout();
}

function moveGridTargetToRandomCell(hitTarget: typeof target): void {
  const targetIndex = gridTargets.indexOf(hitTarget);
  const occupiedCells = new Set(gridCellIndices);
  occupiedCells.delete(gridCellIndices[targetIndex]);
  const freeCells = gridCells.filter((cell) => !occupiedCells.has(cell));
  gridCellIndices[targetIndex] =
    freeCells[Math.floor(Math.random() * freeCells.length)];
  updateGridLayout();
}

function _snapshotTargetPositions(): void {
  gridTargets.forEach((gridTarget, targetIndex) => {
    previousTargetPositions[targetIndex].copy(gridTarget.position);
  });
}

function getRandomVisibleTargetPosition(
  distanceMin = 14,
  distanceRange = 22,
  spread = 1,
): THREE.Vector3 {
  camera.updateMatrixWorld();
  camera.getWorldPosition(targetSpawnPosition);
  camera.getWorldDirection(targetSpawnForward);
  targetSpawnRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  targetSpawnUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

  const distance = distanceMin + Math.random() * distanceRange;
  const halfHeight =
    Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
  const halfWidth = halfHeight * camera.aspect;
  const horizontalMargin = Math.min(2.4, halfWidth * 0.65);
  const verticalMargin = Math.min(1.3, halfHeight * 0.65);
  const horizontalOffset =
    (Math.random() * 2 - 1) *
    Math.max(0, halfWidth - horizontalMargin) *
    spread;
  const verticalOffset =
    (Math.random() * 2 - 1) * Math.max(0, halfHeight - verticalMargin) * spread;

  targetSpawnPosition
    .addScaledVector(targetSpawnForward, distance)
    .addScaledVector(targetSpawnRight, horizontalOffset)
    .addScaledVector(targetSpawnUp, verticalOffset);
  targetSpawnPosition.y = THREE.MathUtils.clamp(
    targetSpawnPosition.y,
    targetRadius + 0.15 + 0.55,
    5.5,
  );
  return targetSpawnPosition.clone();
}

function getNearbyPrecisionTargetPosition(
  origin: THREE.Vector3,
): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const distance = 2.5 + Math.random() * 3.5;
  targetSpawnPosition.set(
    origin.x + Math.cos(angle) * distance,
    origin.y + (Math.random() - 0.5) * 3,
    origin.z + Math.sin(angle) * distance,
  );
  targetSpawnPosition.y = THREE.MathUtils.clamp(
    targetSpawnPosition.y,
    targetRadius + 0.15,
    5.5,
  );
  return targetSpawnPosition.clone();
}

function clearReflexTimers(): void {
  reflexRespawnCall?.kill();
  reflexHideCall?.kill();
  reflexRespawnCall = null;
  reflexHideCall = null;
}

function scheduleReflexTarget(position: THREE.Vector3): void {
  clearReflexTimers();
  target.position.copy(position);
  target.visible = false;
  reflexRespawnAt = clock.getElapsedTime() + 0.5 + Math.random() * 1.5;
  reflexHideAt = 0;
}

function _updateReflexTarget(elapsed: number): void {
  if (target.visible && elapsed >= reflexHideAt) {
    scheduleReflexTarget(
      getRandomVisibleTargetPosition(
        isSnipingMode() ? 30 : 16,
        isSnipingMode() ? 20 : 12,
        0.58,
      ),
    );
    return;
  }
  if (!target.visible && elapsed >= reflexRespawnAt) {
    target.visible = true;
    reflexHideAt = elapsed + 0.5;
  }
}

function rebuildTargetPath(center: THREE.Vector3, startTime = 0): void {
  targetPathCenter.copy(center);
  targetPathSeed = Math.random() * Math.PI * 2;
  targetPathStartedAt = startTime;
  targetPath.points = [
    new THREE.Vector3(center.x - 1.2, center.y + 0.35, center.z + 0.7),
    new THREE.Vector3(center.x + 1.1, center.y + 0.65, center.z + 0.4),
    new THREE.Vector3(center.x + 1.4, center.y - 0.3, center.z - 0.7),
    new THREE.Vector3(center.x - 0.9, center.y - 0.55, center.z - 0.8),
    new THREE.Vector3(center.x - 1.5, center.y + 0.1, center.z - 0.1),
  ];
}

function resetTrackingTarget(mode: ShootingMode): void {
  camera.getWorldDirection(targetSpawnForward);
  camera.getWorldPosition(trackingCenter);
  trackingCenter.addScaledVector(
    targetSpawnForward,
    mode === "fallingtrack" ? 15 : 18,
  );
  trackingCenter.y = mode === "fallingtrack" ? 5.8 : targetRadius + 0.15;
  if (mode === "fallingtrack") {
    target.visible = true;
    target.position.set(
      trackingCenter.x + (Math.random() - 0.5) * 2.2,
      trackingCenter.y + Math.random() * 1.8,
      trackingCenter.z + (Math.random() - 0.5) * 2.2,
    );
    fallingVelocity.set(
      (Math.random() - 0.5) * fallingHorizontalForce,
      fallingLaunchSpeed,
      (Math.random() - 0.5) * fallingHorizontalForce,
    );
    return;
  }
  target.position.copy(trackingCenter);
  strafetrackDirection = Math.random() > 0.5 ? 1 : -1;
  strafetrackSwitchAt = clock.getElapsedTime() + 0.35 + Math.random() * 1.4;
  trackingVelocity.set(strafetrackDirection * trackingSpeed, 0, 0);
}

function _updateTrackingTarget(delta: number, elapsed: number): void {
  if (shootingMode === "strafetrack") {
    if (elapsed >= strafetrackSwitchAt) {
      strafetrackDirection *= -1;
      strafetrackSwitchAt = elapsed + 0.35 + Math.random() * 1.4;
      trackingVelocity.x = strafetrackDirection * trackingSpeed;
    }
    target.position.x += trackingVelocity.x * delta;
    if (Math.abs(target.position.x - trackingCenter.x) > trackingBounds.x)
      trackingVelocity.x *= -1;
    target.position.y = trackingCenter.y;
    target.position.z = trackingCenter.z;
    target.lookAt(camera.position);
    return;
  }
  if (shootingMode === "spheretrack") {
    const orbitTime = elapsed * 1.35;
    target.position.set(
      trackingCenter.x +
        Math.sin(orbitTime * 1.17) * 3.2 +
        Math.sin(orbitTime * 2.3) * 0.8,
      trackingCenter.y +
        Math.sin(orbitTime * 0.83) * 1.8 +
        Math.cos(orbitTime * 1.9) * 0.65,
      trackingCenter.z +
        Math.cos(orbitTime * 1.07) * 2.4 +
        Math.sin(orbitTime * 1.73) * 0.7,
    );
    target.lookAt(camera.position);
    return;
  }
  if (shootingMode === "fallingtrack") {
    if (!target.visible) {
      if (elapsed >= fallingRespawnAt) resetTrackingTarget("fallingtrack");
      return;
    }
    fallingVelocity.y -= fallingGravity * delta;
    target.position.addScaledVector(fallingVelocity, delta);
    if (target.position.y <= -targetRadius) {
      target.visible = false;
      fallingRespawnAt = elapsed + fallingRespawnDelay;
    }
  }
}

function setShootingMode(nextMode: ShootingMode): void {
  shootingMode = nextMode;
  updatePrecisionTargetScale();
  applyWeaponSelection();
  clearReflexTimers();
  modeButtons.forEach((button) =>
    button.classList.toggle("is-active", button.dataset.mode === nextMode),
  );
  gridTargets.forEach((gridTarget) => {
    gsap.killTweensOf(gridTarget);
    gridTarget.visible =
      nextMode === "gridshot" || nextMode === "gridshotprecision";
  });
  target.visible = true;
  if (nextMode === "gridshot" || nextMode === "gridshotprecision") {
    resetGridTargets();
    return;
  }
  if (nextMode === "reflexshot" || nextMode === "reflexshotprecision") {
    scheduleReflexTarget(
      getRandomVisibleTargetPosition(
        isSnipingMode() ? 30 : 16,
        isSnipingMode() ? 20 : 12,
        0.58,
      ),
    );
    return;
  }
  if (
    nextMode === "strafetrack" ||
    nextMode === "spheretrack" ||
    nextMode === "fallingtrack"
  ) {
    resetTrackingTarget(nextMode);
    return;
  }
  const nextCenter =
    nextMode === "microshot" || nextMode === "microshotprecision"
      ? isSnipingMode()
        ? getRandomVisibleTargetPosition(30, 20, 0.72)
        : microshotPositions[
            Math.floor(Math.random() * microshotPositions.length)
          ]
      : getRandomVisibleTargetPosition(
          isSnipingMode() ? 30 : 14,
          isSnipingMode() ? 20 : 22,
        );
  targetPathSpeed =
    nextMode === "flickshot" || nextMode === "flickshotprecision"
      ? 0.075
      : 0.11;
  rebuildTargetPath(nextCenter, clock.getElapsedTime());
  target.position.copy(nextCenter);
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setShootingMode(button.dataset.mode as ShootingMode);
    closeMenu();
    lockPointerControls(controls, rawInputEnabled);
  });
});

modeCategoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const category = button.dataset.modeCategory;
    modeCategoryButtons.forEach((categoryButton) =>
      categoryButton.classList.toggle("is-active", categoryButton === button),
    );
    modeCategoryPanels.forEach((panel) =>
      panel.classList.toggle(
        "is-visible",
        panel.dataset.modePanel === category,
      ),
    );
  });
});

rebuildTargetPath(target.position);

function _updateTargetMovement(elapsed: number): void {
  if (
    shootingMode === "gridshot" ||
    shootingMode === "gridshotprecision" ||
    shootingMode === "reflexshot" ||
    shootingMode === "reflexshotprecision" ||
    shootingMode === "strafetrack" ||
    shootingMode === "spheretrack" ||
    shootingMode === "fallingtrack"
  )
    return;
  const pathTime = ((elapsed - targetPathStartedAt) * targetPathSpeed) % 1;
  targetPath.getPointAt(pathTime, targetPathSample);
  const noiseTime = elapsed * 1.7 + targetPathSeed;
  const strafeX =
    Math.sin(noiseTime) * 0.42 + Math.sin(noiseTime * 2.37) * 0.16;
  const strafeY =
    Math.sin(noiseTime * 0.83) * 0.3 + Math.cos(noiseTime * 1.91) * 0.12;
  target.position.set(
    targetPathSample.x + strafeX,
    targetPathSample.y + strafeY,
    targetPathSample.z,
  );
}

type Projectile = {
  body: RAPIER.RigidBody;
  mesh: THREE.Mesh;
  bornAt: number;
  lastTrailAt: number;
  previousPosition: THREE.Vector3;
};

const projectiles: Projectile[] = [];
const parkedCars: THREE.Object3D[] = [];
const projectileMaterial = new THREE.MeshBasicMaterial({
  color: "#fff1a3",
  fog: false,
});
const projectileGeometry = new THREE.SphereGeometry(0.035, 8, 8);
const projectileRadius = 0.035;
const projectileLifetime = 3;

function spawnProjectile(
  direction: THREE.Vector3,
  muzzleWorldPosition: THREE.Vector3,
): void {
  shotOrigin.copy(muzzleWorldPosition);
  const muzzleVelocity = projectileVelocity;
  const bodyDescription = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(shotOrigin.x, shotOrigin.y, shotOrigin.z)
    .setLinvel(
      direction.x * muzzleVelocity,
      direction.y * muzzleVelocity,
      direction.z * muzzleVelocity,
    )
    .setCcdEnabled(true);
  const body = physicsWorld.createRigidBody(bodyDescription);
  body.setGravityScale(gravityMultiplier, true);
  physicsWorld.createCollider(
    RAPIER.ColliderDesc.ball(projectileRadius).setDensity(1).setRestitution(0),
    body,
  );
  const mesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
  mesh.position.copy(shotOrigin);
  mesh.visible = false;
  scene.add(mesh);
  const now = performance.now() / 1000;
  projectiles.push({
    body,
    mesh,
    bornAt: now,
    lastTrailAt: now,
    previousPosition: shotOrigin.clone(),
  });
}

function updateProjectiles(now: number, delta: number): void {
  camera.getWorldPosition(cameraOrigin);
  physicsWorld.timestep = delta;
  physicsWorld.step();
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index];
    const translation = projectile.body.translation();
    projectile.mesh.position.set(translation.x, translation.y, translation.z);
    if (
      projectile.mesh.position.distanceToSquared(cameraOrigin) >
      camera.far ** 2
    ) {
      physicsWorld.removeRigidBody(projectile.body);
      scene.remove(projectile.mesh);
      projectiles.splice(index, 1);
      continue;
    }
    if (
      projectile.mesh.position.y > projectileRadius + 0.08 &&
      now - projectile.lastTrailAt > 0.045
    ) {
      createTracer(projectile.mesh.position);
      projectile.lastTrailAt = now;
    }
    const projectilePosition = projectile.mesh.position;
    const projectileTravel = projectilePosition
      .clone()
      .sub(projectile.previousPosition);
    const travelDistance = projectileTravel.length();
    const projectileHits =
      travelDistance > 0
        ? findMapProjectileHits({
            episodeId: gameState.isInClassroom
              ? "classroom"
              : gameState.isInChess
                ? "chess"
                : "parking-lot",
            raycaster: parkingProjectileRaycaster,
            origin: projectile.previousPosition,
            direction: projectileTravel.normalize(),
            maxDistance: travelDistance,
            projectileRadius,
            parkingLotRoot,
            classroomRoot,
            chessRoot,
            parkedCars,
            matryoshkaMobs,
            classroomStudents,
            deadStudents: classroomDeadStudents,
            isCollisionSurface,
          })
        : {};
    const parkingSurfaceHit = projectileHits.surface;
    const matryoshkaHit = projectileHits.matryoshka;
    const classroomStudentHit = projectileHits.classroomStudent;
    projectile.previousPosition.copy(projectilePosition);
    const hitFloor = translation.y <= projectileRadius + 0.01;
    const classroomStudentAccepted = Boolean(
      classroomStudentHit &&
      (!parkingSurfaceHit ||
        classroomStudentHit.hit.distance <= parkingSurfaceHit.distance),
    );
    const projectileExpired = now - projectile.bornAt > projectileLifetime;
    if (
      projectileHitLogSetting.checked &&
      gameState.isInClassroom &&
      (classroomStudentAccepted ||
        parkingSurfaceHit ||
        hitFloor ||
        projectileExpired)
    ) {
      if (classroomStudentAccepted && classroomStudentHit) {
        console.info("[Projectile hit] classroom student", {
          studentPosition: classroomStudentHit.student.position.toArray(),
          mesh:
            classroomStudentHit.hit.object.name ||
            classroomStudentHit.hit.object.type,
          impactPosition: classroomStudentHit.hit.point.toArray(),
          distance: classroomStudentHit.hit.distance,
        });
      } else if (parkingSurfaceHit) {
        console.info("[Projectile blocked] classroom surface", {
          surface:
            parkingSurfaceHit.object.name || parkingSurfaceHit.object.type,
          impactPosition: parkingSurfaceHit.point.toArray(),
          distance: parkingSurfaceHit.distance,
          studentCandidate: classroomStudentHit
            ? {
                position: classroomStudentHit.student.position.toArray(),
                distance: classroomStudentHit.hit.distance,
              }
            : null,
        });
      } else if (hitFloor) {
        console.info("[Projectile ended] floor", {
          position: projectilePosition.toArray(),
        });
      } else if (projectileExpired) {
        console.info("[Projectile missed] lifetime expired", {
          position: projectilePosition.toArray(),
        });
      }
    }
    if (classroomStudentAccepted && classroomStudentHit) {
      const impactNormal = classroomStudentHit.hit.face
        ? classroomStudentHit.hit.face.normal
            .clone()
            .applyNormalMatrix(
              new THREE.Matrix3().getNormalMatrix(
                classroomStudentHit.hit.object.matrixWorld,
              ),
            )
            .normalize()
        : new THREE.Vector3(0, 1, 0);
      createImpactSpark(
        classroomStudentHit.hit.point,
        impactNormal,
        projectileTravel.normalize(),
      );
      knockDownClassroomStudent(
        classroomStudentHit.student,
        now,
        projectileTravel,
      );
    } else if (
      matryoshkaHit &&
      (!parkingSurfaceHit ||
        matryoshkaHit.hit.distance <= parkingSurfaceHit.distance)
    ) {
      const impactNormal = matryoshkaHit.hit.face
        ? matryoshkaHit.hit.face.normal
            .clone()
            .applyNormalMatrix(
              new THREE.Matrix3().getNormalMatrix(
                matryoshkaHit.hit.object.matrixWorld,
              ),
            )
            .normalize()
        : new THREE.Vector3(0, 1, 0);
      createImpactSpark(
        matryoshkaHit.hit.point,
        impactNormal,
        projectileTravel.normalize(),
      );
      knockDownMatryoshkaMob(matryoshkaHit.mob, now, projectileTravel);
    } else if (parkingSurfaceHit) {
      const impactNormal = parkingSurfaceHit.face
        ? parkingSurfaceHit.face.normal
            .clone()
            .applyNormalMatrix(
              new THREE.Matrix3().getNormalMatrix(
                parkingSurfaceHit.object.matrixWorld,
              ),
            )
            .normalize()
        : new THREE.Vector3(0, 1, 0);
      createImpactSpark(
        parkingSurfaceHit.point,
        impactNormal,
        projectileTravel.normalize(),
      );
    } else if (hitFloor)
      createImpactSpark(
        projectilePosition,
        new THREE.Vector3(0, 1, 0),
        projectileTravel.normalize(),
      );
    if (
      classroomStudentHit ||
      matryoshkaHit ||
      parkingSurfaceHit ||
      hitFloor ||
      projectileExpired
    ) {
      physicsWorld.removeRigidBody(projectile.body);
      scene.remove(projectile.mesh);
      projectiles.splice(index, 1);
    }
  }
}

const shotDirection = new THREE.Vector3();
const shotOrigin = new THREE.Vector3();
const cameraOrigin = new THREE.Vector3();
const aimPoint = new THREE.Vector3();
const cameraRight = new THREE.Vector3();
const cameraUp = new THREE.Vector3();
const impactOffset = new THREE.Vector3();
const projectileAimDistance = 45;

function _registerTargetHit(hitTarget: typeof target): void {
  if (hitVfxEnabled) {
    gsap.killTweensOf(hitMarker);
    gsap.fromTo(
      hitMarker,
      { opacity: 1, scale: 0.82 },
      { opacity: 0, scale: 1, duration: hitMarkerDuration, ease: "power2.out" },
    );
  }
  if (
    shootingMode === "strafetrack" ||
    shootingMode === "spheretrack" ||
    shootingMode === "fallingtrack"
  ) {
    return;
  }
  if (shootingMode === "gridshot" || shootingMode === "gridshotprecision") {
    moveGridTargetToRandomCell(hitTarget);
  } else if (
    shootingMode === "reflexshot" ||
    shootingMode === "reflexshotprecision"
  ) {
    impactOffset.copy(
      getRandomVisibleTargetPosition(
        isSnipingMode() ? 30 : 16,
        isSnipingMode() ? 20 : 12,
        0.58,
      ),
    );
    scheduleReflexTarget(impactOffset);
  } else if (
    shootingMode === "microshot" ||
    shootingMode === "microshotprecision"
  ) {
    impactOffset.copy(
      shootingMode === "microshotprecision"
        ? getNearbyPrecisionTargetPosition(hitTarget.position)
        : microshotPositions[
            Math.floor(Math.random() * microshotPositions.length)
          ],
    );
    rebuildTargetPath(impactOffset, clock.getElapsedTime());
    target.position.copy(impactOffset);
    target.visible = false;
    gsap.delayedCall(0.28, () => {
      if (shootingMode === "microshot" || shootingMode === "microshotprecision")
        target.visible = true;
    });
  } else {
    impactOffset.copy(getRandomVisibleTargetPosition(14, 22));
    rebuildTargetPath(impactOffset, clock.getElapsedTime());
    target.position.copy(impactOffset);
    target.visible = false;
    gsap.delayedCall(0.28, () => {
      if (shootingMode === "flickshot" || shootingMode === "flickshotprecision")
        target.visible = true;
    });
  }
}

function createTracer(_position: THREE.Vector3): void {
  return;
}

function createImpactSpark(
  position: THREE.Vector3,
  normal: THREE.Vector3,
  incomingDirection?: THREE.Vector3,
): void {
  if (!hitVfxEnabled) return;
  const surfaceNormal = normal.clone().normalize();
  const tangent = new THREE.Vector3()
    .crossVectors(
      surfaceNormal,
      Math.abs(surfaceNormal.y) < 0.9
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0),
    )
    .normalize();
  const bitangent = new THREE.Vector3()
    .crossVectors(surfaceNormal, tangent)
    .normalize();
  const incident = incomingDirection
    ? incomingDirection.clone().normalize()
    : new THREE.Vector3();
  const reflection =
    incident.lengthSq() > 0
      ? incident
          .clone()
          .sub(
            surfaceNormal
              .clone()
              .multiplyScalar(2 * incident.dot(surfaceNormal)),
          )
      : new THREE.Vector3();
  const reflectedDirection =
    reflection.lengthSq() > 0 ? reflection.normalize() : surfaceNormal.clone();

  for (let index = 0; index < 10; index += 1) {
    const spark = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.008, 0.008),
      new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? "#ffd166" : "#ff7a45",
        transparent: true,
        opacity: 0.95,
        fog: false,
      }),
    );
    const sparkMaterial = spark.material as THREE.MeshBasicMaterial;
    const _angle = (index / 10) * Math.PI * 2;
    const distance = 0.22 + Math.random() * 0.18;
    const jitter = tangent
      .clone()
      .multiplyScalar((Math.random() - 0.5) * 0.55)
      .addScaledVector(bitangent, (Math.random() - 0.5) * 0.55);
    const spreadDirection = reflectedDirection.clone().add(jitter).normalize();
    const spread = spreadDirection.multiplyScalar(distance);
    const lift = surfaceNormal
      .clone()
      .multiplyScalar(0.04 + Math.random() * 0.08);
    const start = position.clone().addScaledVector(surfaceNormal, 0.02);
    const end = position.clone().add(spread).add(lift);

    spark.position.copy(start);
    spark.quaternion.setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      end.clone().sub(start).normalize(),
    );
    scene.add(spark);

    gsap.to(spark.position, {
      x: end.x,
      y: end.y,
      z: end.z,
      duration: 0.06 + Math.random() * 0.03,
      ease: "power1.out",
    });
    gsap.to(spark.scale, {
      x: 1.8,
      y: 1,
      z: 1,
      duration: 0.08,
      ease: "power1.out",
    });
    gsap.to(sparkMaterial, {
      opacity: 0,
      duration: 0.12 + Math.random() * 0.04,
      onComplete: () => {
        scene.remove(spark);
        spark.geometry.dispose();
        sparkMaterial.dispose();
      },
    });
  }
}

function fireShot(): void {
  if (trueCarEntered || !gameState.weaponPickupCollected || weaponReloading)
    return;
  if (gameState.weaponAmmo <= 0) {
    if (reloadPromptFadeTimer !== null)
      window.clearTimeout(reloadPromptFadeTimer);
    reloadPrompt.classList.remove("is-fading");
    reloadPrompt.hidden = false;
    reloadPromptFadeTimer = window.setTimeout(() => {
      reloadPrompt.classList.add("is-fading");
      reloadPromptFadeTimer = window.setTimeout(() => {
        reloadPrompt.hidden = true;
        reloadPrompt.classList.remove("is-fading");
        reloadPromptFadeTimer = null;
      }, 300);
    }, 700);
    camera.getWorldPosition(cameraOrigin);
    alertMatryoshkasToSound(cameraOrigin);
    void dryFireSoundReady.then(playDryFire);
    return;
  }
  gameState.weaponAmmo -= 1;
  playGunshot();
  applyRecoil();
  shotOrigin.copy(getMuzzleWorldPosition());
  camera.getWorldPosition(cameraOrigin);
  alertMatryoshkasToSound(cameraOrigin, "player", true);
  camera.getWorldDirection(shotDirection);
  cameraRight.setFromMatrixColumn(camera.matrixWorld, 0);
  cameraUp.setFromMatrixColumn(camera.matrixWorld, 1);
  const movingAtShot =
    controls.isLocked &&
    (keys.has("KeyW") ||
      keys.has("KeyA") ||
      keys.has("KeyS") ||
      keys.has("KeyD"));
  const airborneAtShot =
    controls.isLocked && camera.position.y > playerHeight + 0.05;
  const shotSpread = getShotSpread(movingAtShot, airborneAtShot);
  calculateShotDirection({
    cameraPosition: cameraOrigin,
    forward: shotDirection,
    right: cameraRight,
    up: cameraUp,
    muzzlePosition: shotOrigin,
    aimDistance: projectileAimDistance,
    spread: shotSpread,
    aimPoint,
    direction: shotDirection,
  });
  spawnProjectile(shotDirection, shotOrigin);
}

bindRendererResize(renderer, camera, canvas);

const clock = new THREE.Clock();
let weaponSwayFactor = 0;
let movementBobPhase = 0;
let wasRunning = false;
let runningBobStrength = 0;
let cameraBobOffset = 0;
const cameraBobAxis = new THREE.Vector3(0, 0, 1);
const cameraBobQuaternion = new THREE.Quaternion();
const identityQuaternion = new THREE.Quaternion();
let lastFrameAt = 0;
function render(): void {
  const frameNow = performance.now();
  if (maxFps > 0 && frameNow - lastFrameAt < 1000 / maxFps) return;
  lastFrameAt = frameNow;
  const delta = Math.min(clock.getDelta(), 0.05);
  const _elapsed = clock.getElapsedTime();
  if (!cameraBobQuaternion.equals(identityQuaternion)) {
    camera.quaternion.multiply(cameraBobQuaternion.invert());
    cameraBobQuaternion.identity();
  }
  camera.position.y -= cameraBobOffset;
  cameraBobOffset = 0;
  if (
    (gameState.isPaused && !gameState.playerDeathActive) ||
    startScreen.classList.contains("is-visible") ||
    episodeScreen.classList.contains("is-visible") ||
    settingsOverlay.classList.contains("is-open") ||
    (range.classList.contains("is-loading") &&
      !range.classList.contains("is-enter-loading"))
  ) {
    return;
  }
  ensureHeartbeatSound();
  updateClassroomBackDoorProgress();
  updateProjectiles(performance.now() / 1000, delta);
  updateMatryoshkaMobs(performance.now() / 1000, delta);
  if (gameState.playerDeathActive) {
    gameState.playerDeathElapsed = Math.min(
      gameState.playerDeathElapsed + delta,
      1.2,
    );
    const deathProgress = 1 - Math.exp(-5 * gameState.playerDeathElapsed);
    camera.position.copy(playerDeathStartPosition);
    camera.position.y -= 2.1 * deathProgress;
    playerDeathRotation.setFromEuler(
      new THREE.Euler(-1.42 * deathProgress, 0, 0.78 * deathProgress),
    );
    camera.quaternion
      .copy(playerDeathStartQuaternion)
      .multiply(playerDeathRotation);
    renderer.render(scene, camera);
    return;
  }

  movement.set(0, 0, 0);
  let frameSprintSpeed = playerWalkSpeed;
  if (
    controls.isLocked &&
    !trueCarEntered &&
    !classroomSeatActive &&
    !startScreen.classList.contains("is-visible")
  ) {
    direction.set(
      Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
      0,
      Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
    );
    updatePlayerStamina(delta);
    const sprintRequested =
      isGrounded &&
      direction.lengthSq() > 0 &&
      keys.has("KeyW") &&
      !weaponReloading &&
      (keys.has("ShiftLeft") || keys.has("ShiftRight")) &&
      gameState.playerSprintActive;
    const sprintAccelerationTarget =
      sprintRequested ||
      (jumpMomentumActive && jumpMomentumSpeed > playerWalkSpeed)
        ? 1
        : 0;
    gameState.playerSprintAcceleration +=
      (sprintAccelerationTarget - gameState.playerSprintAcceleration) *
      Math.min(1, delta * 3.5);
    frameSprintSpeed = jumpMomentumActive
      ? jumpMomentumSpeed
      : playerWalkSpeed +
        (playerRunSpeed - playerWalkSpeed) *
          gameState.playerSprintAcceleration *
          getStaminaSprintFactor();
    if (jumpMomentumActive) {
      movePlayerWithJumpMomentum(delta);
    } else if (direction.lengthSq() > 0) {
      direction.normalize();
      movement.copy(direction).multiplyScalar(frameSprintSpeed * delta);
      movePlayerWithCollision(movement);
    }

    isGrounded = false;
    verticalVelocity -= gravity * delta;
    camera.position.y += verticalVelocity * delta;
    if (!parkingBounds && camera.position.y < playerHeight) {
      camera.position.y = playerHeight;
      verticalVelocity = 0;
      isGrounded = true;
    }
  }
  if (trueCarEntered) updateTrueCarSeatPosition();
  else resolveParkingCollision();
  if (isGrounded) {
    if (jumpMomentumActive) {
      const staminaFactor = getStaminaSprintFactor();
      gameState.playerSprintAcceleration =
        staminaFactor > 0
          ? THREE.MathUtils.clamp(
              (jumpMomentumSpeed - playerWalkSpeed) /
                ((playerRunSpeed - playerWalkSpeed) * staminaFactor),
              0,
              1,
            )
          : 0;
    }
    jumpMomentumActive = false;
    jumpMomentumDirection.set(0, 0, 0);
  }
  if (trueCarEntered && trueCar && Number.isFinite(carEndingShakeStartedAt)) {
    const shakeElapsed = performance.now() / 1000 - carEndingShakeStartedAt;
    const shake = carEndingShakePeaks.reduce((amount, peak) => {
      const peakElapsed = shakeElapsed - peak;
      return amount + Math.exp(-((peakElapsed / 0.16) ** 2));
    }, 0);
    trueCar.position
      .copy(carEndingBasePosition)
      .add(
        new THREE.Vector3(
          Math.sin(shakeElapsed * 42) * shake * 0.28,
          Math.abs(Math.sin(shakeElapsed * 36)) * shake * 0.12,
          0,
        ),
      );
    carEndingShakeQuaternion.setFromAxisAngle(
      carEndingShakeAxis,
      Math.sin(shakeElapsed * 48) * shake * 0.12,
    );
    trueCar.quaternion
      .copy(carEndingBaseQuaternion)
      .multiply(carEndingShakeQuaternion);
  }
  updateInfiniteFloor();
  updateKeyInteractionPrompt();
  updateTrueCarSoundIndicator();
  updateClassroomStudentsFacingPlayer();
  updateClassroomFearState();

  runningFeedbackStrength = getStaminaSprintFactor();
  runningFootstepGains.forEach((gain) => {
    gain.gain.value = getMasterVolumeMultiplier() * runningFeedbackStrength;
  });
  const isMoving = controls.isLocked && direction.lengthSq() > 0;
  const isRunning =
    isMoving &&
    isGrounded &&
    !classroomSeatActive &&
    frameSprintSpeed > playerWalkSpeed + 0.02;
  const runningBobTarget = isRunning ? runningFeedbackStrength : 0;
  runningBobStrength +=
    (runningBobTarget - runningBobStrength) * Math.min(1, delta * 8);
  if (Math.abs(runningBobStrength) < 0.001) runningBobStrength = 0;
  const cadenceScale = THREE.MathUtils.clamp(
    frameSprintSpeed / playerRunSpeed,
    0.01,
    1,
  );
  const currentFootstepInterval = runningFootstepInterval / cadenceScale;
  if (isRunning && !wasRunning) {
    runningStepPhase = 0;
    nextRunningStepPhase = 1;
    playRunningFootstep();
    alertMatryoshkasToSound(camera.position);
  }
  wasRunning = isRunning;
  if (isRunning) {
    runningStepPhase += delta / currentFootstepInterval;
    while (runningStepPhase >= nextRunningStepPhase) {
      nextRunningStepPhase += 1;
      playRunningFootstep();
      alertMatryoshkasToSound(camera.position);
    }
    movementBobPhase = Math.PI / 2 + runningStepPhase * Math.PI * 2;
  } else {
    stopRunningSound();
  }
  if (!isRunning && isMoving) movementBobPhase += delta * 7;
  else if (!isRunning) movementBobPhase += delta * 2;
  if (controls.isLocked && !trueCarEntered && runningBobStrength > 0) {
    const bobStrength = 0.075 * runningBobStrength;
    cameraBobOffset = Math.sin(movementBobPhase) * bobStrength;
    camera.position.y += cameraBobOffset;
    const bobRoll =
      Math.sin(movementBobPhase * 0.5) * 0.018 * runningBobStrength;
    cameraBobQuaternion.setFromAxisAngle(cameraBobAxis, bobRoll);
    camera.quaternion.multiply(cameraBobQuaternion);
  } else {
    cameraBobQuaternion.identity();
  }
  const isAirborne =
    controls.isLocked && camera.position.y > playerHeight + 0.05;
  const stationarySpreadPixels = getSpreadPixels(false, false);
  const dynamicSpreadPixels = getSpreadPixels(isMoving, isAirborne);
  const sprintSpreadPixels = getSpreadPixels(true, false);
  const spreadPixels = isRunning
    ? sprintSpreadPixels
    : crosshairDynamicEnabled
      ? stationarySpreadPixels +
        (dynamicSpreadPixels - stationarySpreadPixels) *
          crosshairDynamicStrength
      : stationarySpreadPixels;
  const configuredGapScale = Number(crosshairGapSetting.value) / 14;
  const crosshairGap = spreadPixels * configuredGapScale;
  crosshair.style.setProperty(
    "--crosshair-gap",
    settingPixelsToRem(crosshairGap.toString()),
  );
  weaponSwayFactor +=
    ((isMoving ? 1 : 0) - weaponSwayFactor) * Math.min(1, delta * 10);
  const swayAmount =
    weaponSwayFactor * (aiming ? 0.003 : 0.008) * (isRunning ? 0.75 : 1);
  const weaponSwayRate = isRunning ? 5 : 7;
  const recoilEase = 1 - Math.exp(-38 * delta);
  const recoilPitchStep = (recoilPitch - appliedRecoilPitch) * recoilEase;
  if (Math.abs(recoilPitchStep) > 0.000001) {
    recoilRotation.setFromAxisAngle(recoilLocalAxis, recoilPitchStep);
    camera.quaternion.multiply(recoilRotation).normalize();
    appliedRecoilPitch += recoilPitchStep;
  }
  weaponRecoilVisual +=
    (weaponRecoilPitch - weaponRecoilVisual) * (1 - Math.exp(-42 * delta));
  const weaponKick = weaponRecoilVisual * 0.8;
  if (!gameState.weaponHolstering && !gameState.weaponRaising) {
    weapon.position.set(
      weaponPosition.x +
        Math.sin((movementBobPhase * weaponSwayRate) / 7) * swayAmount,
      weaponPosition.y +
        Math.cos(((movementBobPhase * weaponSwayRate) / 7) * 0.5) *
          swayAmount *
          0.65 +
        weaponKick * 0.45,
      weaponPosition.z,
    );
    weapon.rotation.set(
      weaponRotation.x + weaponRecoilPitch * 0.8,
      weaponRotation.y,
      weaponRotation.z,
    );
  }
  if (weaponReloading) {
    const reloadProgress = THREE.MathUtils.clamp(
      (gunshotAudioContext.currentTime - weaponReloadStartedAt) /
        weaponReloadDuration,
      0,
      1,
    );
    const reloadDip = Math.sin(reloadProgress * Math.PI);
    weapon.position.y -= reloadDip * 0.9;
    weapon.rotation.y += reloadDip * 1.15;
  }
  if (recoilMode === "recover") recoilPitch *= Math.exp(-9 * delta);
  weaponRecoilPitch *= Math.exp(-16 * delta);

  renderer.render(scene, camera);
}

antialiasingSetting.addEventListener("change", () => {
  if (restoringSettings) return;
  saveSettings();
  window.location.reload();
});

restoreSettingsFromStorage();
syncSizeSettingLabels([
  [crosshairOutlineThicknessSetting, crosshairOutlineThicknessValue],
  [crosshairGapSetting, crosshairGapValue],
  [crosshairLengthSetting, crosshairLengthValue],
  [crosshairThicknessSetting, crosshairThicknessValue],
  [crosshairDotSizeSetting, crosshairDotSizeValue],
  [crosshairCircleSizeSetting, crosshairCircleSizeValue],
  [hitMarkerSizeSetting, hitMarkerSizeValue],
  [hitMarkerLengthSetting, hitMarkerLengthValue],
  [hitMarkerThicknessSetting, hitMarkerThicknessValue],
  [hitMarkerGapSetting, hitMarkerGapValue],
]);
applyWeaponSelection();
const shouldShowEpisodeSelectOnLoad =
  sessionStorage.getItem("escape-return-to-episode-select") === "true";
sessionStorage.removeItem("escape-return-to-episode-select");
startScreen.classList.toggle("is-visible", !shouldShowEpisodeSelectOnLoad);
episodeScreen.classList.toggle("is-visible", shouldShowEpisodeSelectOnLoad);
const savedEpisode = getStoredEpisodeId();
gameState.currentEpisode = savedEpisode;
if (savedEpisode === "classroom") {
  gameState.isInClassroom = true;
  gameState.isInChess = false;
} else if (savedEpisode === "chess") {
  gameState.isInClassroom = false;
  gameState.isInChess = true;
} else {
  gameState.isInClassroom = false;
  gameState.isInChess = false;
}
restoreEpisodeVisibility(savedEpisode, {
  parkingLotRoot,
  classroomRoot,
  chessRoot,
});
startGameLoop(renderer, render);
