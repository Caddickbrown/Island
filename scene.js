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
  postOffice: 0xcc2222,
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
  TOWN_SQUARE:    { x: 0,    z: 0,    label: 'Town Square' },
  BAKERY:         { x: -60,  z: -40,  label: 'Bakery' },
  POST_OFFICE:    { x: 60,   z: -40,  label: 'Post Office' },
  CAFE:           { x: 5,    z: -55,  label: 'The Café' },
  DOCK:           { x: 0,    z: 262,  label: 'The Dock' },
  FARM:           { x: -180, z: 80,   label: 'The Farm' },
  FOREST:         { x: 180,  z: 120,  label: 'Forest Path' },
  HILLTOP:        { x: -100, z: -180, label: 'The Hilltop' },
  BEACH_SOUTH:    { x: 0,    z: -220, label: 'South Beach' },
  LIBRARY:        { x: 80,   z: 40,   label: 'Library' },
  WORKSHOP:       { x: -80,  z: 40,   label: 'Workshop' },
  PUB:            { x: -30,  z: -70,  label: 'The Anchor' },
  SCHOOL:         { x: 40,   z: -70,  label: 'School' },
  SOUTH_QUARTER:  { x: 8,    z: -68,  label: 'South Quarter' },
  AQUARIUM:       { x: 150,  z: -80,  label: "Elliot's Aquarium" },
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

function makeBuilding(w, h, d, wallColor, roofColor = C.roof, { solarPanels = false, label = '', signText = '', signBg = 0xfde8c9, signColor = 0x4a2800 } = {}) {
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

  // Wall-mounted sign — flush on the front face, below the roof line
  if (signText) {
    const signW = Math.min(w * 0.72, 5.5);
    const signH = 0.85;
    const signY = h * 0.8; // well above door, safely below roofline
    const signZ = d / 2 + 0.12;

    // Backing board
    const backing = box(signW + 0.3, signH + 0.3, 0.12, signColor);
    backing.position.set(0, signY, signZ - 0.03);
    group.add(backing);

    const board = box(signW, signH, 0.15, signBg);
    board.position.set(0, signY, signZ);
    group.add(board);

    // Canvas text — rendered as a sprite ON the board face
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const r = (signBg >> 16) & 0xff, g = (signBg >> 8) & 0xff, b = signBg & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 512, 128);
    const tr = (signColor >> 16) & 0xff, tg = (signColor >> 8) & 0xff, tb = signColor & 0xff;
    ctx.fillStyle = `rgb(${tr},${tg},${tb})`;
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(signText, 256, 64);
    const tex = new THREE.CanvasTexture(canvas);
    // Use a PlaneGeometry (not Sprite) so the sign rotates with the building
    const planeMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.FrontSide });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), planeMat);
    plane.position.set(0, signY, signZ + 0.09);
    group.add(plane);
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

  // All blades share one spinner group — rotate the spinner for animation
  const spinner = new THREE.Group();
  spinner.position.set(0, 14, 2.3);
  for (let i = 0; i < 4; i++) {
    const blade = box(1, 7, 0.15, C.blade);
    blade.position.set(0, 3.5, 0);
    const pivot = new THREE.Group();
    pivot.add(blade);
    pivot.rotation.z = (Math.PI / 2) * i;
    spinner.add(pivot);
  }
  group.add(spinner);
  group.userData.spinner = spinner;

  return group;
}

// ---------------------------------------------------------------------------
// Postbox — classic large red British pillar box (Post Office only)
// ---------------------------------------------------------------------------

function makePostbox() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 10), mat(0xcc1111));
  body.position.y = 0.75;
  group.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.55, 0.35, 10), mat(0xaa0000));
  top.position.y = 1.68;
  group.add(top);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.08), mat(0x333333));
  slot.position.set(0, 1.0, 0.48);
  group.add(slot);
  // Royal cipher plate
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.06), mat(0xbb0000));
  plate.position.set(0, 0.55, 0.5);
  group.add(plate);
  return group;
}

// ---------------------------------------------------------------------------
// Mailbox — small American-style box on a post (residential delivery)
// ---------------------------------------------------------------------------

function makeMailbox() {
  const group = new THREE.Group();

  // Post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 6), mat(0x888888));
  post.position.y = 0.6;
  group.add(post);

  // Box body — rounded rectangular shape
  const boxBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.9), mat(0x446688));
  boxBody.position.y = 1.38;
  group.add(boxBody);

  // Rounded top (half-cylinder)
  const topGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.55, 8, 1, false, 0, Math.PI);
  const topCap = new THREE.Mesh(topGeo, mat(0x446688));
  topCap.rotation.z = Math.PI / 2;
  topCap.position.set(0, 1.57, 0);
  group.add(topCap);

  // Door flap (front face, slightly darker)
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.32, 0.04), mat(0x335577));
  flap.position.set(0, 1.38, 0.47);
  group.add(flap);

  // Flag — small red flag on the side
  const flagPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4), mat(0x888888));
  flagPost.position.set(0.28, 1.55, 0);
  group.add(flagPost);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.03), mat(0xcc2222));
  flag.position.set(0.38, 1.68, 0);
  group.add(flag);

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
      const post = cylinder(0.3, 0.3, 5.5, C.trunk, 6);
      post.position.set(x, -1, z);
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
// Café table — round pedestal with 2 chairs
// ---------------------------------------------------------------------------

