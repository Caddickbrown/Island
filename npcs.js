/**
 * NPC System — Time-based schedules and routines
 *
 * 8 NPCs with distinct daily schedules driven by a simulated clock.
 * 1 real second = 10 sim minutes, so a full day = 2.4 real minutes.
 */

import * as THREE from 'three';
import { getHeight, deliveryVanMesh, goodsWheatMesh, goodsFlourMesh } from './scene.js';

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
  mill:        { x: -120, z: 40   },
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

  /** Expose schedule entry for external use (CAD-254) */
  getScheduleEntry(hour) {
    return getScheduleEntry(this.schedule, hour);
  }
  /** Expose current sim hour (CAD-254) */
  _getSimHour() {
    return getSimTime();
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
// CAD-365 — Felix the Delivery Driver
// ---------------------------------------------------------------------------
// Felix drives a van around the island collecting and delivering goods.
// Route: farm → mill → bakery → café → dock → farm (repeat)
// ---------------------------------------------------------------------------

const FELIX_ROUTE = [
  { area: 'farm',      waitSec: 20, label: 'Collecting at farm 🌾' },
  { area: 'mill',      waitSec: 30, label: 'Milling flour ⚙️'      },
  { area: 'bakery',    waitSec: 15, label: 'Delivering flour 🍞'    },
  { area: 'cafe',      waitSec: 15, label: 'Delivering supplies ☕'  },
  { area: 'dock',      waitSec: 20, label: 'Collecting fish 🐟'     },
];

const FELIX_DIALOGUE = [
  "Morning! Busy day — flour run first, then fish from the dock.",
  "Mill's grinding well today. Eddy's got a good harvest on.",
  "Nearly done the rounds. Just the café left.",
  "Last run of the day. The island feeds itself, doesn't it?",
];

class DeliveryDriver {
  constructor(scene) {
    this.name = 'Felix';
    this.job = 'Delivery Driver';
    this._routeIndex = 0;
    this._waitTimer = 0;
    this._travelling = true; // start by travelling to first stop
    this._speed = 5.5; // slightly faster than walking NPCs
    this._dialogueIndex = 0;
    this._idleTime = 0;

    // Build NPC mesh (Felix — blue uniform)
    this.group = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a7bd5 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 8), bodyMat);
    torso.position.y = 1.1;
    this.group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), bodyMat);
    head.position.y = 2.0;
    this.group.add(head);
    this._head = head;

    // Eyes
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const eyeGeo = new THREE.SphereGeometry(0.065, 6, 5);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.12, 2.05, 0.26); this.group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.12, 2.05, 0.26); this.group.add(eyeR);

    // Cap — navy peaked cap for delivery driver
    const capMat = new THREE.MeshLambertMaterial({ color: 0x1a2a5e });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.14, 10), capMat);
    cap.position.set(0, 2.29, 0); this.group.add(cap);
    const peak = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.22), capMat);
    peak.position.set(0, 2.21, 0.30); this.group.add(peak);

    // Label
    this.label = this._createLabel();
    this.label.position.y = 3.2;
    this.label.visible = false;
    this.group.add(this.label);

    // Start at farm
    const startPos = AREAS.farm;
    this.group.position.set(startPos.x, getHeight(startPos.x, startPos.z), startPos.z);

    scene.add(this.group);
  }

  _createLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 176;
    const ctx = canvas.getContext('2d');
    this._drawLabel(ctx, canvas.width, canvas.height, 'Collecting at farm 🌾');
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(5, 1.72, 1);
    sprite.userData.canvas = canvas;
    sprite.userData.texture = tex;
    return sprite;
  }

  _drawLabel(ctx, w, h, activity) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const r = 18;
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r); ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h); ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r); ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Felix the Delivery Driver', w / 2, 62);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 100); ctx.lineTo(w - 40, 100); ctx.stroke();
    ctx.fillStyle = '#d0e8ff';
    ctx.font = '28px sans-serif';
    ctx.fillText(activity, w / 2, 136);
  }

  _updateLabel(activity) {
    const canvas = this.label.userData.canvas;
    const ctx = canvas.getContext('2d');
    this._drawLabel(ctx, canvas.width, canvas.height, activity);
    this.label.userData.texture.needsUpdate = true;
  }

  _applyGoodsVisibility() {
    // Decide which goods mesh is visible based on route leg
    const stop = FELIX_ROUTE[this._routeIndex];
    if (!goodsWheatMesh || !goodsFlourMesh) return;
    // Leg farm→mill: show wheat
    // Leg mill→bakery or mill→café: show flour (after milling wait)
    // Other legs: hide both
    if (this._routeIndex === 0) {
      // At farm, waiting — wheat visible
      goodsWheatMesh.visible = !this._travelling;
      goodsFlourMesh.visible = false;
    } else if (this._routeIndex === 1) {
      // Travelling to mill or waiting at mill — wheat visible, flour hidden until wait done
      goodsWheatMesh.visible = true;
      goodsFlourMesh.visible = false;
    } else if (this._routeIndex === 2 || this._routeIndex === 3) {
      // Mill→bakery or bakery→café: flour visible
      goodsWheatMesh.visible = false;
      goodsFlourMesh.visible = true;
    } else {
      // dock leg, return — nothing
      goodsWheatMesh.visible = false;
      goodsFlourMesh.visible = false;
    }
  }

  update(delta, playerPosition) {
    const stop = FELIX_ROUTE[this._routeIndex];
    const target = AREAS[stop.area];
    const pos = this.group.position;

    if (this._travelling) {
      // Move toward target
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 2.5) {
        // Arrived at stop
        this._travelling = false;
        this._waitTimer = stop.waitSec;

        // At mill: swap wheat → flour after milling wait
        if (stop.area === 'mill' && goodsWheatMesh) {
          // flour will show after wait completes (handled below)
        }
      } else {
        const nx = dx / dist;
        const nz = dz / dist;
        pos.x += nx * this._speed * delta;
        pos.z += nz * this._speed * delta;
        this.group.rotation.y = Math.atan2(nx, nz);
      }
    } else {
      // Waiting at stop
      this._waitTimer -= delta;
      this._idleTime += delta;
      this._head.position.y = 2.0 + Math.sin(this._idleTime * 1.5) * 0.04;

      if (this._waitTimer <= 0) {
        // At mill: transition wheat to flour
        if (stop.area === 'mill' && goodsWheatMesh && goodsFlourMesh) {
          goodsWheatMesh.visible = false;
          goodsFlourMesh.visible = true;
        }

        // Advance to next stop
        this._routeIndex = (this._routeIndex + 1) % FELIX_ROUTE.length;
        this._travelling = true;
        this._idleTime = 0;

        // Advance dialogue line (cycle through lines, skip first-visit line after first cycle)
        this._dialogueIndex = (this._dialogueIndex + 1) % FELIX_DIALOGUE.length;
      }
    }

    // Snap to terrain
    pos.y = getHeight(pos.x, pos.z);

    // Move van mesh alongside Felix (offset slightly to not overlap)
    if (deliveryVanMesh) {
      deliveryVanMesh.position.set(pos.x + 1.5, pos.y, pos.z);
      deliveryVanMesh.rotation.y = this.group.rotation.y;
    }

    // Keep goods packages pinned above the van
    const vanX = pos.x + 1.5;
    const vanZ = pos.z;
    if (goodsWheatMesh && goodsWheatMesh.visible) {
      goodsWheatMesh.position.set(vanX, pos.y + 1.8, vanZ);
    }
    if (goodsFlourMesh && goodsFlourMesh.visible) {
      goodsFlourMesh.position.set(vanX, pos.y + 1.8, vanZ);
    }

    // Apply goods visibility
    this._applyGoodsVisibility();

    // Label
    const playerDist = pos.distanceTo(playerPosition);
    this.label.visible = playerDist < 14;
    if (this.label.visible) {
      this._updateLabel(FELIX_ROUTE[this._routeIndex].label);
    }
  }

  /** Returns Felix's current dialogue line (called by interaction system) */
  getDialogue() {
    const hour = getSimTime();
    if (this._dialogueIndex === 0) return FELIX_DIALOGUE[0];
    if (hour >= 12 && hour < 17) return FELIX_DIALOGUE[2];
    if (hour >= 17) return FELIX_DIALOGUE[3];
    return FELIX_DIALOGUE[1];
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
    // CAD-365 — Felix the Delivery Driver
    this.felix = new DeliveryDriver(scene);
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
    // Update Felix separately (route-driven, not schedule-driven)
    this.felix.update(delta, playerPosition);
  }
}


