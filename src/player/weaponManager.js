import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { sound } from '../engine/audio.js';

export class WeaponManager {
  constructor(camera, scene, player) {
    this.camera = camera;
    this.scene = scene;
    this.player = player;

    this.weapons = [
      { id: 1, name: 'REVOLVER', altCd: 0, altMaxCd: 2.0 },
      { id: 2, name: 'SHOTGUN', altCd: 0, altMaxCd: 3.5 },
      { id: 3, name: 'NAILGUN', ammo: 100, maxAmmo: 100, reloadCd: 0 },
      { id: 4, name: 'RAILCANNON', charge: 100, rechargeRate: 20 } // % per sec
    ];
    this.currentSlot = 0; // 0-indexed (Weapon 1)

    this.viewmodels = [];
    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);
    this.scene.add(this.camera);

    this.fireTimer = 0;
    this.recoil = 0;

    this.buildWeaponModels();
    this.initEvents();
  }

  buildWeaponModels() {
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222836, roughness: 0.6, metalness: 0.8 });
    const accentMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

    // 1. Revolver Viewmodel
    const revGroup = new THREE.Group();
    const revBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), gunMat);
    revBarrel.position.set(0.2, -0.22, -0.45);
    revGroup.add(revBarrel);
    const revGlow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.3), accentMat);
    revGlow.position.set(0.2, -0.16, -0.45);
    revGroup.add(revGlow);

    // 2. Shotgun Viewmodel
    const shotGroup = new THREE.Group();
    const shotBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), gunMat);
    shotBarrel.rotation.x = Math.PI / 2;
    shotBarrel.position.set(0.22, -0.25, -0.5);
    shotGroup.add(shotBarrel);

    // 3. Nailgun Viewmodel
    const nailGroup = new THREE.Group();
    const nailBody = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.6), gunMat);
    nailBody.position.set(0.25, -0.25, -0.45);
    nailGroup.add(nailBody);

    // 4. Railcannon Viewmodel
    const railGroup = new THREE.Group();
    const railBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.8), gunMat);
    railBody.position.set(0.25, -0.25, -0.55);
    const railCore = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0044 }));
    railCore.position.set(0.25, -0.25, -0.4);
    railGroup.add(railBody, railCore);

    this.viewmodels = [revGroup, shotGroup, nailGroup, railGroup];
    this.viewmodels.forEach((vm, idx) => {
      vm.visible = (idx === this.currentSlot);
      this.viewmodelGroup.add(vm);
    });
  }

  initEvents() {
    window.addEventListener('mousedown', (e) => {
      if (!this.player.isLocked || this.player.isDead) return;
      if (e.button === 0) this.shootPrimary();
      if (e.button === 2) this.shootAlt();
    });

    window.addEventListener('keydown', (e) => {
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const slot = parseInt(e.code.replace('Digit', '')) - 1;
        this.selectWeapon(slot);
      }
    });

    window.addEventListener('wheel', (e) => {
      if (!this.player.isLocked) return;
      if (e.deltaY > 0) {
        this.selectWeapon((this.currentSlot + 1) % 4);
      } else {
        this.selectWeapon((this.currentSlot + 3) % 4);
      }
    });
  }

  selectWeapon(index) {
    if (index === this.currentSlot) return;
    this.viewmodels[this.currentSlot].visible = false;
    this.currentSlot = index;
    this.viewmodels[this.currentSlot].visible = true;

    // Update UI active slot
    const slots = document.querySelectorAll('.weapon-slot');
    slots.forEach((s, idx) => {
      if (idx === index) s.classList.add('active');
      else s.classList.remove('active');
    });
  }

  shootPrimary() {
    if (this.fireTimer > 0) return;
    const w = this.weapons[this.currentSlot];

    if (w.id === 1) { // Revolver
      sound.playPistolShot();
      this.fireTimer = 0.25;
      this.recoil = 0.08;
      this.spawnRaycastShot(35 * this.player.statMultipliers.damage);
    } else if (w.id === 2) { // Shotgun
      sound.playShotgunShot();
      this.fireTimer = 0.6;
      this.recoil = 0.16;
      for (let i = 0; i < 8; i++) {
        this.spawnRaycastShot(12 * this.player.statMultipliers.damage, 0.06);
      }
    } else if (w.id === 3) { // Nailgun
      if (w.ammo <= 0) return;
      sound.playNailgunShot();
      w.ammo--;
      this.fireTimer = 0.08;
      this.recoil = 0.03;
      this.spawnRaycastShot(8 * this.player.statMultipliers.damage, 0.03);
    } else if (w.id === 4) { // Railcannon
      if (w.charge < 100) return;
      sound.playRailcannonShot();
      w.charge = 0;
      this.fireTimer = 1.0;
      this.recoil = 0.22;
      this.spawnRaycastShot(200 * this.player.statMultipliers.damage, 0.0);
    }
  }

  shootAlt() {
    const w = this.weapons[this.currentSlot];
    if (w.id === 1 && w.altCd <= 0) { // Revolver Charged Shot
      sound.playRailcannonShot();
      w.altCd = w.altMaxCd;
      this.recoil = 0.15;
      this.spawnRaycastShot(90 * this.player.statMultipliers.damage);
    } else if (w.id === 2 && w.altCd <= 0) { // Shotgun Explosive Core
      sound.playShotgunShot();
      w.altCd = w.altMaxCd;
      this.recoil = 0.18;
      this.spawnRaycastShot(120 * this.player.statMultipliers.damage, 0.02);
    }
  }

  spawnRaycastShot(damage, spread = 0.0) {
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);

    // Apply random spread offset
    if (spread > 0) {
      center.x += (Math.random() * 2 - 1) * spread;
      center.y += (Math.random() * 2 - 1) * spread;
    }

    raycaster.setFromCamera(center, this.camera);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    for (const hit of intersects) {
      // Ignore player or viewmodels
      if (hit.object.ancestorEnemy) {
        hit.object.ancestorEnemy.takeDamage(damage);
        sound.playHit();
        this.showHitMarker();
        break;
      }
      if (hit.object.isMesh && hit.object.geometry.type === 'BoxGeometry') {
        // Hit wall/floor spark effect
        break;
      }
    }
  }

  showHitMarker() {
    const hm = document.getElementById('hit-marker');
    if (hm) {
      hm.style.opacity = '1';
      setTimeout(() => { hm.style.opacity = '0'; }, 80);
    }
  }

  update(delta) {
    if (this.fireTimer > 0) this.fireTimer -= delta;

    // Cooldown updates
    this.weapons.forEach(w => {
      if (w.altCd > 0) w.altCd = Math.max(0, w.altCd - delta);
      if (w.id === 3 && w.ammo < w.maxAmmo) {
        w.reloadCd += delta;
        if (w.reloadCd >= 0.15) {
          w.ammo = Math.min(w.maxAmmo, w.ammo + 2);
          w.reloadCd = 0;
        }
      }
      if (w.id === 4 && w.charge < 100) {
        w.charge = Math.min(100, w.charge + w.rechargeRate * delta);
      }
    });

    // Recoil recovery
    if (this.recoil > 0) {
      this.viewmodelGroup.position.z = this.recoil;
      this.recoil = Math.max(0, this.recoil - delta * 1.2);
    } else {
      this.viewmodelGroup.position.z = 0;
    }
  }
}
