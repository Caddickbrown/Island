/**
 * NPC System — Time-based schedules and routines
 *
 * 5 NPCs with distinct daily schedules driven by a simulated clock.
 * 1 real second = 10 sim minutes, so a full day = 2.4 real minutes.
 */

import * as THREE from 'three';
import { getHeight } from './scene.js';

// ---------------------------------------------------------------------------
// Simulated time
// ---------------------------------------------------------------------------
let simTimeAccum = 0; // accumulated sim hours
const SIM_SPEED = 10; // 1 real second = 10 sim minutes
const startHour = 8;  // sim starts at 8am

/** Returns current simulated hour as a float (0–24). */
export function getSimTime() {
  return (startHour + simTimeAccum) % 24;
}

function advanceSimTime(deltaSec) {
  simTimeAccum += (deltaSec * SIM_SPEED) / 60; // convert sim-minutes to hours
}

// ---------------------------------------------------------------------------
// Named areas — positions derived from scene.js building placements
// ---------------------------------------------------------------------------
const AREAS = {
  bakery:      new THREE.Vector3(-15, 0, 8),
  postOffice:  new THREE.Vector3(15, 0, -8),
  townSquare:  new THREE.Vector3(0, 0, 0),
  library:     new THREE.Vector3(5, 0, -30),
  workshop:    new THREE.Vector3(35, 0, 40),
  dock:        new THREE.Vector3(70, 0, 65),
  farm:        new THREE.Vector3(-45, 0, -50),
  beach:       new THREE.Vector3(55, 0, 50),
  southBeach:  new THREE.Vector3(0, 0, 70),
  hilltop:     new THREE.Vector3(-50, 0, 30),  // near windmill
  forestPath:  new THREE.Vector3(30, 0, -42),
  // Homes — near each NPC's primary workplace
  mabelHome:   new THREE.Vector3(-20, 0, 12),
  gusHome:     new THREE.Vector3(20, 0, -12),
  fernHome:    new THREE.Vector3(-35, 0, -40),
  oliveHome:   new THREE.Vector3(5, 0, 5),
  rosaHome:    new THREE.Vector3(10, 0, -25),
};

// ---------------------------------------------------------------------------
// NPC schedules
// ---------------------------------------------------------------------------
// Each entry: [startHour, endHour, areaKey, activityLabel]
// Hours wrap around midnight (endHour < startHour means spans midnight)

const SCHEDULES = {
  Mabel: [
    [5,  8,  'bakery',     'Baking 🍞'],
    [8,  12, 'townSquare', 'Selling bread 🥖'],
    [12, 14, 'beach',      'On break 🏖️'],
    [14, 18, 'bakery',     'Baking for tomorrow 🍞'],
    [18, 21, 'library',    'Reading 📚'],
    [21, 5,  'mabelHome',  'Sleeping 💤'],
  ],
  Gus: [
    [6,  7,  'postOffice',  'Sorting mail 📮'],
    [7,  9,  'bakery',      'Delivering 📬'],
    [9,  11, 'library',     'Delivering 📬'],
    [11, 13, 'farm',        'Delivering 📬'],
    [13, 15, 'dock',        'Lunch break 🎣'],
    [15, 18, 'postOffice',  'Working 📮'],
    [18, 22, 'workshop',    'Tinkering 🔧'],
    [22, 6,  'gusHome',     'Sleeping 💤'],
  ],
  Fern: [
    [4,  12, 'farm',        'Farming 🌾'],
    [12, 13, 'townSquare',  "Farmer's market 🥕"],
    [13, 15, 'workshop',    'Building 🔨'],
    [15, 18, 'farm',        'Farming 🌾'],
    [18, 20, 'southBeach',  'Evening walk 🌅'],
    [20, 4,  'fernHome',    'Sleeping 💤'],
  ],
  Olive: [
    [8,  18, 'townSquare', 'Tending shop 🛍️'],
    [18, 20, 'hilltop',    'Evening walk 🌄'],
    [20, 23, 'library',    'Reading 📖'],
    [23, 8,  'oliveHome',  'Sleeping 💤'],
  ],
  Rosa: [
    [9,  19, 'library',     'Keeping the library 📚'],
    [19, 21, 'forestPath',  'Evening walk 🌲'],
    [21, 9,  'rosaHome',    'Sleeping 💤'],
  ],
};