// ===========================================================================
// CAD-254 — Job Sub-In Mechanic
// ===========================================================================
// When an NPC is on their day off (home/sleeping slot), the player can walk
// to the NPC's usual work location, press E to take over.
//
// "Day off" is detected when the NPC's *current* scheduled area is a home
// area (contains 'Home') AND it is an unusual time for that — we expose a
// helper that main.js can call.
// ===========================================================================

// Map of NPC → their primary work location (area key)
const NPC_WORK_LOCATIONS = {
  Mabel:  'bakery',
  Gus:    'postOffice',
  Fern:   'farm',
  Olive:  'townSquare',
  Rosa:   'library',
  Jack:   'dock',
  Pete:   'farm',
  Barney: 'pub',
  Suki:   'cafe',
  Clara:  'school',
  Rex:    'school',
  Otto:   'workshop',
};

// Friendly text shown when player takes over
const SUBIN_MESSAGES = {
  Mabel:  "You're running the bakery today.\nMabel waves from the clifftop.",
  Gus:    "You're sorting the post today.\nGus gives you a cheerful wave.",
  Fern:   "You're tending the farm today.\nFern gives you a grateful nod.",
  Olive:  "You're minding the shop today.\nOlive smiles from the hillside.",
  Rosa:   "You're keeping the library today.\nRosa waves from the forest path.",
  Jack:   "You're fishing at the dock today.\nJack tips his cap from the beach.",
  Pete:   "You're working the fields today.\nPete waves from over the fence.",
  Barney: "You're running The Anchor today.\nBarney winks from the garden.",
  Suki:   "You're making coffee today.\nSuki gives you a big smile.",
  Clara:  "You're teaching today.\nClara watches proudly from afar.",
  Rex:    "You're teaching science today.\nRex grins from the forest path.",
  Otto:   "You're in the workshop today.\nOtto waves a spanner at you.",
};

