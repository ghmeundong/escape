import fs from "node:fs";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

globalThis.ProgressEvent ??= class {
  constructor(type, props = {}) {
    this.type = type;
    this.lengthComputable = !!props.lengthComputable;
    this.loaded = props.loaded ?? 0;
    this.total = props.total ?? 0;
  }
};

const loader = new FBXLoader();

function inspect(path) {
  const raw = fs.readFileSync(path);
  const url = URL.createObjectURL(new Blob([raw]));
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (obj) => {
        console.log(`=== ${path} ===`);
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const box = new THREE.Box3().setFromObject(child);
            const size = box.getSize(new THREE.Vector3());
            console.log(
              `mesh: ${child.name || "(unnamed)"} size=${size
                .toArray()
                .map((v) => v.toFixed(2))
                .join(", ")} pos=${child.position
                .toArray()
                .map((v) => v.toFixed(2))
                .join(", ")}`,
            );
          }
        });
        URL.revokeObjectURL(url);
        resolve();
      },
      undefined,
      (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      },
    );
  });
}

await inspect("src/assets/parkingLot/parking.fbx");
await inspect("src/assets/car/Beetle+-+FBX.FBX");
