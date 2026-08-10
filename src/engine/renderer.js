import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class GameRenderer {
  constructor(container) {
    this.container = container;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08090e);
    this.scene.fog = new THREE.Fog(0x08090e, 25, 75);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.05, 150);

    // Optimized Pixelated WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    this.renderer.shadowMap.enabled = false;
    this.renderer.domElement.style.imageRendering = 'pixelated';
    this.container.appendChild(this.renderer.domElement);

    // Bright Hemisphere Light (Sky/Ground)
    this.hemiLight = new THREE.HemisphereLight(0x8090b0, 0x443322, 1.6);
    this.scene.add(this.hemiLight);

    // Warm Ambient Light
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.5);
    this.scene.add(this.ambientLight);

    // Torches registration
    this.torches = [];

    // PS2 Texture Cache
    this.textures = this.generatePS2Textures();

    // Event Listeners (bound for cleanup)
    this._onResize = () => this.onWindowResize();
    window.addEventListener('resize', this._onResize);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    this.torches.length = 0;
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
    });

    const metalFloor = createTex((ctx, w, h) => {
      ctx.fillStyle = '#333c4e';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#506080';
      ctx.lineWidth = 2;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      ctx.fillStyle = '#7080a0';
      [[6,6], [w-6,6], [6,h-6], [w-6,h-6]].forEach(([cx, cy]) => {
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
      });
    });

    const gateMetal = createTex((ctx, w, h) => {
      ctx.fillStyle = '#181c28';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#cc2244';
      ctx.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
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
    for (let i = 0; i < this.torches.length; i++) {
      const torch = this.torches[i];
      const noise = Math.sin(time * 12 + i * 2) * 0.4;
      torch.light.intensity = torch.baseIntensity + noise;
    }
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