// Grateful dialogue next time you speak to that NPC (stored per-NPC)
const SUBIN_GRATITUDE = {
  Mabel:  "I heard you looked after the bakery for me — thank you so much!",
  Gus:    "You delivered the post? That was incredibly kind of you.",
  Fern:   "I owe you one for tending the farm. The hens were happy!",
  Olive:  "Word is you kept the shop going splendidly. I'm so grateful.",
  Rosa:   "You kept the library? The readers are very appreciative.",
  Jack:   "Heard you went fishing in my place. Hope the sea was kind to you!",
  Pete:   "You worked the fields for me? I really appreciate it.",
  Barney: "Thanks for pulling pints today — the regulars said you did grand.",
  Suki:   "You made coffee all morning? You're a star!",
  Clara:  "The class said you were brilliant. Thank you for stepping in.",
  Rex:    "I hear the science lesson went well. Cheers for covering!",
  Otto:   "Thanks for holding the fort in the workshop. Top effort.",
};

// Track which NPCs the player has subbed in for (grateful dialogue flag)
export const subInGratitude = {}; // npcName → true when they should say their gratitude line

let _subInActive = null;      // { npcName, workAreaKey } if a shift is active
let _subInTimer = 0;          // counts real seconds of shift
const SHIFT_DURATION = 120;   // 2 real minutes for a "shift"

/**
 * Returns the name of an NPC whose shift is currently open (they are home
 * during what would normally be a work period), AND whose work location is
 * near the player. Returns null if none found.
 */
export function findOpenShift(npcList, playerPos) {
  const hour = npcList[0] ? npcList[0]._getSimHour() : 0;
  for (const npc of npcList) {
    const schedEntry = npc.getScheduleEntry(hour);
    // NPC is home during what would normally be a work slot
    const isAtHome = schedEntry.area.toLowerCase().includes('home');
    if (!isAtHome) continue;

    const workAreaKey = NPC_WORK_LOCATIONS[npc.name];
    if (!workAreaKey) continue;
    const workPos = AREAS[workAreaKey];

    const dx = playerPos.x - workPos.x;
    const dz = playerPos.z - workPos.z;
    if (Math.sqrt(dx*dx + dz*dz) < 10) {
      return { npcName: npc.name, workAreaKey };
    }
  }
  return null;
}

