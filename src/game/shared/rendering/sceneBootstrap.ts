import * as THREE from "three";

export function setupEpisodePreviewScenes(params: {
  episodeScreen: HTMLElement;
  parkingLotEpisodeButton: HTMLButtonElement;
  parkingPreviewCanvas: HTMLCanvasElement;
  classroomEpisodeButton: HTMLButtonElement;
  classroomPreviewCanvas: HTMLCanvasElement;
  storeEpisodeButton: HTMLButtonElement;
  storePreviewCanvas: HTMLCanvasElement;
  parkingLotRoot: () => THREE.Object3D | null;
  parkedCars: () => THREE.Object3D[];
  classroomRoot: () => THREE.Object3D | null;
  classroomStudents: () => THREE.Object3D[];
  storeRoot: () => THREE.Object3D | null;
}): void {
  const parkingScene = new THREE.Scene();
  parkingScene.background = new THREE.Color("#10171a");
  parkingScene.add(new THREE.HemisphereLight("#dce6e2", "#111619", 2.4));
  const parkingLight = new THREE.DirectionalLight("#fff3d4", 3.5);
  parkingLight.position.set(-90, 140, 80);
  parkingScene.add(parkingLight);
  const parkingCamera = new THREE.PerspectiveCamera(38, 1, 1, 600);
  parkingCamera.position.set(36, 40, 36);
  parkingCamera.lookAt(0, 0, 0);

  const parkingRenderer = new THREE.WebGLRenderer({
    canvas: params.parkingPreviewCanvas,
    antialias: true,
    alpha: false,
  });
  parkingRenderer.setPixelRatio(1);
  const parkingGroup = new THREE.Group();
  parkingScene.add(parkingGroup);

  let parkingReady = false;
  let lastParkingFrameAt = 0;
  parkingRenderer.setAnimationLoop(() => {
    if (!params.episodeScreen.classList.contains("is-visible")) return;
    const now = performance.now();
    const interval = params.parkingLotEpisodeButton.matches(":hover")
      ? 16
      : 100;
    if (now - lastParkingFrameAt < interval) return;
    lastParkingFrameAt = now;

    const width = params.parkingPreviewCanvas.clientWidth;
    const height = params.parkingPreviewCanvas.clientHeight;
    if (!width || !height) return;

    parkingRenderer.setSize(
      Math.max(160, Math.floor(width * 0.75)),
      Math.max(160, Math.floor(height * 0.75)),
      false,
    );
    parkingCamera.aspect = width / height;
    parkingCamera.updateProjectionMatrix();

    if (!parkingReady) {
      const root = params.parkingLotRoot();
      const parkedCars = params.parkedCars();
      if (root && parkedCars.length > 0) {
        const clone = root.clone(true);
        parkingGroup.add(clone);
        parkedCars.forEach((car) => {
          const carClone = car.clone(true);
          carClone.visible = true;
          parkingGroup.add(carClone);
        });
        parkingReady = true;
      }
    }

    parkingGroup.rotation.y += 0.0015;
    parkingRenderer.render(parkingScene, parkingCamera);
  });

  const classroomScene = new THREE.Scene();
  classroomScene.background = new THREE.Color("#10171a");
  classroomScene.add(new THREE.HemisphereLight("#dfe9f8", "#111619", 2.2));
  const classroomLight = new THREE.DirectionalLight("#fff2d8", 3.2);
  classroomLight.position.set(-8, 12, 8);
  classroomScene.add(classroomLight);
  const classroomCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  classroomCamera.position.set(7.2, 5.6, 7.2);
  classroomCamera.lookAt(0, 2, 0);

  const classroomRenderer = new THREE.WebGLRenderer({
    canvas: params.classroomPreviewCanvas,
    antialias: true,
    alpha: false,
  });
  classroomRenderer.setPixelRatio(1);
  const classroomGroup = new THREE.Group();
  classroomScene.add(classroomGroup);

  let classroomReady = false;
  let classroomStudentsReady = false;
  let lastClassroomFrameAt = 0;
  classroomRenderer.setAnimationLoop(() => {
    if (!params.episodeScreen.classList.contains("is-visible")) return;
    const now = performance.now();
    const interval = params.classroomEpisodeButton.matches(":hover") ? 16 : 100;
    if (now - lastClassroomFrameAt < interval) return;
    lastClassroomFrameAt = now;

    const width = params.classroomPreviewCanvas.clientWidth;
    const height = params.classroomPreviewCanvas.clientHeight;
    if (!width || !height) return;

    classroomRenderer.setSize(
      Math.max(160, Math.floor(width * 0.75)),
      Math.max(160, Math.floor(height * 0.75)),
      false,
    );
    classroomCamera.aspect = width / height;
    classroomCamera.updateProjectionMatrix();

    if (!classroomReady) {
      const root = params.classroomRoot();
      if (root) {
        const clone = root.clone(true);
        clone.visible = true;
        clone.traverse((object) => {
          object.visible = true;
        });
        classroomGroup.add(clone);
        classroomReady = true;
      }
    }
    if (classroomReady && !classroomStudentsReady) {
      const students = params.classroomStudents();
      if (students.length > 0) {
        students.forEach((student) => {
          const studentClone = student.clone(true);
          studentClone.visible = true;
          studentClone.traverse((object) => {
            object.visible = true;
          });
          classroomGroup.add(studentClone);
        });
        classroomStudentsReady = true;
      }
    }

    classroomGroup.rotation.y += 0.0015;
    classroomRenderer.render(classroomScene, classroomCamera);
  });

  const storeScene = new THREE.Scene();
  storeScene.background = new THREE.Color("#10171a");
  storeScene.add(new THREE.HemisphereLight("#dce6e2", "#111619", 2.4));
  const storeLight = new THREE.DirectionalLight("#fff3d4", 3.5);
  storeLight.position.set(-5, 9, 7);
  storeScene.add(storeLight);
  const storeCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  storeCamera.position.set(7, 6, 7);
  storeCamera.lookAt(0, 2, 0);

  const storeRenderer = new THREE.WebGLRenderer({
    canvas: params.storePreviewCanvas,
    antialias: true,
    alpha: false,
  });
  storeRenderer.setPixelRatio(1);
  const storeGroup = new THREE.Group();
  storeScene.add(storeGroup);

  let storeReady = false;
  let lastStoreFrameAt = 0;
  storeRenderer.setAnimationLoop(() => {
    if (!params.episodeScreen.classList.contains("is-visible")) return;
    const now = performance.now();
    const interval = params.storeEpisodeButton.matches(":hover") ? 16 : 100;
    if (now - lastStoreFrameAt < interval) return;
    lastStoreFrameAt = now;

    const width = params.storePreviewCanvas.clientWidth;
    const height = params.storePreviewCanvas.clientHeight;
    if (!width || !height) return;

    storeRenderer.setSize(
      Math.max(160, Math.floor(width * 0.75)),
      Math.max(160, Math.floor(height * 0.75)),
      false,
    );
    storeCamera.aspect = width / height;
    storeCamera.updateProjectionMatrix();

    if (!storeReady) {
      const root = params.storeRoot();
      if (root) {
        const clone = root.clone(true);
        clone.position.set(0, 0, 0);
        storeGroup.add(clone);
        storeReady = true;
      }
    }

    storeGroup.rotation.y += 0.0015;
    storeRenderer.render(storeScene, storeCamera);
  });
}

