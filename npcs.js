/**
 * NPC System — Time-based schedules and routines
 *
 * 8 NPCs with distinct daily schedules driven by a simulated clock.
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
// Named areas — coordinates match scene.js building placements exactly
// ---------------------------------------------------------------------------
const AREAS = {
  bakery:      { x: -60,  z: -40  },
  postOffice:  { x: 60,   z: -40  },
  townSquare:  { x: 0,    z: 0    },
  library:     { x: 80,   z: 40   },
  workshop:    { x: -80,  z: 40   },
  dock:        { x: 0,    z: 262  },
  farm:        { x: -180, z: 80   },
  beach:       { x: 30,   z: -200 },
  southBeach:  { x: 0,    z: -220 },
  hilltop:     { x: -100, z: -180 },
  forestPath:  { x: 180,  z: 120  },
  pub:         { x: -30,  z: -70  },
  cafe:        { x: 5,    z: -55  },
  school:      { x: 40,   z: -70  },
  // Homes — near each NPC's primary workplace
  mabelHome:   { x: -72,  z: -58  },
  gusHome:     { x: 72,   z: -58  },
  fernHome:    { x: -195, z: 90   },
  oliveHome:   { x: -12,  z: 12   },
  rosaHome:    { x: 90,   z: 58   },
  jackHome:    { x: 30,   z: 200  },
  peteHome:    { x: -195, z: 65   },
  barneyHome:  { x: -42,  z: -78  },
  sukiHome:    { x: -5,   z: -63  },
  claraHome:   { x: 52,   z: -82  },
  rexHome:     { x: 56,   z: -60  },
  ottoHome:    { x: -94,  z: 28   },
};

// ---------------------------------------------------------------------------
// NPC schedules
// ---------------------------------------------------------------------------
// Each entry: [startHour, endHour, areaKey, activityLabel]
// Hours wrap around midnight (endHour < startHour means spans midnight)

const SCHEDULES = {
  Mabel: [
    [5,  8,  'bakery',     'Baking 🍞'],
    [8,  12, 'bakery',     'Selling bread 🥖'],
    [12, 14, 'beach',      'On break 🏖️'],
    [14, 18, 'bakery',     'Baking for tomorrow 🍞'],
    [18, 21, 'library',    'Reading 📚'],
    [21, 5,  'mabelHome',  'Sleeping 💤'],
  ],
  Gus: [
    [6,  7,  'postOffice',  'Sorting mail 📮'],
    [7,  9,  'townSquare',  'Delivering 📬'],
    [9,  11, 'library',     'Delivering 📬'],
    [11, 13, 'farm',        'Delivering 📬'],
    [13, 14, 'dock',        'Lunch break 🎣'],
    [14, 16, 'workshop',    'Delivering 📬'],
    [16, 18, 'postOffice',  'Back at base 📮'],
    [18, 22, 'bakery',      'Off-duty coffee ☕'],
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
  Jack: [
    [5,  10, 'dock',        'Fishing 🎣'],
    [10, 12, 'beach',       'Mending nets 🪢'],
    [12, 14, 'townSquare',  'Selling catch 🐟'],
    [14, 17, 'dock',        'Fishing 🎣'],
    [17, 20, 'pub',         'Having a pint 🍺'],
    [20, 5,  'jackHome',    'Sleeping 💤'],
  ],
  Pete: [
    [4,  7,  'farm',        'Tending animals 🐄'],
    [7,  12, 'farm',        'Working the fields 🌾'],
    [12, 13, 'townSquare',  'Selling produce 🥕'],
    [13, 16, 'farm',        'Harvesting 🌾'],
    [16, 19, 'workshop',    'Fixing tools 🔧'],
    [19, 21, 'pub',         'Unwinding 🍺'],
    [21, 4,  'peteHome',    'Sleeping 💤'],
  ],
  Barney: [
    [10, 14, 'pub',         'Preparing 🍺'],
    [14, 23, 'pub',         'Running The Anchor ⚓'],
    [23, 1,  'pub',         'Closing up 🍺'],
    [1,  10, 'barneyHome',  'Sleeping 💤'],
  ],
  Suki: [
    [5,  8,  'cafe',        'Opening up ☕'],
    [8,  14, 'cafe',        'Making coffee ☕'],
    [14, 15, 'townSquare',  'Lunch break 🥗'],
    [15, 19, 'cafe',        'Afternoon rush ☕'],
    [19, 21, 'library',     'Reading 📚'],
    [21, 5,  'sukiHome',    'Sleeping 💤'],
  ],
  Clara: [
    [7,  9,  'cafe',        'Morning coffee ☕'],
    [9,  15, 'school',      'Teaching 📐'],
    [15, 18, 'library',     'Marking work 📝'],
    [18, 20, 'townSquare',  'Evening stroll 🌇'],
    [20, 7,  'claraHome',   'Sleeping 💤'],
  ],
  Rex: [
    [8,  9,  'townSquare',  'Morning walk 🌅'],
    [9,  15, 'school',      'Teaching 🔬'],
    [15, 17, 'workshop',    'Woodwork club 🔨'],
    [17, 20, 'pub',         'After-school pint 🍺'],
    [20, 8,  'rexHome',     'Sleeping 💤'],
  ],
  Otto: [
    [6,  7,  'workshop',    'Early start 🌄'],
    [7,  12, 'workshop',    'Working on the truck 🔧'],
    [12, 13, 'townSquare',  'Lunch break 🥪'],
    [13, 18, 'workshop',    'Welding ⚙️'],
    [18, 20, 'pub',         'Evening pint 🍺'],
    [20, 6,  'ottoHome',    'Sleeping 💤'],
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
const LABEL_DISTANCE = 14; // show label when player within this range

const WANDER_RADIUS = 12;      // roam within this many units of the area centre
const SLEEP_WANDER_RADIUS = 2; // tiny wander when at home / sleeping

class NPC {
  constructor(name, job, color, schedule) {
    this.name = name;
    this.job = job;
    this.schedule = schedule;
    this.speed = MOVE_SPEED;
    this.idleTime = 0;

    // Wander state: pick a nearby sub-target to loiter around
    this._wanderTarget = null;
    this._wanderTimer = 0;

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

    // Eyes
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const eyeGeo = new THREE.SphereGeometry(0.065, 6, 5);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.12, 2.05, 0.26);
    this.group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.12, 2.05, 0.26);
    this.group.add(eyeR);

    // Store head reference for animation
    this._head = head;

    // Job-specific hat / accessory
    this._addAccessory(job);

    // Label sprite — two-line format: "Name the Job" / activity
    this.labelText = '';
    this.label = this._createLabel(name, job, '');
    this.label.position.y = 3.2;
    this.label.visible = false;
    this.group.add(this.label);

    // Start at scheduled location
    const entry = getScheduleEntry(schedule, getSimTime());
    const startPos = AREAS[entry.area];
    this.group.position.set(startPos.x, getHeight(startPos.x, startPos.z), startPos.z);
    this._currentArea = entry.area;
    this._currentActivity = entry.activity;
  }

  _addAccessory(job) {
    const m = color => new THREE.MeshLambertMaterial({ color });
    switch (job) {
      case 'Baker': {
        // White chef's toque
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.10, 10), m(0xfcfcfc));
        brim.position.set(0, 2.30, 0); this.group.add(brim);
        const toque = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.30, 0.44, 10), m(0xfcfcfc));
        toque.position.set(0, 2.54, 0); this.group.add(toque);
        break;
      }
      case 'Postman': {
        // Red peaked cap
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.14, 10), m(0xcc1111));
        cap.position.set(0, 2.29, 0); this.group.add(cap);
        const peak = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.22), m(0xaa0000));
        peak.position.set(0, 2.21, 0.30); this.group.add(peak);
        break;
      }
      case 'Farmer': {
        // Wide-brim straw hat
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.58, 0.07, 10), m(0xc8942e));
        brim.position.set(0, 2.26, 0); this.group.add(brim);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.30, 0.28, 10), m(0xb8841e));
        crown.position.set(0, 2.42, 0); this.group.add(crown);
        break;
      }
      case 'Librarian': {
        // Round glasses
        const gm = m(0x333333);
        [-0.13, 0.13].forEach(ox => {
          const frame = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.018, 5, 10), gm);
          frame.position.set(ox, 2.04, 0.28);
          frame.rotation.y = Math.PI / 2;
          this.group.add(frame);
        });
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.012), gm);
        bridge.position.set(0, 2.04, 0.28); this.group.add(bridge);
        break;
      }
      case 'Fisherman': {
        // Yellow sou'wester
        const sowBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.50, 0.07, 10), m(0xf0c020));
        sowBrim.position.set(0, 2.25, 0); this.group.add(sowBrim);
        const sowCap = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.20, 10), m(0xf0c020));
        sowCap.position.set(0, 2.36, 0); this.group.add(sowCap);
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.20, 0.12), m(0xe8b818));
        flap.position.set(0, 2.27, 0.28); this.group.add(flap);
        break;
      }
      case 'Barkeeper': {
        // Dark flat cap
        const flatCap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.12, 10), m(0x3a3a3a));
        flatCap.position.set(0, 2.28, 0); this.group.add(flatCap);
        const flatBrim = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.20), m(0x2a2a2a));
        flatBrim.position.set(0.02, 2.21, 0.28); this.group.add(flatBrim);
        break;
      }
      case 'Barista': {
        // Coffee-shop visor
        const visorRing = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.35, 0.10, 10), m(0x2d1a0e));
        visorRing.position.set(0, 2.27, 0); this.group.add(visorRing);
        const visorBrim = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.05, 0.20), m(0x2d1a0e));
        visorBrim.position.set(0, 2.21, 0.30); this.group.add(visorBrim);
        break;
      }
      case 'Teacher': {
        // Mortarboard
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.32, 0.14, 8), m(0x1a1a2e));
        base.position.set(0, 2.33, 0); this.group.add(base);
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.72), m(0x1a1a2e));
        board.position.set(0, 2.45, 0); this.group.add(board);
        const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 0.20, 4), m(0xd4a853));
        tassel.position.set(0.20, 2.37, 0.20); this.group.add(tassel);
        break;
      }
      case 'Shopkeeper': {
        // Flower hair decoration
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.10, 4), m(0x2ecc71));
        stem.position.set(0.24, 2.18, -0.06); this.group.add(stem);
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.10, 6, 5), m(0xff6eb4));
        bloom.position.set(0.24, 2.26, -0.06); this.group.add(bloom);
        break;
      }
      case 'Engineer': {
        // Yellow hard hat
        const hardHat = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.16, 10), m(0xf6c90e));
        hardHat.position.set(0, 2.30, 0); this.group.add(hardHat);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), m(0xf6c90e));
        dome.position.set(0, 2.38, 0); this.group.add(dome);
        const brim = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.05, 0.28), m(0xf6c90e));
        brim.position.set(0, 2.24, 0.28); this.group.add(brim);
        break;
      }
      default: break;
    }
  }

  _createLabel(name, job, activity) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 176;
    const ctx = canvas.getContext('2d');
    this._drawLabel(ctx, canvas.width, canvas.height, name, job, activity);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(5, 1.72, 1);
    sprite.userData.canvas = canvas;
    sprite.userData.texture = texture;
    return sprite;
  }

  _drawLabel(ctx, w, h, name, job, activity) {
    ctx.clearRect(0, 0, w, h);

    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const r = 18;
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

    // Name + job — "Gus the Postman"
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${name} the ${job}`, w / 2, 62);

    // Divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 100);
    ctx.lineTo(w - 40, 100);
    ctx.stroke();

    // Activity — smaller, slightly dimmer
    ctx.fillStyle = '#d0e8ff';
    ctx.font = '28px sans-serif';
    ctx.fillText(activity || '', w / 2, 136);
  }

  _updateLabel(name, job, activity) {
    const key = `${name}|${job}|${activity}`;
    if (key === this.labelText) return;
    this.labelText = key;

    const canvas = this.label.userData.canvas;
    const ctx = canvas.getContext('2d');
    this._drawLabel(ctx, canvas.width, canvas.height, name, job, activity);
    this.label.userData.texture.needsUpdate = true;
  }

  update(delta, playerPosition) {
    const hour = getSimTime();
    const entry = getScheduleEntry(this.schedule, hour);
    this._currentArea = entry.area;
    this._currentActivity = entry.activity;

    const areaCenter = AREAS[entry.area];
    const pos = this.group.position;
    const isSleeping = entry.area.toLowerCase().includes('home');
    const distToCenter = Math.sqrt((pos.x - areaCenter.x) ** 2 + (pos.z - areaCenter.z) ** 2);

    if (isSleeping && distToCenter < 4) {
      // Arrived home — nod head and stand still
      this.idleTime += delta;
      this._head.rotation.x = 0.38 + Math.sin(this.idleTime * 0.5) * 0.06;
      this._head.position.y = 2.0;
    } else if (isSleeping) {
      // Walk directly to home centre (no wander sub-targets while sleeping)
      const hDir = new THREE.Vector3(areaCenter.x - pos.x, 0, areaCenter.z - pos.z).normalize();
      pos.x += hDir.x * this.speed * delta;
      pos.z += hDir.z * this.speed * delta;
      this.group.rotation.y = Math.atan2(hDir.x, hDir.z);
      this._head.rotation.x = 0;
    } else {
      // Normal wander behaviour
      this._head.rotation.x = 0;
      this._wanderTimer -= delta;
      if (!this._wanderTarget || this._wanderTimer <= 0 || distToCenter > WANDER_RADIUS * 1.5) {
        const angle = Math.random() * Math.PI * 2;
        const r = WANDER_RADIUS * 0.3 + Math.random() * WANDER_RADIUS * 0.7;
        this._wanderTarget = {
          x: areaCenter.x + Math.cos(angle) * r,
          z: areaCenter.z + Math.sin(angle) * r,
        };
        this._wanderTimer = 3 + Math.random() * 5;
      }

      const dir = new THREE.Vector3(this._wanderTarget.x - pos.x, 0, this._wanderTarget.z - pos.z);
      const dist = dir.length();

      if (dist > IDLE_THRESHOLD) {
        dir.normalize();
        pos.x += dir.x * this.speed * delta;
        pos.z += dir.z * this.speed * delta;
        this.group.rotation.y = Math.atan2(dir.x, dir.z);
        this.idleTime = 0;
      } else {
        this.idleTime += delta;
        this._head.position.y = 2.0 + Math.sin(this.idleTime * 2) * 0.05;
      }
    }

    // Snap to terrain height
    pos.y = getHeight(pos.x, pos.z);

    // Show label when player is close
    const playerDist = pos.distanceTo(playerPosition);
    this.label.visible = playerDist < LABEL_DISTANCE;
    if (this.label.visible) {
      this._updateLabel(this.name, this.job, this._currentActivity);
    }
  }
}

// ---------------------------------------------------------------------------
// NPC Manager
// ---------------------------------------------------------------------------

const NPC_DEFS = [
  { name: 'Mabel',  job: 'Baker',       color: 0xe8a87c, schedule: SCHEDULES.Mabel  },
  { name: 'Gus',    job: 'Postman',     color: 0x5b9bd5, schedule: SCHEDULES.Gus    },
  { name: 'Fern',   job: 'Farmer',      color: 0x7bc67e, schedule: SCHEDULES.Fern   },
  { name: 'Olive',  job: 'Shopkeeper',  color: 0xd4a0d4, schedule: SCHEDULES.Olive  },
  { name: 'Rosa',   job: 'Librarian',   color: 0xa29bfe, schedule: SCHEDULES.Rosa   },
  { name: 'Jack',   job: 'Fisherman',   color: 0xc47d52, schedule: SCHEDULES.Jack   },
  { name: 'Pete',   job: 'Farmer',      color: 0x8db87a, schedule: SCHEDULES.Pete   },
  { name: 'Barney', job: 'Barkeeper',   color: 0xd4a853, schedule: SCHEDULES.Barney },
  { name: 'Suki',   job: 'Barista',     color: 0xf4c77e, schedule: SCHEDULES.Suki   },
  { name: 'Clara',  job: 'Teacher',     color: 0x74b9e8, schedule: SCHEDULES.Clara  },
  { name: 'Rex',    job: 'Teacher',     color: 0x6ec97b, schedule: SCHEDULES.Rex    },
  { name: 'Otto',   job: 'Engineer',    color: 0xe17055, schedule: SCHEDULES.Otto   },
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
