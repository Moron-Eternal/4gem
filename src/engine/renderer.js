import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class GameRenderer {
  constructor(container) {
    this.container = container;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // PS2 Low-Res Downsampling Resolution (e.g. 384 x 216 or 320 x 240)
    this.renderWidth = 384;
    this.renderHeight = 216;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0c14);
    this.scene.fog = new THREE.FogExp2(0x0a0c14, 0.012); // Atmosphere fog

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 0.1, 150);

    // Main WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(1.0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Bright Ambient Lighting so dungeon walls are clearly visible
    this.ambientLight = new THREE.AmbientLight(0x404860, 1.2);
    this.scene.add(this.ambientLight);

    // Main Directional Sunlight / Dungeon Fill Light
    this.dirLight = new THREE.DirectionalLight(0xd0e0ff, 0.8);
    this.dirLight.position.set(20, 40, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.scene.add(this.dirLight);

    // Torches registration
    this.torches = [];

    // PS2 Texture Generator Helper Cache
    this.textures = this.generatePS2Textures();

    // PS2 Downsampling Render Target Setup
    this.renderTarget = new THREE.WebGLRenderTarget(this.renderWidth, this.renderHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat
    });

    // Fullscreen quad for PS2 blit pass
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMat = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture
    });
    const postGeo = new THREE.PlaneGeometry(2, 2);
    this.postQuad = new THREE.Mesh(postGeo, postMat);
    this.postScene.add(this.postQuad);

    // Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
  }

  // Generate procedural retro PS2 style textures with needsUpdate = true
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
      texture.needsUpdate = true; // Critical for WebGL GPU upload!
      return texture;
    };

    // Dark Grimy Stone Wall Texture
    const stoneWall = createTex((ctx, w, h) => {
      ctx.fillStyle = '#2b3244';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#121622';
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
      // Noise overlay
      for (let i = 0; i < 800; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const s = Math.random() * 3 + 1;
        ctx.fillStyle = Math.random() > 0.5 ? '#3d4860' : '#181e2b';
        ctx.fillRect(x, y, s, s);
      }
    });

    // Metallic Rust Floor Texture
    const metalFloor = createTex((ctx, w, h) => {
      ctx.fillStyle = '#222938';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#445270';
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      // Rust spots & rivets
      ctx.fillStyle = '#5c3a26';
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.fillRect(x, y, 4, 4);
      }
      ctx.fillStyle = '#6a7ca4';
      const corners = [[10,10], [w-10,10], [10,h-10], [w-10,h-10]];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
      });
    });

    // Door Gate Metal Texture
    const gateMetal = createTex((ctx, w, h) => {
      ctx.fillStyle = '#101420';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ff2a4b';
      ctx.fillRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);
      ctx.strokeStyle = '#801024';
      ctx.lineWidth = 6;
      ctx.strokeRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);
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

  registerTorch(torchLight, torchPosition) {
    this.torches.push({ light: torchLight, baseIntensity: torchLight.intensity, pos: torchPosition });
  }

  updateTorches(time) {
    this.torches.forEach((torch, idx) => {
      const noise = Math.sin(time * 14 + idx * 3) * 0.4 + Math.cos(time * 26 + idx * 5) * 0.3;
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

    // Render 3D Scene into PS2 low-res render target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.camera);

    // Blit low-res target onto screen for hardware PS2 pixelation crunch
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}