function getScheduleEntry(schedule, hour) {
  for (const [start, end, area, activity] of schedule) {
    if (start < end) {
      // Normal range (e.g. 5–8)
      if (hour >= start && hour < end) return { area, activity };
    } else {
      // Wraps midnight (e.g. 21–5)
      if (hour >= start || hour < end) return { area, activity };
    }
  }
  // Fallback — shouldn't happen if schedules cover 24h
  return { area: schedule[0][2], activity: schedule[0][3] };
}

// ---------------------------------------------------------------------------
// NPC class
// ---------------------------------------------------------------------------

const MOVE_SPEED = 4; // units per second
const IDLE_THRESHOLD = 5; // distance to target to start idling
const LABEL_DISTANCE = 12; // show label when player within this range

class NPC {
  constructor(name, job, color, schedule) {
    this.name = name;
    this.job = job;
    this.schedule = schedule;
    this.speed = MOVE_SPEED;
    this.idleTime = 0;

    // Mesh group
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color });

    // Torso
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 1.2, 8),
      bodyMat
    );
    torso.position.y = 1.1;
    this.group.add(torso);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 6),
      bodyMat
    );
    head.position.y = 2.0;
    this.group.add(head);

    // Label sprite (will be updated dynamically)
    this.labelText = '';
    this.label = this._createLabel(`${name} • ${job}`);
    this.label.position.y = 2.8;
    this.label.visible = false;
    this.group.add(this.label);

    // Start at scheduled location
    const entry = getScheduleEntry(schedule, getSimTime());
    const startPos = AREAS[entry.area];
    this.group.position.set(startPos.x, getHeight(startPos.x, startPos.z), startPos.z);
    this._currentArea = entry.area;
    this._currentActivity = entry.activity;
  }

  _createLabel(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const r = 16;
    const w = canvas.width;
    const h = canvas.height;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4, 1, 1);
    sprite.userData.canvas = canvas;
    sprite.userData.texture = texture;
    return sprite;
  }

  _updateLabel(text) {
    if (text === this.labelText) return;
    this.labelText = text;

    const canvas = this.label.userData.canvas;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const r = 16;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    this.label.userData.texture.needsUpdate = true;
  }

  update(delta, playerPosition) {
    const hour = getSimTime();
    const entry = getScheduleEntry(this.schedule, hour);
    this._currentArea = entry.area;
    this._currentActivity = entry.activity;

    const target = AREAS[entry.area];
    const pos = this.group.position;
    const dir = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z);
    const dist = dir.length();

    if (dist > IDLE_THRESHOLD) {
      // Walk toward target
      dir.normalize();
      pos.x += dir.x * this.speed * delta;
      pos.z += dir.z * this.speed * delta;
      this.group.rotation.y = Math.atan2(dir.x, dir.z);
      this.idleTime = 0;
    } else {
      // Idle — gentle bobbing
      this.idleTime += delta;
      this.group.children[1].position.y = 2.0 + Math.sin(this.idleTime * 2) * 0.05;
    }

    // Snap to terrain height
    pos.y = getHeight(pos.x, pos.z);

    // Show label when player is close
    const playerDist = pos.distanceTo(playerPosition);
    this.label.visible = playerDist < LABEL_DISTANCE;
    if (this.label.visible) {
      this._updateLabel(`${this.name} • ${this._currentActivity}`);
    }
  }
}

// ---------------------------------------------------------------------------
// NPC Manager
// ---------------------------------------------------------------------------

const NPC_DEFS = [
  { name: 'Mabel', job: 'Baker',       color: 0xe8a87c, schedule: SCHEDULES.Mabel },
  { name: 'Gus',   job: 'Postman',     color: 0x5b9bd5, schedule: SCHEDULES.Gus },
  { name: 'Fern',  job: 'Farmer',      color: 0x7bc67e, schedule: SCHEDULES.Fern },
  { name: 'Olive', job: 'Shopkeeper',  color: 0xd4a0d4, schedule: SCHEDULES.Olive },
  { name: 'Rosa',  job: 'Library Keeper', color: 0xa29bfe, schedule: SCHEDULES.Rosa },
];

export class NPCManager {
  constructor(scene) {
    this.npcs = [];
    this.scene = scene;
    this._createNPCs();
  }

  _createNPCs() {
    for (const def of NPC_DEFS) {
      const npc = new NPC(def.name, def.job, def.color, def.schedule);
      this.npcs.push(npc);
      this.scene.add(npc.group);
    }
  }

  update(delta, playerPosition) {
    advanceSimTime(delta);
    for (const npc of this.npcs) {
      npc.update(delta, playerPosition);
    }
  }
}