export function setupMatryoshkaPreview(params: {
  canvas: HTMLCanvasElement;
  startScreen: HTMLElement;
  model: Promise<THREE.Object3D>;
}): void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#080b0d");
  scene.add(new THREE.HemisphereLight("#d9e0df", "#111519", 2.2));
  const light = new THREE.DirectionalLight("#fff4dc", 4);
  light.position.set(-3, 5, 4);
  scene.add(light);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 30);
  camera.position.set(0, 2.4, 8.5);
  camera.lookAt(0, 1.8, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas: params.canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(1);

  const group = new THREE.Group();
  scene.add(group);
  let lastFrameAt = 0;

  void params.model
    .then((model) => {
      const previewModel = model.clone(true);
      const bounds = new THREE.Box3().setFromObject(previewModel);
      const size = bounds.getSize(new THREE.Vector3());
      previewModel.scale.setScalar(5.4 / Math.max(size.y, 0.01));
      previewModel.updateMatrixWorld(true);
      const scaledBounds = new THREE.Box3().setFromObject(previewModel);
      previewModel.position.y -= scaledBounds.min.y;
      group.add(previewModel);
    })
    .catch((error: unknown) =>
      console.error("Failed to load Matryoshka preview.", error),
    );

  renderer.setAnimationLoop(() => {
    if (!params.startScreen.classList.contains("is-visible")) return;
    const now = performance.now();
    if (now - lastFrameAt < 33) return;
    lastFrameAt = now;

    const width = params.canvas.clientWidth;
    const height = params.canvas.clientHeight;
    if (!width || !height) return;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    group.rotation.y -= 0.006;
    renderer.render(scene, camera);
  });
}
