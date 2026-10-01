import RAPIER from "@dimforge/rapier3d-compat";
import "./style.css";

async function init(): Promise<void> {
  await RAPIER.init();
  await import("./game/escapeGame");
}

await init();
