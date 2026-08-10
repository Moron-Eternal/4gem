import * as THREE from '../vendor/three.module.js';
import { sound } from '../engine/audio.js';

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Movement
    this.moveSpeed = 16.0;
    this.jumpForce = 11.0;
    this.gravity = 28.0;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    // Dash
    this.maxDashCharges = 3;
    this.dashCharges = 3;
    this.dashRechargeRate = 1.8;
    this.dashTimer = 0;
    this.dashImpulse = 36.0;

    // Health
    this.maxHealth = 100;
    this.health = 100;
    this.isDead = false;
    this.statMultipliers = {
      speed: 1.0, damage: 1.0, cooldown: 1.0,
      bloodFuel: false, steelArmor: 1.0
    };

    // Camera
    this.isLocked = false;
    this.pitch = 0;
    this.yaw = 0;

    // Input
    this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false, e: false };
    this.mouseHeld = false; // Track mouse button for auto-fire

    // Camera shake
    this.shakeIntensity = 0;

    // Bound event handlers for cleanup
    this._onKeyDown = (e) => this.onKeyDown(e);
    this._onKeyUp = (e) => this.onKeyUp(e);
    this._onClick = () => {
      if (!this.isLocked && !this.isDead) this.domElement.requestPointerLock();
    };
    this._onPointerLockChange = () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      if (!this.isLocked) this.mouseHeld = false;
    };
    this._onMouseMove = (e) => {
      if (!this.isLocked || this.isDead) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      const maxPitch = Math.PI / 2.1;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    };
    this._onMouseDown = (e) => {
      if (e.button === 0) this.mouseHeld = true;
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this.mouseHeld = false;
    };

    this.initControls();
  }

  initControls() {
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    this.domElement.addEventListener('click', this._onClick);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.domElement.removeEventListener('click', this._onClick);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
  }

  onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': this.keys.w = true; break;
      case 'KeyA': this.keys.a = true; break;
      case 'KeyS': this.keys.s = true; break;
      case 'KeyD': this.keys.d = true; break;
      case 'KeyE': this.keys.e = true; break;
      case 'Space': this.keys.space = true; break;
      case 'ShiftLeft': case 'ShiftRight':
        if (!this.keys.shift) this.performDash();
        this.keys.shift = true;
        break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': this.keys.w = false; break;
      case 'KeyA': this.keys.a = false; break;
      case 'KeyS': this.keys.s = false; break;
      case 'KeyD': this.keys.d = false; break;
      case 'KeyE': this.keys.e = false; break;
      case 'Space': this.keys.space = false; break;
      case 'ShiftLeft': case 'ShiftRight': this.keys.shift = false; break;
    }
  }

  performDash() {
    if (this.dashCharges >= 1 && !this.isDead) {
      this.dashCharges--;
      sound.playDash();

      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      if (forward.lengthSq() > 0) forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      let dashDir = new THREE.Vector3();
      if (this.keys.w) dashDir.add(forward);
      if (this.keys.s) dashDir.sub(forward);
      if (this.keys.d) dashDir.add(right);
      if (this.keys.a) dashDir.sub(right);

      if (dashDir.lengthSq() === 0) dashDir.copy(forward);
      else dashDir.normalize();

      this.velocity.x = dashDir.x * this.dashImpulse;
      this.velocity.z = dashDir.z * this.dashImpulse;
      this.shakeCamera(0.2);
    }
  }

  takeDamage(amount) {
    if (this.isDead) return;
    const actualDamage = amount * this.statMultipliers.steelArmor;
    this.health = Math.max(0, this.health - actualDamage);
    sound.playPlayerHurt();
    this.shakeCamera(0.4);

    const vignette = document.getElementById('damage-vignette');
    if (vignette) {
      vignette.style.boxShadow = 'inset 0 0 120px rgba(255, 0, 40, 0.8)';
      setTimeout(() => {
        vignette.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0)';
      }, 200);
    }

    if (this.health <= 0) this.isDead = true;
  }

  heal(amount) {
    if (this.isDead) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  shakeCamera(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  applyRoomCollisions(currentRoom) {
    if (!currentRoom) return;

    const pos = this.camera.position;
    const center = currentRoom.worldPos;
    const innerRadius = 11.2;
    const pRadius = 0.6;

    const minX = center.x - innerRadius + pRadius;
    const maxX = center.x + innerRadius - pRadius;
    const minZ = center.z - innerRadius + pRadius;
    const maxZ = center.z + innerRadius - pRadius;

    const doorWidth = 2.4;

    if (pos.z < minZ) {
      const inDoor = currentRoom.doors.N && !currentRoom.gateMeshes['N']?.visible && (Math.abs(pos.x - center.x) < doorWidth);
      if (!inDoor) { pos.z = minZ; this.velocity.z = 0; }
    }
    if (pos.z > maxZ) {
      const inDoor = currentRoom.doors.S && !currentRoom.gateMeshes['S']?.visible && (Math.abs(pos.x - center.x) < doorWidth);
      if (!inDoor) { pos.z = maxZ; this.velocity.z = 0; }
    }
    if (pos.x < minX) {
      const inDoor = currentRoom.doors.W && !currentRoom.gateMeshes['W']?.visible && (Math.abs(pos.z - center.z) < doorWidth);
      if (!inDoor) { pos.x = minX; this.velocity.x = 0; }
    }
    if (pos.x > maxX) {
      const inDoor = currentRoom.doors.E && !currentRoom.gateMeshes['E']?.visible && (Math.abs(pos.z - center.z) < doorWidth);
      if (!inDoor) { pos.x = maxX; this.velocity.x = 0; }
    }

    // Pillar collision
    if (currentRoom.type === 'boss' || currentRoom.type === 'combat') {
      const pillarOffsets = [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]];
      pillarOffsets.forEach(([px, pz]) => {
        const pillarX = center.x + px;
        const pillarZ = center.z + pz;
        const dx = pos.x - pillarX;
        const dz = pos.z - pillarZ;
        const dist = Math.hypot(dx, dz);
        const minDist = 1.4;
        if (dist < minDist && dist > 0) {
          const push = (minDist - dist) / dist;
          pos.x += dx * push;
          pos.z += dz * push;
        }
      });
    }
  }

  update(delta, currentRoom = null) {
    if (this.isDead) return;

    // Dash recharge
    if (this.dashCharges < this.maxDashCharges) {
      this.dashTimer += delta;
      if (this.dashTimer >= this.dashRechargeRate / this.statMultipliers.cooldown) {
        this.dashCharges++;
        this.dashTimer = 0;
      }
    }

    // Movement
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    this.direction.set(0, 0, 0);
    if (this.keys.w) this.direction.add(forward);
    if (this.keys.s) this.direction.sub(forward);
    if (this.keys.d) this.direction.add(right);
    if (this.keys.a) this.direction.sub(right);
    if (this.direction.lengthSq() > 0) this.direction.normalize();

    const speed = this.moveSpeed * this.statMultipliers.speed;
    this.velocity.x += (this.direction.x * speed - this.velocity.x) * Math.min(1.0, delta * 12.0);
    this.velocity.z += (this.direction.z * speed - this.velocity.z) * Math.min(1.0, delta * 12.0);

    // Gravity & Jump
    this.velocity.y -= this.gravity * delta;
    if (this.camera.position.y <= 1.8) {
      this.velocity.y = 0;
      this.camera.position.y = 1.8;
      if (this.keys.space) this.velocity.y = this.jumpForce;
    }

    // Apply velocity
    this.camera.position.x += this.velocity.x * delta;
    this.camera.position.y += this.velocity.y * delta;
    this.camera.position.z += this.velocity.z * delta;

    // Wall collision
    if (currentRoom) this.applyRoomCollisions(currentRoom);

    // Camera shake
    let shakeX = 0, shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() * 2 - 1) * this.shakeIntensity;
      shakeY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 2.5);
    }

    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch + shakeY * 0.1;
    euler.y = this.yaw + shakeX * 0.1;
    this.camera.quaternion.setFromEuler(euler);
  }
}
