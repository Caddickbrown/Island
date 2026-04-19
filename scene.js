/**
 * Island Scene v2 — Solarpunk Town (Big Island with Topology)
 *
 * A ~600x600 island with rolling hills, distinct named areas,
 * path network, and surrounding sea. Built from simple Three.js
 * primitives with warm, cheerful colours. No textures.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Colour palette
// ---------------------------------------------------------------------------
const C = {
  sea:        0x3a9fbf,
  seaDeep:    0x2d7d9a,
  sand:       0xe8d5a3,
  grass:      0x6ab04c,
  grassDark:  0x4a8a30,
  path:       0xb89e5c,
  pathDark:   0xa68b4b,
  dock:       0x8b6914,
  // buildings
  bakery:     0xe17055,
  postOffice: 0x4a90d9,
  house1:     0xffeaa7,
  house2:     0xfdcb6e,
  house3:     0xf8e8d0,
  house4:     0xdfe6e9,
  house5:     0xfab1a0,
  library:    0xa29bfe,
  greenhouse: 0x55efc4,
  workshop:   0xb2bec3,
  barn:       0x8b4513,
  barnRoof:   0x6b3410,
  // details
  roof:       0xd63031,
  roofDark:   0x9b2226,
  door:       0x6d4c3d,
  solar:      0x2d3436,
  solarFrame: 0x636e72,
  trunk:      0x8b6914,
  foliage:    0x27ae60,
  foliageDark:0x1e8449,
  windmill:   0xf0f0f0,
  blade:      0xe0e0e0,
  field:      0x7dcea0,
  fieldRows:  0x5dae80,
  water:      0x74b9ff,
  white:      0xffffff,
  fence:      0x9e8a6e,
  boat:       0xc0392b,
  boatHull:   0xf5f0e8,
};

// ---------------------------------------------------------------------------
// Areas — named locations NPCs and player navigate between
// ---------------------------------------------------------------------------
export const AREAS = {
  TOWN_SQUARE:  { x: 0,    z: 0,    label: 'Town Square' },
  BAKERY:       { x: -60,  z: -40,  label: 'Bakery' },
  POST_OFFICE:  { x: 60,   z: -40,  label: 'Post Office' },
  DOCK:         { x: 0,    z: 220,  label: 'The Dock' },
  FARM:         { x: -180, z: 80,   label: 'The Farm' },
  FOREST:       { x: 180,  z: 120,  label: 'Forest Path' },
  HILLTOP:      { x: -100, z: -180, label: 'The Hilltop' },
  BEACH_SOUTH:  { x: 0,    z: -220, label: 'South Beach' },
  LIBRARY:      { x: 80,   z: 40,   label: 'Library' },
  WORKSHOP:     { x: -80,  z: 40,   label: 'Workshop' },
};

// ---------------------------------------------------------------------------
// Walkable island bounds
// ---------------------------------------------------------------------------
export const ISLAND_BOUNDS = {
  minX: -280,
  maxX:  280,
  minZ: -280,
  maxZ:  280,
};

// ---------------------------------------------------------------------------
// Terrain height function
// ---------------------------------------------------------------------------
const ISLAND_RADIUS = 300;

export function getHeight(x, z) {
  const nx = x / 300;
  const nz = z / 300;

  // Base rolling hills
  let h = (
    Math.sin(nx * 2.1) * Math.cos(nz * 1.8) * 12 +
    Math.sin(nx * 4.3 + 1.2) * Math.cos(nz * 3.7) * 6 +
    Math.sin(nx * 8.1) * Math.cos(nz * 7.3) * 3
  );

  // Fade to 0 near edges (beach)
  const dist = Math.sqrt(x * x + z * z);
  const edgeFade = Math.max(0, 1 - dist / ISLAND_RADIUS);
  const fade = Math.min(1, edgeFade * 3); // sharper transition
  h *= fade;

  // Flatten the dock area (near water level)
  const dockDist = Math.sqrt(x * x + (z - 220) * (z - 220));
  if (dockDist < 40) {
    const dockFade = Math.max(0, 1 - dockDist / 40);
    h *= (1 - dockFade * 0.9);
  }

  // Flatten town square area slightly
  const townDist = Math.sqrt(x * x + z * z);
  if (townDist < 30) {
    const townFade = Math.max(0, 1 - townDist / 30);
    h *= (1 - townFade * 0.6);
  }

  // Boost hilltop area
  const hillDist = Math.sqrt((x + 100) * (x + 100) + (z + 180) * (z + 180));
  if (hillDist < 60) {
    const hillBoost = Math.max(0, 1 - hillDist / 60);
    h += hillBoost * 18;
  }

  // Flatten beach south
  const beachDist = Math.sqrt(x * x + (z + 220) * (z + 220));
  if (beachDist < 50) {
    const beachFade = Math.max(0, 1 - beachDist / 50);
    h *= (1 - beachFade * 0.85);
  }

  return Math.max(0, h); // never below sea level
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

function box(w, h, d, color) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
}

function cylinder(rTop, rBot, h, color, segs = 8) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat(color));
}

function cone(r, h, color, segs = 8) {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), mat(color));
}

function flatPlane(w, d, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// ---------------------------------------------------------------------------
// Building factory
// ---------------------------------------------------------------------------

function makeBuilding(w, h, d, wallColor, roofColor = C.roof, { solarPanels = false, label = '' } = {}) {
  const group = new THREE.Group();

  const walls = box(w, h, d, wallColor);
  walls.position.y = h / 2;
  group.add(walls);

  const roofH = h * 0.35;
  const roof = box(w + 1, roofH, d + 1, roofColor);
  roof.position.y = h + roofH / 2 - 0.3;
  group.add(roof);

  const doorW = Math.min(w * 0.25, 2);
  const doorH = Math.min(h * 0.5, 3);
  const door = box(doorW, doorH, 0.3, C.door);
  door.position.set(0, doorH / 2, d / 2 + 0.15);
  group.add(door);

  if (solarPanels) {
    const panelW = w * 0.4;
    const panelD = d * 0.3;
    for (let i = -1; i <= 1; i += 2) {
      const panel = box(panelW, 0.2, panelD, C.solar);
      panel.position.set(i * w * 0.2, h + roofH + 0.1, 0);
      panel.rotation.x = -0.3;
      const frame = box(panelW + 0.4, 0.1, panelD + 0.4, C.solarFrame);
      frame.position.copy(panel.position);
      frame.position.y -= 0.1;
      frame.rotation.x = -0.3;
      group.add(panel, frame);
    }
  }

  group.userData.label = label;
  return group;
}

// ---------------------------------------------------------------------------
// Tree factory
// ---------------------------------------------------------------------------

function makeTree(height = 6, foliageColor = C.foliage) {
  const group = new THREE.Group();
  const trunkH = height * 0.4;
  const trunk = cylinder(0.3, 0.5, trunkH, C.trunk);
  trunk.position.y = trunkH / 2;
  group.add(trunk);

  const crownH = height * 0.65;
  const crown = cone(height * 0.35, crownH, foliageColor, 6);
  crown.position.y = trunkH + crownH / 2 - 0.5;
  group.add(crown);

  const crown2 = cone(height * 0.25, crownH * 0.6, foliageColor, 6);
  crown2.position.y = trunkH + crownH * 0.7;
  group.add(crown2);

  return group;
}

// ---------------------------------------------------------------------------
// Windmill
// ---------------------------------------------------------------------------

function makeWindmill() {
  const group = new THREE.Group();

  const tower = cylinder(1.5, 2.5, 14, C.windmill, 6);
  tower.position.y = 7;
  group.add(tower);

  const hub = cylinder(0.6, 0.6, 1, C.solarFrame, 8);
  hub.position.set(0, 14, 1.8);
  hub.rotation.x = Math.PI / 2;
  group.add(hub);

  for (let i = 0; i < 4; i++) {
    const blade = box(1, 7, 0.15, C.blade);
    blade.position.set(0, 3.5, 0);
    const pivot = new THREE.Group();
    pivot.add(blade);
    pivot.rotation.z = (Math.PI / 2) * i;
    pivot.position.set(0, 14, 2.3);
    group.add(pivot);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Dock
// ---------------------------------------------------------------------------

function makeDock() {
  const group = new THREE.Group();

  const platform = box(8, 0.5, 30, C.dock);
  platform.position.set(0, 1.5, 0);
  group.add(platform);

  for (let z = -12; z <= 12; z += 4) {
    for (let x = -3; x <= 3; x += 6) {
      const post = cylinder(0.3, 0.3, 3.5, C.trunk, 6);
      post.position.set(x, 0, z);
      group.add(post);
    }
  }

  for (let z = -10; z <= 10; z += 5) {
    const bollard = cylinder(0.3, 0.4, 1.2, C.solarFrame, 8);
    bollard.position.set(4.5, 2.0, z);
    group.add(bollard);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Boat
// ---------------------------------------------------------------------------

function makeBoat(size = 1) {
  const group = new THREE.Group();
  const hull = box(3 * size, 1.2 * size, 7 * size, C.boatHull);
  hull.position.y = 0.6 * size;
  group.add(hull);
  const trim = box(3.2 * size, 0.3 * size, 7.2 * size, C.boat);
  trim.position.y = 1.1 * size;
  group.add(trim);
  const mast = cylinder(0.15, 0.15, 5 * size, C.trunk, 6);
  mast.position.set(0, 3.5 * size, 0);
  group.add(mast);
  return group;
}

// ---------------------------------------------------------------------------
// Field / farm
// ---------------------------------------------------------------------------

function makeField(w, d) {
  const group = new THREE.Group();
  const base = flatPlane(w, d, C.field);
  base.position.y = 0.15;
  group.add(base);

  const rows = Math.floor(d / 2);
  for (let i = 0; i < rows; i++) {
    const row = box(w * 0.85, 0.4, 0.6, C.fieldRows);
    row.position.set(0, 0.35, -d / 2 + 1.5 + i * 2);
    group.add(row);
  }

  return group;
}

// ---------------------------------------------------------------------------
// Barn
// ---------------------------------------------------------------------------

function makeBarn() {
  const group = new THREE.Group();

  const walls = box(14, 8, 10, C.barn);
  walls.position.y = 4;
  group.add(walls);

  // Peaked roof
  const roofL = box(8, 0.4, 11, C.barnRoof);
  roofL.position.set(-2.5, 8.5, 0);
  roofL.rotation.z = 0.4;
  group.add(roofL);

  const roofR = box(8, 0.4, 11, C.barnRoof);
  roofR.position.set(2.5, 8.5, 0);
  roofR.rotation.z = -0.4;
  group.add(roofR);

  // Barn door
  const barnDoor = box(4, 5, 0.3, C.door);
  barnDoor.position.set(0, 2.5, 5.15);
  group.add(barnDoor);

  group.userData.label = 'Barn';
  return group;
}

// ---------------------------------------------------------------------------
// Fence
// ---------------------------------------------------------------------------

function makeFence(length, posts = 6) {
  const group = new THREE.Group();
  const spacing = length / (posts - 1);
  for (let i = 0; i < posts; i++) {
    const post = cylinder(0.15, 0.15, 1.5, C.fence, 4);
    post.position.set(i * spacing - length / 2, 0.75, 0);
    group.add(post);
  }
  // Rails
  const rail1 = box(length, 0.1, 0.1, C.fence);
  rail1.position.set(0, 0.5, 0);
  group.add(rail1);
  const rail2 = box(length, 0.1, 0.1, C.fence);
  rail2.position.set(0, 1.0, 0);
  group.add(rail2);
  return group;
}

// ---------------------------------------------------------------------------
// Bike rack
// ---------------------------------------------------------------------------

function makeBikeRack() {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const frame = box(0.1, 1, 1.5, C.solarFrame);
    frame.position.set(i * 1.2, 0.5, 0);
    group.add(frame);
  }
  const bar = box(3.5, 0.15, 0.15, C.solarFrame);
  bar.position.set(1.2, 0.08, 0);
  group.add(bar);
  return group;
}

// ---------------------------------------------------------------------------
// Garden patch
// ---------------------------------------------------------------------------

function makeGarden(size = 4) {
  const group = new THREE.Group();
  const colors = [0xe17055, 0xfdcb6e, 0xa29bfe, 0x55efc4, 0xfab1a0];
  const half = size / 2;
  for (let x = -half; x <= half; x += 1.2) {
    for (let z = -half; z <= half; z += 1.2) {
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 + Math.random() * 0.3, 6, 5),
        mat(colors[Math.floor(Math.random() * colors.length)])
      );
      bush.position.set(x + Math.random() * 0.4, 0.4, z + Math.random() * 0.4);
      group.add(bush);
    }
  }
  return group;
}

// ---------------------------------------------------------------------------
// Bench
// ---------------------------------------------------------------------------

function makeBench() {
  const group = new THREE.Group();
  const seat = box(3, 0.2, 1, C.dock);
  seat.position.y = 0.8;
  group.add(seat);
  const leg1 = box(0.2, 0.8, 0.2, C.trunk);
  leg1.position.set(-1.2, 0.4, 0);
  group.add(leg1);
  const leg2 = box(0.2, 0.8, 0.2, C.trunk);
  leg2.position.set(1.2, 0.4, 0);
  group.add(leg2);
  return group;
}

// ---------------------------------------------------------------------------
// Place helper — sets position at terrain height
// ---------------------------------------------------------------------------

function placeOnTerrain(obj, x, z, yOffset = 0) {
  obj.position.set(x, getHeight(x, z) + yOffset, z);
}

// ---------------------------------------------------------------------------
// Path strip — a flat plane along a line between two points
// ---------------------------------------------------------------------------

function makePath(scene, x1, z1, x2, z2, width = 4) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  // Use segments to follow terrain
  const segs = Math.max(2, Math.floor(length / 8));
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const tm = (t0 + t1) / 2;
    const mx = x1 + dx * tm;
    const mz = z1 + dz * tm;
    const segLen = length / segs;

    const strip = flatPlane(width, segLen + 0.5, C.path);
    strip.position.set(mx, getHeight(mx, mz) + 0.15, mz);
    strip.rotation.z = -angle;
    scene.add(strip);
  }
}

// ---------------------------------------------------------------------------
// Terrain mesh builder
// ---------------------------------------------------------------------------

function buildTerrain(scene) {
  // Main island terrain — subdivided plane with height
  const size = 620;
  const segs = 100;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const positions = geo.attributes.position;
  const colors = [];

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const dist = Math.sqrt(x * x + z * z);

    let y;
    if (dist > ISLAND_RADIUS) {
      y = -0.5; // underwater
    } else {
      y = getHeight(x, z);
    }
    positions.setY(i, y);

    // Vertex colours: sand at edges, grass inland, darker grass on hills
    const edgeFactor = Math.max(0, 1 - dist / ISLAND_RADIUS);
    if (dist > ISLAND_RADIUS - 15) {
      // Sand beach
      colors.push(0.91, 0.84, 0.64);
    } else if (y < 1) {
      // Low areas — lighter grass
      colors.push(0.42, 0.69, 0.30);
    } else if (y > 12) {
      // High areas — darker grass
      colors.push(0.29, 0.54, 0.19);
    } else {
      // Normal grass
      const t = y / 12;
      colors.push(
        0.42 - t * 0.13,
        0.69 - t * 0.15,
        0.30 - t * 0.11,
      );
    }
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const terrain = new THREE.Mesh(geo, terrainMat);
  scene.add(terrain);

  // Beach ring — a flat sand disc under the terrain for smoother shoreline
  const beachGeo = new THREE.CircleGeometry(ISLAND_RADIUS + 20, 64);
  beachGeo.rotateX(-Math.PI / 2);
  const beach = new THREE.Mesh(beachGeo, mat(C.sand));
  beach.position.y = -0.2;
  scene.add(beach);
}

// ---------------------------------------------------------------------------
// Hanging sign factory — canvas text on a flat board
// ---------------------------------------------------------------------------

function makeHangingSign(text, bgColor, textColorHex) {
  const group = new THREE.Group();

  // Board
  const boardW = 3.5;
  const boardH = 0.9;
  const board = box(boardW, boardH, 0.15, bgColor);
  group.add(board);

  // Border frame
  const frame = box(boardW + 0.22, boardH + 0.22, 0.1, textColorHex);
  frame.position.z = -0.05;
  group.add(frame);

  // Canvas text sprite above the board
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Background
  const r = (bgColor >> 16) & 0xff;
  const g = (bgColor >> 8)  & 0xff;
  const b =  bgColor        & 0xff;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 512, 128);

  // Text
  const tr = (textColorHex >> 16) & 0xff;
  const tg = (textColorHex >> 8)  & 0xff;
  const tb =  textColorHex        & 0xff;
  ctx.fillStyle = `rgb(${tr},${tg},${tb})`;
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(boardW, boardH * 0.9, 1);
  sprite.position.z = 0.12;
  group.add(sprite);

  // Hanging chains (thin cylinders)
  for (const sx of [-boardW / 2 + 0.2, boardW / 2 - 0.2]) {
    const chain = cylinder(0.04, 0.04, 0.55, 0xaaaaaa, 4);
    chain.position.set(sx, boardH / 2 + 0.28, 0);
    group.add(chain);
  }

  // Crossbar
  const bar = box(boardW + 0.5, 0.1, 0.1, 0x8b6914);
  bar.position.y = boardH / 2 + 0.55;
  group.add(bar);

  return group;
}

// ---------------------------------------------------------------------------
// Main scene builder
// ---------------------------------------------------------------------------

export function buildScene(scene) {

  // === Lighting ===
  const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.7);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
  sunLight.position.set(200, 250, 150);
  sunLight.castShadow = true;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
  fillLight.position.set(-150, 100, -200);
  scene.add(fillLight);

  // === Sky ===
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.FogExp2(0xc9e8f5, 0.0015);

  // === Sea ===
  const seaGeo = new THREE.PlaneGeometry(1200, 1200);
  seaGeo.rotateX(-Math.PI / 2);
  const sea = new THREE.Mesh(seaGeo, mat(C.sea));
  sea.position.y = -0.8;
  scene.add(sea);

  const seaDeep = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 1600),
    mat(C.seaDeep)
  );
  seaDeep.rotation.x = -Math.PI / 2;
  seaDeep.position.y = -1.2;
  scene.add(seaDeep);

  // === Terrain ===
  buildTerrain(scene);

  // === Path network ===
  // Central hub
  makePath(scene, 0, 0, -60, -40, 4);    // Town → Bakery
  makePath(scene, 0, 0, 60, -40, 4);     // Town → Post Office
  makePath(scene, 0, 0, 80, 40, 4);      // Town → Library
  makePath(scene, 0, 0, -80, 40, 4);     // Town → Workshop
  makePath(scene, 0, 0, 0, 220, 4);      // Town → Dock (long south)
  // Outer ring & branches
  makePath(scene, -80, 40, -180, 80, 3); // Workshop → Farm
  makePath(scene, 80, 40, 180, 120, 3);  // Library → Forest
  makePath(scene, -60, -40, -100, -180, 3); // Bakery → Hilltop
  makePath(scene, 60, -40, 0, -220, 3);  // Post Office → South Beach
  makePath(scene, -60, -40, 0, -220, 3); // Bakery → South Beach
  // Cross paths
  makePath(scene, -60, -40, 60, -40, 3); // Bakery ↔ Post Office
  makePath(scene, -80, 40, 80, 40, 3);   // Workshop ↔ Library

  // =====================================================================
  // TOWN SQUARE (0, 0)
  // =====================================================================
  // Central fountain / well
  const fountain = cylinder(3, 3, 1.5, 0xb0b0b0, 12);
  placeOnTerrain(fountain, 0, 0, 0.75);
  scene.add(fountain);
  const waterTop = cylinder(2.5, 2.5, 0.3, C.water, 12);
  placeOnTerrain(waterTop, 0, 0, 1.6);
  scene.add(waterTop);

  // Benches around square
  for (let a = 0; a < 4; a++) {
    const bx = Math.cos(a * Math.PI / 2) * 12;
    const bz = Math.sin(a * Math.PI / 2) * 12;
    const bench = makeBench();
    placeOnTerrain(bench, bx, bz);
    bench.rotation.y = a * Math.PI / 2;
    scene.add(bench);
  }

  // Bike racks near town square
  const bikeRack1 = makeBikeRack();
  placeOnTerrain(bikeRack1, -8, 8);
  scene.add(bikeRack1);

  const bikeRack2 = makeBikeRack();
  placeOnTerrain(bikeRack2, 10, -6);
  bikeRack2.rotation.y = Math.PI / 2;
  scene.add(bikeRack2);

  // A few trees near square
  const squareTrees = [[15, 15], [-15, 12], [12, -15], [-12, -12]];
  squareTrees.forEach(([x, z]) => {
    const tree = makeTree(6 + Math.random() * 2);
    placeOnTerrain(tree, x, z);
    scene.add(tree);
  });

  // Gardens near square
  const garden1 = makeGarden(3);
  placeOnTerrain(garden1, -18, 0);
  scene.add(garden1);

  const garden2 = makeGarden(3);
  placeOnTerrain(garden2, 18, 5);
  scene.add(garden2);

  // =====================================================================
  // BAKERY (-60, -40)
  // =====================================================================
  const bakery = makeBuilding(12, 8, 9, C.bakery, C.roofDark, { solarPanels: true, label: 'Bakery' });
  placeOnTerrain(bakery, -60, -40);
  bakery.rotation.y = 0.3;
  scene.add(bakery);

  // Bakery chimney — tall brick stack with animated smoke handled in main loop
  const bakeryBase = getHeight(-60, -40);
  const chimneyStack = cylinder(0.45, 0.55, 6, 0x8b4513, 8);
  chimneyStack.position.set(-57.5, bakeryBase + 8 + 3, -43);
  scene.add(chimneyStack);
  const chimneyTop = cylinder(0.6, 0.45, 0.6, 0x6b3410, 8);
  chimneyTop.position.set(-57.5, bakeryBase + 11.3, -43);
  scene.add(chimneyTop);

  // Bakery awning — wide striped canopy over door
  const awningL = box(6.5, 0.18, 2.2, 0xe17055);
  awningL.position.set(-60, bakeryBase + 5.2, -35.6);
  awningL.rotation.x = -0.35;
  scene.add(awningL);
  // Awning stripes (white)
  for (let i = -2; i <= 2; i++) {
    const stripe = box(0.6, 0.19, 2.2, 0xffffff);
    stripe.position.set(-60 + i * 1.1, bakeryBase + 5.22, -35.6);
    stripe.rotation.x = -0.35;
    scene.add(stripe);
  }
  // Awning support poles
  for (const sx of [-62.5, -57.5]) {
    const pole = cylinder(0.1, 0.1, 1.8, 0x8b6914, 5);
    pole.position.set(sx, bakeryBase + 4.3, -36.4);
    scene.add(pole);
  }

  // Bakery hanging sign
  const bakerySign = makeHangingSign('🍞 BAKERY', 0xfde8c9, 0x8b4513);
  bakerySign.position.set(-60, bakeryBase + 7.2, -35.2);
  scene.add(bakerySign);

  // Small awning / outdoor seating
  const bakeryBench = makeBench();
  placeOnTerrain(bakeryBench, -52, -36);
  scene.add(bakeryBench);

  // Garden beside bakery
  const bakeryGarden = makeGarden(3);
  placeOnTerrain(bakeryGarden, -70, -35);
  scene.add(bakeryGarden);

  // =====================================================================
  // POST OFFICE (60, -40)
  // =====================================================================
  const postOffice = makeBuilding(10, 7, 8, C.postOffice, C.roof, { solarPanels: true, label: 'Post Office' });
  placeOnTerrain(postOffice, 60, -40);
  postOffice.rotation.y = -0.2;
  scene.add(postOffice);

  // Post Office hanging sign
  const poBase = getHeight(60, -40);
  const poSign = makeHangingSign('📮 POST OFFICE', 0xffffff, 0x2d5fa3);
  poSign.position.set(60, poBase + 6.8, -35.8);
  scene.add(poSign);

  // Flagpole
  const flagPole = cylinder(0.12, 0.12, 9, 0xd0d0d0, 6);
  flagPole.position.set(67, poBase + 4.5, -37);
  scene.add(flagPole);
  // Flag — red/white
  const flagMain = box(3.2, 1.8, 0.08, 0xdd2233);
  flagMain.position.set(68.6, poBase + 8.4, -37);
  scene.add(flagMain);
  const flagStripe = box(3.2, 0.55, 0.09, 0xffffff);
  flagStripe.position.set(68.6, poBase + 8.6, -37);
  scene.add(flagStripe);

  // Red postbox (classic pillar box shape)
  const pbBody = cylinder(0.55, 0.55, 1.5, 0xcc1111, 10);
  pbBody.position.set(52, poBase + 0.75, -36);
  scene.add(pbBody);
  const pbTop = cylinder(0.58, 0.55, 0.35, 0xaa0000, 10);
  pbTop.position.set(52, poBase + 1.68, -36);
  scene.add(pbTop);
  const pbSlot = box(0.6, 0.1, 0.08, 0x333333);
  pbSlot.position.set(52, poBase + 1.0, -35.4);
  scene.add(pbSlot);

  // =====================================================================
  // LIBRARY (80, 40)
  // =====================================================================
  const library = makeBuilding(14, 9, 12, C.library, C.roofDark, { solarPanels: true, label: 'Library' });
  placeOnTerrain(library, 80, 40);
  library.rotation.y = -0.4;
  scene.add(library);

  // Reading garden
  const readingGarden = makeGarden(4);
  placeOnTerrain(readingGarden, 92, 50);
  scene.add(readingGarden);

  const libBench = makeBench();
  placeOnTerrain(libBench, 72, 50);
  libBench.rotation.y = 0.5;
  scene.add(libBench);

  // Trees near library
  [[70, 30], [90, 30], [95, 55]].forEach(([x, z]) => {
    const tree = makeTree(5 + Math.random() * 3);
    placeOnTerrain(tree, x, z);
    scene.add(tree);
  });

  // =====================================================================
  // WORKSHOP (-80, 40)
  // =====================================================================
  const workshop = makeBuilding(12, 7, 10, C.workshop, C.roofDark, { solarPanels: true, label: 'Workshop' });
  placeOnTerrain(workshop, -80, 40);
  workshop.rotation.y = 0.3;
  scene.add(workshop);

  // Solar panel array near workshop
  for (let i = 0; i < 4; i++) {
    const panel = box(4, 0.15, 3, C.solar);
    placeOnTerrain(panel, -95 + i * 5, 55, 2);
    panel.rotation.x = -0.5;
    const pole = cylinder(0.15, 0.15, 2, C.solarFrame, 4);
    placeOnTerrain(pole, -95 + i * 5, 55, 1);
    scene.add(panel, pole);
  }

  // Bike rack at workshop
  const workshopBikes = makeBikeRack();
  placeOnTerrain(workshopBikes, -72, 48);
  workshopBikes.rotation.y = 0.3;
  scene.add(workshopBikes);

  // =====================================================================
  // THE DOCK (0, 220)
  // =====================================================================
  const dock = makeDock();
  placeOnTerrain(dock, 0, 235, 0);
  dock.rotation.y = 0;
  scene.add(dock);

  // Boats
  const boat1 = makeBoat(1.2);
  boat1.position.set(12, -0.3, 240);
  boat1.rotation.y = 0.3;
  scene.add(boat1);

  const boat2 = makeBoat(0.8);
  boat2.position.set(-10, -0.3, 245);
  boat2.rotation.y = -0.5;
  scene.add(boat2);

  // Dock bollard lights / crates
  const crate1 = box(2, 2, 2, C.dock);
  crate1.position.set(5, 1, 225);
  scene.add(crate1);
  const crate2 = box(1.5, 1.5, 1.5, C.dock);
  crate2.position.set(6.5, 0.75, 224);
  scene.add(crate2);

  // =====================================================================
  // THE FARM (-180, 80)
  // =====================================================================
  // Barn
  const barn = makeBarn();
  placeOnTerrain(barn, -180, 70);
  barn.rotation.y = 0.2;
  scene.add(barn);

  // Fields
  const field1 = makeField(25, 18);
  placeOnTerrain(field1, -200, 100);
  scene.add(field1);

  const field2 = makeField(20, 15);
  placeOnTerrain(field2, -165, 105);
  field2.rotation.y = 0.3;
  scene.add(field2);

  const field3 = makeField(18, 12);
  placeOnTerrain(field3, -195, 65);
  field3.rotation.y = -0.2;
  scene.add(field3);

  // Greenhouse
  const greenhouse = makeBuilding(10, 5, 14, C.greenhouse, 0x2ecc71, { solarPanels: false, label: 'Greenhouse' });
  placeOnTerrain(greenhouse, -160, 90);
  greenhouse.rotation.y = 0.2;
  greenhouse.children[0].material = new THREE.MeshLambertMaterial({ color: C.greenhouse, transparent: true, opacity: 0.6 });
  scene.add(greenhouse);

  // Fences around farm
  const fence1 = makeFence(30, 8);
  placeOnTerrain(fence1, -195, 85);
  scene.add(fence1);

  const fence2 = makeFence(25, 6);
  placeOnTerrain(fence2, -175, 115);
  fence2.rotation.y = Math.PI / 2;
  scene.add(fence2);

  // Scattered farm trees
  [[-205, 55], [-150, 75], [-210, 110]].forEach(([x, z]) => {
    const tree = makeTree(5 + Math.random() * 3);
    placeOnTerrain(tree, x, z);
    scene.add(tree);
  });

  // =====================================================================
  // FOREST PATH (180, 120)
  // =====================================================================
  // Dense tree cluster
  const forestTrees = [
    [160, 100], [170, 105], [165, 115], [175, 110], [185, 108],
    [190, 115], [195, 125], [185, 130], [175, 135], [170, 125],
    [200, 120], [195, 105], [180, 140], [165, 140], [200, 135],
    [205, 110], [210, 125], [155, 110], [155, 130], [210, 140],
    [160, 145], [190, 145], [175, 150], [205, 150], [150, 120],
    [215, 130], [170, 95], [195, 95], [145, 115], [220, 120],
  ];
  forestTrees.forEach(([x, z]) => {
    const height = 7 + Math.random() * 5;
    const color = Math.random() > 0.3 ? C.foliage : C.foliageDark;
    const tree = makeTree(height, color);
    placeOnTerrain(tree, x + Math.random() * 4 - 2, z + Math.random() * 4 - 2);
    tree.rotation.y = Math.random() * Math.PI;
    scene.add(tree);
  });

  // A small clearing bench in the forest
  const forestBench = makeBench();
  placeOnTerrain(forestBench, 180, 120);
  forestBench.rotation.y = 1.2;
  scene.add(forestBench);

  // =====================================================================
  // THE HILLTOP (-100, -180)
  // =====================================================================
  const windmill = makeWindmill();
  placeOnTerrain(windmill, -100, -180);
  scene.add(windmill);

  // Viewpoint bench
  const hilltopBench = makeBench();
  placeOnTerrain(hilltopBench, -90, -175);
  hilltopBench.rotation.y = 0.8;
  scene.add(hilltopBench);

  // A few trees on the hill
  [[-110, -170], [-115, -190], [-85, -190]].forEach(([x, z]) => {
    const tree = makeTree(4 + Math.random() * 2);
    placeOnTerrain(tree, x, z);
    scene.add(tree);
  });

  // Solar panel cluster on hilltop
  for (let i = 0; i < 3; i++) {
    const panel = box(5, 0.15, 3.5, C.solar);
    placeOnTerrain(panel, -120 + i * 8, -185, 2.5);
    panel.rotation.x = -0.5;
    const pole = cylinder(0.15, 0.15, 2.5, C.solarFrame, 4);
    placeOnTerrain(pole, -120 + i * 8, -185, 1.25);
    scene.add(panel, pole);
  }

  // =====================================================================
  // SOUTH BEACH (0, -220)
  // =====================================================================
  // Extra sand strip
  const sandStrip = flatPlane(80, 30, C.sand);
  sandStrip.position.set(0, 0.05, -225);
  scene.add(sandStrip);

  // Beach umbrellas (simple cone + pole)
  const umbrellaPositions = [[-15, -215], [0, -220], [15, -218], [25, -225]];
  umbrellaPositions.forEach(([x, z]) => {
    const pole = cylinder(0.15, 0.15, 3, C.trunk, 4);
    pole.position.set(x, 1.5, z);
    scene.add(pole);
    const shade = cone(2.5, 1, [0xe17055, 0x4a90d9, 0xfdcb6e, 0xa29bfe][Math.floor(Math.random() * 4)], 6);
    shade.position.set(x, 3.2, z);
    scene.add(shade);
  });

  // Driftwood / logs
  const log1 = cylinder(0.3, 0.25, 4, 0x9e8a6e, 5);
  log1.rotation.z = Math.PI / 2;
  log1.position.set(-25, 0.3, -230);
  log1.rotation.y = 0.4;
  scene.add(log1);

  // =====================================================================
  // Scattered houses around town
  // =====================================================================
  const houses = [
    { pos: [-30, -20], color: C.house1, rot: 0.3, label: 'House' },
    { pos: [-40, 10],  color: C.house2, rot: -0.2, label: 'House' },
    { pos: [35, 15],   color: C.house3, rot: 0.5, label: 'House' },
    { pos: [40, -15],  color: C.house4, rot: -0.4, label: 'House' },
    { pos: [-15, -60], color: C.house5, rot: 0.1, label: 'House' },
    { pos: [25, -65],  color: C.house1, rot: -0.3, label: 'House' },
    { pos: [-45, -60], color: C.house3, rot: 0.4, label: 'House' },
    { pos: [45, 60],   color: C.house2, rot: -0.6, label: 'House' },
    { pos: [-50, 70],  color: C.house4, rot: 0.2, label: 'House' },
    { pos: [-120, -60], color: C.house5, rot: -0.1, label: 'House' },
    { pos: [120, -20], color: C.house1, rot: 0.5, label: 'House' },
    { pos: [-30, 120], color: C.house2, rot: -0.3, label: 'House' },
  ];
  houses.forEach(cfg => {
    const house = makeBuilding(8, 5.5, 7, cfg.color, C.roof, { solarPanels: Math.random() > 0.3, label: cfg.label });
    placeOnTerrain(house, cfg.pos[0], cfg.pos[1]);
    house.rotation.y = cfg.rot;
    scene.add(house);
  });

  // =====================================================================
  // Scattered trees across the island
  // =====================================================================
  const scatteredTrees = [
    // Along paths / midpoints
    [0, 40], [0, 80], [0, 120], [0, 160], [0, 195],
    [-30, 60], [30, 70], [-100, 60], [100, 80],
    // Northern area
    [-40, -100], [20, -120], [-80, -100], [80, -100],
    [-140, -120], [140, -80], [-60, -140], [60, -130],
    // Southern scatter
    [40, 180], [-40, 170], [80, 170], [-80, 160],
    // East/west scatter
    [140, 20], [-140, 30], [120, 60], [-120, 50],
    [160, 50], [-160, 40],
    // Edge of island
    [-200, -100], [200, -80], [-220, 0], [220, 30],
    [0, -180], [-180, -40], [180, -30],
    [-240, 40], [240, 60], [0, 260],
    [-150, 160], [150, 170], [-230, 100], [230, 80],
  ];
  scatteredTrees.forEach(([x, z]) => {
    const dist = Math.sqrt(x * x + z * z);
    if (dist > ISLAND_RADIUS - 10) return; // skip if off the island
    const height = 5 + Math.random() * 4;
    const color = Math.random() > 0.3 ? C.foliage : C.foliageDark;
    const tree = makeTree(height, color);
    placeOnTerrain(tree, x + Math.random() * 3 - 1.5, z + Math.random() * 3 - 1.5);
    tree.rotation.y = Math.random() * Math.PI;
    scene.add(tree);
  });

  // =====================================================================
  // Extra details — gardens, bike racks
  // =====================================================================
  // Garden near workshop
  const workshopGarden = makeGarden(5);
  placeOnTerrain(workshopGarden, -70, 55);
  scene.add(workshopGarden);

  // Garden near farm
  const farmGarden = makeGarden(4);
  placeOnTerrain(farmGarden, -165, 60);
  scene.add(farmGarden);

  // Extra benches along paths
  const benchSpots = [[-30, 0], [30, -5], [0, 100], [0, 150], [-40, -80]];
  benchSpots.forEach(([x, z]) => {
    const b = makeBench();
    placeOnTerrain(b, x, z);
    b.rotation.y = Math.random() * Math.PI;
    scene.add(b);
  });
}
