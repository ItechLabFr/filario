"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";

export function ModelViewer({ src, title }: { src: string; title: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    setError("");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 5000);
    camera.position.set(180, 140, 180);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 20;
    controls.maxDistance = 1500;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x5a6470, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(160, 220, 140);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x88ffe8, 1.1);
    fill.position.set(-150, 80, -120);
    scene.add(fill);

    const grid = new THREE.GridHelper(400, 20, 0x71807e, 0x394443);
    grid.material.opacity = 0.22;
    grid.material.transparent = true;
    scene.add(grid);

    let loadedObject: THREE.Object3D | null = null;
    let frame = 0;

    function resize() {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(320, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function frameObject(object: THREE.Object3D) {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      object.position.sub(center);
      object.position.y += size.y / 2;

      const maxSize = Math.max(size.x, size.y, size.z, 1);
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const distance = (maxSize / (2 * Math.tan(fov / 2))) * 1.65;
      camera.position.set(distance, distance * 0.75, distance);
      camera.near = Math.max(0.1, distance / 100);
      camera.far = distance * 20;
      camera.updateProjectionMatrix();
      controls.target.set(0, size.y * 0.15, 0);
      controls.update();
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const loader = new ThreeMFLoader();
    loader.load(
      src,
      (object) => {
        loadedObject = object;
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            for (const material of materials) {
              if (material && "roughness" in material) {
                (material as THREE.MeshStandardMaterial).roughness = 0.5;
                (material as THREE.MeshStandardMaterial).metalness = 0.05;
              }
            }
          }
        });
        scene.add(object);
        frameObject(object);
      },
      undefined,
      () => setError("Impossible d’afficher l’aperçu 3D de ce fichier.")
    );

    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      if (loadedObject) {
        loadedObject.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => material?.dispose());
          }
        });
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src]);

  return (
    <div className="model-viewer-shell">
      <div ref={hostRef} className="model-viewer" role="img" aria-label={`Aperçu 3D de ${title}`} />
      <div className="model-viewer-hint">Glisser pour tourner · Molette pour zoomer</div>
      {error && <div className="error model-viewer-error">{error}</div>}
    </div>
  );
}
