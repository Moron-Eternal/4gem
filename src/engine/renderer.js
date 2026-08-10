import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class GameRenderer {
  constructor(container) {
    this.container = container;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06070a);
    this.scene.fog = new THREE.FogExp2(0x06070a, 0.035);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 150);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Ambient dim lighting for dark dungeon look
    this.ambientLight = new THREE.AmbientLight(0x1a2030, 0.4);
    this.scene.add(this.ambientLight);

    // Torches registration
    this.torches = [];

    // PS2 Texture Generator Helper Cache
    this.textures = this.generatePS2Textures();

    // Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
  }

  // Generate procedural retro PS2 style textures
  generatePS2Textures() {
    const createTex = (drawFn, width = 128, height = 128) => {
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
      return texture;
    };

    // Dark Grimy Stone Wall Texture
    const stoneWall = createTex((ctx, w, h) => {
      ctx.fillStyle = '#181b24';
      ctx.fillRect(0, 0, w, h);
      // Brick grid lines
      ctx.strokeStyle = '#0d0f15';
      ctx.lineWidth = 4;
      const rows = 8;
      const cols = 4;
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
      // Grimy noise overlay
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const s = Math.random() * 3 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? '#242a38' : '#080a0e';
        ctx.fillRect(x, y, s, s);
      }
    });

    // Metallic Rust Floor Texture
    const metalFloor = createTex((ctx, w, h) => {
      ctx.fillStyle = '#151922';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#2b3448';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      // Rust spots & rivets
      ctx.fillStyle = '#3a2419';
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillRect(x, y, 4, 4);
      }
      ctx.fillStyle = '#4a5775';
      const corners = [[8,8], [w-8,8], [8,h-8], [w-8,h-8]];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx - 2, cy - 2, 4, 4);
      });
    });

    // Door Gate Metal Texture
    const gateMetal = createTex((ctx, w, h) => {
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ff2a4b';
      ctx.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
      ctx.strokeStyle = '#5a121e';
      ctx.lineWidth = 4;
      ctx.strokeRect(w * 0.2, h * 0.2, w * 0.6, h * 0.6);
    });

    return { stoneWall, metalFloor, gateMetal };
  }

  registerTorch(torchLight, torchPosition) {
    this.torches.push({ light: torchLight, baseIntensity: torchLight.intensity, pos: torchPosition });
  }

  updateTorches(time) {
    // Torch flicker effect
    this.torches.forEach((torch, idx) => {
      const noise = Math.sin(time * 12 + idx * 3) * 0.15 + Math.cos(time * 23 + idx * 5) * 0.1;
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
