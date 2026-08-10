import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { sound } from '../engine/audio.js';

export class WeaponManager {
  constructor(camera, scene, player) {
    this.camera = camera;
    this.scene = scene;
    this.player = player;

    this.weapons = [
      { id: 1, name: 'REVOLVER', unlocked: true, altCd: 0, altMaxCd: 2.0 },
      { id: 2, name: 'SHOTGUN', unlocked: false, altCd: 0, altMaxCd: 3.5 },
      { id: 3, name: 'NAILGUN', unlocked: false, ammo: 100, maxAmmo: 100, reloadCd: 0 },
      { id: 4, name: 'RAILCANNON', unlocked: false, charge: 100, rechargeRate: 20 }
    ];
    this.currentSlot = 0; // Starts with Revolver

    this.viewmodels = [];
    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);

    this.fireTimer = 0;
    this.recoil = 0;

    this.buildWeaponModels();
    this.initEvents();
  }

  buildWeaponModels() {
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x1f2636, roughness: 0.4, metalness: 0.85 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x0f131c, roughness: 0.6, metalness: 0.9 });
    const cyanGlow = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const redGlow = new THREE.MeshBasicMaterial({ color: 0xff2a4b });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.9 });

    // 1. REVOLVER VIEWMODEL
    const revGroup = new THREE.Group();
    const revBarrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.55), gunMat);
    revBarrel.position.set(0.28, -0.24, -0.65);
    const revCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8), darkSteel);
    revCylinder.rotation.x = Math.PI / 2;
    revCylinder.position.set(0.28, -0.27, -0.55);
    const revGrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.20, 0.09), darkSteel);
    revGrip.rotation.x = Math.PI / 6;
    revGrip.position.set(0.28, -0.34, -0.45);
    const revSight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.40), cyanGlow);
    revSight.position.set(0.28, -0.19, -0.65);
    revGroup.add(revBarrel, revCylinder, revGrip, revSight);

    // 2. SHOTGUN VIEWMODEL
    const shotGroup = new THREE.Group();
    const shotBarrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8), gunMat);
    shotBarrel1.rotation.x = Math.PI / 2;
    shotBarrel1.position.set(0.28, -0.26, -0.70);
    const shotBarrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8), gunMat);
    shotBarrel2.rotation.x = Math.PI / 2;
    shotBarrel2.position.set(0.35, -0.26, -0.70);
    const shotPump = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.28), darkSteel);
    shotPump.position.set(0.315, -0.28, -0.60);
    const shotGlow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.40), redGlow);
    shotGlow.position.set(0.315, -0.21, -0.68);
    shotGroup.add(shotBarrel1, shotBarrel2, shotPump, shotGlow);

    // 3. NAILGUN VIEWMODEL
    const nailGroup = new THREE.Group();
    const nailBody = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 0.65), gunMat);
    nailBody.position.set(0.32, -0.26, -0.68);
    const nailDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12), brassMat);
    nailDrum.position.set(0.32, -0.36, -0.58);
    const nailBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), darkSteel);
    nailBarrel.rotation.x = Math.PI / 2;
    nailBarrel.position.set(0.32, -0.24, -0.80);
    nailGroup.add(nailBody, nailDrum, nailBarrel);

    // 4. RAILCANNON VIEWMODEL
    const railGroup = new THREE.Group();
    const railBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.85), gunMat);
    railBody.position.set(0.32, -0.28, -0.75);
    const railCore = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), cyanGlow);
    railCore.position.set(0.32, -0.28, -0.60);
    const railCoil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 16), brassMat);
    railCoil.rotation.x = Math.PI / 2;
    railCoil.position.set(0.32, -0.28, -0.75);
    railGroup.add(railBody, railCore, railCoil);

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
        if (this.weapons[slot].unlocked) {
          this.selectWeapon(slot);
        }
      }
    });

    window.addEventListener('wheel', (e) => {
      if (!this.player.isLocked) return;
      const unlockedIndices = this.weapons.map((w, i) => w.unlocked ? i : -1).filter(i => i !== -1);
      if (unlockedIndices.length <= 1) return;

      const currentIdxPos = unlockedIndices.indexOf(this.currentSlot);
      if (e.deltaY > 0) {
        const nextPos = (currentIdxPos + 1) % unlockedIndices.length;
        this.selectWeapon(unlockedIndices[nextPos]);
      } else {
        const nextPos = (currentIdxPos - 1 + unlockedIndices.length) % unlockedIndices.length;
        this.selectWeapon(unlockedIndices[nextPos]);
      }
    });
  }

  unlockWeapon(slotIndex) {
    if (this.weapons[slotIndex]) {
      this.weapons[slotIndex].unlocked = true;
      this.updateUI();
    }
  }

  selectWeapon(index) {
    if (!this.weapons[index].unlocked) return;
    this.viewmodels[this.currentSlot].visible = false;
    this.currentSlot = index;
    this.viewmodels[this.currentSlot].visible = true;
    this.updateUI();
  }

  updateUI() {
    const slots = document.querySelectorAll('.weapon-slot');
    slots.forEach((s, idx) => {
      const w = this.weapons[idx];
      const nameElem = s.querySelector('.name');

      if (!w.unlocked) {
        s.classList.add('locked');
        s.classList.remove('active');
        if (nameElem) nameElem.innerText = 'LOCKED';
      } else {
        s.classList.remove('locked');
        if (nameElem) nameElem.innerText = w.name;
        if (idx === this.currentSlot) s.classList.add('active');
        else s.classList.remove('active');
      }
    });
  }

  shootPrimary() {
    if (this.fireTimer > 0) return;
    const w = this.weapons[this.currentSlot];
    if (!w.unlocked) return;

    if (w.id === 1) { // Revolver
      sound.playPistolShot();
      this.fireTimer = 0.22;
      this.recoil = 0.08;
      this.spawnRaycastShot(38 * this.player.statMultipliers.damage);
    } else if (w.id === 2) { // Shotgun
      sound.playShotgunShot();
      this.fireTimer = 0.55;
      this.recoil = 0.16;
      for (let i = 0; i < 9; i++) {
        this.spawnRaycastShot(14 * this.player.statMultipliers.damage, 0.06);
      }
    } else if (w.id === 3) { // Nailgun
      if (w.ammo <= 0) return;
      sound.playNailgunShot();
      w.ammo--;
      this.fireTimer = 0.07;
      this.recoil = 0.03;
      this.spawnRaycastShot(9 * this.player.statMultipliers.damage, 0.03);
    } else if (w.id === 4) { // Railcannon
      if (w.charge < 100) return;
      sound.playRailcannonShot();
      w.charge = 0;
      this.fireTimer = 0.9;
      this.recoil = 0.22;
      this.spawnRaycastShot(220 * this.player.statMultipliers.damage, 0.0);
    }
  }

  shootAlt() {
    const w = this.weapons[this.currentSlot];
    if (!w.unlocked) return;

    if (w.id === 1 && w.altCd <= 0) { // Charged Ricochet
      sound.playRailcannonShot();
      w.altCd = w.altMaxCd;
      this.recoil = 0.15;
      this.spawnRaycastShot(95 * this.player.statMultipliers.damage);
    } else if (w.id === 2 && w.altCd <= 0) { // Shotgun Core Eject
      sound.playShotgunShot();
      w.altCd = w.altMaxCd;
      this.recoil = 0.18;
      this.spawnRaycastShot(130 * this.player.statMultipliers.damage, 0.02);
    }
  }

  spawnRaycastShot(damage, spread = 0.0) {
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);

    if (spread > 0) {
      center.x += (Math.random() * 2 - 1) * spread;
      center.y += (Math.random() * 2 - 1) * spread;
    }

    raycaster.setFromCamera(center, this.camera);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    for (const hit of intersects) {
      if (hit.object.ancestorEnemy) {
        hit.object.ancestorEnemy.takeDamage(damage);
        sound.playHit();
        this.showHitMarker();
        break;
      }
      if (hit.object.isMesh && hit.object.geometry.type === 'BoxGeometry') {
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

    this.weapons.forEach(w => {
      if (w.altCd > 0) w.altCd = Math.max(0, w.altCd - delta);
      if (w.id === 3 && w.ammo < w.maxAmmo) {
        w.reloadCd += delta;
        if (w.reloadCd >= 0.12) {
          w.ammo = Math.min(w.maxAmmo, w.ammo + 2);
          w.reloadCd = 0;
        }
      }
      if (w.id === 4 && w.charge < 100) {
        w.charge = Math.min(100, w.charge + w.rechargeRate * delta);
      }
    });

    if (this.recoil > 0) {
      this.viewmodelGroup.position.z = this.recoil;
      this.recoil = Math.max(0, this.recoil - delta * 1.2);
    } else {
      this.viewmodelGroup.position.z = 0;
    }
  }
}
