import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class GameRenderer {
  constructor(container) {
    this.container = container;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08090e);
    // Very light fog so distant rooms fade but nearby is fully visible
    this.scene.fog = new THREE.Fog(0x08090e, 30, 80);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.05, 200);

    // WebGL Renderer - renders at LOW resolution for PS2 look
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    // PS2 pixelation: render at 1/3 resolution
    const ps2Scale = 0.35;
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(ps2Scale);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.domElement.style.imageRendering = 'pixelated';
    this.container.appendChild(this.renderer.domElement);

    // BRIGHT hemisphere light (sky/ground fill) so the dungeon is VISIBLE
    this.hemiLight = new THREE.HemisphereLight(0x8090b0, 0x443322, 1.8);
    this.scene.add(this.hemiLight);

    // Warm ambient fill
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.6);
    this.scene.add(this.ambientLight);

    // Torches registration
    this.torches = [];

    // PS2 Texture Generator
    this.textures = this.generatePS2Textures();

    // Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
  }

  generatePS2Textures() {
    const createTex = (drawFn, width = 64, height = 64) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      drawFn(ctx, width, height);
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      return texture;
    };

    // Stone Wall - brighter colors so it's visible
    const stoneWall = createTex((ctx, w, h) => {
      ctx.fillStyle = '#3a4258';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#222838';
      ctx.lineWidth = 3;
      const rows = 4;
      const cols = 2;
      const rh = h / rows;
      const cw = w / cols;
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * rh);
        ctx.lineTo(w, r * rh);
        ctx.stroke();
      }
      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (cw / 2);
        for (let c = 0; c <= cols + 1; c++) {
          ctx.beginPath();
          ctx.moveTo(c * cw - offset, r * rh);
          ctx.lineTo(c * cw - offset, (r + 1) * rh);
          ctx.stroke();
        }
      }
      for (let i = 0; i < 200; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? '#4a5570' : '#2a3040';
        ctx.fillRect(x, y, 2, 2);
      }
    });

    // Metal Floor
    const metalFloor = createTex((ctx, w, h) => {
      ctx.fillStyle = '#333c4e';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#506080';
      ctx.lineWidth = 2;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.fillStyle = '#6a4530';
      for (let i = 0; i < 30; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
      ctx.fillStyle = '#7080a0';
      [[6,6], [w-6,6], [6,h-6], [w-6,h-6]].forEach(([cx, cy]) => {
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
      });
    });

    // Gate texture
    const gateMetal = createTex((ctx, w, h) => {
      ctx.fillStyle = '#181c28';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#cc2244';
      ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
      ctx.strokeStyle = '#661122';
      ctx.lineWidth = 4;
      ctx.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
    });

    return { stoneWall, metalFloor, gateMetal };
  }

  getClonedTexture(tex, repeatX = 1, repeatY = 1) {
    const cloned = tex.clone();
    cloned.wrapS = THREE.RepeatWrapping;
    cloned.wrapT = THREE.RepeatWrapping;
    cloned.repeat.set(repeatX, repeatY);
    cloned.minFilter = THREE.NearestFilter;
    cloned.magFilter = THREE.NearestFilter;
    cloned.needsUpdate = true;
    return cloned;
  }

  registerTorch(torchLight) {
    this.torches.push({ light: torchLight, baseIntensity: torchLight.intensity });
  }

  updateTorches(time) {
    this.torches.forEach((torch, idx) => {
      const noise = Math.sin(time * 14 + idx * 3.7) * 0.5 + Math.cos(time * 23 + idx * 5.3) * 0.3;
      torch.light.intensity = torch.baseIntensity + noise;
    });
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  render(time) {
    this.updateTorches(time);
    this.renderer.render(this.scene, this.camera);
  }
}
