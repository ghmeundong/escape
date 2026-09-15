import './style.css'
import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { gsap } from 'gsap'
import RAPIER from '@dimforge/rapier3d-compat'

declare global {
  interface Window {
    electronAPI?: {
      quit: () => void
    }
  }
}

await RAPIER.init()

if (window.electronAPI) document.documentElement.classList.add('electron-app')

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <main class="escape-app">
    <section class="range-shell">
      <div class="range" aria-label="Escape parking environment">
      <section class="start-screen is-visible" aria-label="Start Escape">
        <h1>ESCAPE</h1>
        <button class="start-play-button" id="start-play-button" type="button">PLAY</button>
      </section>
      <canvas id="range-canvas" aria-label="Escape game view"></canvas>
      <div class="crosshair" aria-hidden="true"><span></span><i></i><b></b><em></em></div>
      <div class="hit-marker" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="fear-overlay" aria-hidden="true"></div>
      <div class="death-overlay" aria-hidden="true"></div>
      <section class="death-screen" aria-label="You died">
        <div class="death-actions"><button class="death-action-button" id="death-retry-button" type="button">RETRY</button><button class="death-action-button" id="death-exit-button" type="button">EXIT</button></div>
      </section>
      <div class="episode-fade-overlay" aria-hidden="true"></div>
      <button class="settings-button" type="button" aria-label="Open settings" title="Open settings">⚙</button>
      <button class="fullscreen-button" type="button" aria-label="Enter fullscreen" title="Enter fullscreen">⛶</button>
      <div class="settings-overlay" aria-hidden="true">
        <button class="settings-close" type="button" aria-label="Close settings" title="Close settings">×</button>
        <section class="menu-home menu-view is-visible" aria-label="Pause menu">
          <h1>PAUSED</h1>
          <div class="menu-choice-list"><button class="menu-choice-button" id="menu-settings-button" type="button"><strong>ENVIRONMENT SETTINGS</strong><span>Adjust your escape environment</span></button><button class="menu-choice-button menu-exit-button" id="menu-exit-button" type="button"><strong>EXIT</strong><span>Close ESCAPE</span></button></div>
        </section>
        <section class="mode-menu menu-view" aria-label="Mode selection">
          <h1>MODE SELECT</h1>
          <div class="mode-layout">
            <nav class="mode-category-nav" aria-label="Mode categories"><button class="mode-category-button is-active" data-mode-category="flicking" type="button">FLICKING</button><button class="mode-category-button" data-mode-category="tracking" type="button">TRACKING</button></nav>
            <div class="mode-category-content"><section class="mode-panel is-visible" data-mode-panel="flicking"><h2>FLICKING</h2><div class="mode-select" role="group" aria-label="Flicking modes"><button class="mode-button is-active" data-mode="flickshot" type="button">FLICKSHOT</button><button class="mode-button" data-mode="microshot" type="button">MICROSHOT</button><button class="mode-button" data-mode="gridshot" type="button">GRIDSHOT</button><button class="mode-button" data-mode="reflexshot" type="button">REFLEXSHOT</button></div></section><section class="mode-panel" data-mode-panel="tracking"><h2>TRACKING</h2><div class="mode-select" role="group" aria-label="Tracking modes"><button class="mode-button" data-mode="strafetrack" type="button">STRAFETRACK</button><button class="mode-button" data-mode="spheretrack" type="button">SPHERETRACK</button><button class="mode-button" data-mode="fallingtrack" type="button">FALLING TRACK</button></div></section></div>
          </div>
        </section>
        <div class="settings-content">
          <div class="settings-heading"><span>ENVIRONMENT SETTINGS</span></div>
          <div class="settings-layout">
            <nav class="settings-nav" aria-label="Settings categories"><button class="settings-category is-active" data-category="display" type="button">DISPLAY &amp; GRAPHICS</button><button class="settings-category" data-category="weapon" type="button">WEAPON &amp; BALLISTICS</button><button class="settings-category" data-category="controls" type="button">MOUSE &amp; CONTROLS</button><button class="settings-category" data-category="crosshair" type="button">CROSSHAIR</button><button class="settings-category" data-category="targets" type="button">TARGETS &amp; ENVIRONMENT</button><button class="settings-category" data-category="sound" type="button">SOUND</button></nav>
            <div class="settings-category-content">
              <section class="settings-group settings-panel-group is-visible" data-category-panel="display"><h2>DISPLAY &amp; GRAPHICS</h2><label>RENDER DISTANCE <output id="render-distance-value">600</output><input id="render-distance-setting" type="range" min="100" max="600" step="10" value="600"></label><label>FOV <output id="fov-value">65</output><input id="fov-setting" type="range" min="45" max="103" step="1" value="65"></label><label>RESOLUTION SCALE <output id="resolution-scale-value">100%</output><input id="resolution-scale-setting" type="range" min="50" max="150" step="5" value="100"></label><label>MAX FPS <select id="max-fps-setting"><option value="0">UNLIMITED</option><option value="60">60</option><option value="144">144</option><option value="240">240</option></select></label><label class="toggle-row">ANTI-ALIASING <input id="antialiasing-setting" type="checkbox" checked></label></section>
              <section class="settings-group settings-panel-group" data-category-panel="weapon"><h2>WEAPON &amp; BALLISTICS</h2><div class="weapon-preview"><h2>CURRENT WEAPON</h2><canvas id="weapon-preview-canvas" aria-label="Current weapon preview"></canvas><strong id="current-weapon-name">COLT 1911</strong></div><label>WEAPON <select id="weapon-setting"><option value="pistol">PISTOL</option></select></label><label>BULLET SPEED <output id="bullet-speed-value">253</output><input id="bullet-speed-setting" type="range" min="50" max="500" step="1" value="253"></label><label>RECOIL <output id="recoil-value">50%</output><input id="recoil-setting" type="range" min="0" max="100" value="50"></label><label>SPREAD <output id="spread-value">50%</output><input id="spread-setting" type="range" min="0" max="150" value="50"></label><label>MOVEMENT SPREAD <output id="movement-spread-value">225%</output><input id="movement-spread-setting" type="range" min="100" max="500" value="225"></label><label>AIM JUMP SPREAD <output id="aiming-jump-spread-value">550%</output><input id="aiming-jump-spread-setting" type="range" min="100" max="800" value="550"></label><label>HIPFIRE JUMP SPREAD <output id="hipfire-jump-spread-value">450%</output><input id="hipfire-jump-spread-setting" type="range" min="100" max="800" value="450"></label><label>BULLET DROP <output id="bullet-drop-value">100%</output><input id="bullet-drop-setting" type="range" min="0" max="200" value="100"></label></section>
              <section class="settings-group settings-panel-group" data-category-panel="controls"><h2>MOUSE &amp; CONTROLS</h2><label>SENSITIVITY <output id="settings-sensitivity-value">0.70</output><input id="settings-sensitivity" type="range" min="0.2" max="1.5" step="0.05" value="0.7"></label><label>DPI MULTIPLIER <output id="dpi-value">800</output><input id="dpi-setting" type="range" min="100" max="3200" step="100" value="800"></label><label>ADS RATIO <output id="ads-ratio-value">1.00</output><input id="ads-ratio-setting" type="range" min="0.1" max="2" step="0.05" value="1"></label><label>ADS FOV <output id="ads-fov-value">48</output><input id="ads-fov-setting" type="range" min="30" max="65" step="1" value="48"></label><label class="toggle-row">RAW INPUT <input id="raw-input-setting" type="checkbox" checked></label></section>
              <section class="settings-group settings-panel-group" data-category-panel="crosshair"><h2>CROSSHAIR</h2><label>STYLE <select id="crosshair-style-setting"><option>DOT + CROSS</option><option>DOT</option><option>CROSS</option><option>CIRCLE</option></select></label><label>COLOR <input id="crosshair-color-setting" type="color" value="#ffffff"></label><label>GAP <output id="crosshair-gap-value">14px</output><input id="crosshair-gap-setting" type="range" min="0" max="30" value="14"></label><label>LENGTH <output id="crosshair-length-value">8px</output><input id="crosshair-length-setting" type="range" min="2" max="24" value="8"></label><label>THICKNESS <output id="crosshair-thickness-value">1px</output><input id="crosshair-thickness-setting" type="range" min="1" max="5" value="1"></label><label>DOT SIZE <output id="crosshair-dot-size-value">5px</output><input id="crosshair-dot-size-setting" type="range" min="1" max="12" value="5"></label><label>CIRCLE SIZE <output id="crosshair-circle-size-value">30px</output><input id="crosshair-circle-size-setting" type="range" min="8" max="58" value="30"></label><label>OPACITY <output id="crosshair-opacity-value">90%</output><input id="crosshair-opacity-setting" type="range" min="10" max="100" value="90"></label><label>OUTLINE COLOR <input id="crosshair-outline-color-setting" type="color" value="#000000"></label><label>OUTLINE THICKNESS <output id="crosshair-outline-thickness-value">0px</output><input id="crosshair-outline-thickness-setting" type="range" min="0" max="4" value="0"></label><label class="toggle-row">DYNAMIC RESPONSE <input id="crosshair-dynamic-setting" type="checkbox" checked></label><label>DYNAMIC STRENGTH <output id="crosshair-dynamic-strength-value">100%</output><input id="crosshair-dynamic-strength-setting" type="range" min="0" max="200" value="100"></label><h2>HIT MARKER</h2><label>COLOR <input id="hit-marker-color-setting" type="color" value="#67d68b"></label><label>SIZE <output id="hit-marker-size-value">36px</output><input id="hit-marker-size-setting" type="range" min="16" max="72" value="36"></label><label>LENGTH <output id="hit-marker-length-value">9px</output><input id="hit-marker-length-setting" type="range" min="3" max="24" value="9"></label><label>THICKNESS <output id="hit-marker-thickness-value">1px</output><input id="hit-marker-thickness-setting" type="range" min="1" max="5" value="1"></label><label>GAP <output id="hit-marker-gap-value">10px</output><input id="hit-marker-gap-setting" type="range" min="4" max="24" value="10"></label><label>FADE TIME <output id="hit-marker-duration-value">0.22s</output><input id="hit-marker-duration-setting" type="range" min="0.05" max="1" step="0.01" value="0.22"></label></section>
              <section class="settings-group settings-panel-group" data-category-panel="targets"><h2>TARGETS &amp; ENVIRONMENT</h2><label>BACKGROUND <input id="background-color-setting" type="color" value="#0b0e12"></label><label>FLOOR <input id="floor-color-setting" type="color" value="#171d24"></label><label>GRID <input id="grid-color-setting" type="color" value="#33404a"></label><label>TARGET <input id="target-color-setting" type="color" value="#e33f32"></label><label>TARGET SIZE <output id="target-size-value">100%</output><input id="target-size-setting" type="range" min="50" max="150" value="100"></label><label>TRACKING SPEED <output id="tracking-speed-value">4.0</output><input id="tracking-speed-setting" type="range" min="1" max="10" step="0.5" value="4"></label><label>FALLING HORIZONTAL FORCE <output id="falling-horizontal-force-value">3.4</output><input id="falling-horizontal-force-setting" type="range" min="0" max="8" step="0.1" value="3.4"></label><label>FALLING LAUNCH <output id="falling-launch-value">12.0</output><input id="falling-launch-setting" type="range" min="0" max="20" step="0.5" value="12"></label><label>FALLING GRAVITY <output id="falling-gravity-value">18.0</output><input id="falling-gravity-setting" type="range" min="1" max="36" step="0.5" value="18"></label><label>FALLING RESPAWN DELAY <output id="falling-respawn-delay-value">0.60s</output><input id="falling-respawn-delay-setting" type="range" min="0.1" max="2" step="0.05" value="0.6"></label></section>
              <section class="settings-group settings-panel-group" data-category-panel="sound"><h2>SOUND</h2><label>GUNSHOT VOLUME <output id="gunshot-volume-value">50%</output><input id="gunshot-volume-setting" type="range" min="0" max="100" value="50"></label></section>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  </main>