/**
 * Start a sub-in shift for the named NPC.
 * Returns the display message to show the player.
 */
export function startSubInShift(npcName) {
  _subInActive = { npcName, startTime: Date.now() };
  _subInTimer = 0;
  return SUBIN_MESSAGES[npcName] || `You're covering for ${npcName} today.`;
}

/**
 * Update the sub-in timer. Returns "complete" message when done, else null.
 */
export function updateSubIn(deltaSec) {
  if (!_subInActive) return null;
  _subInTimer += deltaSec;
  if (_subInTimer >= SHIFT_DURATION) {
    const name = _subInActive.npcName;
    _subInActive = null;
    subInGratitude[name] = true;
    return `Shift done! You did a wonderful job.\n${name} will be grateful next time you meet.`;
  }
  return null;
}

export function isSubInActive() { return _subInActive !== null; }
export function getSubInProgress() {
  if (!_subInActive) return 0;
  return Math.min(1, _subInTimer / SHIFT_DURATION);
}

/**
 * Get and consume the gratitude line for an NPC (called when player talks to them).
 */
export function consumeGratitudeLine(npcName) {
  if (subInGratitude[npcName]) {
    delete subInGratitude[npcName];
    return SUBIN_GRATITUDE[npcName] || null;
  }
  return null;
}


// ===========================================================================
// CAD-142 — Island Energy System
// ===========================================================================
// Simulates a renewable energy balance for the island.
// Solar panels and wind turbines (visual objects exist in scene.js) produce
// energy; buildings draw it. A simple stored-energy buffer tracks surplus/
// deficit. The Centralised Maintenance building (to be added) can display this.
// ===========================================================================

const ENERGY_CONSUMERS = [
  { name: 'Bakery',        draw: 3.2 },
  { name: 'Post Office',   draw: 0.8 },
  { name: 'Library',       draw: 1.0 },
  { name: 'Workshop',      draw: 2.5 },
  { name: 'Pub',           draw: 1.8 },
  { name: 'Café',          draw: 1.5 },
  { name: 'School',        draw: 1.2 },
  { name: 'Mill',          draw: 2.0 },
  { name: 'Harbour Dock',  draw: 1.0 },
  { name: 'Farm (Pump)',   draw: 0.6 },
  { name: 'Street Lights', draw: 0.9 },
];

const TOTAL_BASE_CONSUMPTION = ENERGY_CONSUMERS.reduce((s, c) => s + c.draw, 0); // ~16.5 kW equivalent

class IslandEnergySystem {
  constructor() {
    this.stored       = 80;    // start at 80% of max (kWh equivalent, max 120)
    this.maxStored    = 120;
    this.production   = 0;
    this.consumption  = TOTAL_BASE_CONSUMPTION;
    this.status       = 'normal'; // 'abundant' | 'normal' | 'low'
  }

  update(deltaSec, dayFraction, weather) {
    // Solar output: peaks at solar noon (dayFraction 0.5), zero at night
    const solarEfficiency = weather === 'stormy' ? 0.1
                          : weather === 'cloudy'  ? 0.4
                          : 1.0;
    // dayFraction 0-1 over the full 24h sim day; solar active ~0.25-0.75
    const solarWindow = Math.max(0, Math.sin((dayFraction - 0.25) * Math.PI / 0.5));
    const solarOutput = 12.0 * solarEfficiency * solarWindow;

    // Wind output: stronger at night/morning; reduced in calm weather
    const windBase = weather === 'stormy' ? 1.4
                   : weather === 'cloudy'  ? 1.0
                   : weather === 'calm'    ? 0.3
                   : 0.8;
    const windOutput = 6.0 * windBase;

    this.production  = solarOutput + windOutput;
    this.consumption = TOTAL_BASE_CONSUMPTION;

    // Night-time lights add a little draw after sunset
    const isNight = dayFraction < 0.2 || dayFraction > 0.8;
    if (isNight) this.consumption += 1.2;

    const netKw = this.production - this.consumption;
    // Convert kW to kWh for this delta slice (deltaSec / 3600, but scaled for game time)
    // 1 real second = 10 sim minutes, so energy accumulates faster for flavour
    this.stored += (netKw * deltaSec * 10) / 3600;
    this.stored = Math.max(0, Math.min(this.maxStored, this.stored));

    const pct = this.stored / this.maxStored;
    this.status = pct > 0.6 ? 'abundant' : pct > 0.25 ? 'normal' : 'low';
  }

