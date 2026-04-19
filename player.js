import * as THREE from 'three';

// Try to import island bounds and height function from scene; fall back to defaults
let ISLAND_BOUNDS, getHeight;
try {
  const scene = await import('./scene.js');
  ISLAND_BOUNDS = scene.ISLAND_BOUNDS;
  getHeight = scene.getHeight;
} catch {
  ISLAND_BOUNDS = { minX: -280, maxX: 280, minZ: -280, maxZ: 280 };
  getHeight = () => 0;
}

export class PlayerController {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Movement state
    this.keys = { forward: false, backward: false, left: false, right: false };
    this.moveSpeed = 8; // units per second
    this.isMoving = false;

    // Camera state
    this.yaw = 0;
    this.pitch = 0.3; // slight downward look
    this.cameraDistance = 10;
    this.cameraHeight = 5;
    this.isDragging = false;
    this.mouseSensitivity = 0.003;
    this.pitchMin = -1.3;
    this.pitchMax = 1.5;

    // Camera bob
    this.bobTime = 0;
    this.bobAmount = 0.04;
    this.bobSpeed = 8;

    // Build the player mesh — a simple capsule shape
    this.player = this._createPlayerMesh();
    this.player.position.set(0, 0, 0);
    scene.add(this.player);

    // Direction vector (reused)
    this._moveDir = new THREE.Vector3();

    this._bindInput();
  }

  _createPlayerMesh() {
    const group = new THREE.Group();

    // Body — cylinder
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.2, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a9e8e, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);

    // Head — sphere
    const headGeo = new THREE.SphereGeometry(0.3, 12, 10);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf0d0a0, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.9;
    head.castShadow = true;
    group.add(head);

    // Feet — two small spheres for a bottom cap look
    const footGeo = new THREE.SphereGeometry(0.35, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const footMat = bodyMat;
    const foot = new THREE.Mesh(footGeo, footMat);
    foot.position.y = 0.4;
    foot.castShadow = true;
    group.add(foot);

    return group;
  }

  _bindInput() {
    // Keyboard
    window.addEventListener('keydown', (e) => this._onKey(e, true));
    window.addEventListener('keyup', (e) => this._onKey(e, false));

    // Mouse look
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.isDragging = true;
    });
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch += e.movementY * this.mouseSensitivity;
      this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch));
    });

    // Pointer lock alternative (right-click)
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Touch support (basic)
    let touchStart = null;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });
    canvas.addEventListener('touchmove', (e) => {
      if (!touchStart || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStart.x;
      const dy = e.touches[0].clientY - touchStart.y;
      this.yaw -= dx * this.mouseSensitivity;
      this.pitch += dy * this.mouseSensitivity;
      this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch));
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });
    canvas.addEventListener('touchend', () => { touchStart = null; });
  }

  _onKey(e, pressed) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    this.keys.forward  = pressed; break;
      case 'KeyS': case 'ArrowDown':  this.keys.backward = pressed; break;
      case 'KeyA': case 'ArrowLeft':  this.keys.left     = pressed; break;
      case 'KeyD': case 'ArrowRight': this.keys.right    = pressed; break;
    }
  }

  update(delta) {
    // Get camera forward direction projected onto XZ plane
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    // Right is perpendicular to forward
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // Build movement vector from input
    this._moveDir.set(0, 0, 0);
    if (this.keys.forward)  this._moveDir.add(forward);
    if (this.keys.backward) this._moveDir.sub(forward);
    if (this.keys.left)     this._moveDir.sub(right);
    if (this.keys.right)    this._moveDir.add(right);

    this.isMoving = this._moveDir.lengthSq() > 0;

    if (this.isMoving) {
      this._moveDir.normalize();

      this.player.position.addScaledVector(this._moveDir, this.moveSpeed * delta);

      // Face movement direction
      this.player.rotation.y = Math.atan2(this._moveDir.x, this._moveDir.z);
    }

    // Keep player on ground (follow terrain height)
    this.player.position.y = getHeight(this.player.position.x, this.player.position.z);

    // Clamp to island bounds
    const b = ISLAND_BOUNDS;
    this.player.position.x = Math.max(b.minX, Math.min(b.maxX, this.player.position.x));
    this.player.position.z = Math.max(b.minZ, Math.min(b.maxZ, this.player.position.z));

    // Camera bob
    if (this.isMoving) {
      this.bobTime += delta * this.bobSpeed;
    } else {
      // Ease bob back to zero
      this.bobTime += delta * 2;
    }
    const bobOffset = this.isMoving ? Math.sin(this.bobTime) * this.bobAmount : 0;

    // Third-person camera: position behind and above player
    const camX = this.player.position.x + Math.sin(this.yaw) * this.cameraDistance * Math.cos(this.pitch);
    const camZ = this.player.position.z + Math.cos(this.yaw) * this.cameraDistance * Math.cos(this.pitch);
    const camY = this.player.position.y + this.cameraHeight + this.cameraDistance * Math.sin(this.pitch) + bobOffset;

    this.camera.position.set(camX, camY, camZ);

    // Look at player (slightly above feet)
    this.camera.lookAt(
      this.player.position.x,
      this.player.position.y + 1.2,
      this.player.position.z
    );
  }
}