`

const canvas = document.querySelector<HTMLCanvasElement>('#range-canvas')!
const startScreen = document.querySelector<HTMLElement>('.start-screen')!
const startPlayButton = document.querySelector<HTMLButtonElement>('#start-play-button')!
const crosshair = document.querySelector<HTMLElement>('.crosshair')!
const hitMarker = document.querySelector<HTMLElement>('.hit-marker')!
const fearOverlay = document.querySelector<HTMLElement>('.fear-overlay')!
const deathOverlay = document.querySelector<HTMLElement>('.death-overlay')!
const deathScreen = document.querySelector<HTMLElement>('.death-screen')!
const deathRetryButton = document.querySelector<HTMLButtonElement>('#death-retry-button')!
const deathExitButton = document.querySelector<HTMLButtonElement>('#death-exit-button')!
const range = document.querySelector<HTMLElement>('.range')!
const keyPickupPrompt = document.createElement('div')
keyPickupPrompt.className = 'interaction-prompt'
keyPickupPrompt.textContent = 'PRESS [F] TO PICK UP KEY'
keyPickupPrompt.hidden = true
range.append(keyPickupPrompt)
const vehicleSearchHint = document.createElement('div')
vehicleSearchHint.className = 'vehicle-search-hint'
vehicleSearchHint.textContent = '[P]: PANIC BUTTON'
vehicleSearchHint.hidden = true
range.append(vehicleSearchHint)
const trueCarPrompt = document.createElement('div')
trueCarPrompt.className = 'interaction-prompt'
trueCarPrompt.textContent = 'PRESS [F] TO ENTER'
trueCarPrompt.hidden = true
range.append(trueCarPrompt)
const trueCarSoundIndicator = document.createElement('div')
trueCarSoundIndicator.className = 'true-car-sound-indicator'
trueCarSoundIndicator.hidden = true
range.append(trueCarSoundIndicator)
const episodeFadeOverlay = document.querySelector<HTMLElement>('.episode-fade-overlay')!
const scopeOverlay = document.createElement('div')
scopeOverlay.className = 'scope-overlay'
scopeOverlay.innerHTML = '<div class="scope-reticle"><span></span><i></i><b></b><em></em></div>'
range.append(scopeOverlay)
const crosshairPreview = crosshair.cloneNode(true) as HTMLElement
crosshairPreview.classList.remove('is-scope-hidden', 'is-hipfire-hidden')
crosshairPreview.classList.add('crosshair-preview')
const scopePreview = document.createElement('div')
scopePreview.className = 'scope-overlay scope-preview-overlay scope-classic is-visible'
scopePreview.innerHTML = '<div class="scope-reticle"><span></span><i></i><b></b><em></em></div>'
const hitMarkerPreview = hitMarker.cloneNode(true) as HTMLElement
hitMarkerPreview.classList.add('hit-marker-preview')
hitMarkerPreview.style.opacity = '1'
const crosshairPanel = document.querySelector<HTMLElement>('[data-category-panel="crosshair"]')!
const customPreview = document.createElement('div')
customPreview.className = 'custom-preview'
customPreview.innerHTML = '<div class="custom-preview-item"><span>CROSSHAIR PREVIEW</span><div class="crosshair-preview-stage"></div></div>'
customPreview.querySelector('.crosshair-preview-stage')?.append(crosshairPreview)
crosshairPanel.prepend(customPreview)
const hitMarkerPreviewCard = document.createElement('div')
hitMarkerPreviewCard.className = 'custom-preview custom-preview-hit-marker'
hitMarkerPreviewCard.innerHTML = '<div class="custom-preview-item"><span>HIT MARKER PREVIEW</span><div class="hit-marker-preview-stage"></div></div>'
hitMarkerPreviewCard.querySelector('.hit-marker-preview-stage')?.append(hitMarkerPreview)
const hitMarkerHeading = [...crosshairPanel.querySelectorAll('h2')].find((heading) => heading.textContent?.trim() === 'HIT MARKER')
hitMarkerHeading?.before(hitMarkerPreviewCard)
const scopePreviewCard = document.createElement('div')
scopePreviewCard.className = 'custom-preview custom-preview-scope'
scopePreviewCard.innerHTML = '<div class="custom-preview-item"><span>SCOPE PREVIEW</span><div class="scope-preview-stage"></div></div>'
scopePreviewCard.querySelector('.scope-preview-stage')?.append(scopePreview)
const crosshairPreviewTargets = [crosshair, crosshairPreview]
const scopePreviewTargets = [scopeOverlay, scopePreview]
const hitMarkerPreviewTargets = [hitMarker, hitMarkerPreview]
const settingsButton = document.querySelector<HTMLButtonElement>('.settings-button')!
const settingsOverlay = document.querySelector<HTMLElement>('.settings-overlay')!
const settingsClose = document.querySelector<HTMLButtonElement>('.settings-close')!
const menuHome = document.querySelector<HTMLElement>('.menu-home')!
const modeMenu = document.querySelector<HTMLElement>('.mode-menu')!
modeMenu.remove()
const settingsContent = document.querySelector<HTMLElement>('.settings-content')!
const resetSettingsButton = document.createElement('button')
resetSettingsButton.type = 'button'
resetSettingsButton.className = 'settings-reset-button'
resetSettingsButton.textContent = 'RESET DEFAULTS'
settingsContent.querySelector('.settings-heading')?.append(resetSettingsButton)
resetSettingsButton.addEventListener('click', () => {
  localStorage.removeItem(settingsStorageKey)
  window.location.reload()
})
const menuSettingsButton = document.querySelector<HTMLButtonElement>('#menu-settings-button')!
const menuExitButton = document.querySelector<HTMLButtonElement>('#menu-exit-button')!
const modeCategoryButtons = [...document.querySelectorAll<HTMLButtonElement>('.mode-category-button')]
const modeCategoryPanels = [...document.querySelectorAll<HTMLElement>('[data-mode-panel]')]
const modeCategoryNav = modeCategoryButtons[0]?.parentElement
const modeCategoryContent = modeCategoryPanels[0]?.parentElement
let activeMenuView: 'home' | 'mode' | 'settings' = 'home'
const weaponPreviewCanvas = document.querySelector<HTMLCanvasElement>('#weapon-preview-canvas')!
const fullscreenButton = document.querySelector<HTMLButtonElement>('.fullscreen-button')!
const modeButtons = [...document.querySelectorAll<HTMLButtonElement>('.mode-button')]
const settingsCategoryButtons = [...document.querySelectorAll<HTMLButtonElement>('.settings-category')]
const settingsCategoryPanels = [...document.querySelectorAll<HTMLElement>('[data-category-panel]')]
const weaponCategoryButton = settingsCategoryButtons.find((button) => button.dataset.category === 'weapon')
const displayCategoryButton = settingsCategoryButtons.find((button) => button.dataset.category === 'display')
const settingsCategoryNav = weaponCategoryButton?.parentElement
if (weaponCategoryButton && displayCategoryButton && settingsCategoryNav) settingsCategoryNav.insertBefore(weaponCategoryButton, displayCategoryButton)
const weaponCategoryPanel = settingsCategoryPanels.find((panel) => panel.dataset.categoryPanel === 'weapon')
const displayCategoryPanel = settingsCategoryPanels.find((panel) => panel.dataset.categoryPanel === 'display')
const settingsCategoryContent = weaponCategoryPanel?.parentElement
if (weaponCategoryPanel && displayCategoryPanel && settingsCategoryContent) settingsCategoryContent.insertBefore(weaponCategoryPanel, displayCategoryPanel)
settingsCategoryButtons.forEach((button) => button.classList.toggle('is-active', button === displayCategoryButton))
settingsCategoryPanels.forEach((panel) => panel.classList.toggle('is-visible', panel === displayCategoryPanel))
const crosshairVisibilitySetting = document.createElement('input')
crosshairVisibilitySetting.id = 'crosshair-visibility-setting'
crosshairVisibilitySetting.type = 'checkbox'
crosshairVisibilitySetting.checked = false
const crosshairVisibilityLabel = document.createElement('label')
crosshairVisibilityLabel.className = 'toggle-row'
crosshairVisibilityLabel.textContent = 'SHOW CROSSHAIR '
crosshairVisibilityLabel.append(crosshairVisibilitySetting)
displayCategoryPanel?.append(crosshairVisibilityLabel)
crosshair.hidden = !crosshairVisibilitySetting.checked
crosshairVisibilitySetting.addEventListener('change', () => {
  crosshair.hidden = !crosshairVisibilitySetting.checked
})
const fovSetting = document.querySelector<HTMLInputElement>('#fov-setting')!
const fovValue = document.querySelector<HTMLOutputElement>('#fov-value')!
const bulletSpeedSetting = document.querySelector<HTMLInputElement>('#bullet-speed-setting')!
const bulletSpeedValue = document.querySelector<HTMLOutputElement>('#bullet-speed-value')!
const settingsSensitivity = document.querySelector<HTMLInputElement>('#settings-sensitivity')!
const settingsSensitivityValue = document.querySelector<HTMLOutputElement>('#settings-sensitivity-value')!
const renderDistanceSetting = document.querySelector<HTMLInputElement>('#render-distance-setting')!
const renderDistanceValue = document.querySelector<HTMLOutputElement>('#render-distance-value')!
const resolutionScaleSetting = document.querySelector<HTMLInputElement>('#resolution-scale-setting')!
const resolutionScaleValue = document.querySelector<HTMLOutputElement>('#resolution-scale-value')!
const antialiasingSetting = document.querySelector<HTMLInputElement>('#antialiasing-setting')!
const maxFpsSetting = document.querySelector<HTMLSelectElement>('#max-fps-setting')!
const weaponSetting = document.querySelector<HTMLSelectElement>('#weapon-setting')!
const currentWeaponName = document.querySelector<HTMLElement>('#current-weapon-name')!
currentWeaponName.textContent = 'M1911'
weaponSetting.replaceChildren(new Option('M1911', 'pistol'))
const recoilModeSetting = document.createElement('select')
recoilModeSetting.id = 'recoil-mode-setting'
recoilModeSetting.innerHTML = '<option value="recover">KICK + RECOVER</option><option value="sustained">SUSTAINED</option>'
const recoilModeLabel = document.createElement('label')
recoilModeLabel.textContent = 'RECOIL MODE '
recoilModeLabel.append(recoilModeSetting)
bulletSpeedSetting.closest('label')?.before(recoilModeLabel)
const recoilSetting = document.querySelector<HTMLInputElement>('#recoil-setting')!
const recoilValue = document.querySelector<HTMLOutputElement>('#recoil-value')!
const spreadSetting = document.querySelector<HTMLInputElement>('#spread-setting')!
const spreadValue = document.querySelector<HTMLOutputElement>('#spread-value')!
const movementSpreadSetting = document.querySelector<HTMLInputElement>('#movement-spread-setting')!
const movementSpreadValue = document.querySelector<HTMLOutputElement>('#movement-spread-value')!
const aimingJumpSpreadSetting = document.querySelector<HTMLInputElement>('#aiming-jump-spread-setting')!
const aimingJumpSpreadValue = document.querySelector<HTMLOutputElement>('#aiming-jump-spread-value')!
const hipfireJumpSpreadSetting = document.querySelector<HTMLInputElement>('#hipfire-jump-spread-setting')!
const hipfireJumpSpreadValue = document.querySelector<HTMLOutputElement>('#hipfire-jump-spread-value')!
const bulletDropSetting = document.querySelector<HTMLInputElement>('#bullet-drop-setting')!
const bulletDropValue = document.querySelector<HTMLOutputElement>('#bullet-drop-value')!
const trackingSpeedSetting = document.querySelector<HTMLInputElement>('#tracking-speed-setting')!
const trackingSpeedValue = document.querySelector<HTMLOutputElement>('#tracking-speed-value')!
const fallingHorizontalForceSetting = document.querySelector<HTMLInputElement>('#falling-horizontal-force-setting')!
const fallingHorizontalForceValue = document.querySelector<HTMLOutputElement>('#falling-horizontal-force-value')!
const fallingLaunchSetting = document.querySelector<HTMLInputElement>('#falling-launch-setting')!
const fallingLaunchValue = document.querySelector<HTMLOutputElement>('#falling-launch-value')!
const fallingGravitySetting = document.querySelector<HTMLInputElement>('#falling-gravity-setting')!
const fallingGravityValue = document.querySelector<HTMLOutputElement>('#falling-gravity-value')!
const fallingRespawnDelaySetting = document.querySelector<HTMLInputElement>('#falling-respawn-delay-setting')!
const fallingRespawnDelayValue = document.querySelector<HTMLOutputElement>('#falling-respawn-delay-value')!
const targetSizeSetting = document.querySelector<HTMLInputElement>('#target-size-setting')!
const targetSizeValue = document.querySelector<HTMLOutputElement>('#target-size-value')!
const backgroundColorSetting = document.querySelector<HTMLInputElement>('#background-color-setting')!
const floorColorSetting = document.querySelector<HTMLInputElement>('#floor-color-setting')!
const gridColorSetting = document.querySelector<HTMLInputElement>('#grid-color-setting')!
const targetColorSetting = document.querySelector<HTMLInputElement>('#target-color-setting')!
const gunshotVolumeSetting = document.querySelector<HTMLInputElement>('#gunshot-volume-setting')!
const gunshotVolumeValue = document.querySelector<HTMLOutputElement>('#gunshot-volume-value')!
const crosshairStyleSetting = document.querySelector<HTMLSelectElement>('#crosshair-style-setting')!
const crosshairColorSetting = document.querySelector<HTMLInputElement>('#crosshair-color-setting')!
const crosshairGapSetting = document.querySelector<HTMLInputElement>('#crosshair-gap-setting')!
const crosshairGapValue = document.querySelector<HTMLOutputElement>('#crosshair-gap-value')!
const crosshairLengthSetting = document.querySelector<HTMLInputElement>('#crosshair-length-setting')!
const crosshairLengthValue = document.querySelector<HTMLOutputElement>('#crosshair-length-value')!
const crosshairThicknessSetting = document.querySelector<HTMLInputElement>('#crosshair-thickness-setting')!
const crosshairThicknessValue = document.querySelector<HTMLOutputElement>('#crosshair-thickness-value')!
const crosshairDotSizeSetting = document.querySelector<HTMLInputElement>('#crosshair-dot-size-setting')!
const crosshairDotSizeValue = document.querySelector<HTMLOutputElement>('#crosshair-dot-size-value')!
const crosshairCircleSizeSetting = document.querySelector<HTMLInputElement>('#crosshair-circle-size-setting')!
const crosshairCircleSizeValue = document.querySelector<HTMLOutputElement>('#crosshair-circle-size-value')!
const crosshairOpacitySetting = document.querySelector<HTMLInputElement>('#crosshair-opacity-setting')!
const crosshairOpacityValue = document.querySelector<HTMLOutputElement>('#crosshair-opacity-value')!
const crosshairDynamicSetting = document.querySelector<HTMLInputElement>('#crosshair-dynamic-setting')!
const crosshairHideWhenNotAimingSetting = document.createElement('input')
crosshairHideWhenNotAimingSetting.id = 'crosshair-hide-when-not-aiming-setting'
crosshairHideWhenNotAimingSetting.type = 'checkbox'
crosshairHideWhenNotAimingSetting.checked = false
const crosshairHideWhenNotAimingLabel = document.createElement('label')
crosshairHideWhenNotAimingLabel.className = 'toggle-row'
crosshairHideWhenNotAimingLabel.textContent = 'HIDE WHEN NOT AIMING '
crosshairHideWhenNotAimingLabel.append(crosshairHideWhenNotAimingSetting)
crosshairDynamicSetting.closest('label')?.before(crosshairHideWhenNotAimingLabel)
const crosshairDynamicStrengthSetting = document.querySelector<HTMLInputElement>('#crosshair-dynamic-strength-setting')!
const crosshairDynamicStrengthValue = document.querySelector<HTMLOutputElement>('#crosshair-dynamic-strength-value')!
const hitMarkerColorSetting = document.querySelector<HTMLInputElement>('#hit-marker-color-setting')!
const hitMarkerSizeSetting = document.querySelector<HTMLInputElement>('#hit-marker-size-setting')!
const hitMarkerSizeValue = document.querySelector<HTMLOutputElement>('#hit-marker-size-value')!
const hitMarkerLengthSetting = document.querySelector<HTMLInputElement>('#hit-marker-length-setting')!
const hitMarkerLengthValue = document.querySelector<HTMLOutputElement>('#hit-marker-length-value')!
const hitMarkerThicknessSetting = document.querySelector<HTMLInputElement>('#hit-marker-thickness-setting')!
const hitMarkerThicknessValue = document.querySelector<HTMLOutputElement>('#hit-marker-thickness-value')!
const hitMarkerGapSetting = document.querySelector<HTMLInputElement>('#hit-marker-gap-setting')!
const hitMarkerGapValue = document.querySelector<HTMLOutputElement>('#hit-marker-gap-value')!
const hitMarkerDurationSetting = document.querySelector<HTMLInputElement>('#hit-marker-duration-setting')!
const hitMarkerDurationValue = document.querySelector<HTMLOutputElement>('#hit-marker-duration-value')!
const dpiSetting = document.querySelector<HTMLInputElement>('#dpi-setting')!
const dpiValue = document.querySelector<HTMLOutputElement>('#dpi-value')!
const adsRatioSetting = document.querySelector<HTMLInputElement>('#ads-ratio-setting')!
const adsRatioValue = document.querySelector<HTMLOutputElement>('#ads-ratio-value')!
const adsFovSetting = document.querySelector<HTMLInputElement>('#ads-fov-setting')!
const adsFovValue = document.querySelector<HTMLOutputElement>('#ads-fov-value')!
const rawInputSetting = document.querySelector<HTMLInputElement>('#raw-input-setting')!
const domeGridPanel = document.querySelector<HTMLElement>('[data-category-panel="targets"]')!
const domeGridSetting = document.createElement('input')
domeGridSetting.id = 'dome-grid-setting'
domeGridSetting.type = 'checkbox'
domeGridSetting.checked = false
const domeGridToggleLabel = document.createElement('label')
domeGridToggleLabel.className = 'toggle-row'
domeGridToggleLabel.textContent = 'NEON DOME GRID '
domeGridToggleLabel.append(domeGridSetting)
const domeGridColorSetting = document.createElement('input')
domeGridColorSetting.id = 'dome-grid-color-setting'
domeGridColorSetting.type = 'color'
domeGridColorSetting.value = '#39ff88'
const domeGridColorLabel = document.createElement('label')
domeGridColorLabel.textContent = 'DOME GRID COLOR '
domeGridColorLabel.append(domeGridColorSetting)
domeGridPanel.insertBefore(domeGridToggleLabel, floorColorSetting.closest('label'))
domeGridPanel.insertBefore(domeGridColorLabel, floorColorSetting.closest('label'))
const hideAllCarsSetting = document.createElement('input')
hideAllCarsSetting.id = 'hide-all-cars-setting'
hideAllCarsSetting.type = 'checkbox'
hideAllCarsSetting.checked = false
const hideAllCarsToggleLabel = document.createElement('label')
hideAllCarsToggleLabel.className = 'toggle-row'
hideAllCarsToggleLabel.textContent = 'HIDE ALL CARS '
hideAllCarsToggleLabel.append(hideAllCarsSetting)
const keyEspSetting = document.createElement('input')
keyEspSetting.id = 'key-esp-setting'
keyEspSetting.type = 'checkbox'
keyEspSetting.checked = false
const keyEspToggleLabel = document.createElement('label')
keyEspToggleLabel.className = 'toggle-row'
keyEspToggleLabel.textContent = 'KEY ESP OUTLINE '
keyEspToggleLabel.append(keyEspSetting)
const trueCarEspSetting = document.createElement('input')
trueCarEspSetting.id = 'true-car-esp-setting'
trueCarEspSetting.type = 'checkbox'
trueCarEspSetting.checked = false
const trueCarEspToggleLabel = document.createElement('label')
trueCarEspToggleLabel.className = 'toggle-row'
trueCarEspToggleLabel.textContent = 'TRUE CAR ESP OUTLINE '
trueCarEspToggleLabel.append(trueCarEspSetting)
const carHitboxSetting = document.createElement('input')
carHitboxSetting.id = 'car-hitbox-setting'
carHitboxSetting.type = 'checkbox'
carHitboxSetting.checked = false
const carHitboxToggleLabel = document.createElement('label')
carHitboxToggleLabel.className = 'toggle-row'
carHitboxToggleLabel.textContent = 'CAR HITBOXES '
carHitboxToggleLabel.append(carHitboxSetting)
const matryoshkaHitboxSetting = document.createElement('input')
matryoshkaHitboxSetting.id = 'matryoshka-hitbox-setting'
matryoshkaHitboxSetting.type = 'checkbox'
matryoshkaHitboxSetting.checked = false
const matryoshkaHitboxToggleLabel = document.createElement('label')
matryoshkaHitboxToggleLabel.className = 'toggle-row'
matryoshkaHitboxToggleLabel.textContent = 'MATRYOSHKA HITBOX '
matryoshkaHitboxToggleLabel.append(matryoshkaHitboxSetting)
const matryoshkaVisionSetting = document.createElement('input')
matryoshkaVisionSetting.id = 'matryoshka-vision-setting'
matryoshkaVisionSetting.type = 'checkbox'
matryoshkaVisionSetting.checked = false
const matryoshkaVisionToggleLabel = document.createElement('label')
matryoshkaVisionToggleLabel.className = 'toggle-row'
matryoshkaVisionToggleLabel.textContent = 'MATRYOSHKA VISION RANGE '
matryoshkaVisionToggleLabel.append(matryoshkaVisionSetting)
const waypointDisplaySetting = document.createElement('input')
waypointDisplaySetting.id = 'matryoshka-waypoint-display-setting'
waypointDisplaySetting.type = 'checkbox'
waypointDisplaySetting.checked = false
const waypointDisplayToggleLabel = document.createElement('label')
waypointDisplayToggleLabel.className = 'toggle-row'
waypointDisplayToggleLabel.textContent = 'SHOW MATRYOSHKA WAYPOINTS '
waypointDisplayToggleLabel.append(waypointDisplaySetting)
const waypointEditSetting = document.createElement('input')
waypointEditSetting.id = 'matryoshka-waypoint-edit-setting'
waypointEditSetting.type = 'checkbox'
waypointEditSetting.checked = false
const waypointEditToggleLabel = document.createElement('label')
waypointEditToggleLabel.className = 'toggle-row'
waypointEditToggleLabel.textContent = 'PLACE WAYPOINTS WITH CLICK '
waypointEditToggleLabel.append(waypointEditSetting)
const developerTestGroup = document.createElement('div')
developerTestGroup.className = 'developer-test-group'
developerTestGroup.innerHTML = '<h2>DEVELOPER TEST OPTIONS</h2>'
developerTestGroup.append(hideAllCarsToggleLabel, keyEspToggleLabel, trueCarEspToggleLabel, carHitboxToggleLabel, matryoshkaHitboxToggleLabel, matryoshkaVisionToggleLabel, waypointDisplayToggleLabel, waypointEditToggleLabel)
const developerCategoryButton = document.createElement('button')
developerCategoryButton.className = 'settings-category'
developerCategoryButton.dataset.category = 'developer'
developerCategoryButton.type = 'button'
developerCategoryButton.textContent = 'DEVELOPER TEST'
const developerCategoryPanel = document.createElement('section')
developerCategoryPanel.className = 'settings-group settings-panel-group'
developerCategoryPanel.dataset.categoryPanel = 'developer'
developerCategoryPanel.append(developerTestGroup)
settingsCategoryNav?.append(developerCategoryButton)
settingsCategoryContent?.append(developerCategoryPanel)
settingsCategoryButtons.push(developerCategoryButton)
settingsCategoryPanels.push(developerCategoryPanel)
const crosshairOutlineColorSetting = document.querySelector<HTMLInputElement>('#crosshair-outline-color-setting')!
const crosshairOutlineThicknessSetting = document.querySelector<HTMLInputElement>('#crosshair-outline-thickness-setting')!
const crosshairOutlineThicknessValue = document.querySelector<HTMLOutputElement>('#crosshair-outline-thickness-value')!
type ShootingMode = 'microshot' | 'flickshot' | 'gridshot' | 'reflexshot' | 'microshotprecision' | 'flickshotprecision' | 'gridshotprecision' | 'reflexshotprecision' | 'strafetrack' | 'spheretrack' | 'fallingtrack'
type WeaponId = 'pistol'
type RecoilMode = 'recover' | 'sustained'
type WeaponProfile = {
  bulletSpeed: number
  recoil: number
  spread: number
  movementSpread: number
  aimingJumpSpread: number
  hipfireJumpSpread: number
  bulletDrop: number
  fireDelay: number
  recoilMode: RecoilMode
}
const weaponProfiles: Record<WeaponId, WeaponProfile> = {
  pistol: { bulletSpeed: 253, recoil: 50, spread: 75, movementSpread: 235, aimingJumpSpread: 350, hipfireJumpSpread: 250, bulletDrop: 100, fireDelay: 0, recoilMode: 'recover' },
}
let shootingMode: ShootingMode = 'flickshot'
let weaponSelection: 'auto' | WeaponId = 'auto'
let activeWeapon: WeaponId = 'pistol'
let recoilMode: RecoilMode = 'recover'
let recoilMultiplier = 1
let spreadMultiplier = 1
let gravityMultiplier = 1
let trackingSpeed = 4
let fallingHorizontalForce = 3.4
let fallingLaunchSpeed = 12
let fallingGravity = 18
let fallingRespawnDelay = 0.6
let maxFps = 0
let targetSizeMultiplier = 1
let hitVfxEnabled = true
let hitSoundEnabled = true
let crosshairDynamicEnabled = true
let crosshairHideWhenNotAiming = false
let crosshairDynamicStrength = 1
let hitMarkerDuration = 0.22
let dpiMultiplier = 1
let adsSensitivityRatio = 1
let adsFov = 48
let resolutionScale = 1
let rawInputEnabled = true

const settingsStorageKey = 'escape-settings-v1'
let restoringSettings = false
const persistedSettings = [
  ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('.settings-overlay input, .settings-overlay select'),
]

function saveSettings(): void {
  const values: Record<string, string | boolean> = {}
  persistedSettings.forEach((control) => {
    values[control.id] = control instanceof HTMLInputElement && control.type === 'checkbox' ? control.checked : control.value
  })
  try {
    localStorage.setItem(settingsStorageKey, JSON.stringify(values))
  } catch { }
}

function restoreSettings(): void {
  restoringSettings = true
  try {
    const storedValues = JSON.parse(localStorage.getItem(settingsStorageKey) ?? '{}') as Record<string, string | boolean>
    persistedSettings.forEach((control) => {
      const storedValue = storedValues[control.id]
      if (storedValue === undefined) return
      if (control instanceof HTMLInputElement && control.type === 'checkbox') control.checked = storedValue === true
      else if (typeof storedValue === 'string') control.value = storedValue
      control.dispatchEvent(new Event('input'))
      control.dispatchEvent(new Event('change'))
    })
  } catch { }
  restoringSettings = false
}

persistedSettings.forEach((control) => {
  control.addEventListener('input', saveSettings)
  control.addEventListener('change', saveSettings)
})
try {
  const storedValues = JSON.parse(localStorage.getItem(settingsStorageKey) ?? '{}') as Record<string, string | boolean>
  if (typeof storedValues['antialiasing-setting'] === 'boolean') antialiasingSetting.checked = storedValues['antialiasing-setting']
} catch { }
const scene = new THREE.Scene()
scene.background = new THREE.Color('#0b0e12')
scene.fog = new THREE.Fog('#0b0e12', 28, 600)
let parkingBounds: THREE.Box3 | null = null
let parkingLotRoot: THREE.Object3D | null = null
let storeRoot: THREE.Object3D | null = null
let storeBounds: THREE.Box3 | null = null
let isInStore = false
const parkingObstacles: THREE.Box3[] = []
const matryoshkaObstacles: THREE.Box3[] = []
const matryoshkaVehicleObstacles: THREE.Box3[] = []
const carHitboxHelpers: THREE.Box3Helper[] = []
const parkingObstacleCellSize = 8
const parkingObstacleCells = new Map<string, THREE.Box3[]>()
const keyEspObjects: THREE.Object3D[] = []
const trueCarEspObjects: THREE.Object3D[] = []
let parkedCarsReady = false
let keyPickupObject: THREE.Object3D | null = null
let keyPickupCollected = false
let trueCar: THREE.Object3D | null = null
let trueCarEntered = false
let trueCarSoundPlaying = false
let carEndingShakeStartedAt = -Infinity
let carEndingShakePeaks: number[] = []
type MatryoshkaMobState = 'wander' | 'investigate' | 'chase'
type MatryoshkaSoundSource = 'player' | 'car'
type MatryoshkaWaypointNetwork = 'yellow' | 'blue'
type MatryoshkaInvestigationPhase = 'yellow' | 'blue'
type MatryoshkaMob = {
  object: THREE.Object3D
  state: MatryoshkaMobState
  soundSource: MatryoshkaSoundSource
  isClone: boolean
  patrolDestination: THREE.Vector3 | null
  physicsBody: RAPIER.RigidBody
  physicsOffsetY: number
  target: THREE.Vector3
  velocity: THREE.Vector3
  stationaryTime: number
  slideDirection: THREE.Vector3
  slideDirectionUntil: number
  knockedDownAt: number
  knockdownBaseY: number
  routeSide: number
  chaseNetwork: MatryoshkaWaypointNetwork
  investigationPhase: MatryoshkaInvestigationPhase
  lastSeenPlayerPosition: THREE.Vector3
  pathRefreshAt: number
  route: THREE.Vector3[]
  visionIndicator: THREE.LineLoop
  hitboxHelper: THREE.Box3Helper
  heardSoundVersion: number
}
const matryoshkaMobs: MatryoshkaMob[] = []
const matryoshkaWaypoints: THREE.Vector3[] = []
const matryoshkaRecoveryWaypoints: THREE.Vector3[] = []
const matryoshkaUserWaypoints: THREE.Vector3[] = []
const matryoshkaWaypointMarkers: THREE.Mesh[] = []
const matryoshkaRecoveryWaypointMarkers: THREE.Mesh[] = []
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
]
const matryoshkaDetectionRange = 34
const matryoshkaSpeed = 7.65
const matryoshkaChaseSpeed = 7.65
const matryoshkaChaseMemoryDistance = 18
const matryoshkaPathRefreshInterval = 0.6
const matryoshkaEyeHeight = 2.5
const matryoshkaModelYawOffset = -Math.PI / 2
const matryoshkaMinWanderDistance = 35
const matryoshkaObstaclePadding = 0.3
const playerWalkSpeed = 3.8
const playerRunSpeed = 11.5
let runningFootstepInterval = 0.5
let runningFootstepClipDuration = runningFootstepInterval * 2
let runningFootstepLoopStart = 0

function detectTwoFootstepClipDuration(buffer: AudioBuffer): number {
  const samples = buffer.getChannelData(0)
  const windowSize = Math.max(1, Math.floor(buffer.sampleRate * 0.01))
  const envelope: number[] = []
  for (let offset = 0; offset < samples.length; offset += windowSize) {
    let energy = 0
    const end = Math.min(samples.length, offset + windowSize)
    for (let index = offset; index < end; index += 1) energy += samples[index] ** 2
    envelope.push(Math.sqrt(energy / Math.max(1, end - offset)))
  }
  const sortedEnvelope = [...envelope].sort((first, second) => first - second)
  const noiseFloor = sortedEnvelope[Math.floor(sortedEnvelope.length * 0.65)] ?? 0
  const peakThreshold = Math.max(noiseFloor * 2.2, (sortedEnvelope.at(-1) ?? 0) * 0.2)
  const minPeakSpacing = Math.max(1, Math.floor(0.16 / 0.01))
  const peaks: number[] = []
  for (let index = 1; index < envelope.length - 1; index += 1) {
    if (envelope[index] < peakThreshold || envelope[index] < envelope[index - 1] || envelope[index] < envelope[index + 1]) continue
    if (peaks.length > 0 && index - peaks[peaks.length - 1] < minPeakSpacing) {
      if (envelope[index] > envelope[peaks[peaks.length - 1]]) peaks[peaks.length - 1] = index
      continue
    }
    peaks.push(index)
  }
  const tenthFootstep = peaks[9]
  const eleventhFootstep = peaks[10]
  const detectedDuration = eleventhFootstep !== undefined
    ? Math.max(0.2, eleventhFootstep * 0.01 - 0.035)
    : tenthFootstep !== undefined
      ? Math.min(buffer.duration, tenthFootstep * 0.01 + 0.12)
      : buffer.duration
  const firstFootstep = peaks[0]
  const secondFootstep = peaks[1]
  if (firstFootstep !== undefined && secondFootstep !== undefined) {
    runningFootstepInterval = Math.max(0.2, (secondFootstep - firstFootstep) * 0.01)
    runningFootstepLoopStart = Math.max(0, firstFootstep * 0.01 - 0.08)
    runningFootstepClipDuration = eleventhFootstep === undefined
      ? Math.min(buffer.duration, detectedDuration)
      : Math.min(buffer.duration, Math.max(runningFootstepLoopStart + runningFootstepInterval, eleventhFootstep * 0.01 - 0.035))
  } else {
    runningFootstepLoopStart = 0
    runningFootstepClipDuration = Math.min(buffer.duration, detectedDuration)
  }
  return runningFootstepClipDuration
}
let matryoshkaVehicleHeight = 20
const matryoshkaMobPosition = new THREE.Vector3()
const matryoshkaPlayerPosition = new THREE.Vector3()
const matryoshkaToPlayer = new THREE.Vector3()
const matryoshkaMoveDirection = new THREE.Vector3()
const matryoshkaRaycaster = new THREE.Raycaster()
const matryoshkaSoundTarget = new THREE.Vector3()
const matryoshkaCarSoundTarget = new THREE.Vector3()
let matryoshkaSoundVersion = 0
let matryoshkaCarSoundVersion = 0
let lastFootstepSoundAt = -Infinity
let playerDeathActive = false
let playerDeathElapsed = 0
let playerDeathStartPosition = new THREE.Vector3()
let playerDeathStartQuaternion = new THREE.Quaternion()
const playerDeathRotation = new THREE.Quaternion()
const playerDeathAxis = new THREE.Vector3(0, 0, 1)

function triggerPlayerDeath(): void {
  if (playerDeathActive) return
  playerDeathActive = true
  playerDeathElapsed = 0
  playerDeathStartPosition.copy(camera.position)
  playerDeathStartQuaternion.copy(camera.quaternion)
  deathOverlay.classList.add('is-visible')
  deathScreen.classList.add('is-visible')
  fearOverlay.classList.remove('is-visible')
  controls.unlock()
  stopRunningSound()
  keys.clear()
  matryoshkaMobs.forEach((mob) => { mob.velocity.set(0, 0, 0); mob.route = [] })
}

function exitApplication(): void {
  if (window.electronAPI) {
    window.electronAPI.quit()
    return
  }
  window.close()
}

function returnToHome(): void {
  if (controls.isLocked) controls.unlock()
  window.location.reload()
}

deathRetryButton.addEventListener('click', () => window.location.reload())
deathExitButton.addEventListener('click', returnToHome)

function getMatryoshkaGroundHit(x: number, z: number, maxGroundY = Infinity): THREE.Intersection | undefined {
  if (!parkingBounds || !parkingLotRoot) return undefined
  parkingGroundRaycaster.set(new THREE.Vector3(x, parkingBounds.max.y + 10, z), new THREE.Vector3(0, -1, 0))
  return parkingGroundRaycaster.intersectObject(parkingLotRoot, true).find((intersection) => {
    if (intersection.point.y < parkingBounds!.min.y - 0.25 || intersection.point.y > maxGroundY) return false
    return Boolean(intersection.face && intersection.face.normal.clone().transformDirection(intersection.object.matrixWorld).y > 0.08)
  })
}

function isMatryoshkaWaypointValid(x: number, z: number): boolean {
  if (!parkingBounds || !parkingLotRoot || overlapsMatryoshkaVehicleObstacle(x, z, matryoshkaObstaclePadding)) return false
  const hit = getMatryoshkaGroundHit(x, z)
  return Boolean(hit?.face && hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y > 0.08)
}

function rebuildMatryoshkaWaypoints(): void {
  if (!parkingBounds) return
  matryoshkaWaypoints.length = 0
  const validatedPatrolWaypoints = matryoshkaPatrolWaypoints
    .map((waypoint) => {
      const ground = getMatryoshkaGroundHit(waypoint.x, waypoint.z, waypoint.y + 2.5)
      return ground ? new THREE.Vector3(waypoint.x, ground.point.y + 0.02, waypoint.z) : null
    })
    .filter((waypoint): waypoint is THREE.Vector3 => waypoint !== null)
  matryoshkaWaypoints.push(...validatedPatrolWaypoints)
  const rampStart = validatedPatrolWaypoints[1]
  const rampEnd = validatedPatrolWaypoints[validatedPatrolWaypoints.length - 1]
  if (rampStart && rampEnd && rampStart.distanceTo(rampEnd) > 4) {
    const rampSteps = Math.ceil(rampStart.distanceTo(rampEnd) / 3)
    for (let step = 1; step < rampSteps; step += 1) {
      const progress = step / rampSteps
      const x = THREE.MathUtils.lerp(rampStart.x, rampEnd.x, progress)
      const z = THREE.MathUtils.lerp(rampStart.z, rampEnd.z, progress)
      const expectedY = THREE.MathUtils.lerp(rampStart.y, rampEnd.y, progress)
      const ground = getMatryoshkaGroundHit(x, z, expectedY + 2.5)
      if (!ground || overlapsMatryoshkaVehicleObstacle(x, z, matryoshkaObstaclePadding)) continue
      matryoshkaWaypoints.push(new THREE.Vector3(x, ground.point.y + 0.02, z))
    }
  }
  matryoshkaRecoveryWaypoints.length = 0
  syncMatryoshkaWaypointMarkers()
}

function getMatryoshkaWaypointNetwork(network: MatryoshkaWaypointNetwork): THREE.Vector3[] {
  return network === 'yellow' ? matryoshkaWaypoints : matryoshkaRecoveryWaypoints
}

function syncMatryoshkaWaypointMarkers(): void {
  matryoshkaWaypointMarkers.forEach((marker) => scene.remove(marker))
  matryoshkaWaypointMarkers.length = 0
  matryoshkaRecoveryWaypointMarkers.forEach((marker) => scene.remove(marker))
  matryoshkaRecoveryWaypointMarkers.length = 0
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#ffcf52', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false })
  matryoshkaWaypoints.forEach((waypoint) => {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), markerMaterial)
    marker.position.copy(waypoint)
    marker.position.y += 0.3
    marker.renderOrder = 1004
    marker.visible = waypointDisplaySetting.checked
    scene.add(marker)
    matryoshkaWaypointMarkers.push(marker)
  })
}

function addMatryoshkaRowCorridorWaypoints(firstRowX: number, reversedRowX: number, startZ: number, endZ: number): void {
  const corridorX = (firstRowX + reversedRowX) * 0.5
  const corridorOffsets = [0, -0.9, 0.9, -1.8, 1.8]
  const corridorStep = 2.5
  for (let z = Math.min(startZ, endZ); z <= Math.max(startZ, endZ); z += corridorStep) {
    let placed = false
    for (const offset of corridorOffsets) {
      const x = corridorX + offset
      if (!isMatryoshkaWaypointValid(x, z)) continue
      const hit = getMatryoshkaGroundHit(x, z)
      if (!hit) continue
      const waypoint = new THREE.Vector3(x, hit.point.y, z)
      if (!matryoshkaWaypoints.some((existing) => existing.distanceToSquared(waypoint) < 1)) matryoshkaWaypoints.push(waypoint)
      placed = true
      break
    }
    if (!placed) console.warn(`Matryoshka corridor waypoint skipped at z=${z.toFixed(1)}`)
  }
}

function logMatryoshkaUserWaypoints(): void {
  const coordinates = matryoshkaUserWaypoints.map((waypoint, index) => ({
    index,
    x: Number(waypoint.x.toFixed(3)),
    y: Number(waypoint.y.toFixed(3)),
    z: Number(waypoint.z.toFixed(3)),
  }))
  console.log('[Matryoshka waypoints] Copy this JSON:', JSON.stringify(coordinates, null, 2))
  console.table(coordinates)
}

function getMatryoshkaFreeRoamTarget(origin: THREE.Vector3): THREE.Vector3 | null {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (!parkingBounds || !parkingLotRoot) return null
    const x = THREE.MathUtils.randFloat(parkingBounds.min.x + 1.5, parkingBounds.max.x - 1.5)
    const z = THREE.MathUtils.randFloat(parkingBounds.min.z + 1.5, parkingBounds.max.z - 1.5)
    if (overlapsMatryoshkaVehicleObstacle(x, z, matryoshkaObstaclePadding)) continue
    const hit = getMatryoshkaGroundHit(x, z, origin.y + 2.5)
    const candidate = hit ? new THREE.Vector3(x, hit.point.y + 0.02, z) : null
    if (candidate && candidate.distanceTo(origin) >= matryoshkaMinWanderDistance) return candidate
  }
  return null
}

function addMatryoshkaWaypointFromAim(): void {
  if (!parkingLotRoot || !parkingBounds) return
  camera.updateMatrixWorld(true)
  camera.getWorldDirection(matryoshkaMoveDirection)
  parkingGroundRaycaster.set(camera.position, matryoshkaMoveDirection)
  parkingGroundRaycaster.far = 180
  const hit = parkingGroundRaycaster.intersectObject(parkingLotRoot, true).find((intersection) => intersection.point.y >= parkingBounds!.min.y - 0.25)
  if (!hit || !hit.face) return
  const floorNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
  if (floorNormal.y <= 0.2) return
  const waypoint = new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z)
  if (matryoshkaUserWaypoints.some((existing) => existing.distanceToSquared(waypoint) < 0.25)) return
  matryoshkaUserWaypoints.push(waypoint)
  syncMatryoshkaWaypointMarkers()
  logMatryoshkaUserWaypoints()
  matryoshkaMobs.forEach((mob) => { mob.pathRefreshAt = 0 })
}

function alertMatryoshkasToSound(position: THREE.Vector3, source: MatryoshkaSoundSource = 'player', interruptChase = false): void {
  const soundTarget = source === 'player' ? matryoshkaSoundTarget : matryoshkaCarSoundTarget
  if (source === 'player') matryoshkaSoundVersion += 1
  else matryoshkaCarSoundVersion += 1
  soundTarget.copy(position)
  matryoshkaMobs.forEach((mob) => {
    if (mob.state === 'chase' && !interruptChase) return
    if (source === 'car' && mob.state === 'investigate' && mob.soundSource === 'player') return
    if (source === 'player' && mob.state === 'investigate' && mob.soundSource === 'player') return
    mob.state = 'investigate'
    mob.soundSource = source
    mob.investigationPhase = 'yellow'
    mob.heardSoundVersion = 0
    mob.route = []
    mob.pathRefreshAt = 0
  })
}

function isMatryoshkaPathClear(start: THREE.Vector3, end: THREE.Vector3, padding = matryoshkaObstaclePadding): boolean {
  const minX = Math.min(start.x, end.x) - padding
  const maxX = Math.max(start.x, end.x) + padding
  const minZ = Math.min(start.z, end.z) - padding
  const maxZ = Math.max(start.z, end.z) + padding
  const directionX = end.x - start.x
  const directionZ = end.z - start.z
  for (const obstacle of matryoshkaVehicleObstacles) {
    if (obstacle.max.x < minX || obstacle.min.x > maxX || obstacle.max.z < minZ || obstacle.min.z > maxZ) continue
    const expandedMinX = obstacle.min.x - padding
    const expandedMaxX = obstacle.max.x + padding
    const expandedMinZ = obstacle.min.z - padding
    const expandedMaxZ = obstacle.max.z + padding
    const tx1 = directionX === 0 ? (start.x >= expandedMinX && start.x <= expandedMaxX ? -Infinity : Infinity) : (expandedMinX - start.x) / directionX
    const tx2 = directionX === 0 ? (start.x >= expandedMinX && start.x <= expandedMaxX ? Infinity : -Infinity) : (expandedMaxX - start.x) / directionX
    const tz1 = directionZ === 0 ? (start.z >= expandedMinZ && start.z <= expandedMaxZ ? -Infinity : Infinity) : (expandedMinZ - start.z) / directionZ
    const tz2 = directionZ === 0 ? (start.z >= expandedMinZ && start.z <= expandedMaxZ ? Infinity : -Infinity) : (expandedMaxZ - start.z) / directionZ
    if (Math.max(Math.min(tx1, tx2), Math.min(tz1, tz2), 0) <= Math.min(Math.max(tx1, tx2), Math.max(tz1, tz2), 1)) return false
  }
  return true
}

function findNearestMatryoshkaWaypoint(position: THREE.Vector3, waypoints = matryoshkaWaypoints): THREE.Vector3 | null {
  let nearest: THREE.Vector3 | null = null
  let nearestDistance = Infinity
  for (const waypoint of waypoints) {
    const distance = waypoint.distanceToSquared(position)
    if (distance < nearestDistance && isMatryoshkaPathClear(position, waypoint)) {
      nearest = waypoint
      nearestDistance = distance
    }
  }
  return nearest
}

function findMatryoshkaRoute(start: THREE.Vector3, end: THREE.Vector3, waypoints = matryoshkaWaypoints): THREE.Vector3[] {
  const startWaypoint = findNearestMatryoshkaWaypoint(start, waypoints)
  const endWaypoint = findNearestMatryoshkaWaypoint(end, waypoints)
  if (!startWaypoint || !endWaypoint) return []
  if (Math.abs(end.y - start.y) <= 2.5 && isMatryoshkaPathClear(start, end)) return [end.clone()]

  const distances = new Map<THREE.Vector3, number>(waypoints.map((waypoint) => [waypoint, Infinity]))
  const previous = new Map<THREE.Vector3, THREE.Vector3>()
  const open = [startWaypoint]
  distances.set(startWaypoint, 0)
  while (open.length > 0) {
    open.sort((a, b) => (distances.get(a) ?? Infinity) - (distances.get(b) ?? Infinity))
    const current = open.shift()!
    if (current === endWaypoint) break
    for (const neighbor of waypoints) {
      if (neighbor === current || current.distanceToSquared(neighbor) > 36 || Math.abs(neighbor.y - current.y) > 2.5 || !isMatryoshkaPathClear(current, neighbor)) continue
      const nextDistance = (distances.get(current) ?? Infinity) + current.distanceTo(neighbor)
      if (nextDistance >= (distances.get(neighbor) ?? Infinity)) continue
      distances.set(neighbor, nextDistance)
      previous.set(neighbor, current)
      if (!open.includes(neighbor)) open.push(neighbor)
    }
  }
  if (!previous.has(endWaypoint) && endWaypoint !== startWaypoint) return []
  const route: THREE.Vector3[] = [end.clone()]
  let current: THREE.Vector3 | undefined = endWaypoint
  while (current && current !== startWaypoint) {
    route.unshift(current.clone())
    current = previous.get(current)
  }
  return route
}

function getMatryoshkaRouteDistance(start: THREE.Vector3, route: THREE.Vector3[]): number {
  return route.reduce((distance, point, index) => distance + (index === 0 ? start.distanceTo(point) : route[index - 1].distanceTo(point)), 0)
}

function getMatryoshkaRouteOverlapScore(mob: MatryoshkaMob, route: THREE.Vector3[]): number {
  let overlapScore = 0
  for (const otherMob of matryoshkaMobs) {
    if (otherMob === mob || otherMob.knockedDownAt > 0 || otherMob.route.length === 0) continue
    for (const point of route) {
      for (const otherPoint of otherMob.route) {
        if (point.distanceToSquared(otherPoint) < 25) overlapScore += 1
      }
    }
  }
  return overlapScore
}

function findMatryoshkaNonOverlappingRoute(mob: MatryoshkaMob, start: THREE.Vector3, end: THREE.Vector3, network: MatryoshkaWaypointNetwork = 'yellow'): THREE.Vector3[] {
  const candidateRoutes: THREE.Vector3[][] = []
  const waypoints = getMatryoshkaWaypointNetwork(network)
  for (const waypoint of waypoints) {
    if (waypoint.distanceToSquared(start) < 64 || waypoint.distanceToSquared(end) < 64) continue
    const routeToWaypoint = findMatryoshkaRoute(start, waypoint, waypoints)
    const routeFromWaypoint = findMatryoshkaRoute(waypoint, end, waypoints)
    if (routeToWaypoint.length === 0 || routeFromWaypoint.length === 0) continue
    candidateRoutes.push([...routeToWaypoint, ...routeFromWaypoint.slice(1)])
  }
  candidateRoutes.sort((first, second) => {
    const overlapDifference = getMatryoshkaRouteOverlapScore(mob, first) - getMatryoshkaRouteOverlapScore(mob, second)
    return overlapDifference || getMatryoshkaRouteDistance(start, first) - getMatryoshkaRouteDistance(start, second)
  })
  return candidateRoutes[0] ?? findMatryoshkaRoute(start, end, waypoints)
}

function findMatryoshkaRecoveryRoute(start: THREE.Vector3): THREE.Vector3[] {
  const recoveryCandidates = matryoshkaWaypoints
    .filter((waypoint) => waypoint.distanceToSquared(start) > 36)
    .sort((first, second) => first.distanceToSquared(start) - second.distanceToSquared(start))
  const destination = findNearestMatryoshkaWaypoint(start, recoveryCandidates)
  if (!destination) return []
  const recoveryGraph = [...matryoshkaRecoveryWaypoints, ...matryoshkaWaypoints]
  return findMatryoshkaRoute(start, destination, recoveryGraph)
}

function findMatryoshkaOpenDirection(mob: MatryoshkaMob, origin: THREE.Vector3): THREE.Vector3 | null {
  const desired = matryoshkaMoveDirection.subVectors(mob.target, origin)
  desired.y = 0
  if (desired.lengthSq() < 0.01) desired.set(0, 0, 1)
  desired.normalize()
  let bestTarget: THREE.Vector3 | null = null
  let bestScore = -Infinity
  const probeDistance = 3.5
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
    const x = origin.x + direction.x * probeDistance
    const z = origin.z + direction.z * probeDistance
    if (overlapsMatryoshkaVehicleObstacle(x, z, matryoshkaObstaclePadding)) continue
    const ground = getMatryoshkaGroundHit(x, z)
    if (!ground) continue
    const score = direction.dot(desired) * 4 + ground.point.y * 0.01
    if (score <= bestScore) continue
    bestScore = score
    bestTarget = new THREE.Vector3(x, ground.point.y, z)
  }
  return bestTarget
}

function getMatryoshkaSpawnPosition(): THREE.Vector3 | null {
  const randomSpawn = getRandomKeySpawnPosition()
  if (randomSpawn) return randomSpawn
  if (!parkingBounds || !parkingLotRoot) return null

  const bounds = parkingBounds
  for (let x = bounds.min.x + 3; x <= bounds.max.x - 3; x += 3) {
    for (let z = bounds.min.z + 3; z <= bounds.max.z - 3; z += 3) {
      if (!isMatryoshkaWaypointValid(x, z)) continue
      const hit = getMatryoshkaGroundHit(x, z)
      if (hit) return new THREE.Vector3(x, hit.point.y + 0.02, z)
    }
  }
  return null
}

function getMatryoshkaRampSpawnPosition(): THREE.Vector3 | null {
  if (!parkingBounds || !parkingLotRoot) return null
  const bounds = parkingBounds
  let bestPosition: THREE.Vector3 | null = null
  let bestSlope = 0
  const sample = new THREE.Vector3()
  const neighbor = new THREE.Vector3()
  const sampleGround = (x: number, z: number): THREE.Vector3 | null => {
    if (!isMatryoshkaWaypointValid(x, z)) return null
    const hit = getMatryoshkaGroundHit(x, z)
    return hit ? new THREE.Vector3(x, hit.point.y, z) : null
  }

  for (let x = bounds.min.x + 4; x <= bounds.max.x - 4; x += 3) {
    for (let z = bounds.min.z + 4; z <= bounds.max.z - 4; z += 3) {
      const center = sampleGround(x, z)
      if (!center) continue
      let slope = 0
      for (const [offsetX, offsetZ] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) {
        neighbor.copy(center)
        neighbor.x += offsetX
        neighbor.z += offsetZ
        sample.copy(neighbor)
        const neighborGround = sampleGround(sample.x, sample.z)
        if (neighborGround) slope = Math.max(slope, Math.abs(center.y - neighborGround.y))
      }
      if (slope > bestSlope) {
        bestSlope = slope
        bestPosition = center
      }
    }
  }
  return bestPosition ? bestPosition.add(new THREE.Vector3(0, 0.02, 0)) : null
}

function matryoshkaHasLineOfSight(mob: THREE.Object3D, player: THREE.Vector3): boolean {
  mob.getWorldPosition(matryoshkaMobPosition)
  const mobGroundPosition = matryoshkaMobPosition.clone()
  matryoshkaMobPosition.y += matryoshkaEyeHeight
  matryoshkaPlayerPosition.copy(player)
  matryoshkaPlayerPosition.y += 1.2
  matryoshkaToPlayer.subVectors(matryoshkaPlayerPosition, matryoshkaMobPosition)
  const distance = matryoshkaToPlayer.length()
  if (distance <= 0.01) return true
  matryoshkaRaycaster.set(matryoshkaMobPosition, matryoshkaToPlayer.normalize())
  matryoshkaRaycaster.far = distance
  if (parkingLotRoot && matryoshkaRaycaster.intersectObject(parkingLotRoot, true).length > 0) return false
  return isMatryoshkaPathClear(mobGroundPosition, player, matryoshkaObstaclePadding)
}

function getMatryoshkaSeparatedTarget(mob: MatryoshkaMob, destination: THREE.Vector3): THREE.Vector3 {
  const approachDirection = new THREE.Vector3(destination.x - matryoshkaMobPosition.x, 0, destination.z - matryoshkaMobPosition.z)
  if (approachDirection.lengthSq() < 0.01) approachDirection.set(1, 0, 0)
  approachDirection.normalize()
  return destination.clone().add(new THREE.Vector3(-approachDirection.z, 0, approachDirection.x).multiplyScalar(mob.routeSide * 3))
}

function isMatryoshkaPatrolDestinationAvailable(mob: MatryoshkaMob, destination: THREE.Vector3): boolean {
  return !matryoshkaMobs.some((otherMob) => otherMob !== mob && otherMob.state === 'wander' && otherMob.patrolDestination && otherMob.patrolDestination.distanceToSquared(destination) < 144)
}

function isMatryoshkaWallPathBlocked(start: THREE.Vector3, end: THREE.Vector3): boolean {
  if (!parkingLotRoot) return false
  const direction = new THREE.Vector3(end.x - start.x, 0, end.z - start.z)
  const distance = direction.length()
  if (distance < 0.01) return false
  direction.normalize()
  for (const height of [0.8, 1.8, 2.8]) {
    parkingWallRaycaster.set(new THREE.Vector3(start.x, start.y + height, start.z), direction)
    parkingWallRaycaster.far = distance - 0.25
    if (parkingWallRaycaster.intersectObject(parkingLotRoot, true).length > 0) return true
  }
  return false
}

function getMatryoshkaHorizontalDistanceSquared(first: THREE.Vector3, second: THREE.Vector3): number {
  const deltaX = first.x - second.x
  const deltaZ = first.z - second.z
  return deltaX * deltaX + deltaZ * deltaZ
}

function chooseMatryoshkaTarget(mob: MatryoshkaMob): void {
  mob.object.getWorldPosition(matryoshkaMobPosition)
  if (mob.state !== 'wander') mob.patrolDestination = null
  const chaseTarget = mob.lastSeenPlayerPosition.clone()
  if (mob.state === 'chase') {
    mob.route = [chaseTarget]
    mob.target.copy(chaseTarget)
    return
  }
  if (mob.state === 'investigate') {
    const soundTarget = (mob.soundSource === 'player' ? matryoshkaSoundTarget : matryoshkaCarSoundTarget).clone()
    mob.route = [soundTarget]
    mob.target.copy(mob.route[0])
    mob.heardSoundVersion = mob.soundSource === 'player' ? matryoshkaSoundVersion : matryoshkaCarSoundVersion
    return
  }
  if (matryoshkaWaypoints.length === 0) return
  const candidates: THREE.Vector3[] = []
  for (const waypoint of matryoshkaWaypoints) {
    if (getMatryoshkaHorizontalDistanceSquared(waypoint, matryoshkaMobPosition) > 36 && isMatryoshkaPatrolDestinationAvailable(mob, waypoint) && !isMatryoshkaWallPathBlocked(matryoshkaMobPosition, waypoint)) {
      candidates.push(waypoint.clone())
    }
  }
  let bestRoute: THREE.Vector3[] = []
  let bestDistance = 0
  for (const candidate of candidates) {
    const route = [candidate]
    const routeDistance = route.reduce((distance, point, index) => distance + (index === 0 ? matryoshkaMobPosition.distanceTo(point) : route[index - 1].distanceTo(point)), 0)
    if (routeDistance > bestDistance) {
      bestDistance = routeDistance
      bestRoute = route
    }
  }
  if (bestRoute.length === 0) {
    const availableWaypoints = matryoshkaWaypoints.filter((waypoint) => getMatryoshkaHorizontalDistanceSquared(waypoint, matryoshkaMobPosition) > 36 && isMatryoshkaPatrolDestinationAvailable(mob, waypoint) && !isMatryoshkaWallPathBlocked(matryoshkaMobPosition, waypoint))
    const fallback = (availableWaypoints.length > 0 ? availableWaypoints : matryoshkaWaypoints).reduce((farthest, waypoint) => waypoint.distanceToSquared(matryoshkaMobPosition) > farthest.distanceToSquared(matryoshkaMobPosition) ? waypoint : farthest)
    bestRoute = [fallback.clone()]
  }
  mob.route = bestRoute
  mob.target.copy(bestRoute[0])
  mob.patrolDestination = bestRoute[bestRoute.length - 1].clone()
}

function ensureMatryoshkaWanderMovement(mob: MatryoshkaMob): void {
  if (mob.state !== 'wander' || mob.route.length > 0) return
  mob.object.getWorldPosition(matryoshkaMobPosition)
  const nextWaypoint = matryoshkaWaypoints
    .filter((waypoint) => getMatryoshkaHorizontalDistanceSquared(waypoint, matryoshkaMobPosition) > 36 && isMatryoshkaPatrolDestinationAvailable(mob, waypoint) && !isMatryoshkaWallPathBlocked(matryoshkaMobPosition, waypoint))
    .sort((first, second) => first.distanceToSquared(matryoshkaMobPosition) - second.distanceToSquared(matryoshkaMobPosition))[0]
  if (!nextWaypoint) return
  mob.route = [nextWaypoint.clone()]
  mob.target.copy(nextWaypoint)
  mob.patrolDestination = nextWaypoint.clone()
}

function knockDownMatryoshkaMob(mob: MatryoshkaMob, now: number, impactDirection?: THREE.Vector3): void {
  if (mob.knockedDownAt > 0) return
  mob.object.getWorldPosition(matryoshkaMobPosition)
  mob.knockdownBaseY = mob.object.position.y
  mob.knockedDownAt = now
  mob.velocity.set(0, 0, 0)
  mob.route = []
  const direction = impactDirection?.clone().setY(0).normalize() ?? new THREE.Vector3(0, 0, 1)
  mob.physicsBody.setGravityScale(gravityMultiplier, true)
  mob.physicsBody.applyImpulse({ x: direction.x * 0.55, y: 0.8, z: direction.z * 0.55 }, true)
  mob.physicsBody.applyTorqueImpulse({ x: direction.z * 0.18, y: 0.05, z: -direction.x * 0.18 }, true)
}

function createMatryoshkaClone(sourceMob: MatryoshkaMob): void {
  const cloneObject = sourceMob.object.clone(true)
  cloneObject.scale.multiplyScalar(0.8)
  cloneObject.rotation.set(0, sourceMob.object.rotation.y, 0)
  const candidateOffsets = [
    new THREE.Vector3(4, 0, 0),
    new THREE.Vector3(-4, 0, 0),
    new THREE.Vector3(0, 0, 4),
    new THREE.Vector3(0, 0, -4),
  ]
  let spawnPosition = sourceMob.object.position.clone()
  for (const offset of candidateOffsets) {
    const candidate = sourceMob.object.position.clone().add(offset)
    if (overlapsMatryoshkaVehicleObstacle(candidate.x, candidate.z, matryoshkaObstaclePadding)) continue
    if (matryoshkaMobs.some((mob) => mob !== sourceMob && mob.object.position.distanceToSquared(candidate) < 6.25)) continue
    const ground = getMatryoshkaGroundHit(candidate.x, candidate.z)
    if (!ground) continue
    spawnPosition = new THREE.Vector3(candidate.x, ground.point.y, candidate.z)
    break
  }
  cloneObject.position.set(spawnPosition.x, 0, spawnPosition.z)
  cloneObject.updateMatrixWorld(true)
  const cloneBounds = new THREE.Box3().setFromObject(cloneObject)
  cloneObject.position.y = spawnPosition.y - cloneBounds.min.y
  cloneObject.updateMatrixWorld(true)
  const clonePhysics = createMatryoshkaPhysicsBody(cloneObject)
  const hitbox = new THREE.Box3().setFromObject(cloneObject)
  const hitboxHelper = new THREE.Box3Helper(hitbox, '#ff00ff')
  hitboxHelper.visible = matryoshkaHitboxSetting.checked
  hitboxHelper.renderOrder = 1006
  const visionPoints = Array.from({ length: 160 }, (_, index) => {
    const angle = (index / 160) * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle) * matryoshkaDetectionRange, 0, Math.sin(angle) * matryoshkaDetectionRange)
  })
  const visionIndicator = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(visionPoints),
    new THREE.LineBasicMaterial({ color: '#ff2020', transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, toneMapped: false }),
  )
  visionIndicator.renderOrder = 1005
  visionIndicator.frustumCulled = false
  visionIndicator.visible = matryoshkaVisionSetting.checked
  scene.add(cloneObject, visionIndicator, hitboxHelper)
  const cloneMob: MatryoshkaMob = {
    object: cloneObject,
    state: sourceMob.state,
    soundSource: sourceMob.soundSource,
    isClone: true,
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
    chaseNetwork: sourceMob.chaseNetwork === 'blue' ? 'yellow' : 'blue',
    investigationPhase: 'yellow',
    lastSeenPlayerPosition: sourceMob.lastSeenPlayerPosition.clone(),
    pathRefreshAt: 0,
    route: [],
    visionIndicator,
    hitboxHelper,
    heardSoundVersion: sourceMob.heardSoundVersion,
  }
  matryoshkaMobs.push(cloneMob)
  chooseMatryoshkaTarget(cloneMob)
}

function recoverMatryoshkaMob(mob: MatryoshkaMob): void {
  syncMatryoshkaFromPhysics(mob)
  mob.physicsBody.setGravityScale(0, true)
  mob.physicsBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
  mob.physicsBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
  mob.knockedDownAt = 0
  mob.object.rotation.x = 0
  mob.object.rotation.z = 0
  mob.object.position.y = mob.knockdownBaseY
  mob.object.updateMatrixWorld(true)
  const uprightQuaternion = mob.object.quaternion.clone()
  mob.physicsBody.setTranslation({
    x: mob.object.position.x,
    y: mob.object.position.y + mob.physicsOffsetY,
    z: mob.object.position.z,
  }, true)
  mob.physicsBody.setRotation({ x: uprightQuaternion.x, y: uprightQuaternion.y, z: uprightQuaternion.z, w: uprightQuaternion.w }, true)
  mob.stationaryTime = 0
  mob.pathRefreshAt = 0
  createMatryoshkaClone(mob)
  chooseMatryoshkaTarget(mob)
}

function updateMatryoshkaMobs(now: number, delta: number): void {
  if (!parkingLotRoot || matryoshkaWaypoints.length === 0) return
  if (startScreen.classList.contains('is-visible') || settingsOverlay.classList.contains('is-open')) {
    matryoshkaMobs.forEach((mob) => { mob.velocity.set(0, 0, 0) })
    return
  }
  if (playerDeathActive) return
  let fearActive = false
  for (const mob of matryoshkaMobs) {
    if (mob.knockedDownAt > 0) syncMatryoshkaFromPhysics(mob)
    mob.object.getWorldPosition(matryoshkaMobPosition)
    if (mob.knockedDownAt > 0) {
      if (now - mob.knockedDownAt >= 3) recoverMatryoshkaMob(mob)
      else continue
    }
    const movementStart = matryoshkaMobPosition.clone()
    const fullMobBounds = new THREE.Box3().setFromObject(mob.object)
    const mobBoundsCenter = fullMobBounds.getCenter(new THREE.Vector3())
    const mobBoundsSize = fullMobBounds.getSize(new THREE.Vector3()).multiplyScalar(0.7)
    mob.hitboxHelper.box.setFromCenterAndSize(mobBoundsCenter, mobBoundsSize)
    mob.hitboxHelper.visible = matryoshkaHitboxSetting.checked
    mob.visionIndicator.position.set(matryoshkaMobPosition.x, matryoshkaMobPosition.y + 0.05, matryoshkaMobPosition.z)
    if (Math.hypot(matryoshkaMobPosition.x - camera.position.x, matryoshkaMobPosition.z - camera.position.z) <= 1.35) {
      triggerPlayerDeath()
      return
    }
    const distanceToPlayer = matryoshkaMobPosition.distanceTo(camera.position)
    const playerInRedRange = distanceToPlayer <= matryoshkaDetectionRange
    const playerVisible = playerInRedRange || matryoshkaHasLineOfSight(mob.object, camera.position)
    if (playerVisible) mob.lastSeenPlayerPosition.copy(camera.position)
    const chaseMemoryActive = mob.state === 'chase' && !playerVisible && distanceToPlayer <= matryoshkaChaseMemoryDistance
    const currentSoundVersion = mob.soundSource === 'player' ? matryoshkaSoundVersion : matryoshkaCarSoundVersion
    const investigationTarget = mob.soundSource === 'player' ? matryoshkaSoundTarget : matryoshkaCarSoundTarget
    if (mob.state === 'investigate' && mob.investigationPhase === 'yellow' && investigationTarget.distanceToSquared(matryoshkaMobPosition) < 324) {
      mob.investigationPhase = 'blue'
      mob.route = []
      mob.pathRefreshAt = 0
    }
    const reachedSound = mob.state === 'investigate' && mob.heardSoundVersion === currentSoundVersion && investigationTarget.distanceToSquared(matryoshkaMobPosition) < 16
    // Visual contact always outranks an older gunshot or footstep target.
    const nextState: MatryoshkaMobState = playerVisible || chaseMemoryActive
      ? 'chase'
      : reachedSound
        ? 'wander'
          : mob.state === 'investigate'
          ? 'investigate'
          : 'wander'
    const previousState = mob.state
    if (nextState !== mob.state) {
      mob.state = nextState
      if (nextState === 'chase') mob.chaseNetwork = mob.isClone ? 'yellow' : 'blue'
      mob.route = []
      if (nextState === 'wander' && previousState !== 'wander') chooseMatryoshkaTarget(mob)
      if (mob.route.length > 0) mob.target.copy(mob.route[0])
      mob.pathRefreshAt = 0
    }
    if (nextState === 'chase' || (nextState === 'investigate' && mob.soundSource === 'player')) fearActive = true
    const targetHorizontalDistanceSquared = getMatryoshkaHorizontalDistanceSquared(mob.target, matryoshkaMobPosition)
    if (targetHorizontalDistanceSquared < 4 && mob.route.length > 1) {
      mob.route.shift()
      mob.target.copy(mob.route[0])
      mob.pathRefreshAt = now + matryoshkaPathRefreshInterval
    } else if (mob.route.length === 0 || targetHorizontalDistanceSquared < 4) {
      chooseMatryoshkaTarget(mob)
      mob.pathRefreshAt = now + matryoshkaPathRefreshInterval
    }
    ensureMatryoshkaWanderMovement(mob)
    matryoshkaMoveDirection.subVectors(mob.target, matryoshkaMobPosition)
    matryoshkaMoveDirection.y = 0
    if (matryoshkaMoveDirection.lengthSq() < 0.01) {
      groundMatryoshkaMob(mob)
      syncMatryoshkaToPhysics(mob)
      continue
    }
    matryoshkaMoveDirection.normalize()
    const speed = (mob.state === 'chase' || mob.state === 'investigate' ? matryoshkaChaseSpeed * 1.2 : matryoshkaSpeed) * (mob.isClone ? 1.5 : 1)
    mob.velocity.lerp(matryoshkaMoveDirection.multiplyScalar(speed), 1 - Math.exp(-8 * delta))
    moveMatryoshkaWithGroundSteps(mob, delta, now)
    syncMatryoshkaToPhysics(mob)
    mob.object.rotation.y = Math.atan2(mob.velocity.x, mob.velocity.z) + matryoshkaModelYawOffset
    mob.object.getWorldPosition(matryoshkaMobPosition)
    const movedDistance = matryoshkaMobPosition.distanceTo(movementStart)
    if (movedDistance < 0.01 && mob.velocity.lengthSq() > 0.25) mob.stationaryTime += delta
    else mob.stationaryTime = 0
    if (mob.stationaryTime >= 0.35) {
      const escapeTarget = findMatryoshkaOpenDirection(mob, movementStart)
      if (escapeTarget) {
        mob.route = [escapeTarget]
        mob.target.copy(escapeTarget)
      } else {
        mob.route = []
        chooseMatryoshkaTarget(mob)
      }
      mob.velocity.set(0, 0, 0)
      mob.stationaryTime = 0
      mob.pathRefreshAt = now + matryoshkaPathRefreshInterval
    }
  }
  fearOverlay.classList.toggle('is-visible', fearActive)
}

function spawnMatryoshkaMob(): void {
  if (!parkingBounds || !parkingLotRoot) return
  const currentParkingBounds = parkingBounds
  const loader = new GLTFLoader()
  const url = new URL('./assets/matryoshka-doll/matryoshka_doll.glb', import.meta.url).href
  loader.load(url, (gltf) => {
    const mobObject = gltf.scene
    mobObject.updateMatrixWorld(true)
    const bounds = new THREE.Box3().setFromObject(mobObject)
    const size = bounds.getSize(new THREE.Vector3())
    mobObject.scale.setScalar(5 / Math.max(size.y, 0.01))
    mobObject.updateMatrixWorld(true)
    const scaledBounds = new THREE.Box3().setFromObject(mobObject)
    mobObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = true
        child.castShadow = false
        child.receiveShadow = false
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => {
          material.side = THREE.DoubleSide
          material.depthWrite = true
          material.transparent = false
          material.opacity = 1
          material.needsUpdate = true
        })
      }
    })
    const fallbackSpawn = currentParkingBounds.getCenter(new THREE.Vector3())
    fallbackSpawn.y = currentParkingBounds.min.y + 0.02
    const spawn = getMatryoshkaRampSpawnPosition() ?? getMatryoshkaSpawnPosition() ?? matryoshkaWaypoints[0]?.clone() ?? fallbackSpawn
    mobObject.position.set(spawn.x, spawn.y - scaledBounds.min.y, spawn.z)
    const physics = createMatryoshkaPhysicsBody(mobObject)
    const matryoshkaHitbox = new THREE.Box3().setFromObject(mobObject)
    const matryoshkaHitboxHelper = new THREE.Box3Helper(matryoshkaHitbox, '#ff00ff')
    matryoshkaHitboxHelper.visible = matryoshkaHitboxSetting.checked
    matryoshkaHitboxHelper.renderOrder = 1006
    const visionPoints = Array.from({ length: 160 }, (_, index) => {
      const angle = (index / 160) * Math.PI * 2
      return new THREE.Vector3(Math.cos(angle) * matryoshkaDetectionRange, 0, Math.sin(angle) * matryoshkaDetectionRange)
    })
    const visionIndicator = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(visionPoints),
      new THREE.LineBasicMaterial({ color: '#ff2020', transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, toneMapped: false }),
    )
    visionIndicator.renderOrder = 1005
    visionIndicator.frustumCulled = false
    visionIndicator.visible = matryoshkaVisionSetting.checked
    scene.add(mobObject, visionIndicator, matryoshkaHitboxHelper)
    const mob: MatryoshkaMob = {
      object: mobObject,
      state: 'wander',
      soundSource: 'player',
      isClone: false,
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
      chaseNetwork: matryoshkaMobs.length % 2 === 0 ? 'blue' : 'yellow',
      investigationPhase: 'yellow',
      lastSeenPlayerPosition: spawn.clone(),
      pathRefreshAt: 0,
      route: [],
      visionIndicator,
      hitboxHelper: matryoshkaHitboxHelper,
      heardSoundVersion: 0,
    }
    matryoshkaMobs.push(mob)
    chooseMatryoshkaTarget(mob)
  }, undefined, (error) => console.error('Failed to load Matryoshka mob.', error))
}

function addParkingObstacle(bounds: THREE.Box3, affectsMatryoshka = true): void {
  parkingObstacles.push(bounds)
  if (affectsMatryoshka) matryoshkaObstacles.push(bounds)

  const minCellX = Math.floor(bounds.min.x / parkingObstacleCellSize)
  const maxCellX = Math.floor(bounds.max.x / parkingObstacleCellSize)
  const minCellZ = Math.floor(bounds.min.z / parkingObstacleCellSize)
  const maxCellZ = Math.floor(bounds.max.z / parkingObstacleCellSize)

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      const key = `${cellX}:${cellZ}`
      const existing = parkingObstacleCells.get(key)
      if (existing) existing.push(bounds)
      else parkingObstacleCells.set(key, [bounds])
    }
  }
}

function getNearbyParkingObstacles(): THREE.Box3[] {
  const minCellX = Math.floor((camera.position.x - 1.2) / parkingObstacleCellSize)
  const maxCellX = Math.floor((camera.position.x + 1.2) / parkingObstacleCellSize)
  const minCellZ = Math.floor((camera.position.z - 1.2) / parkingObstacleCellSize)
  const maxCellZ = Math.floor((camera.position.z + 1.2) / parkingObstacleCellSize)
  const nearbyObstacles: THREE.Box3[] = []
  const uniqueObstacles = new Set<THREE.Box3>()

  for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
    for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
      const key = `${cellX}:${cellZ}`
      const cellObstacles = parkingObstacleCells.get(key)
      if (!cellObstacles) continue
      for (const obstacle of cellObstacles) {
        if (uniqueObstacles.has(obstacle)) continue
        uniqueObstacles.add(obstacle)
        nearbyObstacles.push(obstacle)
      }
    }
  }

  return nearbyObstacles
}

function overlapsParkingObstacle(x: number, z: number, padding = 0.45): boolean {
  for (const obstacle of parkingObstacles) {
    const overlapsX = x > obstacle.min.x - padding && x < obstacle.max.x + padding
    const overlapsZ = z > obstacle.min.z - padding && z < obstacle.max.z + padding
    if (overlapsX && overlapsZ) return true
  }
  return false
}

function overlapsMatryoshkaObstacle(x: number, z: number, padding = matryoshkaObstaclePadding): boolean {
  for (const obstacle of matryoshkaObstacles) {
    const overlapsX = x > obstacle.min.x - padding && x < obstacle.max.x + padding
    const overlapsZ = z > obstacle.min.z - padding && z < obstacle.max.z + padding
    if (overlapsX && overlapsZ) return true
  }
  return false
}

function overlapsMatryoshkaVehicleObstacle(x: number, z: number, padding = matryoshkaObstaclePadding): boolean {
  for (const obstacle of matryoshkaVehicleObstacles) {
    const overlapsX = x > obstacle.min.x - padding && x < obstacle.max.x + padding
    const overlapsZ = z > obstacle.min.z - padding && z < obstacle.max.z + padding
    if (overlapsX && overlapsZ) return true
  }
  return false
}

function getMatryoshkaVehicleContactAxis(currentX: number, currentZ: number, nextX: number, nextZ: number, padding: number): 'x' | 'z' | null {
  let contactAxis: 'x' | 'z' | null = null
  let closestFaceDistance = Infinity
  for (const obstacle of matryoshkaVehicleObstacles) {
    const minX = obstacle.min.x - padding
    const maxX = obstacle.max.x + padding
    const minZ = obstacle.min.z - padding
    const maxZ = obstacle.max.z + padding
    if (nextX <= minX || nextX >= maxX || nextZ <= minZ || nextZ >= maxZ) continue
    const distanceToXFace = Math.min(Math.abs(currentX - minX), Math.abs(currentX - maxX))
    const distanceToZFace = Math.min(Math.abs(currentZ - minZ), Math.abs(currentZ - maxZ))
    const candidateAxis = distanceToXFace <= distanceToZFace ? 'x' : 'z'
    const candidateDistance = candidateAxis === 'x' ? distanceToXFace : distanceToZFace
    if (candidateDistance < closestFaceDistance) {
      closestFaceDistance = candidateDistance
      contactAxis = candidateAxis
    }
  }
  return contactAxis
}

function separateMatryoshkaFromVehicleCorner(mob: MatryoshkaMob): boolean {
  const x = mob.object.position.x
  const z = mob.object.position.z
  for (const obstacle of matryoshkaVehicleObstacles) {
    const minX = obstacle.min.x - matryoshkaObstaclePadding
    const maxX = obstacle.max.x + matryoshkaObstaclePadding
    const minZ = obstacle.min.z - matryoshkaObstaclePadding
    const maxZ = obstacle.max.z + matryoshkaObstaclePadding
    if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) continue
    const pushLeft = x - minX
    const pushRight = maxX - x
    const pushFront = z - minZ
    const pushBack = maxZ - z
    const smallestPush = Math.min(pushLeft, pushRight, pushFront, pushBack)
    if (smallestPush === pushLeft) mob.object.position.x = minX - 0.02
    else if (smallestPush === pushRight) mob.object.position.x = maxX + 0.02
    else if (smallestPush === pushFront) mob.object.position.z = minZ - 0.02
    else mob.object.position.z = maxZ + 0.02
    mob.velocity.set(0, 0, 0)
    return true
  }
  return false
}

function moveMatryoshkaWithVehicleSlide(mob: MatryoshkaMob, delta: number, now: number): void {
  const stepX = mob.velocity.x * delta
  const stepZ = mob.velocity.z * delta
  const horizontalSpeed = Math.hypot(mob.velocity.x, mob.velocity.z)
  const currentX = mob.object.position.x
  const currentZ = mob.object.position.z
  const canMoveFull = !overlapsMatryoshkaVehicleObstacle(currentX + stepX, currentZ + stepZ, matryoshkaObstaclePadding)
  if (canMoveFull && mob.slideDirectionUntil > now && mob.slideDirection.lengthSq() > 0.01) {
    const slideStepX = mob.slideDirection.x * Math.hypot(stepX, stepZ)
    const slideStepZ = mob.slideDirection.z * Math.hypot(stepX, stepZ)
    if (!overlapsMatryoshkaVehicleObstacle(currentX + slideStepX, currentZ + slideStepZ, matryoshkaObstaclePadding)) {
      mob.object.position.x += slideStepX
      mob.object.position.z += slideStepZ
      mob.velocity.x = mob.slideDirection.x * horizontalSpeed
      mob.velocity.z = mob.slideDirection.z * horizontalSpeed
      return
    }
  }
  if (canMoveFull) {
    mob.object.position.x += stepX
    mob.object.position.z += stepZ
    if (mob.slideDirectionUntil <= now) mob.slideDirection.set(0, 0, 0)
    return
  }

  if (separateMatryoshkaFromVehicleCorner(mob)) {
    mob.slideDirection.set(0, 0, 0)
    mob.pathRefreshAt = 0
    return
  }

  const stepLength = Math.hypot(stepX, stepZ)
  if (stepLength > 0.0001) {
    const desiredX = stepX / stepLength
    const desiredZ = stepZ / stepLength
    const contactAxis = getMatryoshkaVehicleContactAxis(currentX, currentZ, currentX + stepX, currentZ + stepZ, matryoshkaObstaclePadding)
    const slideCandidates = contactAxis === 'x'
      ? [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]
      : contactAxis === 'z'
        ? [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)]
        : [
            new THREE.Vector3(-desiredZ, 0, desiredX),
            new THREE.Vector3(desiredZ, 0, -desiredX),
          ]
    const targetDirection = matryoshkaMoveDirection.subVectors(mob.target, mob.object.position).setY(0).normalize()
    const clearSlides = slideCandidates.filter((candidate) => !overlapsMatryoshkaVehicleObstacle(
      currentX + candidate.x * stepLength,
      currentZ + candidate.z * stepLength,
      matryoshkaObstaclePadding,
    ))
    if (clearSlides.length > 0) {
      clearSlides.sort((first, second) => {
        const firstStickyScore = mob.slideDirectionUntil > now ? first.dot(mob.slideDirection) * 8 : 0
        const secondStickyScore = mob.slideDirectionUntil > now ? second.dot(mob.slideDirection) * 8 : 0
        const firstTargetScore = first.dot(targetDirection) * (mob.isClone ? -1 : 1)
        const secondTargetScore = second.dot(targetDirection) * (mob.isClone ? -1 : 1)
        return (secondTargetScore + secondStickyScore) - (firstTargetScore + firstStickyScore)
      })
      const slide = clearSlides[0]
      mob.object.position.x += slide.x * stepLength
      mob.object.position.z += slide.z * stepLength
      mob.velocity.x = slide.x * horizontalSpeed
      mob.velocity.z = slide.z * horizontalSpeed
      mob.slideDirection.copy(slide)
      mob.slideDirectionUntil = now + 0.35
      return
    }
  }

  const canSlideX = Math.abs(stepX) > 0.0001 && !overlapsMatryoshkaVehicleObstacle(currentX + stepX, currentZ, matryoshkaObstaclePadding)
  const canSlideZ = Math.abs(stepZ) > 0.0001 && !overlapsMatryoshkaVehicleObstacle(currentX, currentZ + stepZ, matryoshkaObstaclePadding)
  if (canSlideX) mob.object.position.x += stepX
  if (canSlideZ) mob.object.position.z += stepZ
  if (!canSlideX && !canSlideZ) {
    mob.velocity.set(0, 0, 0)
  } else {
    const slideX = canSlideX ? Math.sign(stepX) : 0
    const slideZ = canSlideZ ? Math.sign(stepZ) : 0
    const slideLength = Math.hypot(slideX, slideZ) || 1
    mob.velocity.set((slideX / slideLength) * horizontalSpeed, 0, (slideZ / slideLength) * horizontalSpeed)
  }
  if (!canSlideX && !canSlideZ) mob.pathRefreshAt = 0
}

function groundMatryoshkaMob(mob: MatryoshkaMob): void {
  const mobBounds = new THREE.Box3().setFromObject(mob.object)
  const ground = getMatryoshkaGroundHit(mob.object.position.x, mob.object.position.z, mobBounds.min.y + 1.25)
  if (!ground) return
  mob.object.position.y += ground.point.y - mobBounds.min.y
}

function moveMatryoshkaWithGroundSteps(mob: MatryoshkaMob, delta: number, now: number): void {
  const horizontalDistance = Math.hypot(mob.velocity.x * delta, mob.velocity.z * delta)
  const stepCount = Math.max(1, Math.ceil(horizontalDistance / 0.08))
  const stepDelta = delta / stepCount
  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    groundMatryoshkaMob(mob)
    const nextPosition = mob.object.position.clone().add(new THREE.Vector3(mob.velocity.x * stepDelta, 0, mob.velocity.z * stepDelta))
    if (mob.state === 'wander' && isMatryoshkaWallPathBlocked(mob.object.position, nextPosition)) {
      mob.velocity.set(0, 0, 0)
      mob.route = []
      mob.pathRefreshAt = 0
      return
    }
    moveMatryoshkaWithVehicleSlide(mob, stepDelta, now + stepIndex * stepDelta)
    groundMatryoshkaMob(mob)
  }
}

function getRandomKeySpawnPosition(): THREE.Vector3 | null {
  if (!parkingBounds || !parkingLotRoot) return null

  const bounds = parkingBounds
  const minX = bounds.min.x + 2
  const maxX = bounds.max.x - 2
  const minZ = bounds.min.z + 2
  const maxZ = bounds.max.z - 2

  for (let attempt = 0; attempt < 1200; attempt += 1) {
    const x = THREE.MathUtils.randFloat(minX, maxX)
    const zDistribution = Math.random() < 0.75 ? Math.pow(Math.random(), 0.45) : Math.random()
    const z = THREE.MathUtils.lerp(minZ, maxZ, zDistribution)

    const nearStoreEntry = Math.abs(x - storeEntryPosition.x) < 3 && Math.abs(z - storeEntryPosition.z) < 3
    if (nearStoreEntry) continue
    if (overlapsParkingObstacle(x, z, 1.1)) continue

    const hit = getMatryoshkaGroundHit(x, z)
    if (!hit || !hit.face) continue

    const worldFaceNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
    if (worldFaceNormal.y < 0.2) continue

    return new THREE.Vector3(x, hit.point.y + 0.02, z)
  }

  return null
}

const parkingGroundRaycaster = new THREE.Raycaster()
const parkingWallRaycaster = new THREE.Raycaster()
const parkingProjectileRaycaster = new THREE.Raycaster()
const parkingLotLoader = new FBXLoader()
const storeSpawnPosition = new THREE.Vector3()
const storeEntryPosition = new THREE.Vector3()
const keyPickupPosition = new THREE.Vector3()
const parkingLotUrl = new URL('./assets/parkingLot/parking.fbx', import.meta.url).href
parkingLotLoader.load(parkingLotUrl, (parkingLot) => {
  parkingLot.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(parkingLot)
  const size = bounds.getSize(new THREE.Vector3())
  const scale = 180 / Math.max(size.x, size.z, 1)
  parkingLot.scale.setScalar(scale)
  parkingLot.updateMatrixWorld(true)
  const scaledBounds = new THREE.Box3().setFromObject(parkingLot)
  const center = scaledBounds.getCenter(new THREE.Vector3())
  parkingLot.position.x -= center.x
  parkingLot.position.z -= center.z
  parkingLot.position.y -= scaledBounds.min.y
  parkingLot.updateMatrixWorld(true)
  parkingLot.traverse((object) => {
    if (object instanceof THREE.Light) {
      object.visible = false
    }
    if (object instanceof THREE.Mesh) {
      object.castShadow = false
      object.receiveShadow = false
      const obstacleBounds = new THREE.Box3().setFromObject(object)
      const obstacleSize = obstacleBounds.getSize(new THREE.Vector3())
      if (obstacleSize.y >= 3 && obstacleSize.y <= 8 && obstacleSize.x > 0.2 && obstacleSize.z > 0.2) {
        addParkingObstacle(obstacleBounds)
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        if ('color' in material) (material as { color: THREE.Color }).color.multiplyScalar(0.35)
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
          material.metalness = 0
          material.roughness = 1
          material.envMapIntensity = 0
        }
        if (material instanceof THREE.MeshPhongMaterial) {
          material.shininess = 0
        }
      })
    }
  })
  parkingBounds = new THREE.Box3().setFromObject(parkingLot)
  parkingLotRoot = parkingLot
  scene.add(parkingLot)

  const carLoader = new FBXLoader()
  const carUrl = new URL('./assets/car/vwkaferhlowered.fbx', import.meta.url).href
  carLoader.load(carUrl, (car) => {
    car.updateMatrixWorld(true)
    const carBounds = new THREE.Box3().setFromObject(car)
    const carSize = carBounds.getSize(new THREE.Vector3())
    const carScale = 14.8 / Math.max(carSize.x, carSize.z, 1)
    car.scale.setScalar(carScale)
    car.updateMatrixWorld(true)

    const carTemplateBounds = new THREE.Box3().setFromObject(car)
    matryoshkaVehicleHeight = carTemplateBounds.getSize(new THREE.Vector3()).y
    const slotMarker = parkingLot.getObjectByName('A')
    const slotBounds = slotMarker ? new THREE.Box3().setFromObject(slotMarker) : new THREE.Box3()

    const fixedBaseX = slotMarker ? slotBounds.min.x - 3 : 0
    const secondRowBaseX = fixedBaseX - 42
    const reversedRowBaseX = secondRowBaseX + 31
    const secondReversedRowBaseX = reversedRowBaseX - 42
    const fifthRowBaseX = secondReversedRowBaseX - 16
    const fifthRowRotationY = Math.PI / 2
    const sixthRowBaseX = fifthRowBaseX - 16
    const sixthRowRotationY = Math.PI / 2
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
    ]
    const trueCarSlotIndex = Math.floor(Math.random() * carRows.reduce((total, row) => total + row.count, 0))
    let parkedCarIndex = 0

    for (const [rowIndex, row] of carRows.entries()) {
      const rowZStep = (row.endZ - row.startZ) / (row.count - 1)

      for (let index = 0; index < row.count; index += 1) {
        const parkedCar = rowIndex === 0 && index === 0 ? car : car.clone(true)
        if (parkedCarIndex === trueCarSlotIndex) trueCar = parkedCar
        parkedCarIndex += 1
        parkedCar.updateMatrixWorld(true)
        const parkedCarBottomY = carTemplateBounds.min.y

        if (slotMarker) {
          parkedCar.position.x = row.x
          parkedCar.position.z = row.startZ + index * rowZStep + (row.zOffsets[index] ?? 0)
          parkedCar.position.y = -parkedCarBottomY + 0.01
        } else {
          const parkedCarCenter = carTemplateBounds.getCenter(new THREE.Vector3())
          const parkingCenterX = (parkingBounds!.min.x + parkingBounds!.max.x) / 2
          const parkingCenterZ = (parkingBounds!.min.z + parkingBounds!.max.z) / 2
          parkedCar.position.x = parkingCenterX - parkedCarCenter.x
          parkedCar.position.z = parkingCenterZ - parkedCarCenter.z + 8
          parkedCar.position.y -= carTemplateBounds.min.y
        }
        parkedCar.rotation.set(0, row.rotationY, 0)
        parkedCar.updateMatrixWorld(true)

        parkedCar.traverse((object) => {
          if (object instanceof THREE.Light) {
            object.visible = false
          }
          if (object instanceof THREE.Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material]
            materials.forEach((material) => {
              if (material) {
                const meshMaterial = material as THREE.Material & { side?: THREE.Side }
                meshMaterial.side = THREE.DoubleSide
              }
            })
            object.castShadow = false
            object.receiveShadow = false
          }
        })

        if (parkedCar === trueCar) {
          const outlineMaterial = new THREE.LineBasicMaterial({
            color: '#d6dde0',
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
            fog: false,
            toneMapped: false,
          })
          parkedCar.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return
            const outline = new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry, 20), outlineMaterial)
            outline.position.copy(object.position)
            outline.rotation.copy(object.rotation)
            outline.scale.copy(object.scale)
            outline.frustumCulled = false
            outline.renderOrder = 1000
            parkedCar.add(outline)
            trueCarEspObjects.push(outline)
          })
          trueCarEspObjects.forEach((outline) => { outline.visible = trueCarEspSetting.checked })
        }

        const carWorldBounds = new THREE.Box3().setFromObject(parkedCar)
        const carCollisionBounds = carWorldBounds.clone().expandByScalar(0.04)
        addParkingObstacle(carCollisionBounds, false)
        matryoshkaVehicleObstacles.push(carCollisionBounds)
        const carHitboxHelper = new THREE.Box3Helper(carCollisionBounds, '#00ffff')
        carHitboxHelper.visible = carHitboxSetting.checked
        carHitboxHelper.renderOrder = 1006
        carHitboxHelpers.push(carHitboxHelper)
        parkedCar.visible = !hideAllCarsSetting.checked
        parkedCars.push(parkedCar)
        scene.add(parkedCar, carHitboxHelper)
      }
    }
    rebuildMatryoshkaWaypoints()
    spawnMatryoshkaMob()
    parkedCarsReady = true
  }, undefined, (error) => {
    console.error('Failed to load car model.', error)
  })

  function createKeyPickup(): THREE.Group {
    const keyGroup = new THREE.Group()

    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = 128
    glowCanvas.height = 128
    const glowContext = glowCanvas.getContext('2d')
    const glowTexture = glowContext ? (() => {
      const gradient = glowContext.createRadialGradient(64, 64, 8, 64, 64, 64)
      gradient.addColorStop(0, 'rgba(255,247,200,1)')
      gradient.addColorStop(0.18, 'rgba(255,214,105,0.95)')
      gradient.addColorStop(0.45, 'rgba(255,166,70,0.45)')
      gradient.addColorStop(1, 'rgba(255,166,70,0)')
      glowContext.fillStyle = gradient
      glowContext.fillRect(0, 0, glowCanvas.width, glowCanvas.height)
      const texture = new THREE.CanvasTexture(glowCanvas)
      texture.needsUpdate = true
      return texture
    })() : null

    const keyMaterial = new THREE.MeshStandardMaterial({
      color: '#d6cdb9',
      metalness: 0.85,
      roughness: 0.28,
      emissive: '#ffcc66',
      emissiveIntensity: 2.5,
      fog: false,
      toneMapped: false,
    })

    const keyOutlineMaterial = new THREE.LineBasicMaterial({
      color: '#ffd36b',
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    })

    const addOutline = (mesh: THREE.Mesh) => {
      const outline = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), keyOutlineMaterial)
      outline.position.copy(mesh.position)
      outline.rotation.copy(mesh.rotation)
      outline.scale.copy(mesh.scale)
      outline.renderOrder = 3
      keyGroup.add(outline)
    }

    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.028, 10, 28), keyMaterial)
    bow.rotation.x = Math.PI / 2
    bow.position.y = 0.06
    keyGroup.add(bow)
    addOutline(bow)

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.04), keyMaterial)
    shaft.position.set(0.34, 0.04, 0)
    keyGroup.add(shaft)
    addOutline(shaft)

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.05), keyMaterial)
    head.position.set(0.73, 0.04, 0)
    keyGroup.add(head)
    addOutline(head)

    const toothMaterial = new THREE.MeshStandardMaterial({
      color: '#f0e5d2',
      metalness: 0.9,
      roughness: 0.22,
      emissive: '#ffbf5a',
      emissiveIntensity: 1.1,
      fog: false,
      toneMapped: false,
    })
    for (let index = 0; index < 4; index += 1) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), toothMaterial)
      tooth.position.set(0.56 + index * 0.06, 0.03, 0)
      keyGroup.add(tooth)
      addOutline(tooth)
    }

    const keyGlow = new THREE.PointLight('#ffcc66', 5, 8, 2)
    keyGlow.position.set(0.25, 0.28, 0)
    keyGroup.add(keyGlow)

    const keyHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture ?? undefined,
        color: '#ffbc5c',
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    )
    keyHalo.position.set(0.22, 0.18, 0)
    keyHalo.scale.set(1.6, 1.0, 1)
    keyGroup.add(keyHalo)

    keyGroup.rotation.y = Math.PI / 2
    return keyGroup
  }

  const storeLoader = new FBXLoader()
  const storeUrl = new URL('./assets/store/empty-store.fbx', import.meta.url).href
  storeLoader.load(storeUrl, (store) => {
    store.updateMatrixWorld(true)
    const storeBoundsBox = new THREE.Box3().setFromObject(store)
    const storeSize = storeBoundsBox.getSize(new THREE.Vector3())
    const storeScale = 18 / Math.max(storeSize.x, storeSize.z, 1)
    store.scale.setScalar(storeScale)
    store.updateMatrixWorld(true)

    const scaledStoreBounds = new THREE.Box3().setFromObject(store)
    const storeCenter = scaledStoreBounds.getCenter(new THREE.Vector3())
    const parkingCenterZ = (parkingBounds!.min.z + parkingBounds!.max.z) / 2

    store.position.x = parkingBounds!.max.x + 20 - storeCenter.x
    store.position.z = parkingCenterZ - storeCenter.z
    store.position.y -= scaledStoreBounds.min.y
    store.updateMatrixWorld(true)

    store.traverse((object) => {
      if (object instanceof THREE.Light) {
        object.visible = false
      }
      if (object instanceof THREE.Mesh) {
        object.castShadow = false
        object.receiveShadow = false
      }
    })

    storeRoot = store
    storeBounds = new THREE.Box3().setFromObject(store)
    storeSpawnPosition.copy(storeBounds.getCenter(new THREE.Vector3()))
    storeSpawnPosition.y = playerHeight
    const storeEntrySize = storeBounds.getSize(new THREE.Vector3())
    storeEntryPosition.set(storeBounds.min.x + Math.min(1.2, storeEntrySize.x * 0.12), playerHeight, (storeBounds.min.z + storeBounds.max.z) * 0.5)
    store.visible = false

    const keyLoader = new GLTFLoader()
    const keyUrl = new URL('./assets/key/lost_car_keys_tlou_inspired.glb', import.meta.url).href
    keyLoader.load(keyUrl, (gltf) => {
      const keyModel = gltf.scene
      keyPickupObject = keyModel
      keyModel.updateMatrixWorld(true)
      const keyBounds = new THREE.Box3().setFromObject(keyModel)
      const keySize = keyBounds.getSize(new THREE.Vector3())
      keyModel.scale.setScalar(1.4 / Math.max(keySize.x, keySize.y, keySize.z, 0.01))

      const keyMeshes: THREE.Mesh[] = []
      keyModel.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          keyMeshes.push(object)
          object.frustumCulled = false
          object.castShadow = false
          object.receiveShadow = false

          const materials = Array.isArray(object.material) ? object.material : [object.material]

          materials.forEach((material) => {
            material.side = THREE.DoubleSide
            material.needsUpdate = true
          })
        }
      })

      const keyOutlineMaterial = new THREE.LineBasicMaterial({
        color: '#ffcf52',
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      })
      const keyOuterOutlineMaterial = new THREE.LineBasicMaterial({
        color: '#ff7a18',
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      })

      for (const mesh of keyMeshes) {
        const outline = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 18), keyOutlineMaterial)
        outline.position.copy(mesh.position)
        outline.rotation.copy(mesh.rotation)
        outline.scale.copy(mesh.scale)
        outline.frustumCulled = false
        outline.renderOrder = 1000
        keyModel.add(outline)
        keyEspObjects.push(outline)

        const outerOutline = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), keyOuterOutlineMaterial)
        outerOutline.position.copy(mesh.position)
        outerOutline.rotation.copy(mesh.rotation)
        outerOutline.scale.set(mesh.scale.x * 1.035, mesh.scale.y * 1.035, mesh.scale.z * 1.035)
        outerOutline.frustumCulled = false
        outerOutline.renderOrder = 999
        keyModel.add(outerOutline)
        keyEspObjects.push(outerOutline)
      }
      keyEspObjects.forEach((outline) => { outline.visible = keyEspSetting.checked })

      const placeKeyWhenReady = () => {
        if (!parkedCarsReady) {
          requestAnimationFrame(placeKeyWhenReady)
          return
        }

        const keySpawnPosition = getRandomKeySpawnPosition()
        if (!keySpawnPosition) {
          requestAnimationFrame(placeKeyWhenReady)
          return
        }

        keyModel.position.copy(keySpawnPosition)
        keyModel.updateMatrixWorld(true)
        scene.add(keyModel)
      }
      placeKeyWhenReady()

    }, undefined, (error) => {
      console.error('Failed to load key pickup model.', error)
    })
    scene.add(store)
  }, undefined, (error) => {
    console.error('Failed to load store model.', error)
  })
}, undefined, (error) => {
  console.error('Failed to load parking lot model.', error)
})
const domeGridRadius = 260
const domeGridSegments = 48
const domeGridRings = 18
const domeGridVertices: number[] = []
const domeGridPoint = new THREE.Vector3()
for (let ring = 0; ring <= domeGridRings; ring += 1) {
  const theta = (ring / domeGridRings) * Math.PI * 0.5
  const ringRadius = Math.sin(theta) * domeGridRadius
  const ringHeight = Math.cos(theta) * domeGridRadius
  for (let segment = 0; segment < domeGridSegments; segment += 1) {
    const nextSegment = (segment + 1) % domeGridSegments
    domeGridPoint.set(Math.cos((segment / domeGridSegments) * Math.PI * 2) * ringRadius, ringHeight, Math.sin((segment / domeGridSegments) * Math.PI * 2) * ringRadius)
    domeGridVertices.push(domeGridPoint.x, domeGridPoint.y, domeGridPoint.z)
    domeGridPoint.set(Math.cos((nextSegment / domeGridSegments) * Math.PI * 2) * ringRadius, ringHeight, Math.sin((nextSegment / domeGridSegments) * Math.PI * 2) * ringRadius)
    domeGridVertices.push(domeGridPoint.x, domeGridPoint.y, domeGridPoint.z)
  }
}
for (let segment = 0; segment < domeGridSegments; segment += 1) {
  const longitude = (segment / domeGridSegments) * Math.PI * 2
  for (let ring = 0; ring < domeGridRings; ring += 1) {
    const theta = (ring / domeGridRings) * Math.PI * 0.5
    const nextTheta = ((ring + 1) / domeGridRings) * Math.PI * 0.5
    domeGridPoint.set(Math.cos(longitude) * Math.sin(theta) * domeGridRadius, Math.cos(theta) * domeGridRadius, Math.sin(longitude) * Math.sin(theta) * domeGridRadius)
    domeGridVertices.push(domeGridPoint.x, domeGridPoint.y, domeGridPoint.z)
    domeGridPoint.set(Math.cos(longitude) * Math.sin(nextTheta) * domeGridRadius, Math.cos(nextTheta) * domeGridRadius, Math.sin(longitude) * Math.sin(nextTheta) * domeGridRadius)
    domeGridVertices.push(domeGridPoint.x, domeGridPoint.y, domeGridPoint.z)
  }
}
const domeGridGeometry = new THREE.BufferGeometry()
domeGridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(domeGridVertices, 3))
const domeGrid = new THREE.LineSegments(
  domeGridGeometry,
  new THREE.LineBasicMaterial({ color: '#39ff88', transparent: true, opacity: 0.16, depthWrite: false, fog: false }),
)
domeGrid.position.y = 0
domeGrid.visible = domeGridSetting.checked
scene.add(domeGrid)
const domeGridMaterial = domeGrid.material as THREE.LineBasicMaterial
domeGridSetting.addEventListener('change', () => {
  domeGrid.visible = domeGridSetting.checked
})
domeGridColorSetting.addEventListener('input', () => {
  domeGridMaterial.color.set(domeGridColorSetting.value)
})
hideAllCarsSetting.addEventListener('change', () => {
  parkedCars.forEach((car) => {
    car.visible = !hideAllCarsSetting.checked
  })
})
keyEspSetting.addEventListener('change', () => {
  keyEspObjects.forEach((outline) => {
    outline.visible = keyEspSetting.checked
  })
})
trueCarEspSetting.addEventListener('change', () => {
  trueCarEspObjects.forEach((outline) => {
    outline.visible = trueCarEspSetting.checked
  })
})
carHitboxSetting.addEventListener('change', () => {
  carHitboxHelpers.forEach((helper) => { helper.visible = carHitboxSetting.checked })
})
matryoshkaHitboxSetting.addEventListener('change', () => {
  matryoshkaMobs.forEach((mob) => { mob.hitboxHelper.visible = matryoshkaHitboxSetting.checked })
})
matryoshkaVisionSetting.addEventListener('change', () => {
  matryoshkaMobs.forEach((mob) => {
    mob.visionIndicator.visible = matryoshkaVisionSetting.checked
  })
})
waypointDisplaySetting.addEventListener('change', () => {
  matryoshkaWaypointMarkers.forEach((marker) => { marker.visible = waypointDisplaySetting.checked })
  matryoshkaRecoveryWaypointMarkers.forEach((marker) => { marker.visible = waypointDisplaySetting.checked })
})
document.querySelector<HTMLElement>('[data-category="targets"]')?.remove()
document.querySelector<HTMLElement>('[data-category-panel="targets"]')?.remove()
const physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
physicsWorld.createCollider(RAPIER.ColliderDesc.cuboid(1000, 0.1, 1000).setTranslation(0, -0.1, 0))
const matryoshkaPhysicsRadius = 0.3

function createMatryoshkaPhysicsBody(object: THREE.Object3D): { body: RAPIER.RigidBody; offsetY: number } {
  const offsetY = matryoshkaPhysicsRadius
  const body = physicsWorld.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(object.position.x, object.position.y + offsetY, object.position.z))
  body.setGravityScale(0, true)
  physicsWorld.createCollider(RAPIER.ColliderDesc.ball(matryoshkaPhysicsRadius).setDensity(6).setFriction(1).setRestitution(0.05), body)
  return { body, offsetY }
}

function syncMatryoshkaFromPhysics(mob: MatryoshkaMob): void {
  const translation = mob.physicsBody.translation()
  const rotation = mob.physicsBody.rotation()
  mob.object.position.set(translation.x, translation.y - mob.physicsOffsetY, translation.z)
  mob.object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
}

function syncMatryoshkaToPhysics(mob: MatryoshkaMob): void {
  mob.physicsBody.setTranslation({
    x: mob.object.position.x,
    y: mob.object.position.y + mob.physicsOffsetY,
    z: mob.object.position.z,
  }, true)
}

const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 600)
let baseFov = camera.fov
camera.position.set(0, 3.4, 5)
const controls = new PointerLockControls(camera, canvas)
controls.pointerSpeed = 0.7
scene.add(controls.object)

const weapon = new THREE.Group()
const modelMuzzle = new THREE.Object3D()
weapon.add(modelMuzzle)
const weaponPosition = new THREE.Vector3(0.44, -0.27, -0.58)
const weaponRotation = new THREE.Euler(-0.03, 0.04, 0.02)
const hipPosition = weaponPosition.clone()
const hipRotation = weaponRotation.clone()
const akHipRotation = new THREE.Euler(0.03, 0.04, 0.02)
const adsPosition = new THREE.Vector3(0, -0.22, -0.47)
const adsRotation = new THREE.Euler(-0.01, 0.002, 0)
const akAdsPosition = new THREE.Vector3(0.025, -0.26, -0.54)
const akAdsRotation = new THREE.Euler(0, 0, 0)
const weaponBodyMaterial = new THREE.MeshStandardMaterial({ color: '#090a0b', roughness: 0.34, metalness: 0.78, fog: false })
const weaponSlideMaterial = new THREE.MeshStandardMaterial({ color: '#17191b', roughness: 0.27, metalness: 0.88, fog: false })
const weaponBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.52), weaponBodyMaterial)
weaponBody.position.z = -0.18
weaponBody.castShadow = false
weapon.add(weaponBody)
const weaponSlide = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.5), weaponSlideMaterial)
weaponSlide.position.set(0, 0.11, -0.2)
weapon.add(weaponSlide)
const weaponGrip = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.14), weaponBodyMaterial)
weaponGrip.position.set(0, -0.16, 0.04)
weaponGrip.rotation.x = -0.23
weapon.add(weaponGrip)
const weaponBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.28, 12), weaponBodyMaterial)
weaponBarrel.rotation.x = Math.PI / 2
weaponBarrel.position.set(0, 0.11, -0.55)
weapon.add(weaponBarrel)
const muzzleFlash = new THREE.Mesh(
  new THREE.ConeGeometry(0.07, 0.24, 8),
  new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: 0, fog: false }),
)
muzzleFlash.rotation.x = -Math.PI / 2
muzzleFlash.position.set(0, 0.11, -0.7)
weapon.add(muzzleFlash)
const rearSightLeft = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.032, 0.038), weaponBodyMaterial)
rearSightLeft.position.set(-0.032, 0.16, 0.01)
weapon.add(rearSightLeft)
const rearSightRight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.032, 0.038), weaponBodyMaterial)
rearSightRight.position.set(0.032, 0.16, 0.01)
weapon.add(rearSightRight)
const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.032, 0.038), weaponBodyMaterial)
frontSight.position.set(0, 0.16, -0.44)
weapon.add(frontSight)
weaponBody.visible = false
weaponSlide.visible = false
weaponGrip.visible = false
weaponBarrel.visible = false
rearSightLeft.visible = false
rearSightRight.visible = false
frontSight.visible = false
let coltModel: THREE.Object3D | null = null
let currentWeaponModel: THREE.Object3D | null = null
const weaponMuzzlePositions = new Map<WeaponId, THREE.Vector3>()
const coltLoader = new FBXLoader()
const coltModelUrl = new URL('./assets/Colt1911/colt1911.fbx', import.meta.url).href
coltLoader.load(coltModelUrl, (colt) => {
  colt.rotation.set(0, Math.PI, 0)
  colt.position.set(0, 0, 0)
  colt.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = false
      object.frustumCulled = false
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      const blackMaterials = materials.map((material) => new THREE.MeshStandardMaterial({
        color: '#050505',
        metalness: 0.82,
        roughness: 0.3,
        side: material.side,
      }))
      object.material = Array.isArray(object.material) ? blackMaterials : blackMaterials[0]
    }
  })
  colt.updateMatrixWorld(true)
  const coltBounds = new THREE.Box3().setFromObject(colt)
  const coltSize = coltBounds.getSize(new THREE.Vector3())
  colt.scale.setScalar(0.95 / Math.max(coltSize.x, coltSize.y, coltSize.z))
  colt.updateMatrixWorld(true)
  const scaledBounds = new THREE.Box3().setFromObject(colt)
  const scaledCenter = scaledBounds.getCenter(new THREE.Vector3())
  colt.position.sub(scaledCenter)
  colt.updateMatrixWorld(true)
  const centeredBounds = new THREE.Box3().setFromObject(colt)
  modelMuzzle.position.set(
    (centeredBounds.min.x + centeredBounds.max.x) * 0.5,
    (centeredBounds.min.y + centeredBounds.max.y) * 0.5,
    Math.min(centeredBounds.min.z, centeredBounds.max.z) - 0.02,
  )
  muzzleFlash.position.copy(modelMuzzle.position)
  muzzleFlash.position.y += 0.22
  muzzleFlash.position.z -= 0.08
  colt.visible = false
  coltModel = colt
  weaponMuzzlePositions.set('pistol', modelMuzzle.position.clone())
  currentWeaponModel = colt
  weapon.add(colt)
  applyWeaponSelection()
}, undefined, (error) => {
  console.error('Failed to load Colt 1911 model or textures.', error)
})
weapon.scale.setScalar(0.72)
weapon.position.copy(weaponPosition)
weapon.rotation.copy(weaponRotation)
camera.add(weapon)

const muzzleLocalPosition = new THREE.Vector3()
const pistolSoundUrl = new URL('./assets/sounds/freesound_community-9mm-pistol-shoot-short-reverb-7152.mp3', import.meta.url).href
const gunshotAudioContext = new AudioContext()
let gunshotBuffer: AudioBuffer | null = null
let knockSoundBuffer: AudioBuffer | null = null
let trueCarSoundBuffer: AudioBuffer | null = null
let runningSoundBuffer: AudioBuffer | null = null
let runningSoundSource: AudioBufferSourceNode | null = null
let soundVolumeMultiplier = 0.5
void fetch(pistolSoundUrl)
  .then((response) => response.arrayBuffer())
  .then((audioData) => gunshotAudioContext.decodeAudioData(audioData))
  .then((buffer) => { gunshotBuffer = buffer })
  .catch((error: unknown) => console.error('Gunshot audio failed to load.', error))
const knockSoundUrl = new URL('./assets/sounds/universfield-door-knock-291150.mp3', import.meta.url).href
const knockSoundReady = fetch(knockSoundUrl)
  .then((response) => response.arrayBuffer())
  .then((audioData) => gunshotAudioContext.decodeAudioData(audioData))
  .then((buffer) => { knockSoundBuffer = buffer })
  .catch((error: unknown) => console.error('Knock audio failed to load.', error))
const carBreakSoundUrl = new URL('./assets/sounds/soumages-iron-smash-with-debris-351841.mp3', import.meta.url).href
let carBreakSoundBuffer: AudioBuffer | null = null
const carBreakSoundReady = fetch(carBreakSoundUrl)
  .then((response) => response.arrayBuffer())
  .then((audioData) => gunshotAudioContext.decodeAudioData(audioData))
  .then((buffer) => {
    carBreakSoundBuffer = buffer
    carEndingShakePeaks = detectCarBreakPeaks(buffer)
  })
  .catch((error: unknown) => console.error('Car break audio failed to load.', error))
const trueCarSoundUrl = new URL('./assets/sounds/universfield-car-horn-02-153260.mp3', import.meta.url).href
void fetch(trueCarSoundUrl)
  .then((response) => response.arrayBuffer())
  .then((audioData) => gunshotAudioContext.decodeAudioData(audioData))
  .then((buffer) => { trueCarSoundBuffer = buffer })
  .catch((error: unknown) => console.error('True car audio failed to load.', error))
const runningSoundUrl = new URL('./assets/sounds/freeeverythingxx-running-on-concrete-268478.mp3', import.meta.url).href
void fetch(runningSoundUrl)
  .then((response) => response.arrayBuffer())
  .then((audioData) => gunshotAudioContext.decodeAudioData(audioData))
  .then((buffer) => {
    runningSoundBuffer = buffer
    detectTwoFootstepClipDuration(buffer)
  })
  .catch((error: unknown) => console.error('Running audio failed to load.', error))

function resolveWeaponForMode(_mode: ShootingMode): WeaponId {
  return 'pistol'
}

function saveCurrentWeaponProfile(): void {
  if (restoringSettings) return
  const profile = weaponProfiles[activeWeapon]
  profile.bulletSpeed = Number(bulletSpeedSetting.value)
  profile.recoil = Number(recoilSetting.value)
  profile.spread = Number(spreadSetting.value)
  profile.movementSpread = Number(movementSpreadSetting.value)
  profile.aimingJumpSpread = Number(aimingJumpSpreadSetting.value)
  profile.hipfireJumpSpread = Number(hipfireJumpSpreadSetting.value)
  profile.bulletDrop = Number(bulletDropSetting.value)
  profile.recoilMode = recoilModeSetting.value as RecoilMode
}

function applyWeaponProfile(weaponId: WeaponId): void {
  const profile = weaponProfiles[weaponId]
  recoilMode = profile.recoilMode
  recoilModeSetting.value = profile.recoilMode
  bulletSpeedSetting.max = '1000'
  bulletSpeedSetting.value = profile.bulletSpeed.toString()
  bulletSpeedValue.value = profile.bulletSpeed.toString()
  recoilSetting.value = profile.recoil.toString()
  recoilValue.value = `${profile.recoil}%`
  spreadSetting.value = profile.spread.toString()
  spreadValue.value = `${profile.spread}%`
  movementSpreadSetting.value = profile.movementSpread.toString()
  movementSpreadValue.value = `${profile.movementSpread}%`
  aimingJumpSpreadSetting.value = profile.aimingJumpSpread.toString()
  aimingJumpSpreadValue.value = `${profile.aimingJumpSpread}%`
  hipfireJumpSpreadSetting.value = profile.hipfireJumpSpread.toString()
  hipfireJumpSpreadValue.value = `${profile.hipfireJumpSpread}%`
  bulletDropSetting.value = profile.bulletDrop.toString()
  bulletDropValue.value = `${profile.bulletDrop}%`
  projectileVelocity = profile.bulletSpeed
  recoilMultiplier = profile.recoil / 50
  spreadMultiplier = profile.spread / 50
  movementSpreadMultiplier = profile.movementSpread / 100
  aimingJumpSpreadMultiplier = profile.aimingJumpSpread / 100
  hipfireJumpSpreadMultiplier = profile.hipfireJumpSpread / 100
  gravityMultiplier = profile.bulletDrop / 100
}

function applyWeaponSelection(): void {
  activeWeapon = resolveWeaponForMode(shootingMode)
  applyWeaponProfile(activeWeapon)
  stopAutomaticFire()
  scopeOverlay.classList.remove('is-visible')
  if (coltModel) coltModel.visible = activeWeapon === 'pistol'
  currentWeaponModel = coltModel
  const muzzlePosition = weaponMuzzlePositions.get(activeWeapon)
  if (muzzlePosition) {
    modelMuzzle.position.copy(muzzlePosition)
    muzzleFlash.position.copy(modelMuzzle.position)
    muzzleFlash.position.y += 0.22
    muzzleFlash.position.z -= 0.2
  }
  currentWeaponName.textContent = 'M1911'
  resetRecoilState()
  resetCameraView()
  if (aiming) setAiming(true)
  else weaponRotation.copy(hipRotation)
  refreshWeaponRender()
}

function playGunshot(): void {
  if (!gunshotBuffer || !hitSoundEnabled) return
  const startGunshot = (): void => {
    const source = gunshotAudioContext.createBufferSource()
    const gain = gunshotAudioContext.createGain()
    source.buffer = gunshotBuffer
    gain.gain.value = soundVolumeMultiplier
    source.connect(gain)
    gain.connect(gunshotAudioContext.destination)
    source.start()
  }
  if (gunshotAudioContext.state === 'running') startGunshot()
  else void gunshotAudioContext.resume().then(startGunshot).catch((error: unknown) => console.error('Gunshot audio playback failed.', error))
}

function playKnockSound(onEnded?: () => void): void {
  if (!knockSoundBuffer || !hitSoundEnabled) return
  const startKnock = (): void => {
    if (!knockSoundBuffer) return
    const source = gunshotAudioContext.createBufferSource()
    const gain = gunshotAudioContext.createGain()
    source.buffer = knockSoundBuffer
    gain.gain.value = soundVolumeMultiplier
    source.connect(gain)
    gain.connect(gunshotAudioContext.destination)
    if (onEnded) source.addEventListener('ended', onEnded, { once: true })
    source.start()
  }
  if (gunshotAudioContext.state === 'running') startKnock()
  else void gunshotAudioContext.resume().then(startKnock).catch((error: unknown) => console.error('Knock audio playback failed.', error))
}

function detectCarBreakPeaks(buffer: AudioBuffer): number[] {
  const samples = buffer.getChannelData(0)
  const windowSize = Math.max(1, Math.floor(buffer.sampleRate * 0.01))
  const envelope: number[] = []
  for (let offset = 0; offset < samples.length; offset += windowSize) {
    let energy = 0
    const end = Math.min(samples.length, offset + windowSize)
    for (let index = offset; index < end; index += 1) energy += samples[index] ** 2
    envelope.push(Math.sqrt(energy / Math.max(1, end - offset)))
  }
  const candidates = envelope
    .map((value, index) => ({ value, time: index * 0.01 }))
    .filter((candidate, index) => candidate.value >= (envelope[index - 1] ?? 0) && candidate.value >= (envelope[index + 1] ?? 0))
    .sort((first, second) => second.value - first.value)
  const peaks: number[] = []
  for (const candidate of candidates) {
    if (peaks.every((peak) => Math.abs(peak - candidate.time) >= 0.25)) peaks.push(candidate.time)
    if (peaks.length === 2) break
  }
  return peaks.sort((first, second) => first - second)
}

function playCarBreakSound(): void {
  if (!carBreakSoundBuffer || !hitSoundEnabled) return
  const startCarBreak = (): void => {
    if (!carBreakSoundBuffer) return
    const source = gunshotAudioContext.createBufferSource()
    const gain = gunshotAudioContext.createGain()
    source.buffer = carBreakSoundBuffer
    gain.gain.value = soundVolumeMultiplier
    source.connect(gain)
    gain.connect(gunshotAudioContext.destination)
    carEndingShakeStartedAt = performance.now() / 1000
    source.start()
  }
  if (gunshotAudioContext.state === 'running') startCarBreak()
  else void gunshotAudioContext.resume().then(startCarBreak).catch((error: unknown) => console.error('Car break audio playback failed.', error))
}

function warmGunshotAudio(): void {
  if (gunshotAudioContext.state === 'suspended') void gunshotAudioContext.resume()
}

function playRunningSound(): void {
  if (!runningSoundBuffer || runningSoundSource) return
  const startRunningSound = (): void => {
    if (!runningSoundBuffer || runningSoundSource) return
    const source = gunshotAudioContext.createBufferSource()
    const gain = gunshotAudioContext.createGain()
    source.buffer = runningSoundBuffer
    source.loop = true
    source.loopStart = runningFootstepLoopStart
    source.loopEnd = runningFootstepClipDuration
    gain.gain.value = soundVolumeMultiplier
    source.connect(gain)
    gain.connect(gunshotAudioContext.destination)
    source.onended = () => {
      if (runningSoundSource === source) runningSoundSource = null
    }
    runningSoundSource = source
    source.start(0, runningFootstepLoopStart)
  }
  if (gunshotAudioContext.state === 'running') startRunningSound()
  else void gunshotAudioContext.resume().then(startRunningSound).catch((error: unknown) => console.error('Running audio playback failed.', error))
}

function stopRunningSound(): void {
  if (!runningSoundSource) return
  runningSoundSource.stop()
  runningSoundSource.disconnect()
  runningSoundSource = null
}

function playTrueCarSound(): void {
  if (!trueCar || !keyPickupCollected) return
  trueCarBounds.setFromObject(trueCar)
  trueCarBounds.getCenter(trueCarWorldPosition)
  alertMatryoshkasToSound(trueCarWorldPosition, 'car')
  if (!trueCarSoundBuffer) return

  const source = gunshotAudioContext.createBufferSource()
  const gain = gunshotAudioContext.createGain()
  const panner = gunshotAudioContext.createPanner()
  panner.panningModel = 'HRTF'
  panner.distanceModel = 'inverse'
  panner.refDistance = 4
  panner.maxDistance = 120
  panner.rolloffFactor = 1
  panner.positionX.value = trueCarWorldPosition.x
  panner.positionY.value = trueCarWorldPosition.y
  panner.positionZ.value = trueCarWorldPosition.z
  source.buffer = trueCarSoundBuffer
  gain.gain.value = soundVolumeMultiplier
  source.connect(gain)
  gain.connect(panner)
  panner.connect(gunshotAudioContext.destination)
  trueCarSoundPlaying = true
  trueCarSoundIndicator.hidden = false
  source.onended = () => {
    trueCarSoundPlaying = false
    trueCarSoundIndicator.hidden = true
  }
  source.start()
}

gunshotVolumeSetting.addEventListener('input', () => {
  soundVolumeMultiplier = Number(gunshotVolumeSetting.value) / 100
  gunshotVolumeValue.value = `${gunshotVolumeSetting.value}%`
})

function getMuzzleWorldPosition(): THREE.Vector3 {
  return modelMuzzle.localToWorld(muzzleLocalPosition.clone())
}

let aiming = false
crosshair.classList.toggle('is-hipfire-hidden', crosshairHideWhenNotAiming && !aiming)
let aimButtonHeld = false
let recoilPitch = 0
let appliedRecoilPitch = 0
let weaponRecoilPitch = 0
let weaponRecoilVisual = 0
const recoilLocalAxis = new THREE.Vector3(1, 0, 0)
const recoilRotation = new THREE.Quaternion()
const aimingSpread = 0.004
const hipfireSpread = 0.02
let movementSpreadMultiplier = 2.25
const sprintSpreadMultiplier = 1.2
let aimingJumpSpreadMultiplier = 5.5
let hipfireJumpSpreadMultiplier = 4.5
function getShotSpread(moving: boolean, airborne: boolean): number {
  const baseSpread = aiming ? aimingSpread : hipfireSpread
  const movementMultiplier = moving ? movementSpreadMultiplier : 1
  const sprintMultiplier = moving && (keys.has('ShiftLeft') || keys.has('ShiftRight')) ? sprintSpreadMultiplier : 1
  const jumpMultiplier = airborne ? aiming ? aimingJumpSpreadMultiplier : hipfireJumpSpreadMultiplier : 1
  return baseSpread * spreadMultiplier * movementMultiplier * sprintMultiplier * jumpMultiplier
}

function getSpreadPixels(moving: boolean, airborne: boolean): number {
  const spreadAngle = getShotSpread(moving, airborne)
  const fovRadians = THREE.MathUtils.degToRad(camera.fov)
  const viewportHeight = canvas.clientHeight || 1
  return Math.tan(spreadAngle) * viewportHeight / (2 * Math.tan(fovRadians / 2))
}

function triggerMuzzleFlash(): void {
  muzzleFlash.scale.set(
    0.7 + Math.random() * 0.3,
    0.8 + Math.random() * 0.35,
    0.7 + Math.random() * 0.3,
  )
  gsap.killTweensOf(muzzleFlash.material)
  muzzleFlash.material.opacity = 0.78
  gsap.to(muzzleFlash.material, { opacity: 0, duration: 0.07, ease: 'power2.out' })
}

function applyRecoil(): void {
  const strength = (aiming ? 0.06 : 0.048) * recoilMultiplier
  recoilPitch += strength
  weaponRecoilPitch += strength * 0.9
  triggerMuzzleFlash()
}

function resetRecoilState(): void {
  if (Math.abs(appliedRecoilPitch) > 0.000001) {
    recoilRotation.setFromAxisAngle(recoilLocalAxis, -appliedRecoilPitch)
    camera.quaternion.multiply(recoilRotation).normalize()
  }
  recoilPitch = 0
  appliedRecoilPitch = 0
  weaponRecoilPitch = 0
  weaponRecoilVisual = 0
}

function resetCameraView(): void {
  camera.rotation.x = 0
  camera.rotation.z = 0
  camera.updateMatrixWorld(true)
}

function getActiveAdsFov(): number {
  return THREE.MathUtils.clamp(baseFov * (adsFov / 65), 1, 179)
}

function setAiming(nextAiming: boolean): void {
  aiming = nextAiming
  updatePointerSensitivity()
  const position = aiming ? adsPosition : hipPosition
  const rotation = aiming ? adsRotation : hipRotation
  gsap.to(weaponPosition, { x: position.x, y: position.y, z: position.z, duration: 0.18, ease: 'power2.out' })
  gsap.to(weaponRotation, { x: rotation.x, y: rotation.y, z: rotation.z, duration: 0.18, ease: 'power2.out' })
  scopeOverlay.classList.toggle('is-visible', false)
  crosshair.classList.toggle('is-scope-hidden', false)
  crosshair.classList.toggle('is-hipfire-hidden', crosshairHideWhenNotAiming && !aiming)
  gsap.to(camera, { fov: aiming ? getActiveAdsFov() : baseFov, duration: 0.2, ease: 'power2.out', onUpdate: () => camera.updateProjectionMatrix() })
}

function updatePointerSensitivity(): void {
  const baseSensitivity = Number(settingsSensitivity.value) * dpiMultiplier
  controls.pointerSpeed = baseSensitivity * (aiming ? adsSensitivityRatio : 1)
}

function handlePointerDown(event: PointerEvent): void {
  if (event.button === 0 && controls.isLocked && !trueCarEntered) {
    event.preventDefault()
    if (waypointEditSetting.checked) {
      addMatryoshkaWaypointFromAim()
      return
    }
    warmGunshotAudio()
    leftButtonHeld = true
    fireShot()
  }
}

function handleMouseDown(event: MouseEvent): void {
  if (event.button === 0 && controls.isLocked && !trueCarEntered && !leftButtonHeld) {
    event.preventDefault()
    if (waypointEditSetting.checked) {
      addMatryoshkaWaypointFromAim()
      leftButtonHeld = true
      return
    }
    warmGunshotAudio()
    leftButtonHeld = true
    fireShot()
  }
  if (event.button !== 2 || !controls.isLocked) return
  event.preventDefault()
  aimButtonHeld = true
  setAiming(true)
}

function handlePointerUp(event: PointerEvent): void {
  if (event.button === 2) {
    aimButtonHeld = false
    setAiming(false)
  }
}

function releaseAim(): void {
  if (aiming) setAiming(false)
}

let automaticFireTimer: number | null = null
let leftButtonHeld = false

function stopAutomaticFire(): void {
  if (automaticFireTimer === null) return
  window.clearInterval(automaticFireTimer)
  automaticFireTimer = null
}

document.addEventListener('pointerdown', handlePointerDown)
document.addEventListener('mousedown', handleMouseDown)
window.addEventListener('focus', warmGunshotAudio)
document.addEventListener('pointerup', (event) => {
  handlePointerUp(event)
  if (event.button === 0) {
    leftButtonHeld = false
    stopAutomaticFire()
  }
})
document.addEventListener('pointercancel', () => {
  aimButtonHeld = false
  stopAutomaticFire()
  releaseAim()
})
window.addEventListener('mouseup', (event) => {
  if (event.button === 2) {
    aimButtonHeld = false
    releaseAim()
  }
  if (event.button === 0) {
    leftButtonHeld = false
    stopAutomaticFire()
  }
})
window.addEventListener('blur', () => {
  aimButtonHeld = false
  leftButtonHeld = false
  stopAutomaticFire()
  releaseAim()
})
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAutomaticFire()
    releaseAim()
  } else warmGunshotAudio()
})
canvas.addEventListener('contextmenu', (event) => event.preventDefault())
settingsSensitivity.addEventListener('input', () => {
  settingsSensitivityValue.value = Number(settingsSensitivity.value).toFixed(2)
  updatePointerSensitivity()
})
dpiSetting.addEventListener('input', () => {
  dpiMultiplier = Number(dpiSetting.value) / 800
  dpiValue.value = dpiSetting.value
  updatePointerSensitivity()
})
adsRatioSetting.addEventListener('input', () => {
  adsSensitivityRatio = Number(adsRatioSetting.value)
  adsRatioValue.value = adsRatioSetting.value
  updatePointerSensitivity()
})
adsFovSetting.addEventListener('input', () => {
  adsFov = Number(adsFovSetting.value)
  adsFovValue.value = adsFovSetting.value
  if (aiming) {
    camera.fov = getActiveAdsFov()
    camera.updateProjectionMatrix()
  }
})
rawInputSetting.addEventListener('change', () => {
  rawInputEnabled = rawInputSetting.checked
})

renderDistanceSetting.addEventListener('input', () => {
  const distance = Number(renderDistanceSetting.value)
  camera.far = distance
  scene.fog = new THREE.Fog(backgroundColorSetting.value, Math.max(28, distance * 0.15), distance)
  renderDistanceValue.value = renderDistanceSetting.value
  camera.updateProjectionMatrix()
})
maxFpsSetting.addEventListener('change', () => {
  maxFps = Number(maxFpsSetting.value)
})
recoilModeSetting.addEventListener('change', () => {
  recoilMode = recoilModeSetting.value as RecoilMode
  saveCurrentWeaponProfile()
})
weaponSetting.addEventListener('change', () => {
  weaponSelection = weaponSetting.value as 'auto' | WeaponId
  applyWeaponSelection()
})
recoilSetting.addEventListener('input', () => {
  recoilMultiplier = Number(recoilSetting.value) / 50
  recoilValue.value = `${recoilSetting.value}%`
  if (!restoringSettings) weaponProfiles[activeWeapon].recoil = Number(recoilSetting.value)
})
spreadSetting.addEventListener('input', () => {
  spreadMultiplier = Number(spreadSetting.value) / 50
  spreadValue.value = `${spreadSetting.value}%`
  if (!restoringSettings) weaponProfiles[activeWeapon].spread = Number(spreadSetting.value)
})
movementSpreadSetting.addEventListener('input', () => {
  movementSpreadMultiplier = Number(movementSpreadSetting.value) / 100
  movementSpreadValue.value = `${movementSpreadSetting.value}%`
  if (!restoringSettings) weaponProfiles[activeWeapon].movementSpread = Number(movementSpreadSetting.value)
})
aimingJumpSpreadSetting.addEventListener('input', () => {
  aimingJumpSpreadMultiplier = Number(aimingJumpSpreadSetting.value) / 100
  aimingJumpSpreadValue.value = `${aimingJumpSpreadSetting.value}%`
  if (!restoringSettings) weaponProfiles[activeWeapon].aimingJumpSpread = Number(aimingJumpSpreadSetting.value)
})
hipfireJumpSpreadSetting.addEventListener('input', () => {
  hipfireJumpSpreadMultiplier = Number(hipfireJumpSpreadSetting.value) / 100
  hipfireJumpSpreadValue.value = `${hipfireJumpSpreadSetting.value}%`
  if (!restoringSettings) weaponProfiles[activeWeapon].hipfireJumpSpread = Number(hipfireJumpSpreadSetting.value)
})
bulletDropSetting.addEventListener('input', () => {
  gravityMultiplier = Number(bulletDropSetting.value) / 100
  bulletDropValue.value = `${bulletDropSetting.value}%`
  if (!restoringSettings) weaponProfiles[activeWeapon].bulletDrop = Number(bulletDropSetting.value)
})
trackingSpeedSetting.addEventListener('input', () => {
  trackingSpeed = Number(trackingSpeedSetting.value)
  trackingSpeedValue.value = trackingSpeed.toFixed(1)
  if (shootingMode === 'strafetrack') trackingVelocity.x = strafetrackDirection * trackingSpeed
})
fallingHorizontalForceSetting.addEventListener('input', () => {
  fallingHorizontalForce = Number(fallingHorizontalForceSetting.value)
  fallingHorizontalForceValue.value = fallingHorizontalForce.toFixed(1)
})
fallingLaunchSetting.addEventListener('input', () => {
  fallingLaunchSpeed = Number(fallingLaunchSetting.value)
  fallingLaunchValue.value = fallingLaunchSpeed.toFixed(1)
})
fallingGravitySetting.addEventListener('input', () => {
  fallingGravity = Number(fallingGravitySetting.value)
  fallingGravityValue.value = fallingGravity.toFixed(1)
})
fallingRespawnDelaySetting.addEventListener('input', () => {
  fallingRespawnDelay = Number(fallingRespawnDelaySetting.value)
  fallingRespawnDelayValue.value = `${fallingRespawnDelay.toFixed(2)}s`
})
targetSizeSetting.addEventListener('input', () => {
  targetSizeMultiplier = Number(targetSizeSetting.value) / 100
  updatePrecisionTargetScale()
  targetSizeValue.value = `${targetSizeSetting.value}%`
})
backgroundColorSetting.addEventListener('input', () => {
  scene.background = new THREE.Color(backgroundColorSetting.value)
  scene.fog = new THREE.Fog(backgroundColorSetting.value, Math.max(28, camera.far * 0.15), camera.far)
})
floorColorSetting.addEventListener('input', () => {
  floor.material.color.set(floorColorSetting.value)
})
gridColorSetting.addEventListener('input', () => {
  gridMaterials.forEach((material) => material.color.set(gridColorSetting.value))
})
crosshairStyleSetting.addEventListener('change', () => {
  const styleClass = {
    'DOT + CROSS': 'crosshair-dot-cross',
    DOT: 'crosshair-dot',
    CROSS: 'crosshair-cross',
    CIRCLE: 'crosshair-circle',
  }[crosshairStyleSetting.value] ?? 'crosshair-dot-cross'
  crosshairPreviewTargets.forEach((crosshairTarget) => {
    crosshairTarget.classList.remove('crosshair-dot-cross', 'crosshair-dot', 'crosshair-cross', 'crosshair-circle')
    crosshairTarget.classList.add(styleClass)
  })
})
crosshairColorSetting.addEventListener('input', () => {
  crosshairPreviewTargets.forEach((crosshairTarget) => crosshairTarget.style.setProperty('--crosshair-color', crosshairColorSetting.value))
})
crosshairOutlineColorSetting.addEventListener('input', () => {
  crosshairPreviewTargets.forEach((crosshairTarget) => crosshairTarget.style.setProperty('--crosshair-outline-color', crosshairOutlineColorSetting.value))
})
crosshairOutlineThicknessSetting.addEventListener('input', () => {
  crosshairPreviewTargets.forEach((crosshairTarget) => crosshairTarget.style.setProperty('--crosshair-outline-thickness', `${crosshairOutlineThicknessSetting.value}px`))
  crosshairOutlineThicknessValue.value = `${crosshairOutlineThicknessSetting.value}px`
})
crosshairGapSetting.addEventListener('input', () => {
  crosshairPreviewTargets.forEach((crosshairTarget) => crosshairTarget.style.setProperty('--crosshair-gap', `${crosshairGapSetting.value}px`))
  crosshairGapValue.value = `${crosshairGapSetting.value}px`
})
crosshairLengthSetting.addEventListener('input', () => {
  crosshairPreviewTargets.forEach((crosshairTarget) => crosshairTarget.style.setProperty('--crosshair-length', `${crosshairLengthSetting.value}px`))
  crosshairLengthValue.value = `${crosshairLengthSetting.value}px`
})
crosshairThicknessSetting.addEventListener('input', () => {
  crosshairPreviewTargets.forEach((crosshairTarget) => crosshairTarget.style.setProperty('--crosshair-thickness', `${crosshairThicknessSetting.value}px`))
  crosshairThicknessValue.value = `${crosshairThicknessSetting.value}px`
})
crosshairDotSizeSetting.addEventListener('input', () => {
  crosshairPreviewTargets.forEach((crosshairTarget) => crosshairTarget.style.setProperty('--crosshair-dot-size', `${crosshairDotSizeSetting.value}px`))
  crosshairDotSizeValue.value = `${crosshairDotSizeSetting.value}px`
})
crosshairCircleSizeSetting.addEventListener('input', () => {
  crosshairPreviewTargets.forEach((crosshairTarget) => crosshairTarget.style.setProperty('--crosshair-circle-size', `${crosshairCircleSizeSetting.value}px`))
  crosshairCircleSizeValue.value = `${crosshairCircleSizeSetting.value}px`
})
crosshairOpacitySetting.addEventListener('input', () => {
  crosshairPreviewTargets.forEach((crosshairTarget) => { crosshairTarget.style.opacity = `${Number(crosshairOpacitySetting.value) / 100}` })
  crosshairOpacityValue.value = `${crosshairOpacitySetting.value}%`
})
crosshairDynamicSetting.addEventListener('change', () => {
  crosshairDynamicEnabled = crosshairDynamicSetting.checked
})
crosshairHideWhenNotAimingSetting.addEventListener('change', () => {
  crosshairHideWhenNotAiming = crosshairHideWhenNotAimingSetting.checked
  crosshair.classList.toggle('is-hipfire-hidden', crosshairHideWhenNotAiming && !aiming)
})
crosshairDynamicStrengthSetting.addEventListener('input', () => {
  crosshairDynamicStrength = Number(crosshairDynamicStrengthSetting.value) / 100
  crosshairDynamicStrengthValue.value = `${crosshairDynamicStrengthSetting.value}%`
})
hitMarkerColorSetting.addEventListener('input', () => {
  hitMarkerPreviewTargets.forEach((hitMarkerTarget) => hitMarkerTarget.style.setProperty('--hit-marker-color', hitMarkerColorSetting.value))
})
hitMarkerSizeSetting.addEventListener('input', () => {
  hitMarkerPreviewTargets.forEach((hitMarkerTarget) => hitMarkerTarget.style.setProperty('--hit-marker-size', `${hitMarkerSizeSetting.value}px`))
  hitMarkerSizeValue.value = `${hitMarkerSizeSetting.value}px`
})
hitMarkerLengthSetting.addEventListener('input', () => {
  hitMarkerPreviewTargets.forEach((hitMarkerTarget) => hitMarkerTarget.style.setProperty('--hit-marker-length', `${hitMarkerLengthSetting.value}px`))
  hitMarkerLengthValue.value = `${hitMarkerLengthSetting.value}px`
})
hitMarkerThicknessSetting.addEventListener('input', () => {
  hitMarkerPreviewTargets.forEach((hitMarkerTarget) => hitMarkerTarget.style.setProperty('--hit-marker-thickness', `${hitMarkerThicknessSetting.value}px`))
  hitMarkerThicknessValue.value = `${hitMarkerThicknessSetting.value}px`
})
hitMarkerGapSetting.addEventListener('input', () => {
  hitMarkerPreviewTargets.forEach((hitMarkerTarget) => hitMarkerTarget.style.setProperty('--hit-marker-gap', `${hitMarkerGapSetting.value}px`))
  hitMarkerGapValue.value = `${hitMarkerGapSetting.value}px`
})
hitMarkerDurationSetting.addEventListener('input', () => {
  hitMarkerDuration = Number(hitMarkerDurationSetting.value)
  hitMarkerDurationValue.value = `${hitMarkerDuration.toFixed(2)}s`
})

settingsCategoryButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const category = button.dataset.category
    settingsCategoryButtons.forEach((categoryButton) => categoryButton.classList.toggle('is-active', categoryButton === button))
    settingsCategoryPanels.forEach((panel) => panel.classList.toggle('is-visible', panel.dataset.categoryPanel === category))
  })
})

fovSetting.addEventListener('input', () => {
  baseFov = Number(fovSetting.value)
  camera.fov = aiming ? getActiveAdsFov() : baseFov
  fovValue.value = fovSetting.value
  camera.updateProjectionMatrix()
})

resolutionScaleSetting.addEventListener('input', () => {
  resolutionScale = Number(resolutionScaleSetting.value) / 100
  resolutionScaleValue.value = `${resolutionScaleSetting.value}%`
  renderer.setPixelRatio(getRenderPixelRatio())
  resizeRenderer()
})

const keys = new Set<string>()
const movement = new THREE.Vector3()
const direction = new THREE.Vector3()
const playerHeight = 3.4
const gravity = 18
const jumpVelocity = 5.5
const keyPickupDistance = 7
const keyPickupWorldPosition = new THREE.Vector3()
const keyPickupLookDirection = new THREE.Vector3()
const keyPickupToPlayerDirection = new THREE.Vector3()
const trueCarWorldPosition = new THREE.Vector3()
const trueCarLookDirection = new THREE.Vector3()
const trueCarToPlayerDirection = new THREE.Vector3()
const trueCarIndicatorForward = new THREE.Vector3()
const trueCarIndicatorRight = new THREE.Vector3()
const trueCarIndicatorDirection = new THREE.Vector3()
const trueCarBounds = new THREE.Box3()
const trueCarClosestPoint = new THREE.Vector3()
const driverSeatPosition = new THREE.Vector3()
const driverSeatLookAt = new THREE.Vector3()
const trueCarWorldQuaternion = new THREE.Quaternion()
const carEndingBasePosition = new THREE.Vector3()
const carEndingBaseQuaternion = new THREE.Quaternion()
const carEndingShakeQuaternion = new THREE.Quaternion()
const carEndingShakeAxis = new THREE.Vector3(0, 0, 1)
const driverSeatLeft = new THREE.Vector3(-0.75, 0, 0)
const driverSeatBack = new THREE.Vector3(0, 0, 0.8)
const driverSeatViewDistance = 10
const driverSeatInitialView = new THREE.Vector3(-1, 0, 0)
const trueCarInteractionDistance = 4.5
const trueCarInteractionAngle = 45
let verticalVelocity = 0
let isGrounded = false

function isKeyWithinPickupRange(): boolean {
  if (!controls.isLocked || !keyPickupObject || keyPickupCollected || !keyPickupObject.visible) return false
  keyPickupObject.getWorldPosition(keyPickupWorldPosition)
  const horizontalDistance = Math.hypot(
    camera.position.x - keyPickupWorldPosition.x,
    camera.position.z - keyPickupWorldPosition.z,
  )
  if (horizontalDistance > keyPickupDistance) return false

  camera.getWorldDirection(keyPickupLookDirection)
  keyPickupToPlayerDirection.copy(keyPickupWorldPosition).sub(camera.position).normalize()
  const lookDot = keyPickupLookDirection.dot(keyPickupToPlayerDirection)
  return lookDot >= Math.cos(THREE.MathUtils.degToRad(32))
}

function updateKeyInteractionPrompt(): void {
  keyPickupPrompt.hidden = !isKeyWithinPickupRange()
  vehicleSearchHint.hidden = !keyPickupCollected
  trueCarPrompt.hidden = !isTrueCarWithinInteractionRange()
}

function collectKeyPickup(): void {
  if (!isKeyWithinPickupRange() || !keyPickupObject) return
  keyPickupCollected = true
  keyPickupObject.visible = false
  keyEspObjects.forEach((outline) => { outline.visible = false })
  updateKeyInteractionPrompt()
}

function isTrueCarWithinInteractionRange(): boolean {
  if (!controls.isLocked || !keyPickupCollected || !trueCar || trueCarEntered) return false
  trueCarBounds.setFromObject(trueCar)
  trueCarBounds.getCenter(trueCarWorldPosition)
  trueCarBounds.clampPoint(camera.position, trueCarClosestPoint)
  const horizontalDistance = Math.hypot(camera.position.x - trueCarClosestPoint.x, camera.position.z - trueCarClosestPoint.z)
  if (horizontalDistance > trueCarInteractionDistance) return false

  camera.getWorldDirection(trueCarLookDirection)
  trueCarLookDirection.y = 0
  trueCarLookDirection.normalize()
  trueCarToPlayerDirection.copy(trueCarClosestPoint).sub(camera.position)
  trueCarToPlayerDirection.y = 0
  trueCarToPlayerDirection.normalize()
  return trueCarLookDirection.dot(trueCarToPlayerDirection) >= Math.cos(THREE.MathUtils.degToRad(trueCarInteractionAngle))
}

function enterTrueCar(): void {
  if (!isTrueCarWithinInteractionRange() || !trueCar) return
  trueCar.getWorldQuaternion(trueCarWorldQuaternion)
  trueCarBounds.setFromObject(trueCar)
  trueCarBounds.getCenter(driverSeatPosition)
  driverSeatPosition.y = THREE.MathUtils.lerp(trueCarBounds.min.y, trueCarBounds.max.y, 0.65)
  driverSeatPosition.add(driverSeatLeft.clone().applyQuaternion(trueCarWorldQuaternion))
  driverSeatPosition.add(driverSeatBack.clone().applyQuaternion(trueCarWorldQuaternion))
  driverSeatLookAt.copy(driverSeatInitialView).applyQuaternion(trueCarWorldQuaternion).multiplyScalar(driverSeatViewDistance).add(driverSeatPosition)
  camera.position.copy(driverSeatPosition)
  camera.lookAt(driverSeatLookAt)
  camera.updateMatrixWorld(true)
  trueCarEntered = true
  carEndingBasePosition.copy(trueCar.position)
  carEndingBaseQuaternion.copy(trueCar.quaternion)
  trueCarPrompt.hidden = true
  episodeFadeOverlay.classList.add('is-fading')
  window.setTimeout(() => {
    void knockSoundReady.then(() => playKnockSound(() => {
      window.setTimeout(() => {
        void knockSoundReady.then(() => playKnockSound(() => {
          window.setTimeout(() => { void carBreakSoundReady.then(playCarBreakSound) }, 2000)
        }))
      }, 1000)
    }))
  }, 1000)
  let endingReturnScheduled = false
  const finishTrueCarEnding = (): void => {
    if (!trueCarEntered || endingReturnScheduled) return
    endingReturnScheduled = true
    window.setTimeout(returnToHome, 1000)
  }
  episodeFadeOverlay.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'opacity') finishTrueCarEnding()
  }, { once: true })
  window.setTimeout(finishTrueCarEnding, 10000)
}

function updateTrueCarSeatPosition(): void {
  if (!trueCarEntered || !trueCar) return
  trueCar.getWorldQuaternion(trueCarWorldQuaternion)
  trueCarBounds.setFromObject(trueCar)
  trueCarBounds.getCenter(driverSeatPosition)
  driverSeatPosition.y = THREE.MathUtils.lerp(trueCarBounds.min.y, trueCarBounds.max.y, 0.65)
  driverSeatPosition.add(driverSeatLeft.clone().applyQuaternion(trueCarWorldQuaternion))
  driverSeatPosition.add(driverSeatBack.clone().applyQuaternion(trueCarWorldQuaternion))
  camera.position.copy(driverSeatPosition)
}

function updateTrueCarSoundIndicator(): void {
  if (!trueCarSoundPlaying || !trueCar) return
  trueCarBounds.setFromObject(trueCar)
  trueCarBounds.getCenter(trueCarWorldPosition)
  camera.getWorldDirection(trueCarIndicatorForward)
  trueCarIndicatorForward.y = 0
  trueCarIndicatorForward.normalize()
  trueCarIndicatorRight.setFromMatrixColumn(camera.matrixWorld, 0)
  trueCarIndicatorRight.y = 0
  trueCarIndicatorRight.normalize()
  trueCarIndicatorDirection.copy(trueCarWorldPosition).sub(camera.position)
  trueCarIndicatorDirection.y = 0
  trueCarIndicatorDirection.normalize()
  const bearing = THREE.MathUtils.radToDeg(Math.atan2(
    trueCarIndicatorDirection.dot(trueCarIndicatorRight),
    trueCarIndicatorDirection.dot(trueCarIndicatorForward),
  ))
  trueCarSoundIndicator.style.setProperty('--true-car-bearing', `${bearing}deg`)
}

function lockPointer(): void {
  controls.lock(rawInputEnabled)
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  } else {
    await range.requestFullscreen()
  }
}

function updateFullscreenButton(): void {
  const isFullscreen = document.fullscreenElement === range
  fullscreenButton.textContent = isFullscreen ? '⛶' : '⛶'
  fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen')
  fullscreenButton.title = isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
  resizeRenderer()
}

function handleKeyDown(event: KeyboardEvent): void {
  if (playerDeathActive) {
    event.preventDefault()
    return
  }
  if (event.code === 'Escape') {
    if (controls.isLocked) {
      event.preventDefault()
      controls.unlock()
      return
    }
    if (window.electronAPI) {
      event.preventDefault()
      if (settingsOverlay.classList.contains('is-open')) {
        if (activeMenuView === 'home') enterGame()
        else showMenuView('home')
      } else {
        openMenu()
      }
      return
    }
    if (document.fullscreenElement) {
      event.preventDefault()
      void document.exitFullscreen()
      return
    }
    event.preventDefault()
    if (!settingsOverlay.classList.contains('is-open')) openMenu()
    else if (activeMenuView === 'home') closeMenu()
    else showMenuView('home')
    return
  }
  if (event.code === 'KeyF') {
    if (keyPickupCollected) enterTrueCar()
    else collectKeyPickup()
    return
  }
  if (event.code === 'KeyP') {
    if (controls.isLocked && keyPickupCollected && !trueCarEntered) playTrueCarSound()
    return
  }
  keys.add(event.code)
  if (event.code === 'Space' && controls.isLocked && isGrounded) {
    event.preventDefault()
    verticalVelocity = jumpVelocity
    isGrounded = false
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  keys.delete(event.code)
}

function handleLockChange(): void {
  const locked = controls.isLocked
  if (!locked) releaseAim()
  range.classList.toggle('is-locked', locked)
  syncPauseMenu()
}

function showMenuView(view: 'home' | 'mode' | 'settings'): void {
  activeMenuView = view
  menuHome.classList.toggle('is-visible', view === 'home')
  modeMenu.classList.toggle('is-visible', view === 'mode')
  settingsContent.classList.toggle('is-visible', view === 'settings')
}

function openMenu(): void {
  if (playerDeathActive) return
  if (controls.isLocked) controls.unlock()
  showMenuView('home')
  settingsOverlay.classList.add('is-open')
  settingsOverlay.setAttribute('aria-hidden', 'false')
}

function syncPauseMenu(): void {
  if (playerDeathActive) {
    settingsOverlay.classList.remove('is-open')
    return
  }
  const isPointerLockedToGameCanvas = document.pointerLockElement === canvas
  const shouldShowPauseMenu = !isPointerLockedToGameCanvas
  if (shouldShowPauseMenu) showMenuView('home')
  settingsOverlay.classList.toggle('is-open', shouldShowPauseMenu)
  settingsOverlay.setAttribute('aria-hidden', shouldShowPauseMenu ? 'false' : 'true')
}

function closeMenu(): void {
  settingsOverlay.classList.remove('is-open')
  settingsOverlay.setAttribute('aria-hidden', 'true')
}

function enterGame(): void {
  startScreen.classList.remove('is-visible')
  closeMenu()
  lockPointer()
}

startPlayButton.addEventListener('click', enterGame)
canvas.addEventListener('click', enterGame)
settingsButton.addEventListener('click', () => {
  openMenu()
})
settingsClose.addEventListener('click', () => {
  if (window.electronAPI && !startScreen.classList.contains('is-visible')) enterGame()
  else closeMenu()
})
menuSettingsButton.addEventListener('click', () => showMenuView('settings'))
menuExitButton.addEventListener('click', () => {
  if (startScreen.classList.contains('is-visible')) exitApplication()
  else returnToHome()
})
settingsOverlay.addEventListener('click', (event) => {
  if (event.target === settingsOverlay) settingsClose.click()
})
fullscreenButton.addEventListener('click', () => { void toggleFullscreen() })
document.addEventListener('fullscreenchange', updateFullscreenButton)
document.addEventListener('keydown', handleKeyDown)
document.addEventListener('keyup', handleKeyUp)
document.addEventListener('pointerlockchange', syncPauseMenu)
controls.addEventListener('lock', handleLockChange)
controls.addEventListener('unlock', handleLockChange)

function getRenderPixelRatio(): number {
  return Math.min(window.devicePixelRatio * resolutionScale, 1.5)
}

let renderer = new THREE.WebGLRenderer({ canvas, antialias: antialiasingSetting.checked, powerPreference: 'high-performance' })
renderer.setPixelRatio(getRenderPixelRatio())
renderer.shadowMap.enabled = false

function refreshWeaponRender(): void {
  currentWeaponModel?.updateMatrixWorld(true)
  weapon.updateMatrixWorld(true)
  camera.updateMatrixWorld(true)
  renderer.clear()
  renderer.render(scene, camera)
}

let projectileVelocity = 710
bulletSpeedSetting.addEventListener('input', () => {
  projectileVelocity = Number(bulletSpeedSetting.value)
  bulletSpeedValue.value = bulletSpeedSetting.value
  if (!restoringSettings) weaponProfiles[activeWeapon].bulletSpeed = projectileVelocity
})

const weaponPreviewScene = new THREE.Scene()
weaponPreviewScene.background = new THREE.Color('#11171d')
const weaponPreviewCamera = new THREE.PerspectiveCamera(35, 1, 0.01, 10)
weaponPreviewCamera.position.set(0, 0.05, 2.2)
weaponPreviewCamera.lookAt(0, 0, 0)
weaponPreviewScene.add(new THREE.HemisphereLight('#f4f6f5', '#10151c', 2.5))
const previewKeyLight = new THREE.DirectionalLight('#ffffff', 3)
previewKeyLight.position.set(-2, 3, 2)
weaponPreviewScene.add(previewKeyLight)
const weaponPreviewGroup = new THREE.Group()
weaponPreviewScene.add(weaponPreviewGroup)
const weaponPreviewRenderer = new THREE.WebGLRenderer({ canvas: weaponPreviewCanvas, antialias: true, alpha: false })
weaponPreviewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
let previewSourceModel: THREE.Object3D | null = null
let weaponPreviewDragging = false
let weaponPreviewLastX = 0
weaponPreviewCanvas.addEventListener('pointerdown', (event) => {
  weaponPreviewDragging = true
  weaponPreviewLastX = event.clientX
  weaponPreviewCanvas.setPointerCapture(event.pointerId)
  weaponPreviewCanvas.classList.add('is-dragging')
})
weaponPreviewCanvas.addEventListener('pointermove', (event) => {
  if (!weaponPreviewDragging) return
  const deltaX = event.clientX - weaponPreviewLastX
  weaponPreviewLastX = event.clientX
  weaponPreviewGroup.rotation.y += deltaX * 0.012
})
const stopWeaponPreviewDrag = (event: PointerEvent) => {
  weaponPreviewDragging = false
  if (weaponPreviewCanvas.hasPointerCapture(event.pointerId)) weaponPreviewCanvas.releasePointerCapture(event.pointerId)
  weaponPreviewCanvas.classList.remove('is-dragging')
}
weaponPreviewCanvas.addEventListener('pointerup', stopWeaponPreviewDrag)
weaponPreviewCanvas.addEventListener('pointercancel', stopWeaponPreviewDrag)
weaponPreviewRenderer.setAnimationLoop(() => {
  const width = weaponPreviewCanvas.clientWidth
  const height = weaponPreviewCanvas.clientHeight
  if (width && height) {
    weaponPreviewRenderer.setSize(width, height, false)
    weaponPreviewCamera.aspect = width / height
    weaponPreviewCamera.updateProjectionMatrix()
    if (currentWeaponModel !== previewSourceModel) {
      weaponPreviewGroup.clear()
      previewSourceModel = currentWeaponModel
      if (previewSourceModel) {
        const previewModel = previewSourceModel.clone(true)
        previewModel.visible = true
        previewModel.updateMatrixWorld(true)
        const centeredBounds = new THREE.Box3().setFromObject(previewModel)
        previewModel.position.sub(centeredBounds.getCenter(new THREE.Vector3()))
        weaponPreviewGroup.add(previewModel)
      }
    }
    if (!weaponPreviewDragging) weaponPreviewGroup.rotation.y += 0.008
    weaponPreviewRenderer.render(weaponPreviewScene, weaponPreviewCamera)
  }
})

scene.add(new THREE.HemisphereLight('#8493a8', '#050709', 0.28))
const keyLight = new THREE.DirectionalLight('#b4a58f', 0.42)
keyLight.position.set(-4, 7, 4)
keyLight.castShadow = false
scene.add(keyLight)

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(3000, 3000),
  new THREE.MeshStandardMaterial({ color: '#171d24', roughness: 0.9 }),
)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = false
floor.visible = false
scene.add(floor)

const grid = new THREE.GridHelper(3000, 600, '#33404a', '#1d252d')
grid.position.y = 0.01
grid.visible = false
scene.add(grid)
const gridMaterials = (Array.isArray(grid.material) ? grid.material : [grid.material]) as THREE.LineBasicMaterial[]
const floorTileSize = 1500
const floorTilePosition = new THREE.Vector3()
const lastSafePlayerPosition = new THREE.Vector3()
let hasSafePlayerPosition = false

function updateInfiniteFloor(): void {
  floorTilePosition.set(
    Math.floor(camera.position.x / floorTileSize + 0.5) * floorTileSize,
    0,
    Math.floor(camera.position.z / floorTileSize + 0.5) * floorTileSize,
  )
  floor.position.x = floorTilePosition.x
  floor.position.z = floorTilePosition.z
  grid.position.x = floorTilePosition.x
  grid.position.z = floorTilePosition.z
  domeGrid.position.x = camera.position.x
  domeGrid.position.z = camera.position.z
}

function resolveParkingCollision(): void {
  if (!parkingBounds) return
  if (trueCarEntered) return
  isGrounded = false
  const playerRadius = 0.42
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, parkingBounds.min.x + playerRadius, parkingBounds.max.x - playerRadius)
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, parkingBounds.min.z + playerRadius, parkingBounds.max.z - playerRadius)

  let hasGround = false
  if (parkingLotRoot && verticalVelocity <= 0) {
    parkingGroundRaycaster.set(new THREE.Vector3(camera.position.x, camera.position.y + 8, camera.position.z), new THREE.Vector3(0, -1, 0))
    const groundHit = parkingGroundRaycaster.intersectObject(parkingLotRoot, true).find((intersection) => intersection.point.y <= camera.position.y + 0.7)
    if (groundHit) {
      const groundCameraHeight = groundHit.point.y + playerHeight
      const groundGap = camera.position.y - groundCameraHeight
      if (groundGap >= -0.3 && groundGap <= 0.08) {
        hasGround = true
        camera.position.y = groundCameraHeight
        verticalVelocity = 0
        isGrounded = true
        lastSafePlayerPosition.copy(camera.position)
        hasSafePlayerPosition = true
      }
    }
  }
  if (!hasGround && verticalVelocity < 0 && camera.position.y < playerHeight - 0.2 && hasSafePlayerPosition) {
    camera.position.copy(lastSafePlayerPosition)
    verticalVelocity = 0
    isGrounded = true
  }
  const playerHeightBounds = new THREE.Vector2(camera.position.y - 0.8, camera.position.y + 0.8)
  const nearbyObstacles = getNearbyParkingObstacles()
  for (const obstacle of nearbyObstacles) {
    if (playerHeightBounds.x >= obstacle.max.y || playerHeightBounds.y <= obstacle.min.y) continue
    const overlapsX = camera.position.x > obstacle.min.x - playerRadius && camera.position.x < obstacle.max.x + playerRadius
    const overlapsZ = camera.position.z > obstacle.min.z - playerRadius && camera.position.z < obstacle.max.z + playerRadius
    if (!overlapsX || !overlapsZ) continue
    const pushLeft = camera.position.x - (obstacle.min.x - playerRadius)
    const pushRight = (obstacle.max.x + playerRadius) - camera.position.x
    const pushFront = camera.position.z - (obstacle.min.z - playerRadius)
    const pushBack = (obstacle.max.z + playerRadius) - camera.position.z
    const smallestPush = Math.min(pushLeft, pushRight, pushFront, pushBack)
    if (smallestPush === pushLeft) camera.position.x = obstacle.min.x - playerRadius
    else if (smallestPush === pushRight) camera.position.x = obstacle.max.x + playerRadius
    else if (smallestPush === pushFront) camera.position.z = obstacle.min.z - playerRadius
    else camera.position.z = obstacle.max.z + playerRadius
  }
}

function movePlayerWithCollision(distance: THREE.Vector3): void {
  const distanceLength = distance.length()
  const stepCount = Math.max(1, Math.ceil(distanceLength / 0.08))
  const step = distance.clone().multiplyScalar(1 / stepCount)
  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    const rightStep = new THREE.Vector3(step.x, 0, 0)
    const forwardStep = new THREE.Vector3(0, 0, step.z)
    if (!parkingLotRoot || !isParkingWallAhead(rightStep)) {
      controls.moveRight(rightStep.x)
      resolveParkingCollision()
    }
    if (!parkingLotRoot || !isParkingWallAhead(forwardStep)) {
      controls.moveForward(forwardStep.z)
      resolveParkingCollision()
    }
  }
}

function isParkingWallAhead(step: THREE.Vector3): boolean {
  if (!parkingLotRoot) return false
  const cameraForward = new THREE.Vector3()
  const cameraRight = new THREE.Vector3()
  camera.getWorldDirection(cameraForward)
  cameraForward.y = 0
  cameraForward.normalize()
  cameraRight.setFromMatrixColumn(camera.matrixWorld, 0)
  cameraRight.y = 0
  cameraRight.normalize()
  const horizontalStep = cameraRight.multiplyScalar(step.x).add(cameraForward.multiplyScalar(step.z))
  const distance = horizontalStep.length()
  if (distance === 0) return false
  horizontalStep.normalize()
  const sampleHeights = [camera.position.y - 1.8, camera.position.y - 0.8, camera.position.y + 0.2]
  for (const sampleHeight of sampleHeights) {
    parkingWallRaycaster.set(new THREE.Vector3(camera.position.x, sampleHeight, camera.position.z), horizontalStep)
    parkingWallRaycaster.far = distance + 0.42
    const hit = parkingWallRaycaster.intersectObject(parkingLotRoot, true)[0]
    if (hit && hit.distance <= distance + 0.18) return true
  }
  return false
}

const targetRadius = 0.72
const target = new THREE.Object3D()
const gridTargetA = new THREE.Object3D()
const gridTargetB = new THREE.Object3D()
const gridTargets: THREE.Object3D[] = []
let currentTargetScaleMultiplier = targetSizeMultiplier
function isSnipingMode(mode: ShootingMode = shootingMode): boolean {
  return mode.endsWith('precision')
}
function updatePrecisionTargetScale(): void {
  currentTargetScaleMultiplier = targetSizeMultiplier * (isSnipingMode() ? 0.55 : 1)
  gridTargets.forEach((gridTarget) => gridTarget.scale.setScalar(currentTargetScaleMultiplier))
}
const previousTargetPositions = gridTargets.map((gridTarget) => gridTarget.position.clone())
const targetCollisionSample = new THREE.Vector3()
gridTargetA.visible = false
gridTargetB.visible = false

const targetPathCenter = new THREE.Vector3()
const targetPathSample = new THREE.Vector3()
const targetPath = new THREE.CatmullRomCurve3([], true, 'catmullrom', 0.5)
let targetPathSeed = 0
let targetPathStartedAt = 0
let targetPathSpeed = 0.11
const trackingCenter = new THREE.Vector3()
const trackingVelocity = new THREE.Vector3()
const fallingVelocity = new THREE.Vector3()
let strafetrackDirection = 1
let strafetrackSwitchAt = 0
let fallingRespawnAt = 0
const trackingBounds = { x: 4.2, y: 0, z: 0 }
const microshotPositions = [
  new THREE.Vector3(-3, 2.2, -8), new THREE.Vector3(0, 3.4, -9), new THREE.Vector3(3, 2.4, -8),
  new THREE.Vector3(-2.5, 1.2, -10), new THREE.Vector3(2.4, 1.4, -10),
]
const targetSpawnForward = new THREE.Vector3()
const targetSpawnRight = new THREE.Vector3()
const targetSpawnUp = new THREE.Vector3()
const targetSpawnPosition = new THREE.Vector3()
const gridAnchor = new THREE.Group()
const gridCenter = new THREE.Vector3()
const gridLocalPosition = new THREE.Vector3()
const gridCellIndices = [0, 1, 2]
const gridCells = Array.from({ length: 9 }, (_, index) => index)
let reflexRespawnCall: gsap.core.Tween | null = null
let reflexHideCall: gsap.core.Tween | null = null
let reflexRespawnAt = 0
let reflexHideAt = 0
scene.add(gridAnchor)

function updateGridLayout(): void {
  gridAnchor.position.copy(gridCenter)
  camera.getWorldPosition(targetSpawnPosition)
  targetSpawnPosition.y = gridCenter.y
  gridAnchor.lookAt(targetSpawnPosition)
  gridTargets.forEach((gridTarget, targetIndex) => {
    const cell = gridCellIndices[targetIndex]
    const column = cell % 3 - 1
    const row = 1 - Math.floor(cell / 3)
    gridLocalPosition.set(column * 2.1, row * 2.1, 0)
    gridTarget.position.copy(gridCenter).add(gridLocalPosition.applyQuaternion(gridAnchor.quaternion))
  })
}

function resetGridTargets(): void {
  camera.getWorldDirection(targetSpawnForward)
  camera.getWorldPosition(gridCenter)
  gridCenter.addScaledVector(targetSpawnForward, isSnipingMode() ? 34 : 18)
  gridCenter.y = Math.max(gridCenter.y, targetRadius + 0.15 + 2.1)
  const shuffledCells = [...gridCells].sort(() => Math.random() - 0.5)
  gridCellIndices.splice(0, gridCellIndices.length, ...shuffledCells.slice(0, gridTargets.length))
  updateGridLayout()
}

function moveGridTargetToRandomCell(hitTarget: typeof target): void {
  const targetIndex = gridTargets.indexOf(hitTarget)
  const occupiedCells = new Set(gridCellIndices)
  occupiedCells.delete(gridCellIndices[targetIndex])
  const freeCells = gridCells.filter((cell) => !occupiedCells.has(cell))
  gridCellIndices[targetIndex] = freeCells[Math.floor(Math.random() * freeCells.length)]
  updateGridLayout()
}

function snapshotTargetPositions(): void {
  gridTargets.forEach((gridTarget, targetIndex) => {
    previousTargetPositions[targetIndex].copy(gridTarget.position)
  })
}

function getRandomVisibleTargetPosition(distanceMin = 14, distanceRange = 22, spread = 1): THREE.Vector3 {
  camera.updateMatrixWorld()
  camera.getWorldPosition(targetSpawnPosition)
  camera.getWorldDirection(targetSpawnForward)
  targetSpawnRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
  targetSpawnUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize()

  const distance = distanceMin + Math.random() * distanceRange
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance
  const halfWidth = halfHeight * camera.aspect
  const horizontalMargin = Math.min(2.4, halfWidth * 0.65)
  const verticalMargin = Math.min(1.3, halfHeight * 0.65)
  const horizontalOffset = (Math.random() * 2 - 1) * Math.max(0, halfWidth - horizontalMargin) * spread
  const verticalOffset = (Math.random() * 2 - 1) * Math.max(0, halfHeight - verticalMargin) * spread

  targetSpawnPosition
    .addScaledVector(targetSpawnForward, distance)
    .addScaledVector(targetSpawnRight, horizontalOffset)
    .addScaledVector(targetSpawnUp, verticalOffset)
  targetSpawnPosition.y = THREE.MathUtils.clamp(targetSpawnPosition.y, targetRadius + 0.15 + 0.55, 5.5)
  return targetSpawnPosition.clone()
}

function getNearbyPrecisionTargetPosition(origin: THREE.Vector3): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2
  const distance = 2.5 + Math.random() * 3.5
  targetSpawnPosition.set(
    origin.x + Math.cos(angle) * distance,
    origin.y + (Math.random() - 0.5) * 3,
    origin.z + Math.sin(angle) * distance,
  )
  targetSpawnPosition.y = THREE.MathUtils.clamp(targetSpawnPosition.y, targetRadius + 0.15, 5.5)
  return targetSpawnPosition.clone()
}

function clearReflexTimers(): void {
  reflexRespawnCall?.kill()
  reflexHideCall?.kill()
  reflexRespawnCall = null
  reflexHideCall = null
}

function scheduleReflexTarget(position: THREE.Vector3): void {
  clearReflexTimers()
  target.position.copy(position)
  target.visible = false
  reflexRespawnAt = clock.getElapsedTime() + 0.5 + Math.random() * 1.5
  reflexHideAt = 0
}

function updateReflexTarget(elapsed: number): void {
  if (target.visible && elapsed >= reflexHideAt) {
    scheduleReflexTarget(getRandomVisibleTargetPosition(isSnipingMode() ? 30 : 16, isSnipingMode() ? 20 : 12, 0.58))
    return
  }
  if (!target.visible && elapsed >= reflexRespawnAt) {
    target.visible = true
    reflexHideAt = elapsed + 0.5
  }
}

function rebuildTargetPath(center: THREE.Vector3, startTime = 0): void {
  targetPathCenter.copy(center)
  targetPathSeed = Math.random() * Math.PI * 2
  targetPathStartedAt = startTime
  targetPath.points = [
    new THREE.Vector3(center.x - 1.2, center.y + 0.35, center.z + 0.7),
    new THREE.Vector3(center.x + 1.1, center.y + 0.65, center.z + 0.4),
    new THREE.Vector3(center.x + 1.4, center.y - 0.3, center.z - 0.7),
    new THREE.Vector3(center.x - 0.9, center.y - 0.55, center.z - 0.8),
    new THREE.Vector3(center.x - 1.5, center.y + 0.1, center.z - 0.1),
  ]
}

function resetTrackingTarget(mode: ShootingMode): void {
  camera.getWorldDirection(targetSpawnForward)
  camera.getWorldPosition(trackingCenter)
  trackingCenter.addScaledVector(targetSpawnForward, mode === 'fallingtrack' ? 15 : 18)
  trackingCenter.y = mode === 'fallingtrack' ? 5.8 : targetRadius + 0.15
  if (mode === 'fallingtrack') {
    target.visible = true
    target.position.set(
      trackingCenter.x + (Math.random() - 0.5) * 2.2,
      trackingCenter.y + Math.random() * 1.8,
      trackingCenter.z + (Math.random() - 0.5) * 2.2,
    )
    fallingVelocity.set((Math.random() - 0.5) * fallingHorizontalForce, fallingLaunchSpeed, (Math.random() - 0.5) * fallingHorizontalForce)
    return
  }
  target.position.copy(trackingCenter)
  strafetrackDirection = Math.random() > 0.5 ? 1 : -1
  strafetrackSwitchAt = clock.getElapsedTime() + 0.35 + Math.random() * 1.4
  trackingVelocity.set(strafetrackDirection * trackingSpeed, 0, 0)
}

function updateTrackingTarget(delta: number, elapsed: number): void {
  if (shootingMode === 'strafetrack') {
    if (elapsed >= strafetrackSwitchAt) {
      strafetrackDirection *= -1
      strafetrackSwitchAt = elapsed + 0.35 + Math.random() * 1.4
      trackingVelocity.x = strafetrackDirection * trackingSpeed
    }
    target.position.x += trackingVelocity.x * delta
    if (Math.abs(target.position.x - trackingCenter.x) > trackingBounds.x) trackingVelocity.x *= -1
    target.position.y = trackingCenter.y
    target.position.z = trackingCenter.z
    target.lookAt(camera.position)
    return
  }
  if (shootingMode === 'spheretrack') {
    const orbitTime = elapsed * 1.35
    target.position.set(
      trackingCenter.x + Math.sin(orbitTime * 1.17) * 3.2 + Math.sin(orbitTime * 2.3) * 0.8,
      trackingCenter.y + Math.sin(orbitTime * 0.83) * 1.8 + Math.cos(orbitTime * 1.9) * 0.65,
      trackingCenter.z + Math.cos(orbitTime * 1.07) * 2.4 + Math.sin(orbitTime * 1.73) * 0.7,
    )
    target.lookAt(camera.position)
    return
  }
  if (shootingMode === 'fallingtrack') {
    if (!target.visible) {
      if (elapsed >= fallingRespawnAt) resetTrackingTarget('fallingtrack')
      return
    }
    fallingVelocity.y -= fallingGravity * delta
    target.position.addScaledVector(fallingVelocity, delta)
    if (target.position.y <= -targetRadius) {
      target.visible = false
      fallingRespawnAt = elapsed + fallingRespawnDelay
    }
  }
}

function setShootingMode(nextMode: ShootingMode): void {
  shootingMode = nextMode
  updatePrecisionTargetScale()
  applyWeaponSelection()
  clearReflexTimers()
  modeButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.mode === nextMode))
  gridTargets.forEach((gridTarget) => {
    gsap.killTweensOf(gridTarget)
    gridTarget.visible = nextMode === 'gridshot' || nextMode === 'gridshotprecision'
  })
  target.visible = true
  if (nextMode === 'gridshot' || nextMode === 'gridshotprecision') {
    resetGridTargets()
    return
  }
  if (nextMode === 'reflexshot' || nextMode === 'reflexshotprecision') {
    scheduleReflexTarget(getRandomVisibleTargetPosition(isSnipingMode() ? 30 : 16, isSnipingMode() ? 20 : 12, 0.58))
    return
  }
  if (nextMode === 'strafetrack' || nextMode === 'spheretrack' || nextMode === 'fallingtrack') {
    resetTrackingTarget(nextMode)
    return
  }
  const nextCenter = nextMode === 'microshot' || nextMode === 'microshotprecision'
    ? isSnipingMode() ? getRandomVisibleTargetPosition(30, 20, 0.72) : microshotPositions[Math.floor(Math.random() * microshotPositions.length)]
    : getRandomVisibleTargetPosition(isSnipingMode() ? 30 : 14, isSnipingMode() ? 20 : 22)
  targetPathSpeed = nextMode === 'flickshot' || nextMode === 'flickshotprecision' ? 0.075 : 0.11
  rebuildTargetPath(nextCenter, clock.getElapsedTime())
  target.position.copy(nextCenter)
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setShootingMode(button.dataset.mode as ShootingMode)
    closeMenu()
    controls.lock(rawInputEnabled)
  })
})

modeCategoryButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const category = button.dataset.modeCategory
    modeCategoryButtons.forEach((categoryButton) => categoryButton.classList.toggle('is-active', categoryButton === button))
    modeCategoryPanels.forEach((panel) => panel.classList.toggle('is-visible', panel.dataset.modePanel === category))
  })
})

rebuildTargetPath(target.position)

function updateTargetMovement(elapsed: number): void {
  if (shootingMode === 'gridshot' || shootingMode === 'gridshotprecision' || shootingMode === 'reflexshot' || shootingMode === 'reflexshotprecision' || shootingMode === 'strafetrack' || shootingMode === 'spheretrack' || shootingMode === 'fallingtrack') return
  const pathTime = ((elapsed - targetPathStartedAt) * targetPathSpeed) % 1
  targetPath.getPointAt(pathTime, targetPathSample)
  const noiseTime = elapsed * 1.7 + targetPathSeed
  const strafeX = Math.sin(noiseTime) * 0.42 + Math.sin(noiseTime * 2.37) * 0.16
  const strafeY = Math.sin(noiseTime * 0.83) * 0.3 + Math.cos(noiseTime * 1.91) * 0.12
  target.position.set(targetPathSample.x + strafeX, targetPathSample.y + strafeY, targetPathSample.z)
}

type Projectile = {
  body: RAPIER.RigidBody
  mesh: THREE.Mesh
  bornAt: number
  lastTrailAt: number
  previousPosition: THREE.Vector3
}

const projectiles: Projectile[] = []
const parkedCars: THREE.Object3D[] = []
const projectileMaterial = new THREE.MeshBasicMaterial({ color: '#fff1a3', fog: false })
const projectileGeometry = new THREE.SphereGeometry(0.035, 8, 8)
const projectileRadius = 0.035
const projectileLifetime = 3

function spawnProjectile(direction: THREE.Vector3): void {
  shotOrigin.copy(getMuzzleWorldPosition())
  const muzzleVelocity = projectileVelocity
  const bodyDescription = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(shotOrigin.x, shotOrigin.y, shotOrigin.z)
    .setLinvel(direction.x * muzzleVelocity, direction.y * muzzleVelocity, direction.z * muzzleVelocity)
    .setCcdEnabled(true)
  const body = physicsWorld.createRigidBody(bodyDescription)
  body.setGravityScale(gravityMultiplier, true)
  physicsWorld.createCollider(RAPIER.ColliderDesc.ball(projectileRadius).setDensity(1).setRestitution(0), body)
  const mesh = new THREE.Mesh(projectileGeometry, projectileMaterial)
  mesh.position.copy(shotOrigin)
  mesh.visible = false
  scene.add(mesh)
  const now = performance.now() / 1000
  projectiles.push({ body, mesh, bornAt: now, lastTrailAt: now, previousPosition: shotOrigin.clone() })
}

function updateProjectiles(now: number, delta: number): void {
  camera.getWorldPosition(cameraOrigin)
  physicsWorld.timestep = delta
  physicsWorld.step()
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index]
    const translation = projectile.body.translation()
    projectile.mesh.position.set(translation.x, translation.y, translation.z)
    if (projectile.mesh.position.distanceToSquared(cameraOrigin) > camera.far ** 2) {
      physicsWorld.removeRigidBody(projectile.body)
      scene.remove(projectile.mesh)
      projectiles.splice(index, 1)
      continue
    }
    if (projectile.mesh.position.y > projectileRadius + 0.08 && now - projectile.lastTrailAt > 0.045) {
      createTracer(projectile.mesh.position)
      projectile.lastTrailAt = now
    }
    const projectilePosition = projectile.mesh.position
    const projectileTravel = projectilePosition.clone().sub(projectile.previousPosition)
    const travelDistance = projectileTravel.length()
    let parkingSurfaceHit: THREE.Intersection<THREE.Object3D> | undefined
    let matryoshkaHit: { mob: MatryoshkaMob; hit: THREE.Intersection<THREE.Object3D> } | undefined
    if (travelDistance > 0) {
      parkingProjectileRaycaster.set(projectile.previousPosition, projectileTravel.normalize())
      parkingProjectileRaycaster.far = travelDistance + projectileRadius
      const parkingLotHit = parkingLotRoot ? parkingProjectileRaycaster.intersectObject(parkingLotRoot, true)[0] : undefined
      const parkedCarHit = parkedCars.length > 0 ? parkingProjectileRaycaster.intersectObjects(parkedCars, true)[0] : undefined
      const candidateHits = [parkingLotHit, parkedCarHit].filter((hit): hit is THREE.Intersection<THREE.Object3D> => Boolean(hit))
      parkingSurfaceHit = candidateHits.sort((a, b) => a.distance - b.distance)[0]
      for (const mob of matryoshkaMobs) {
        if (mob.knockedDownAt > 0) continue
        const mobHit = parkingProjectileRaycaster.intersectObject(mob.object, true)[0]
        if (mobHit && (!matryoshkaHit || mobHit.distance < matryoshkaHit.hit.distance)) matryoshkaHit = { mob, hit: mobHit }
      }
    }
    projectile.previousPosition.copy(projectilePosition)
    const hitFloor = translation.y <= projectileRadius + 0.01
    if (matryoshkaHit && (!parkingSurfaceHit || matryoshkaHit.hit.distance <= parkingSurfaceHit.distance)) {
      const impactNormal = matryoshkaHit.hit.face
        ? matryoshkaHit.hit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(matryoshkaHit.hit.object.matrixWorld)).normalize()
        : new THREE.Vector3(0, 1, 0)
      createImpactSpark(matryoshkaHit.hit.point, impactNormal, projectileTravel.normalize())
      knockDownMatryoshkaMob(matryoshkaHit.mob, now, projectileTravel)
    } else if (parkingSurfaceHit) {
      const impactNormal = parkingSurfaceHit.face
        ? parkingSurfaceHit.face.normal.clone().applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(parkingSurfaceHit.object.matrixWorld)).normalize()
        : new THREE.Vector3(0, 1, 0)
      createImpactSpark(parkingSurfaceHit.point, impactNormal, projectileTravel.normalize())
    } else if (hitFloor) createImpactSpark(projectilePosition, new THREE.Vector3(0, 1, 0), projectileTravel.normalize())
    if (matryoshkaHit || parkingSurfaceHit || hitFloor || now - projectile.bornAt > projectileLifetime) {
      physicsWorld.removeRigidBody(projectile.body)
      scene.remove(projectile.mesh)
      projectiles.splice(index, 1)
    }
  }
}

const shotDirection = new THREE.Vector3()
const shotOrigin = new THREE.Vector3()
const cameraOrigin = new THREE.Vector3()
const aimPoint = new THREE.Vector3()
const cameraRight = new THREE.Vector3()
const cameraUp = new THREE.Vector3()
const impactOffset = new THREE.Vector3()
const projectileAimDistance = 45

function registerTargetHit(hitTarget: typeof target): void {
  if (hitVfxEnabled) {
    gsap.killTweensOf(hitMarker)
    gsap.fromTo(hitMarker, { opacity: 1, scale: 0.82 }, { opacity: 0, scale: 1, duration: hitMarkerDuration, ease: 'power2.out' })
  }
  if (shootingMode === 'strafetrack' || shootingMode === 'spheretrack' || shootingMode === 'fallingtrack') {
    return
  }
  if (shootingMode === 'gridshot' || shootingMode === 'gridshotprecision') {
    moveGridTargetToRandomCell(hitTarget)
  } else if (shootingMode === 'reflexshot' || shootingMode === 'reflexshotprecision') {
    impactOffset.copy(getRandomVisibleTargetPosition(isSnipingMode() ? 30 : 16, isSnipingMode() ? 20 : 12, 0.58))
    scheduleReflexTarget(impactOffset)
  } else if (shootingMode === 'microshot' || shootingMode === 'microshotprecision') {
    impactOffset.copy(shootingMode === 'microshotprecision'
      ? getNearbyPrecisionTargetPosition(hitTarget.position)
      : microshotPositions[Math.floor(Math.random() * microshotPositions.length)])
    rebuildTargetPath(impactOffset, clock.getElapsedTime())
    target.position.copy(impactOffset)
    target.visible = false
    gsap.delayedCall(0.28, () => {
      if (shootingMode === 'microshot' || shootingMode === 'microshotprecision') target.visible = true
    })
  } else {
    impactOffset.copy(getRandomVisibleTargetPosition(14, 22))
    rebuildTargetPath(impactOffset, clock.getElapsedTime())
    target.position.copy(impactOffset)
    target.visible = false
    gsap.delayedCall(0.28, () => {
      if (shootingMode === 'flickshot' || shootingMode === 'flickshotprecision') target.visible = true
    })
  }
}

function createTracer(_position: THREE.Vector3): void {
  return
}

function createImpactSpark(position: THREE.Vector3, normal: THREE.Vector3, incomingDirection?: THREE.Vector3): void {
  if (!hitVfxEnabled) return
  const surfaceNormal = normal.clone().normalize()
  const tangent = new THREE.Vector3().crossVectors(surfaceNormal, Math.abs(surfaceNormal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize()
  const bitangent = new THREE.Vector3().crossVectors(surfaceNormal, tangent).normalize()
  const incident = incomingDirection ? incomingDirection.clone().normalize() : new THREE.Vector3()
  const reflection = incident.lengthSq() > 0
    ? incident.clone().sub(surfaceNormal.clone().multiplyScalar(2 * incident.dot(surfaceNormal)))
    : new THREE.Vector3()
  const reflectedDirection = reflection.lengthSq() > 0 ? reflection.normalize() : surfaceNormal.clone()

  for (let index = 0; index < 10; index += 1) {
    const spark = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.008, 0.008),
      new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? '#ffd166' : '#ff7a45', transparent: true, opacity: 0.95, fog: false }),
    )
    const sparkMaterial = spark.material as THREE.MeshBasicMaterial
    const angle = (index / 10) * Math.PI * 2
    const distance = 0.22 + Math.random() * 0.18
    const jitter = tangent.clone().multiplyScalar((Math.random() - 0.5) * 0.55).addScaledVector(bitangent, (Math.random() - 0.5) * 0.55)
    const spreadDirection = reflectedDirection.clone().add(jitter).normalize()
    const spread = spreadDirection.multiplyScalar(distance)
    const lift = surfaceNormal.clone().multiplyScalar(0.04 + Math.random() * 0.08)
    const start = position.clone().addScaledVector(surfaceNormal, 0.02)
    const end = position.clone().add(spread).add(lift)

    spark.position.copy(start)
    spark.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), end.clone().sub(start).normalize())
    scene.add(spark)

    gsap.to(spark.position, {
      x: end.x,
      y: end.y,
      z: end.z,
      duration: 0.06 + Math.random() * 0.03,
      ease: 'power1.out',
    })
    gsap.to(spark.scale, { x: 1.8, y: 1, z: 1, duration: 0.08, ease: 'power1.out' })
    gsap.to(sparkMaterial, { opacity: 0, duration: 0.12 + Math.random() * 0.04, onComplete: () => {
      scene.remove(spark)
      spark.geometry.dispose()
      sparkMaterial.dispose()
    } })
  }
}

function fireShot(): void {
  if (trueCarEntered) return
  playGunshot()
  applyRecoil()
  shotOrigin.copy(getMuzzleWorldPosition())
  camera.getWorldPosition(cameraOrigin)
  alertMatryoshkasToSound(cameraOrigin, 'player', true)
  camera.getWorldDirection(shotDirection)
  cameraRight.setFromMatrixColumn(camera.matrixWorld, 0)
  cameraUp.setFromMatrixColumn(camera.matrixWorld, 1)
  aimPoint.copy(cameraOrigin).addScaledVector(shotDirection, projectileAimDistance)
  const movingAtShot = controls.isLocked && (keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD'))
  const airborneAtShot = controls.isLocked && camera.position.y > playerHeight + 0.05
  const shotSpread = getShotSpread(movingAtShot, airborneAtShot)
  const horizontalSpread = (Math.random() - 0.5) * shotSpread * projectileAimDistance
  const verticalSpread = (Math.random() - 0.5) * shotSpread * projectileAimDistance
  aimPoint.addScaledVector(cameraRight, horizontalSpread)
  aimPoint.addScaledVector(cameraUp, verticalSpread)
  shotDirection.copy(aimPoint).sub(shotOrigin).normalize()
  spawnProjectile(shotDirection)
}

function resizeRenderer(): void {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

window.addEventListener('resize', resizeRenderer)
resizeRenderer()

const clock = new THREE.Clock()
let weaponSwayFactor = 0
let movementBobPhase = 0
let cameraBobOffset = 0
const cameraBobAxis = new THREE.Vector3(0, 0, 1)
const cameraBobQuaternion = new THREE.Quaternion()
let lastFrameAt = 0
function render(): void {
  const frameNow = performance.now()
  if (maxFps > 0 && frameNow - lastFrameAt < 1000 / maxFps) return
  lastFrameAt = frameNow
  const delta = Math.min(clock.getDelta(), 0.05)
  const elapsed = clock.getElapsedTime()
  if (!cameraBobQuaternion.equals(new THREE.Quaternion())) {
    camera.quaternion.multiply(cameraBobQuaternion.invert())
    cameraBobQuaternion.identity()
  }
  camera.position.y -= cameraBobOffset
  cameraBobOffset = 0
  updateProjectiles(performance.now() / 1000, delta)
  updateMatryoshkaMobs(performance.now() / 1000, delta)
  if (playerDeathActive) {
    playerDeathElapsed = Math.min(playerDeathElapsed + delta, 1.2)
    const deathProgress = 1 - Math.exp(-5 * playerDeathElapsed)
    camera.position.copy(playerDeathStartPosition)
    camera.position.y -= 2.1 * deathProgress
    playerDeathRotation.setFromEuler(new THREE.Euler(-1.42 * deathProgress, 0, 0.78 * deathProgress))
    camera.quaternion.copy(playerDeathStartQuaternion).multiply(playerDeathRotation)
    renderer.render(scene, camera)
    return
  }

  movement.set(0, 0, 0)
  if (controls.isLocked && !trueCarEntered && !startScreen.classList.contains('is-visible')) {
    direction.set(Number(keys.has('KeyD')) - Number(keys.has('KeyA')), 0, Number(keys.has('KeyW')) - Number(keys.has('KeyS')))
    if (direction.lengthSq() > 0) {
      direction.normalize()
      const isRunning = keys.has('KeyW') && (keys.has('ShiftLeft') || keys.has('ShiftRight'))
      movement.copy(direction).multiplyScalar((isRunning ? playerRunSpeed : playerWalkSpeed) * delta)
      movePlayerWithCollision(movement)
    }

    isGrounded = false
    verticalVelocity -= gravity * delta
    camera.position.y += verticalVelocity * delta
    if (!parkingBounds && camera.position.y < playerHeight) {
      camera.position.y = playerHeight
      verticalVelocity = 0
      isGrounded = true
    }
  }
  if (trueCarEntered) updateTrueCarSeatPosition()
  else resolveParkingCollision()
  if (trueCarEntered && trueCar && Number.isFinite(carEndingShakeStartedAt)) {
    const shakeElapsed = performance.now() / 1000 - carEndingShakeStartedAt
    const shake = carEndingShakePeaks.reduce((amount, peak) => {
      const peakElapsed = shakeElapsed - peak
      return amount + Math.exp(-((peakElapsed / 0.16) ** 2))
    }, 0)
    trueCar.position.copy(carEndingBasePosition).add(new THREE.Vector3(Math.sin(shakeElapsed * 42) * shake * 0.28, Math.abs(Math.sin(shakeElapsed * 36)) * shake * 0.12, 0))
    carEndingShakeQuaternion.setFromAxisAngle(carEndingShakeAxis, Math.sin(shakeElapsed * 48) * shake * 0.12)
    trueCar.quaternion.copy(carEndingBaseQuaternion).multiply(carEndingShakeQuaternion)
  }
  updateInfiniteFloor()
  updateKeyInteractionPrompt()
  updateTrueCarSoundIndicator()

  const isMoving = controls.isLocked && direction.lengthSq() > 0
  const isRunning = isMoving && keys.has('KeyW') && (keys.has('ShiftLeft') || keys.has('ShiftRight'))
  if (isRunning) {
    playRunningSound()
    if (elapsed - lastFootstepSoundAt >= 0.18) {
      alertMatryoshkasToSound(camera.position)
      lastFootstepSoundAt = elapsed
    }
  } else {
    stopRunningSound()
  }
  if (isMoving) movementBobPhase += delta * (isRunning ? Math.PI * 2 / runningFootstepInterval : 7)
  else movementBobPhase += delta * 2
  if (controls.isLocked && !trueCarEntered && isRunning) {
    const bobStrength = 0.075
    cameraBobOffset = Math.sin(movementBobPhase) * bobStrength
    camera.position.y += cameraBobOffset
    const bobRoll = Math.sin(movementBobPhase) * (isRunning ? 0.018 : 0.006)
    cameraBobQuaternion.setFromAxisAngle(cameraBobAxis, bobRoll)
    camera.quaternion.multiply(cameraBobQuaternion)
  } else if (cameraBobQuaternion.angleTo(new THREE.Quaternion()) > 0.0001) {
    cameraBobQuaternion.slerp(new THREE.Quaternion(), Math.min(1, delta * 12))
    camera.quaternion.multiply(cameraBobQuaternion)
  }
  const isAirborne = controls.isLocked && camera.position.y > playerHeight + 0.05
  const stationarySpreadPixels = getSpreadPixels(false, false)
  const dynamicSpreadPixels = getSpreadPixels(isMoving, isAirborne)
  const sprintSpreadPixels = getSpreadPixels(true, false)
  const spreadPixels = isRunning
    ? sprintSpreadPixels
    : crosshairDynamicEnabled
      ? stationarySpreadPixels + (dynamicSpreadPixels - stationarySpreadPixels) * crosshairDynamicStrength
      : stationarySpreadPixels
  const configuredGapScale = Number(crosshairGapSetting.value) / 14
  const crosshairGap = spreadPixels * configuredGapScale
  crosshair.style.setProperty('--crosshair-gap', `${crosshairGap}px`)
  weaponSwayFactor += ((isMoving ? 1 : 0) - weaponSwayFactor) * Math.min(1, delta * 10)
  const swayAmount = weaponSwayFactor * (aiming ? 0.003 : 0.008) * (isRunning ? 0.75 : 1)
  const weaponSwayRate = isRunning ? 5 : 7
  const recoilEase = 1 - Math.exp(-38 * delta)
  const recoilPitchStep = (recoilPitch - appliedRecoilPitch) * recoilEase
  if (Math.abs(recoilPitchStep) > 0.000001) {
    recoilRotation.setFromAxisAngle(recoilLocalAxis, recoilPitchStep)
    camera.quaternion.multiply(recoilRotation).normalize()
    appliedRecoilPitch += recoilPitchStep
  }
  weaponRecoilVisual += (weaponRecoilPitch - weaponRecoilVisual) * (1 - Math.exp(-42 * delta))
  const weaponKick = weaponRecoilVisual * 0.8
  weapon.position.set(
    weaponPosition.x + Math.sin(movementBobPhase * weaponSwayRate / 7) * swayAmount,
    weaponPosition.y + Math.cos(movementBobPhase * weaponSwayRate / 7 * 0.5) * swayAmount * 0.65 + weaponKick * 0.45,
    weaponPosition.z,
  )
  weapon.rotation.set(
    weaponRotation.x + weaponRecoilPitch * 0.8,
    weaponRotation.y,
    weaponRotation.z,
  )
  if (recoilMode === 'recover') recoilPitch *= Math.exp(-9 * delta)
  weaponRecoilPitch *= Math.exp(-16 * delta)

  renderer.render(scene, camera)
}

antialiasingSetting.addEventListener('change', () => {
  if (restoringSettings) return
  saveSettings()
  window.location.reload()
})

restoreSettings()
applyWeaponSelection()
renderer.setAnimationLoop(render)