  getStatus() {
    return {
      stored:      parseFloat(this.stored.toFixed(1)),
      production:  parseFloat(this.production.toFixed(1)),
      consumption: parseFloat(this.consumption.toFixed(1)),
      status:      this.status,
    };
  }
}

const _energySystem = new IslandEnergySystem();

/** Update the island energy simulation. Call each frame from the game loop. */
export function updateEnergySystem(deltaSec, dayFraction, weather = 'clear') {
  _energySystem.update(deltaSec, dayFraction, weather);
}

/** Returns current energy status object. */
export function getEnergyStatus() {
  return _energySystem.getStatus();
}

// Low-energy dialogue lines injected into NPC speech when status === 'low'
const LOW_ENERGY_DIALOGUE = [
  "The energy reserves are getting a bit low — hopefully the wind picks up.",
  "Better not leave any lights on tonight, the batteries are running thin.",
  "Otto mentioned we might need to ration power this evening.",
  "The solar panels weren't getting much today. Fingers crossed for wind.",
  "Did you notice the lights flickering? Energy's running low again.",
];

/**
 * If energy status is 'low', returns a random low-energy dialogue line;
 * otherwise returns null. Use this in any NPC getDialogue() to inject
 * energy-awareness into conversation.
 */
export function getLowEnergyDialogue() {
  if (_energySystem.status !== 'low') return null;
  return LOW_ENERGY_DIALOGUE[Math.floor(Math.random() * LOW_ENERGY_DIALOGUE.length)];
}


// ===========================================================================
// CAD-234 — Solar Charging Station (Harbour)
// ===========================================================================
// A solar charging point at the harbour for electric buggies.
// NPCs driving buggies will occasionally path here to recharge.
// Physical prop should be placed at harbour coords in scene.js
// near dock { x:0, z:262 }.
// ===========================================================================

class SolarChargingStation {
  constructor() {
    this.chargeLevel = 75; // 0-100 %
    // Base charge rate: 10 % per real minute in full sun
    this._chargeRate = 10 / 60; // % per real second in full sun
    // Track which NPC buggy (if any) is currently charging
    this.chargingNpc   = null;
    this.chargingTimer = 0;
  }

  update(deltaSec, dayFraction, weather = 'clear') {
    // Charging rate follows solar production
    const solarWindow = Math.max(0, Math.sin((dayFraction - 0.25) * Math.PI / 0.5));
    const weatherMod  = weather === 'stormy' ? 0.1
                      : weather === 'cloudy'  ? 0.4
                      : 1.0;
    const rate = this._chargeRate * solarWindow * weatherMod;
    this.chargeLevel = Math.min(100, this.chargeLevel + rate * deltaSec);

    // Count down any active buggy-charging session
    if (this.chargingNpc) {
      this.chargingTimer -= deltaSec;
      if (this.chargingTimer <= 0) {
        this.chargingNpc  = null;
        this.chargingTimer = 0;
      }
    }
  }

  /** Called when a buggy NPC arrives to charge. Drains station by up to 20 %. */
  refuelBuggy(npcName) {
    const refuelAmount = Math.min(20, this.chargeLevel);
    this.chargeLevel   = Math.max(0, this.chargeLevel - refuelAmount);
    this.chargingNpc   = npcName;
    this.chargingTimer = 30; // 30 real seconds at the station
    return refuelAmount;
  }

  getChargeLevel() {
    return parseFloat(this.chargeLevel.toFixed(1));
  }

  isOccupied() {
    return this.chargingNpc !== null;
  }
}

const _solarCharging = new SolarChargingStation();

/** Update solar charging station simulation. Call each frame. */
export function updateSolarCharging(deltaSec, dayFraction, weather = 'clear') {
  _solarCharging.update(deltaSec, dayFraction, weather);
}

/** Returns current charge level (0-100). */
export function getSolarChargeLevel() {
  return _solarCharging.getChargeLevel();
}

/**
 * Trigger an NPC buggy refuelling event at the harbour station.
 * Returns amount of charge transferred.
 */
export function refuelBuggyAtStation(npcName) {
  return _solarCharging.refuelBuggy(npcName);
}