function makeCafeTable() {
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 10), mat(0xd4a870));
  top.position.y = 1.05;
  group.add(top);
  const leg = cylinder(0.07, 0.1, 1.0, C.trunk, 6);
  leg.position.y = 0.5;
  group.add(leg);
  for (let i = 0; i < 2; i++) {
    const a = (i / 2) * Math.PI * 2;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.65), mat(0xa87050));
    seat.position.set(Math.cos(a) * 1.0, 0.75, Math.sin(a) * 1.0);
    group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 0.07), mat(0xa87050));
    back.position.set(Math.cos(a) * 1.25, 1.15, Math.sin(a) * 1.25);
    back.rotation.y = a;
    group.add(back);
  }
  return group;
}

// ---------------------------------------------------------------------------
// Home nameplate — short post with a painted name plaque
// ---------------------------------------------------------------------------

function makeHomePlaque(name) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 5), mat(C.fence));
  post.position.y = 0.45;
  group.add(post);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fde8c9';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 252, 60);
  ctx.fillStyle = '#4a2800';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🏠 ${name}`, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const planeMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), planeMat);
  plane.position.y = 1.02;
  group.add(plane);
  return group;
}

// ---------------------------------------------------------------------------
// Cloud system — drifting fluffy puffs (adapted from Laila's World)
// ---------------------------------------------------------------------------

function buildClouds(scene) {
  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  const cloudList = [];
  for (let i = 0; i < 22; i++) {
    const group = new THREE.Group();
    const puffs = 3 + Math.floor(Math.random() * 5);
    const scaleX = 0.7 + Math.random() * 1.4;
    const scaleZ = 0.5 + Math.random() * 0.8;
    for (let j = 0; j < puffs; j++) {
      const r = 7 + Math.random() * 12;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), cloudMat);
      mesh.position.set(
        j === 0 ? 0 : (Math.random() - 0.5) * 32 * scaleX,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 14 * scaleZ,
      );
      group.add(mesh);
    }
    group.position.set(
      (Math.random() - 0.5) * 700,
      90 + Math.random() * 45,
      (Math.random() - 0.5) * 700,
    );
    const speed = 4 + Math.random() * 7;
    const angle = (Math.random() - 0.5) * 0.6;
    group.userData.vx = Math.cos(angle) * speed;
    group.userData.vz = Math.sin(angle) * speed;
    scene.add(group);
    cloudList.push(group);
  }
  return cloudList;
}

// ---------------------------------------------------------------------------
// Sun disc — warm glowing orb (adapted from Laila's World)
// ---------------------------------------------------------------------------

function makeSunDisc(scene) {
  const group = new THREE.Group();
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfff8b0,
    fog: false,
    depthTest: false,
    depthWrite: false,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffcc44,
    transparent: true,
    opacity: 0.22,
    fog: false,
    depthTest: false,
    depthWrite: false,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), coreMat);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(13, 16, 12), glowMat);
  group.add(core, glow);
  group.position.set(280, 270, 200); // matches sunLight direction
  group.renderOrder = -1;
  scene.add(group);
  return group;
}

// ---------------------------------------------------------------------------
// Elliot's Aquarium — blue-glass building with fish tanks and a small pond
// ---------------------------------------------------------------------------

function makeAquarium() {
  const group = new THREE.Group();
  const AW = 20, AH = 9, AD = 15;
  const T = 0.5;   // wall/pillar thickness
  const PW = 1.4;  // corner pillar width
  const SILL = 1.6; // height of solid base below glass
  const HEAD = 1.4; // height of solid header above glass
  const GH = AH - SILL - HEAD; // glass panel height

  const solidMat  = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
  const glassMat  = new THREE.MeshLambertMaterial({
    color: 0x4dd0e1, transparent: true, opacity: 0.28,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const roofMat   = new THREE.MeshLambertMaterial({ color: 0x0097a7 });
  const floorMat  = new THREE.MeshLambertMaterial({ color: 0x1a3a5c });

  // Floor slab
  const floor = new THREE.Mesh(new THREE.BoxGeometry(AW, 0.35, AD), floorMat);
  floor.position.y = 0.17;
  group.add(floor);

  // 4 corner pillars — full height
  for (const [sx, sz] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(PW, AH, PW), solidMat);
    pillar.position.set(sx * (AW/2 - PW/2), AH/2, sz * (AD/2 - PW/2));
    group.add(pillar);
  }

  // Helper — build one glass wall with solid sill + header + glass panel(s)
  function addGlassWall(isXAxis, sign, wallSpan, wallZ, doorCutout = false) {
    const halfSpan = wallSpan / 2;
    // Sill (solid base strip)
    const sillGeo = isXAxis
      ? new THREE.BoxGeometry(T, SILL, wallSpan - 2*PW)
      : new THREE.BoxGeometry(wallSpan - 2*PW, SILL, T);
    const sillMesh = new THREE.Mesh(sillGeo, solidMat);
    sillMesh.position.set(isXAxis ? sign*(AW/2) : 0, SILL/2, isXAxis ? 0 : sign*(AD/2));
    group.add(sillMesh);

    // Header (solid top strip)
    const headGeo = isXAxis
      ? new THREE.BoxGeometry(T, HEAD, wallSpan - 2*PW)
      : new THREE.BoxGeometry(wallSpan - 2*PW, HEAD, T);
    const headMesh = new THREE.Mesh(headGeo, solidMat);
    headMesh.position.set(isXAxis ? sign*(AW/2) : 0, AH - HEAD/2, isXAxis ? 0 : sign*(AD/2));
    group.add(headMesh);

    if (doorCutout) {
      // Front wall: two glass panels flanking central door gap (3.5 wide)
      const doorW  = 3.5;
      const panelW = (wallSpan - 2*PW - doorW) / 2;
      const offsets = [-(doorW/2 + panelW/2), (doorW/2 + panelW/2)];
      offsets.forEach(ox => {
        const g = new THREE.Mesh(new THREE.BoxGeometry(panelW, GH, T*0.25), glassMat);
        g.position.set(ox, SILL + GH/2, sign*(AD/2));
        group.add(g);
      });
      // Solid door frame pillars
      for (const dx of [-doorW/2, doorW/2]) {
        const dp = new THREE.Mesh(new THREE.BoxGeometry(0.3, AH, T), solidMat);
        dp.position.set(dx, AH/2, sign*(AD/2));
        group.add(dp);
      }
    } else {
      // Full glass panel
      const glassGeo = isXAxis
        ? new THREE.BoxGeometry(T*0.25, GH, wallSpan - 2*PW)
        : new THREE.BoxGeometry(wallSpan - 2*PW, GH, T*0.25);
      const glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.position.set(isXAxis ? sign*(AW/2) : 0, SILL + GH/2, isXAxis ? 0 : sign*(AD/2));
      group.add(glassMesh);
    }
  }

  // Left wall (local -x)
  addGlassWall(true, -1, AD, 0);
  // Right wall (local +x)
  addGlassWall(true,  1, AD, 0);
  // Back wall (local -z)
  addGlassWall(false, -1, AW, 0);
  // Front wall (local +z) — with door cutout
  addGlassWall(false,  1, AW, 0, true);

  // Roof
  const roofH = AH * 0.25;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(AW + 1.4, roofH, AD + 1.4), roofMat);
  roof.position.y = AH + roofH/2 - 0.2;
  group.add(roof);
  // White ridge strip
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(AW + 1.6, 0.22, 1.0),
    new THREE.MeshLambertMaterial({ color: 0xffffff }));
  ridge.position.y = AH + roofH - 0.06;
  group.add(ridge);

  // ── Fish inside — visible through glass walls ──────────────────────────
  const fishDefs = [
    // [x, y, z, color, ry]  — spread through interior, away from centre path
    [-6,  2.8,  4,  0xff6b6b,  0.4],
    [-6,  4.5, -3,  0xffd93d,  2.8],
    [-5,  3.5,  0,  0x4d96ff,  1.2],
    [-7,  6.0,  2,  0xf97316, -0.8],
    [-5,  5.2, -5,  0xa855f7,  0.0],
    [ 6,  3.0, -4,  0x6bcb77,  3.5],
    [ 6,  4.8,  3,  0xec4899,  2.0],
    [ 7,  2.5,  0,  0x06b6d4,  4.0],
    [ 5,  5.8, -2,  0xff6b6b, -1.5],
    [ 6,  3.8,  5,  0xffd93d,  1.8],
    [ 0,  3.2, -5,  0x4d96ff,  3.0],
    [-3,  6.5,  4,  0xf97316,  0.6],
    [ 3,  4.0,  6,  0x6bcb77,  2.4],
    [-8,  3.5, -6,  0x26c6da,  1.0],
    [ 8,  5.0,  6,  0xff8a65,  3.8],
  ];
  fishDefs.forEach(([fx, fy, fz, col, ry]) => {
    const fm = new THREE.MeshLambertMaterial({ color: col });
    // Body — scaled sphere for fish silhouette
    const bodyGeo = new THREE.SphereGeometry(0.25, 7, 5);
    const body = new THREE.Mesh(bodyGeo, fm);
    body.scale.set(2.0, 0.7, 1.0);
    body.position.set(fx, fy, fz);
    body.rotation.y = ry;
    group.add(body);
    // Tail — small cone behind body
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 4), fm);
    tail.rotation.z = -Math.PI / 2;
    // offset in fish's local -x direction
    const bx = fx - Math.sin(ry) * 0.55;
    const bz = fz - Math.cos(ry) * 0.55;
    tail.position.set(bx, fy, bz);
    group.add(tail);
  });

  // Door — teal panel at front gap
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x004d5e });
  const door = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.2, 0.18), doorMat);
  door.position.set(0, 2.1, AD/2 + 0.08);
  group.add(door);

  // Door arch
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.22, 6, 12, Math.PI),
    new THREE.MeshLambertMaterial({ color: 0x0097a7 })
  );
  arch.rotation.z = Math.PI;
  arch.position.set(0, 4.3, AD/2 + 0.08);
  group.add(arch);

  // Sign above door
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512; signCanvas.height = 96;
  const sctx = signCanvas.getContext('2d');
  sctx.fillStyle = '#002533';
  sctx.fillRect(0, 0, 512, 96);
  sctx.font = 'bold 38px sans-serif';
  sctx.fillStyle = '#4dd0e1';
  sctx.textAlign = 'center';
  sctx.fillText("🐟  Elliot's Aquarium", 256, 62);
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 1.4),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas), transparent: true })
  );
  signMesh.position.set(0, AH - 0.6, AD/2 + 0.2);
  group.add(signMesh);

  // Interior lighting — blue-tinted warm glow
  const aquaLight = new THREE.PointLight(0x4dd0e1, 1.4, 26);
  aquaLight.position.set(0, 6, 0);
  group.add(aquaLight);

  group.userData.label = "Elliot's Aquarium";
  return group;
}

// ---------------------------------------------------------------------------
// Campfire — stone ring, crossed logs, animated flame cones + warm light
// ---------------------------------------------------------------------------

function makeCampfire() {
  const group = new THREE.Group();

  // Stone ring
  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.SphereGeometry(0.28, 5, 4), stoneMat);
    stone.position.set(Math.cos(angle) * 0.95, 0.18, Math.sin(angle) * 0.95);
    stone.scale.set(1.3, 0.65, 0.9);
    group.add(stone);
  }

  // Crossed logs
  const logMat = new THREE.MeshLambertMaterial({ color: 0x5c3317 });
  [-0.45, 0.45].forEach(ry => {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 2.6, 6), logMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = ry;
    log.position.y = 0.16;
    group.add(log);
  });

  // Flame group (animated via userData.flames)
  const flames = new THREE.Group();
  flames.position.y = 0.35;
  // Outer base — red
  const flameBase = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.55, 8), new THREE.MeshBasicMaterial({ color: 0xcc2200 }));
  flameBase.position.set(0, 0.27, 0); flames.add(flameBase);
  // Mid — orange
  const flameMid = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.0, 8), new THREE.MeshBasicMaterial({ color: 0xff6600 }));
  flameMid.position.set(0, 0.5, 0); flames.add(flameMid);
  // Tip — yellow
  const flameTip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0xffdd44 }));
  flameTip.position.set(0, 0.7, 0); flames.add(flameTip);
  group.add(flames);
  group.userData.flames = flames;

  // Warm fire light
  const fireLight = new THREE.PointLight(0xff7722, 2.0, 22);
  fireLight.position.y = 1.5;
  group.add(fireLight);
  group.userData.fireLight = fireLight;

  return group;
}

// ---------------------------------------------------------------------------
// Open garage — 3-wall corrugated shed, open front, truck + workbench inside
// ---------------------------------------------------------------------------

function makeOpenGarage() {
  const GW = 18, GH = 7, GD = 16;
  const T = 0.5;
  const group = new THREE.Group();

  const wallMat = new THREE.MeshLambertMaterial({ color: 0x7d8fa0, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a6e7d });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x7a7a7a });
  const postMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 });

  // Concrete floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.06;
  group.add(floor);

  // Left wall
  const gWallL = new THREE.Mesh(new THREE.BoxGeometry(T, GH, GD), wallMat);
  gWallL.position.set(-GW/2, GH/2, 0); group.add(gWallL);
  // Right wall
  const gWallR = new THREE.Mesh(new THREE.BoxGeometry(T, GH, GD), wallMat);
  gWallR.position.set(GW/2, GH/2, 0); group.add(gWallR);
  // Back wall
  const gWallB = new THREE.Mesh(new THREE.BoxGeometry(GW + T, GH, T), wallMat);
  gWallB.position.set(0, GH/2, GD/2); group.add(gWallB);

  // Roof (with front overhang)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(GW + 1.5, 0.55, GD + 3.5), roofMat);
  roof.position.set(0, GH + 0.27, -0.8);
  group.add(roof);

  // Front support posts
  [-GW/2 + 0.5, GW/2 - 0.5].forEach(px => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, GH, 0.45), postMat);
    post.position.set(px, GH/2, -GD/2);
    group.add(post);
  });

  // Workbench along back wall
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(GW - 3, 0.14, 2.0), benchMat);
  bench.position.set(0, 4.2, GD/2 - 1.5);
  group.add(bench);
  // Bench legs
  for (const bx of [-GW/2 + 2.5, GW/2 - 2.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.2, 0.18), benchMat);
    leg.position.set(bx, 2.1, GD/2 - 1.5);
    group.add(leg);
  }

  // Tool rack — hooks on back wall
  const hookMat = new THREE.MeshLambertMaterial({ color: 0x9a9a9a });
  for (let i = -3; i <= 3; i++) {
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 5), hookMat);
    hook.rotation.z = Math.PI / 2;
    hook.position.set(i * 1.9, 5.8, GD/2 - 0.5);
    group.add(hook);
  }

  // Oil drums in right corner
  const drumMat = new THREE.MeshLambertMaterial({ color: 0x2c5282 });
  [[GW/2 - 1.5, GD/2 - 2.2], [GW/2 - 3.5, GD/2 - 2.2]].forEach(([dx, dz]) => {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 2.1, 8), drumMat);
    drum.position.set(dx, 1.05, dz);
    group.add(drum);
  });

  // Red pickup truck (body + cab + wheels)
  const truckBodyMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
  const truckBody = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.0, 8.0), truckBodyMat);
  truckBody.position.set(-4.5, 1.85, 1.5);
  group.add(truckBody);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.2, 4.2),
    new THREE.MeshLambertMaterial({ color: 0xa93226 }));
  cab.position.set(-4.5, 3.5, -2.0);
  group.add(cab);
  // Windscreen tint
  const glass = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.6, 0.15),
    new THREE.MeshLambertMaterial({ color: 0x7fb3d3, transparent: true, opacity: 0.6 }));
  glass.position.set(-4.5, 3.5, -4.05);
  group.add(glass);
  // Wheels
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const hubMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
  [[-1.8, 0.5], [1.8, 0.5], [-1.8, -5.5], [1.8, -5.5]].forEach(([wx, wz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.65, 10), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(-4.5 + wx, 0.9, 1.5 + wz);
    group.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.68, 6), hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(-4.5 + wx, 0.9, 1.5 + wz);
    group.add(hub);
  });

  // "GARAGE" sign spanning the open front entrance
  const sc = document.createElement('canvas');
  sc.width = 512; sc.height = 80;
  const sctx = sc.getContext('2d');
  sctx.fillStyle = '#2d3748';
  sctx.fillRect(0, 0, 512, 80);
  sctx.fillStyle = '#fbbf24';
  sctx.font = 'bold 52px sans-serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('🔧 GARAGE', 256, 40);
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 1.1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, side: THREE.DoubleSide })
  );
  signMesh.position.set(0, GH - 0.55, -GD/2 - 0.05);
  group.add(signMesh);

  group.userData.label = 'Garage';
  return group;
}

// ---------------------------------------------------------------------------
// Explorable library — hollow building with door gap, rich interior
// Door is on the -z face so after rotation y=1.1 it faces the town path
// ---------------------------------------------------------------------------

function makeLibraryBuilding() {
  const LW = 28, LH = 10, LD = 24;
  const DOOR_W = 5, DOOR_H = 4.8;
  const T = 0.5;
  const group = new THREE.Group();

  const wallMat  = new THREE.MeshLambertMaterial({ color: C.library, side: THREE.DoubleSide });
  const roofMat  = new THREE.MeshLambertMaterial({ color: C.roofDark });
  const shelfMat = new THREE.MeshLambertMaterial({ color: 0x7b4d2a });
  const floorMat = new THREE.MeshLambertMaterial({ color: 0xc09060 });
  const deskMat  = new THREE.MeshLambertMaterial({ color: 0x8b5e3c });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x6b3d1a });
  const bookCols = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6,
                    0x1abc9c, 0xe67e22, 0x2c3e50, 0xc0392b, 0x27ae60,
                    0xd35400, 0x2980b9, 0x8e44ad, 0x16a085];

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(LW - T, LD - T), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.06;
  group.add(floor);

  // ── Walls (DoubleSide so inside faces are visible) ──
  // Left wall (-x)
  const lWallL = new THREE.Mesh(new THREE.BoxGeometry(T, LH, LD), wallMat);
  lWallL.position.set(-LW/2, LH/2, 0); group.add(lWallL);
  // Right wall (+x)
  const lWallR = new THREE.Mesh(new THREE.BoxGeometry(T, LH, LD), wallMat);
  lWallR.position.set(LW/2, LH/2, 0); group.add(lWallR);
  // Back wall (+z face, solid — window decor only)
  const lWallB = new THREE.Mesh(new THREE.BoxGeometry(LW + T, LH, T), wallMat);
  lWallB.position.set(0, LH/2, LD/2); group.add(lWallB);
  // Front wall (-z face) — TWO panels flanking door + lintel
  const sideW = (LW - DOOR_W) / 2;
  [-1, 1].forEach(side => {
    const fw = new THREE.Mesh(new THREE.BoxGeometry(sideW, LH, T), wallMat);
    fw.position.set(side * (DOOR_W/2 + sideW/2), LH/2, -LD/2);
    group.add(fw);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + T, LH - DOOR_H, T), wallMat);
  lintel.position.set(0, DOOR_H + (LH - DOOR_H)/2, -LD/2);
  group.add(lintel);

  // Door frame (wood trim)
  const fTop = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.5, 0.3, 0.7), frameMat);
  fTop.position.set(0, DOOR_H + 0.15, -LD/2);
  group.add(fTop);
  [-DOOR_W/2 - 0.2, DOOR_W/2 + 0.2].forEach(fx => {
    const fSide = new THREE.Mesh(new THREE.BoxGeometry(0.3, DOOR_H, 0.7), frameMat);
    fSide.position.set(fx, DOOR_H/2, -LD/2);
    group.add(fSide);
  });

  // Roof (flat with slight overhang)
  const roof = new THREE.Mesh(new THREE.BoxGeometry(LW + 2, 1.0, LD + 2), roofMat);
  roof.position.set(0, LH + 0.5, 0);
  group.add(roof);

  // Exterior sign above door (outside the -z face)
  const sc = document.createElement('canvas');
  sc.width = 640; sc.height = 96;
  const sctx = sc.getContext('2d');
  sctx.fillStyle = '#a29bfe';
  sctx.fillRect(0, 0, 640, 96);
  sctx.fillStyle = '#ffffff';
  sctx.font = 'bold 58px serif';
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText('📚  LIBRARY', 320, 48);
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 1.05),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, side: THREE.BackSide })
  );
  signMesh.position.set(0, LH - 0.9, -LD/2 - 0.12);
  group.add(signMesh);

  // ── Interior ──

  // Checkout desk near entrance (-z side)
  const deskBase = new THREE.Mesh(new THREE.BoxGeometry(8, 3.4, 2.2), deskMat);
  deskBase.position.set(0, 1.7, -LD/2 + 5);
  group.add(deskBase);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.2, 2.5), new THREE.MeshLambertMaterial({ color: 0x9b6a3d }));
  deskTop.position.set(0, 3.5, -LD/2 + 5);
  group.add(deskTop);

  // Back wall bookshelves (at +z)
  for (let sx = -10; sx <= 10; sx += 5) {
    const ws = new THREE.Mesh(new THREE.BoxGeometry(4.6, 7.5, 0.6), shelfMat);
    ws.position.set(sx, 4.5, LD/2 - 1);
    group.add(ws);
    for (let b = 0; b < 10; b++) {
      const bk = new THREE.Mesh(
        new THREE.BoxGeometry(0.33, 5.8, 0.5),
        new THREE.MeshLambertMaterial({ color: bookCols[(b + sx + 14) % bookCols.length] })
      );
      bk.position.set(sx - 2.0 + b * 0.44, 4.5, LD/2 - 0.75);
      group.add(bk);
    }
  }

  // Left wall shelves
  for (let sz = -7; sz <= 6; sz += 3.5) {
    const ws = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 3.2), shelfMat);
    ws.position.set(-LW/2 + 1, 4, sz);
    group.add(ws);
    for (let b = 0; b < 6; b++) {
      const bk = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 4.5, 0.5),
        new THREE.MeshLambertMaterial({ color: bookCols[(b + sz + 20) % bookCols.length] })
      );
      bk.position.set(-LW/2 + 0.9, 4, sz - 1.4 + b * 0.55);
      group.add(bk);
    }
  }

  // Right wall shelves
  for (let sz = -7; sz <= 6; sz += 3.5) {
    const ws = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 3.2), shelfMat);
    ws.position.set(LW/2 - 1, 4, sz);
    group.add(ws);
    for (let b = 0; b < 6; b++) {
      const bk = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 4.5, 0.5),
        new THREE.MeshLambertMaterial({ color: bookCols[(b + sz + 7) % bookCols.length] })
      );
      bk.position.set(LW/2 - 0.9, 4, sz - 1.4 + b * 0.55);
      group.add(bk);
    }
  }

  // Free-standing shelf stacks creating aisles (back half)
  for (const sz of [2, 6]) {
    for (let sx = -9; sx <= 9; sx += 4.5) {
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7, 3.8), shelfMat);
      stack.position.set(sx, 4, sz);
      group.add(stack);
      for (let b = 0; b < 8; b++) {
        const bc = bookCols[(b + sx * 2 + sz + 25) % bookCols.length];
        for (const face of [-0.27, 0.27]) {
          const bk = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 5, 0.45),
            new THREE.MeshLambertMaterial({ color: bc })
          );
          bk.position.set(sx + face, 4.2, sz + (b - 3.5) * 0.5);
          group.add(bk);
        }
      }
    }
  }

  // Reading tables (middle section)
  const tblMat2 = new THREE.MeshLambertMaterial({ color: 0xc8a870 });
  const seatMat = new THREE.MeshLambertMaterial({ color: 0x6b3a1f });
  for (const [tx, tz] of [[-6, -2], [6, -2]]) {
    const tbl = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.14, 2.5), tblMat2);
    tbl.position.set(tx, 3.5, tz);
    group.add(tbl);
    // Table legs
    for (const [lx, lz] of [[-2.3,-1],[2.3,-1],[-2.3,1],[2.3,1]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.5, 0.2), shelfMat);
      leg.position.set(tx + lx, 1.75, tz + lz);
      group.add(leg);
    }
    // Chairs
    for (const [cx, cz, ry] of [[-3,0,Math.PI/2],[3,0,-Math.PI/2],[0,-1.6,0],[0,1.6,Math.PI]]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.85), seatMat);
      seat.position.set(tx + cx, 2.85, tz + cz);
      group.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.8, 0.1), seatMat);
      back.position.set(tx + cx * 1.2, 3.3, tz + cz * 1.25);
      back.rotation.y = ry;
      group.add(back);
    }
  }

  // Cosy armchair in back-right corner
  const chairMat = new THREE.MeshLambertMaterial({ color: 0x8e44ad });
  const armBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.2), chairMat);
  armBody.position.set(LW/2 - 3.5, 1.4, LD/2 - 4.5);
  group.add(armBody);
  const armBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.45), new THREE.MeshLambertMaterial({ color: 0x9b59b6 }));
  armBack.position.set(LW/2 - 3.5, 2.5, LD/2 - 3.3);
  group.add(armBack);
  [-1.0, 1.0].forEach(ax => {
    const ar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 2.2), new THREE.MeshLambertMaterial({ color: 0x9b59b6 }));
    ar.position.set(LW/2 - 3.5 + ax, 2.25, LD/2 - 4.5);
    group.add(ar);
  });
  // Side table by armchair
  const sideTable = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 10), tblMat2);
  sideTable.position.set(LW/2 - 1.5, 3.0, LD/2 - 4.5);
  group.add(sideTable);

  // Floor lamps (warm pools of light)
  [[-LW/4, -3], [LW/4, -3], [0, 4]].forEach(([lx, lz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6.2, 6), new THREE.MeshLambertMaterial({ color: 0x999999 }));
    post.position.set(lx, 3.2, lz);
    group.add(post);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.3, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff8d0, side: THREE.BackSide }));
    shade.position.set(lx, 6.5, lz);
    group.add(shade);
    const pl = new THREE.PointLight(0xfff8d0, 1.1, 26);
    pl.position.set(lx, 7, lz);
    group.add(pl);
  });

  group.userData.label = 'Library';
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
  const bakery = makeBuilding(12, 8, 9, C.bakery, C.roofDark, { solarPanels: true, label: 'Bakery', signText: '🍞 Bakery', signBg: 0xfde8c9, signColor: 0x6b2f00 });
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

  // Bakery awning — wide striped canopy over door (kept low, below sign)
  const awningL = box(6.5, 0.18, 2.2, 0xe17055);
  awningL.position.set(-60, bakeryBase + 3.8, -35.6);
  awningL.rotation.x = -0.28;
  scene.add(awningL);
  for (let i = -2; i <= 2; i++) {
    const stripe = box(0.6, 0.19, 2.2, 0xffffff);
    stripe.position.set(-60 + i * 1.1, bakeryBase + 3.82, -35.6);
    stripe.rotation.x = -0.28;
    scene.add(stripe);
  }
  for (const sx of [-62.5, -57.5]) {
    const pole = cylinder(0.1, 0.1, 1.5, 0x8b6914, 5);
    pole.position.set(sx, bakeryBase + 3.05, -36.4);
    scene.add(pole);
  }


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
  const postOffice = makeBuilding(10, 7, 8, C.postOffice, C.roofDark, { solarPanels: false, label: 'Post Office', signText: '📮 Post Office', signBg: 0xffffff, signColor: 0xcc2222 });
  placeOnTerrain(postOffice, 60, -40);
  postOffice.rotation.y = -0.2;
  scene.add(postOffice);

  const poBase = getHeight(60, -40);

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

  // One large red pillar box at the Post Office entrance
  const pillarBox = makePostbox();
  placeOnTerrain(pillarBox, 52, -36);
  scene.add(pillarBox);

  // Small American-style mailboxes at residential/delivery spots around the island
  const mailboxSpots = [
    [-52, -36],   // Bakery side
    [0,   12],    // Town Square north
    [-12, -8],    // Town Square west
    [80,  50],    // Library
    [-80, 52],    // Workshop
    [-175, 72],   // Farm entrance
    [5,   215],   // Dock
    [-25, -215],  // South Beach
    [25,  -68],   // Residential east
    [-35, -72],   // Residential west
    [35,  18],    // Near post office path junction
    [-65, -20],   // Near bakery
    [80,  20],    // Near library
    [-80, 20],    // Near workshop
    [-30, -80],   // Residential area
    [30,  -80],   // Residential area
    [-170, 70],   // Near farm
    [30,  200],   // Near Jack's cottage
    [-42, -80],   // Near Barney's home
  ];
  for (const [px, pz] of mailboxSpots) {
    const mb = makeMailbox();
    placeOnTerrain(mb, px, pz);
    mb.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mb);
  }

  // =====================================================================
  // LIBRARY (80, 40)
  // =====================================================================
  const library = makeLibraryBuilding();
  placeOnTerrain(library, 80, 40);
  library.rotation.y = 1.1;
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
  // GARAGE / WORKSHOP (-80, 40) — open-front shed with truck inside
  // =====================================================================
  const workshop = makeOpenGarage();
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
  dock.position.set(0, -1.0, 262); // push out toward water
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

  // Campfire in the forest clearing
  const campfire = makeCampfire();
  placeOnTerrain(campfire, 183, 122);
  scene.add(campfire);

  // A small clearing bench beside the campfire
  const forestBench = makeBench();
  placeOnTerrain(forestBench, 178, 116);
  forestBench.rotation.y = 2.4; // face the fire
  scene.add(forestBench);

  // =====================================================================
  // THE HILLTOP (-100, -180)
  // =====================================================================
  const windmillGroup = makeWindmill();
  placeOnTerrain(windmillGroup, -100, -180);
  scene.add(windmillGroup);

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

  // =====================================================================
  // THE ANCHOR — Pub/Inn (-30, -70)
  // =====================================================================
  const pub = makeBuilding(13, 7, 10, 0xc8a56e, 0x5c3d1e, { solarPanels: false, label: 'The Anchor', signText: '⚓ The Anchor', signBg: 0x1a1a2e, signColor: 0xffd700 });
  placeOnTerrain(pub, -30, -70);
  pub.rotation.y = 0.1;
  scene.add(pub);

  // =====================================================================
  // SCHOOL (40, -70)
  // =====================================================================
  const school = makeBuilding(18, 7, 12, 0xf9ca24, 0x6ab04c, { solarPanels: true, label: 'School', signText: '🏫 School', signBg: 0xffffff, signColor: 0x333333 });
  placeOnTerrain(school, 40, -70);
  school.rotation.y = -0.15;
  scene.add(school);

  // =====================================================================
  // THE CAFÉ (5, -55)
  // =====================================================================
  const cafeBuilding = makeBuilding(10, 6, 8, 0xf0e6d3, 0x5c3d1e, {
    solarPanels: false,
    label: 'The Café',
    signText: '☕ The Café',
    signBg: 0x2d1a0e,
    signColor: 0xffd700,
  });
  placeOnTerrain(cafeBuilding, 5, -55);
  cafeBuilding.rotation.y = 0.15;
  scene.add(cafeBuilding);

  // Outdoor café seating
  for (const [tx, tz] of [[14, -50], [16, -56], [14, -62]]) {
    const ct = makeCafeTable();
    placeOnTerrain(ct, tx, tz);
    scene.add(ct);
  }
  // Potted plants flanking café door
  for (const [px, pz] of [[9, -52], [2, -52]]) {
    const pot = cylinder(0.5, 0.6, 0.8, 0x8b6914, 8);
    placeOnTerrain(pot, px, pz, 0.4);
    scene.add(pot);
    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.65, 6, 5), mat(C.foliage));
    placeOnTerrain(plant, px, pz, 1.3);
    scene.add(plant);
  }
  // Café paths
  makePath(scene, 0, 0, 5, -55, 3);
  makePath(scene, 5, -55, -30, -70, 3);
  makePath(scene, 5, -55, 40, -70, 3);

  // =====================================================================
  // ELLIOT'S AQUARIUM (150, -80)
  // =====================================================================
  const aquarium = makeAquarium();
  placeOnTerrain(aquarium, 150, -80);
  aquarium.rotation.y = -0.6;  // faces roughly toward town
  scene.add(aquarium);

  // Small decorative pond outside aquarium entrance
  const pondGeo = new THREE.CircleGeometry(3.5, 14);
  pondGeo.rotateX(-Math.PI / 2);
  const pond = new THREE.Mesh(pondGeo, mat(C.water));
  placeOnTerrain(pond, 163, -92, 0.15);
  scene.add(pond);

  // Potted sea-plants flanking aquarium entrance
  for (const [px, pz] of [[158, -94], [168, -90]]) {
    const potA = cylinder(0.55, 0.65, 0.85, 0x1a6fa8, 8);
    placeOnTerrain(potA, px, pz, 0.42);
    scene.add(potA);
    const topA = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 5), mat(0x4dd0e1));
    placeOnTerrain(topA, px, pz, 1.35);
    scene.add(topA);
  }

  // Path: Post Office → Aquarium
  makePath(scene, 60, -40, 150, -80, 3);

  // =====================================================================
  // HOME PLAQUES — nameplate sign next to each NPC's front door
  // =====================================================================
  const homePlaqueData = [
    [-71, -56, "Mabel's"],
    [73,  -56, "Gus's"],
    [-194, 92, "Fern's"],
    [-11,  10, "Olive's"],
    [91,   56, "Rosa's"],
    [31,  202, "Jack's"],
    [-194, 67, "Pete's"],
    [-40, -76, "Barney's"],
    [-4,  -61, "Suki's"],
    [53,  -80, "Clara's"],
    [57,  -58, "Rex's"],
    [-92, 30, "Otto's"],
  ];
  for (const [px, pz, name] of homePlaqueData) {
    const plaque = makeHomePlaque(name);
    placeOnTerrain(plaque, px, pz);
    scene.add(plaque);
  }

  // =====================================================================
  // CLOUDS & SUN
  // =====================================================================
  const cloudList = buildClouds(scene);
  makeSunDisc(scene);

  // =====================================================================
  // BUILDING COLLIDERS — OBB rectangles { cx, cz, hw, hd, rot }
  // hw = half-width (local x), hd = half-depth (local z), rot = world rot
  // Library uses per-wall segments so player can walk through the door gap.
  // The open garage has no front wall so is intentionally not listed.
  // =====================================================================
  const colliders = [
    // Bakery (-60, -40)  12×9 building, rot 0.3
    { cx: -60, cz: -40, hw: 6,   hd: 4.5, rot: 0.3  },
    // Post Office (60, -40)  10×8, rot -0.2
    { cx:  60, cz: -40, hw: 5,   hd: 4,   rot: -0.2 },
    // The Anchor pub (-30, -70)  13×10, rot 0.1
    { cx: -30, cz: -70, hw: 6.5, hd: 5,   rot: 0.1  },
    // School (40, -70)  18×12, rot -0.15
    { cx:  40, cz: -70, hw: 9,   hd: 6,   rot: -0.15 },
    // Café (5, -55)  10×8, rot 0.15
    { cx:   5, cz: -55, hw: 5,   hd: 4,   rot: 0.15 },
    // Barn (-180, 70)  approx 14×10, rot 0.2
    { cx: -180, cz: 70, hw: 7,   hd: 5,   rot: 0.2  },
    // Greenhouse (-160, 90)  10×14, rot 0.2
    { cx: -160, cz: 90, hw: 5,   hd: 7,   rot: 0.2  },
    // Windmill tower (-100, -180)  approx radius 3.5
    { cx: -100, cz: -180, hw: 3.5, hd: 3.5, rot: 0  },
    // Elliot's Aquarium (150, -80)  20×15, rot -0.6
    { cx: 150,  cz: -80,  hw: 10,  hd: 7.5, rot: -0.6 },

    // Library — per-wall colliders (hollow building, player enters through door gap)
    // Local positions transformed to world using Three.js rotation.y = 1.1:
    //   wx = libX + cos(rot)*lx + sin(rot)*lz
    //   wz = libZ - sin(rot)*lx + cos(rot)*lz
    // cos(1.1)≈0.4536, sin(1.1)≈0.8912, libX=80, libZ=40
    // Left wall local (-14, 0):   wx=73.650, wz=52.477
    { cx: 73.65, cz: 52.48, hw: 0.3, hd: 12,  rot: 1.1 },
    // Right wall local (14, 0):   wx=86.350, wz=27.523
    { cx: 86.35, cz: 27.52, hw: 0.3, hd: 12,  rot: 1.1 },
    // Back wall local (0, 12):    wx=90.694, wz=45.443
    { cx: 90.69, cz: 45.44, hw: 14.5, hd: 0.3, rot: 1.1 },
    // Front-left panel local (-8.25, -12):  wx=65.564, wz=41.909
    { cx: 65.56, cz: 41.91, hw: 5.8, hd: 0.3, rot: 1.1 },
    // Front-right panel local (8.25, -12):  wx=73.048, wz=27.205
    { cx: 73.05, cz: 27.21, hw: 5.8, hd: 0.3, rot: 1.1 },
  ];

  return { windmill: windmillGroup, clouds: cloudList, campfire, colliders };
}
