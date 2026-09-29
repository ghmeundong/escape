import * as THREE from "three";

export type PreviewSceneSetup = {
  canvas: HTMLCanvasElement;
  button: HTMLButtonElement;
  episodeScreen: HTMLElement;
  getRoot: () => THREE.Object3D | null;
  background: string;
  hemisphere: string;
  lightColor: string;
  lightPosition: THREE.Vector3;
  cameraPosition: THREE.Vector3;
  lookAt: THREE.Vector3;
};

export function setupPreviewScene(config: PreviewSceneSetup): void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.background);
  scene.add(new THREE.HemisphereLight(config.hemisphere, "#111619", 2.4));

  const light = new THREE.DirectionalLight(config.lightColor, 3.5);
  light.position.copy(config.lightPosition);
  scene.add(light);

  const camera = new THREE.PerspectiveCamera(38, 1, 1, 600);
  camera.position.copy(config.cameraPosition);
  camera.lookAt(config.lookAt);

  const renderer = new THREE.WebGLRenderer({
    canvas: config.canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(1);

  const group = new THREE.Group();
  scene.add(group);

  let ready = false;
  let lastFrameAt = 0;

  renderer.setAnimationLoop(() => {
    if (!config.episodeScreen.classList.contains("is-visible")) return;

    const now = performance.now();
    const previewFrameInterval = config.button.matches(":hover") ? 16 : 100;
    if (now - lastFrameAt < previewFrameInterval) return;
    lastFrameAt = now;

    const width = config.canvas.clientWidth;
    const height = config.canvas.clientHeight;
    if (!width || !height) return;

    renderer.setSize(
      Math.max(160, Math.floor(width * 0.75)),
      Math.max(160, Math.floor(height * 0.75)),
      false,
    );
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    if (!ready) {
      const root = config.getRoot();
      if (root) {
        const clone = root.clone(true);
        clone.position.set(0, 0, 0);
        group.add(clone);
        ready = true;
      }
    }

    group.rotation.y += 0.0015;
    renderer.render(scene, camera);
  });
}