/** Returns true if an NPC buggy is currently at the station. */
export function isChargingStationOccupied() {
  return _solarCharging.isOccupied();
}

// Buggy NPC names that occasionally visit the charging station
const BUGGY_NPC_NAMES = ['Otto', 'Felix'];
let _buggyChargeCheckTimer = 0;
const BUGGY_CHARGE_CHECK_INTERVAL = 120; // check every 2 real minutes

/**
 * Tick the "should a buggy NPC visit the charging station?" logic.
 * Returns the name of an NPC heading to charge, or null.
 */
export function tickBuggyChargingBehaviour(deltaSec) {
  if (_solarCharging.isOccupied()) return null;
  _buggyChargeCheckTimer += deltaSec;
  if (_buggyChargeCheckTimer < BUGGY_CHARGE_CHECK_INTERVAL) return null;
  _buggyChargeCheckTimer = 0;
  // 30 % chance one of the buggy NPCs decides to charge
  if (Math.random() < 0.3) {
    const name = BUGGY_NPC_NAMES[Math.floor(Math.random() * BUGGY_NPC_NAMES.length)];
    _solarCharging.refuelBuggy(name);
    return name;
  }
  return null;
}


// ===========================================================================
// CAD-233 — Community Kitchen Garden (near Town Square)
// ===========================================================================
// Six vegetable plots near the town square. Growth advances over real time.
// NPCs (especially Eddy on a day off, or any passing NPC) tend the garden.
// Physical raised-bed props/signs to be added to scene.js near
// townSquare { x:0, z:0 }, e.g. at x:-15, z:15.
// ===========================================================================

const PLOT_NAMES = ['carrots', 'tomatoes', 'courgettes', 'herbs', 'beans', 'squash'];
// Growth stages: 0=seedling, 1=growing, 2=nearly ready, 3=harvest-ready, 4=harvested
const GROWTH_STAGE_LABELS = ['Seedling', 'Growing', 'Nearly Ready', 'Harvest Ready', 'Harvested'];
const GROWTH_SECONDS_PER_STAGE = 90; // ~1.5 real minutes per stage (full cycle ~6 min)
const REGROW_SECONDS = 60;            // harvested plot regrows after 1 real minute

class KitchenGarden {
  constructor() {
    this.plots = PLOT_NAMES.map((name, i) => ({
      id:          i,
      name,
      stage:       Math.floor(Math.random() * 3), // start staggered
      timer:       Math.random() * GROWTH_SECONDS_PER_STAGE,
      beingTended: false,
      tendTimer:   0,
    }));
    this._npcTendTimer = 0;
  }

  update(deltaSec) {
    for (const plot of this.plots) {
      if (plot.stage === 4) {
        // Harvested: countdown to regrow
        plot.timer += deltaSec;
        if (plot.timer >= REGROW_SECONDS) {
          plot.stage = 0;
          plot.timer = 0;
        }
      } else if (plot.stage < 3) {
        // Growing: advance through stages
        const boost = plot.beingTended ? 1.5 : 1.0; // tending speeds growth
        plot.timer += deltaSec * boost;
        if (plot.timer >= GROWTH_SECONDS_PER_STAGE) {
          plot.stage++;
          plot.timer = 0;
        }
      }
      // Stage 3 = harvest-ready: wait for player harvest, no auto-advance

      // Count down tending timer
      if (plot.beingTended) {
        plot.tendTimer -= deltaSec;
        if (plot.tendTimer <= 0) {
          plot.beingTended = false;
          plot.tendTimer   = 0;
        }
      }
    }

    // Occasionally an NPC tends a plot (flavour simulation)
    this._npcTendTimer += deltaSec;
    if (this._npcTendTimer > 45) {
      this._npcTendTimer = 0;
      // Pick a random un-tended, non-harvested plot
      const available = this.plots.filter(p => !p.beingTended && p.stage < 4);
      if (available.length > 0 && Math.random() < 0.4) {
        const pick = available[Math.floor(Math.random() * available.length)];
        pick.beingTended = true;
        pick.tendTimer   = 20; // tended for 20 real seconds
      }
    }
  }

  harvest(plotIndex) {
    const plot = this.plots[plotIndex];
    if (!plot || plot.stage !== 3) return null;
    plot.stage = 4;
    plot.timer = 0;
    return plot.name;
  }

