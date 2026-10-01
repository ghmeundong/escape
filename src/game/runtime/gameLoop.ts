import type { PerspectiveCamera, WebGLRenderer } from "three";

export function resizeRenderer(
  renderer: WebGLRenderer,
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
): void {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function bindRendererResize(
  renderer: WebGLRenderer,
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
): void {
  const handleResize = (): void => resizeRenderer(renderer, camera, canvas);
  window.addEventListener("resize", handleResize);
  handleResize();
}

export function startGameLoop(
  renderer: WebGLRenderer,
  renderFrame: () => void,
): void {
  renderer.setAnimationLoop(renderFrame);
}
