/// <reference lib="webworker" />
// Runs the background scene on an OffscreenCanvas, off the main thread.
import * as THREE from "three";
import { createScene, type SceneCtl } from "./neuralScene";

let ctl: SceneCtl | null = null;
self.onmessage = (e: MessageEvent) => {
  const m = e.data || {};
  try {
    switch (m.type) {
      case "init": ctl = createScene(THREE, m.canvas, m.opts); break;
      case "resize": ctl?.resize(m.w, m.h); break;
      case "pointer": ctl?.pointer(m.x, m.y); break;
      case "still": ctl?.setStill(!!m.v); break;
      case "hidden": ctl?.setHidden(!!m.v); break;
      case "scrolling": ctl?.setScrolling(!!m.v); break;
      case "dispose": ctl?.dispose(); ctl = null; break;
    }
  } catch (err) {
    (self as any).postMessage({ type: "fail", message: String((err as Error)?.message || err) });
  }
};