  getState() {
    return this.plots.map(p => ({
      id:             p.id,
      name:           p.name,
      stage:          p.stage,
      stageLabel:     GROWTH_STAGE_LABELS[p.stage],
      beingTended:    p.beingTended,
      readyToHarvest: p.stage === 3,
    }));
  }

  hasHarvestReady() {
    return this.plots.some(p => p.stage === 3);
  }

  applyCompostBoost(batches) {
    // Each batch of compost shaves some time off all growing plots
    const boostSeconds = batches * 15;
    for (const plot of this.plots) {
      if (plot.stage > 0 && plot.stage < 3) {
        plot.timer = Math.min(plot.timer + boostSeconds, GROWTH_SECONDS_PER_STAGE - 1);
      }
    }
  }
}

const _kitchenGarden = new KitchenGarden();

/** Update kitchen garden simulation. Call each frame. */
export function updateKitchenGarden(deltaSec) {
  _kitchenGarden.update(deltaSec);
}

/** Returns array of plot state objects. */
export function getGardenState() {
  return _kitchenGarden.getState();
}

/**
 * Harvest a specific plot by index. Returns crop name if successful, null if
 * the plot is not at harvest-ready stage.
 */
export function harvestPlot(plotIndex) {
  return _kitchenGarden.harvest(plotIndex);
}

// Harvest-ready dialogue lines for nearby NPCs
const HARVEST_READY_DIALOGUE = [
  "The kitchen garden's looking lovely — I think the tomatoes are ready to pick!",
  "Someone should harvest those beans before they go over.",
  "The herbs are ready — pop into the garden and grab a handful if you like.",
  "Ooh, the courgettes are huge. Time for a harvest, I think!",
  "The carrots are ready. Fresh veg for the café tonight, hopefully!",
  "The squash have come up a treat this season!",
];

/**
 * If any garden plot is harvest-ready, returns a relevant dialogue line.
 * Otherwise returns null.
 */
export function getHarvestReadyDialogue() {
  if (!_kitchenGarden.hasHarvestReady()) return null;
  const readyPlots = _kitchenGarden.getState().filter(p => p.readyToHarvest);
  const plot = readyPlots[Math.floor(Math.random() * readyPlots.length)];
  const line = HARVEST_READY_DIALOGUE.find(l => l.toLowerCase().includes(plot.name));
  return line || HARVEST_READY_DIALOGUE[Math.floor(Math.random() * HARVEST_READY_DIALOGUE.length)];
}


// ===========================================================================
// CAD-232 — Composting & Foraging Systems
// ===========================================================================
// CompostSystem: kitchen waste moves through 3 stages to become ready compost,
// which feeds back into the kitchen garden as a growth boost.
// ForagingSystem: 5 spots around the island replenish on individual timers.
// ===========================================================================

// --- Compost System ---

const COMPOST_STAGE_DURATION = 120; // 2 real minutes per compost stage
const MAX_COMPOST_BATCHES    = 10;

class CompostSystem {
  constructor() {
    // Each batch: { stage: 0|1|2, timer: number }
    // Stage 0 = fresh waste, 1 = breaking down, 2 = ready
    this.batches     = [];
    this._readyCount = 0;
  }

  addWaste() {
    if (this.batches.length >= MAX_COMPOST_BATCHES) return; // bin full
    this.batches.push({ stage: 0, timer: 0 });
  }

  update(deltaSec) {
    this._readyCount = 0;
    for (const batch of this.batches) {
      if (batch.stage < 2) {
        batch.timer += deltaSec;
        if (batch.timer >= COMPOST_STAGE_DURATION) {
          batch.stage++;
          batch.timer = 0;
        }
      }
      if (batch.stage === 2) this._readyCount++;
    }
  }

  collectReady() {
    const ready = this.batches.filter(b => b.stage === 2).length;
    this.batches    = this.batches.filter(b => b.stage < 2);
    this._readyCount = 0;
    if (ready > 0) _kitchenGarden.applyCompostBoost(ready);
    return ready;
  }

  getReady() {
    return this._readyCount;
  }

  getState() {
    return {
      total:   this.batches.length,
      ready:   this._readyCount,
      batches: this.batches.map(b => ({
        stage:    b.stage,
        progress: parseFloat((b.timer / COMPOST_STAGE_DURATION).toFixed(2)),
      })),
    };
  }
}

