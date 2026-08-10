import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { sound } from '../engine/audio.js';

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Movement Parameters
    this.moveSpeed = 16.0;
    this.jumpForce = 12.0;
    this.gravity = 30.0;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    // Dash / Stamina System
    this.maxDashCharges = 3;
    this.dashCharges = 3;
    this.dashRechargeRate = 1.8; // seconds per charge
    this.dashTimer = 0;
    this.dashImpulse = 38.0;

    // Stats & Health
    this.maxHealth = 100;
    this.health = 100;
    this.isDead = false;
    this.statMultipliers = {
      speed: 1.0,
      damage: 1.0,
      cooldown: 1.0,
      bloodFuel: false,
      steelArmor: 1.0
    };

    // Camera PointerLock Controls
    this.isLocked = false;
    this.pitch = 0;
    this.yaw = 0;

    // Key states
    this.keys = {
      w: false, a: false, s: false, d: false,
      space: false, shift: false
    };

    // Camera shake & recoil
    this.shakeIntensity = 0;

    this.initControls();
  }

  initControls() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));

    this.domElement.addEventListener('click', () => {
      if (!this.isLocked && !this.isDead) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked || this.isDead) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      // Clamp pitch to prevent flipping camera
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
    });
  }

  onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': this.keys.w = true; break;
      case 'KeyA': this.keys.a = true; break;
      case 'KeyS': this.keys.s = true; break;
      case 'KeyD': this.keys.d = true; break;
      case 'Space': this.keys.space = true; break;
      case 'ShiftLeft':
      case 'ShiftRight':
        if (!this.keys.shift) {
          this.performDash();
        }
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
      case 'Space': this.keys.space = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.shift = false; break;
    }
  }

  performDash() {
    if (this.dashCharges >= 1 && !this.isDead) {
      this.dashCharges--;
      sound.playDash();

      // Compute forward/side direction relative to camera yaw
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
      const side = new THREE.Vector3(forward.z, 0, -forward.x).normalize();

      let dashDir = new THREE.Vector3();
      if (this.keys.w) dashDir.add(forward);
      if (this.keys.s) dashDir.sub(forward);
      if (this.keys.d) dashDir.add(side);
      if (this.keys.a) dashDir.sub(side);

      if (dashDir.lengthSq() === 0) {
        dashDir.copy(forward); // Default forward dash
      } else {
        dashDir.normalize();
      }

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

    // Damage vignette flash
    const vignette = document.getElementById('damage-vignette');
    if (vignette) {
      vignette.style.boxShadow = 'inset 0 0 120px rgba(255, 0, 40, 0.8)';
      setTimeout(() => {
        vignette.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0)';
      }, 250);
    }

    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  heal(amount) {
    if (this.isDead) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  shakeCamera(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  update(delta) {
    if (this.isDead) return;

    // Dash Recharge Timer
    if (this.dashCharges < this.maxDashCharges) {
      this.dashTimer += delta;
      if (this.dashTimer >= this.dashRechargeRate / this.statMultipliers.cooldown) {
        this.dashCharges++;
        this.dashTimer = 0;
      }
    }

    // WASD Direction Vector
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const side = new THREE.Vector3(forward.z, 0, -forward.x);

    this.direction.set(0, 0, 0);
    if (this.keys.w) this.direction.add(forward);
    if (this.keys.s) this.direction.sub(forward);
    if (this.keys.d) this.direction.add(side);
    if (this.keys.a) this.direction.sub(side);
    if (this.direction.lengthSq() > 0) this.direction.normalize();

    // Horizontal Movement Drag & Acceleration
    const speed = this.moveSpeed * this.statMultipliers.speed;
    this.velocity.x += (this.direction.x * speed - this.velocity.x) * Math.min(1.0, delta * 12.0);
    this.velocity.z += (this.direction.z * speed - this.velocity.z) * Math.min(1.0, delta * 12.0);

    // Gravity & Jump
    this.velocity.y -= this.gravity * delta;
    if (this.camera.position.y <= 1.8) {
      this.velocity.y = 0;
      this.camera.position.y = 1.8;
      if (this.keys.space) {
        this.velocity.y = this.jumpForce;
      }
    }

    // Apply Position Velocity
    this.camera.position.x += this.velocity.x * delta;
    this.camera.position.y += this.velocity.y * delta;
    this.camera.position.z += this.velocity.z * delta;

    // Camera Shake Offset
    let shakeX = 0, shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() * 2 - 1) * this.shakeIntensity;
      shakeY = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 2.5);
    }

    // Update Camera Rotation
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch + shakeY * 0.1;
    euler.y = this.yaw + shakeX * 0.1;
    this.camera.quaternion.setFromEuler(euler);
  }
}
