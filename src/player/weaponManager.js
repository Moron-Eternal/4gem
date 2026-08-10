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
    this.currentSlot = 0;

    this.viewmodels = [];
    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);
    this.scene.add(this.camera);

    this.fireTimer = 0;
    this.recoil = 0;

    this.raycaster = new THREE.Raycaster();
    this.centerVec = new THREE.Vector2(0, 0);

    this.getActiveEnemiesFn = null;

    this.buildWeaponModels();
    this.initEvents();
  }

  setGetActiveEnemiesFn(fn) {
    this.getActiveEnemiesFn = fn;
  }

  buildWeaponModels() {
    const gunMat = new THREE.MeshBasicMaterial({ color: 0x2a3040 });
    const darkMat = new THREE.MeshBasicMaterial({ color: 0x141820 });
    const cyanGlow = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const redGlow = new THREE.MeshBasicMaterial({ color: 0xff2244 });
    const brassMat = new THREE.MeshBasicMaterial({ color: 0xc4a030 });

    // 1. REVOLVER
    const revGroup = new THREE.Group();
    revGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.50), gunMat).translateX(0.28).translateY(-0.26).translateZ(-0.65));
    revGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), darkMat).translateX(0.28).translateY(-0.28).translateZ(-0.55));
    const revGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.08), darkMat);
    revGrip.position.set(0.28, -0.36, -0.48);
    revGrip.rotation.x = 0.4;
    revGroup.add(revGrip);
    revGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.38), cyanGlow).translateX(0.28).translateY(-0.21).translateZ(-0.65));

    // 2. SHOTGUN
    const shotGroup = new THREE.Group();
    const sb1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.70, 8), gunMat);
    sb1.rotation.x = Math.PI / 2; sb1.position.set(0.26, -0.25, -0.68);
    const sb2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.70, 8), gunMat);
    sb2.rotation.x = Math.PI / 2; sb2.position.set(0.34, -0.25, -0.68);
    shotGroup.add(sb1, sb2);
    shotGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.26), darkMat).translateX(0.30).translateY(-0.30).translateZ(-0.58));
    shotGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.38), redGlow).translateX(0.30).translateY(-0.20).translateZ(-0.66));

    // 3. NAILGUN
    const nailGroup = new THREE.Group();
    nailGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.58), gunMat).translateX(0.30).translateY(-0.26).translateZ(-0.66));
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 10), brassMat);
    drum.position.set(0.30, -0.36, -0.56);
    nailGroup.add(drum);
    const nb = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.30, 8), darkMat);
    nb.rotation.x = Math.PI / 2; nb.position.set(0.30, -0.24, -0.78);
    nailGroup.add(nb);

    // 4. RAILCANNON
    const railGroup = new THREE.Group();
    railGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.80), gunMat).translateX(0.30).translateY(-0.27).translateZ(-0.72));
    railGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), cyanGlow).translateX(0.30).translateY(-0.27).translateZ(-0.58));
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.02, 6, 12), brassMat);
    coil.rotation.x = Math.PI / 2; coil.position.set(0.30, -0.27, -0.72);
    railGroup.add(coil);

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
        this.selectWeapon(unlockedIndices[(currentIdxPos + 1) % unlockedIndices.length]);
      } else {
        this.selectWeapon(unlockedIndices[(currentIdxPos - 1 + unlockedIndices.length) % unlockedIndices.length]);
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

    if (w.id === 1) {
      sound.playPistolShot();
      this.fireTimer = 0.22;
      this.recoil = 0.08;
      this.spawnRaycastShot(38 * this.player.statMultipliers.damage);
    } else if (w.id === 2) {
      sound.playShotgunShot();
      this.fireTimer = 0.55;
      this.recoil = 0.16;
      for (let i = 0; i < 9; i++) {
        this.spawnRaycastShot(14 * this.player.statMultipliers.damage, 0.06);
      }
    } else if (w.id === 3) {
      if (w.ammo <= 0) return;
      sound.playNailgunShot();
      w.ammo--;
      this.fireTimer = 0.07;
      this.recoil = 0.03;
      this.spawnRaycastShot(9 * this.player.statMultipliers.damage, 0.03);
    } else if (w.id === 4) {
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
    if (w.id === 1 && w.altCd <= 0) {
      sound.playRailcannonShot();
      w.altCd = w.altMaxCd;
      this.recoil = 0.15;
      this.spawnRaycastShot(95 * this.player.statMultipliers.damage);
    } else if (w.id === 2 && w.altCd <= 0) {
      sound.playShotgunShot();
      w.altCd = w.altMaxCd;
      this.recoil = 0.18;
      this.spawnRaycastShot(130 * this.player.statMultipliers.damage, 0.02);
    }
  }

  spawnRaycastShot(damage, spread = 0.0) {
    this.centerVec.set(0, 0);
    if (spread > 0) {
      this.centerVec.x += (Math.random() * 2 - 1) * spread;
      this.centerVec.y += (Math.random() * 2 - 1) * spread;
    }
    this.raycaster.setFromCamera(this.centerVec, this.camera);

    const activeEnemies = this.getActiveEnemiesFn ? this.getActiveEnemiesFn() : [];
    const enemyGroups = activeEnemies.filter(e => !e.isDead && e.group).map(e => e.group);

    if (enemyGroups.length > 0) {
      const intersects = this.raycaster.intersectObjects(enemyGroups, true);
      for (const hit of intersects) {
        if (hit.object.ancestorEnemy) {
          hit.object.ancestorEnemy.takeDamage(damage);
          sound.playHit();
          this.showHitMarker();
          break;
        }
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