const _compostSystem = new CompostSystem();

/** Add a unit of kitchen waste to the compost bin. */
export function addWaste() {
  _compostSystem.addWaste();
}

/** Update compost simulation. Call each frame. */
export function updateCompost(deltaSec) {
  _compostSystem.update(deltaSec);
}

/** Returns the number of ready compost batches. */
export function getCompostReady() {
  return _compostSystem.getReady();
}

/** Collect all ready compost (feeds back to kitchen garden). Returns batch count. */
export function collectCompost() {
  return _compostSystem.collectReady();
}

/** Full compost state for UI display. */
export function getCompostState() {
  return _compostSystem.getState();
}

// Auto-add waste periodically (flavour — NPCs generate kitchen waste)
let _wasteTimer = 0;
const WASTE_INTERVAL = 60; // one batch of waste per real minute

function tickWasteGeneration(deltaSec) {
  _wasteTimer += deltaSec;
  if (_wasteTimer >= WASTE_INTERVAL) {
    _wasteTimer = 0;
    _compostSystem.addWaste();
  }
}


// --- Foraging System ---
// NOTE: Physical marker props for each spot should be added to scene.js
// at the coordinates listed below (small glowing orb, foliage cluster, etc.)

const FORAGING_SPOT_DEFS = [
  { id: 'berries',   label: 'Wild Berries',     x:  160, z: -140, replenishTime: 180 },
  { id: 'mushrooms', label: 'Forest Mushrooms',  x:  185, z:  110, replenishTime: 240 },
  { id: 'seaglass',  label: 'Sea Glass',          x:   30, z: -220, replenishTime: 120 },
  { id: 'driftwood', label: 'Driftwood',           x:  -40, z: -210, replenishTime: 150 },
  { id: 'herbs',     label: 'Wild Herbs',          x:  -95, z: -175, replenishTime: 200 },
];

class ForagingSystem {
  constructor() {
    this.spots = FORAGING_SPOT_DEFS.map(s => ({ ...s, available: true, timer: 0 }));
  }

  update(deltaSec) {
    for (const spot of this.spots) {
      if (!spot.available) {
        spot.timer += deltaSec;
        if (spot.timer >= spot.replenishTime) {
          spot.available = true;
          spot.timer     = 0;
        }
      }
    }
  }

  getSpots() {
    return this.spots.map(s => ({
      id:                s.id,
      label:             s.label,
      x:                 s.x,
      z:                 s.z,
      available:         s.available,
      replenishProgress: s.available ? 1 : parseFloat((s.timer / s.replenishTime).toFixed(2)),
    }));
  }

  harvest(spotId) {
    const spot = this.spots.find(s => s.id === spotId);
    if (!spot || !spot.available) return null;
    spot.available = false;
    spot.timer     = 0;
    return spot.label;
  }
}

const _foragingSystem = new ForagingSystem();

/** Returns array of foraging spot descriptors with availability and replenish progress. */
export function getForagingSpots() {
  return _foragingSystem.getSpots();
}

/**
 * Harvest a foraging spot by ID. Returns item label if successful, null if
 * the spot is depleted or the ID is invalid.
 */
export function harvestSpot(spotId) {
  return _foragingSystem.harvest(spotId);
}

/** Update foraging replenishment timers. Call each frame. */
export function updateForaging(deltaSec) {
  _foragingSystem.update(deltaSec);
}


// ===========================================================================
// Master island-systems update — single call for the game loop
// ===========================================================================

/**
 * Update all four environmental/systems simulations in one call.
 *
 * @param {number} deltaSec    - Time since last frame in real seconds
 * @param {number} dayFraction - Current time of day as 0-1 fraction (0=midnight, 0.5=noon)
 * @param {string} [weather]   - 'clear' | 'cloudy' | 'stormy' | 'calm'
 */
export function updateIslandSystems(deltaSec, dayFraction, weather = 'clear') {
  updateEnergySystem(deltaSec, dayFraction, weather);
  updateSolarCharging(deltaSec, dayFraction, weather);
  updateKitchenGarden(deltaSec);
  updateCompost(deltaSec);
  updateForaging(deltaSec);
  tickWasteGeneration(deltaSec);
}
