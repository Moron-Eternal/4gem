# 🧬 BioMorph - Animal Evolution Simulator & Creature Workshop

An interactive 2D neuroevolution game where you design custom articulated creatures (joints, rigid bones, contractile muscles, and angular joint limits) and release them into an evolutionary physics simulation where a population learns natural locomotion over generations.

Live development preview: `http://localhost:3000/`

---

## 🌟 Key Features

### 🛠️ In-Depth Creature Creation Workshop
- **Anatomical Node Roles**: Assign roles (*Head*, *Torso*, *Hinge Joint*, *Foot/Paw* with rubber friction pads).
- **Rigid Bones & Dynamic Muscles**: Connect joints with structural bones or contractile springs that stretch and pull according to neural signals.
- **Angular Joint Limits (Ligaments)**: Prevent unnatural flips and joint hyper-extension by setting Min/Max allowable bend angles (e.g. 30° to 160° for knees).
- **Center of Mass (CoM) Crosshair**: Real-time crosshair and plumb line showing creature balance relative to its support polygon.
- **Test Physics Mode**: Grab and toss your creature on a live grid to verify elasticity and joint limits before unleashing it.
- **Starter Presets**: Includes anatomically rigged starters:
  - 🏃 **Strider Biped**: Forward thighs, knee stops, ankle pads.
  - 🐆 **Cheetah Quad**: Flexible arching spine, front/rear leg drive.
  - 🦎 **Gecko Crawler**: Low-profile quad with lateral undulation.
  - 🦘 **Kangaroo Hopper**: Elastic tendon hopper with counterbalancing tail.

---

### 🧠 Realistic Biomechanical Physics & Neuroevolution
- **Hill-Type Muscle Dynamics**:
  - Muscles have finite maximum force (Newtons) and maximum contraction speed ($v_{max}$).
  - Muscles cannot twitch instantaneously or inject infinite energy.
- **Inelastic Ground Contact & Coulomb Friction**:
  - Eliminates "rocket bounce" glitches by setting vertical ground restitution to zero.
  - Tangential stick-slip friction allows realistic pushing off the ground.
- **Anti-Exploit Fitness Scoring**:
  - Flying Disqualification: Creatures that try flying or launching into the air without ground contact for >1.2s receive a 95% fitness penalty.
  - Inversion Penalty: Creatures tumbling head-over-heels receive a 50% penalty.
  - Metabolic Energy Penalty: Penalizes high-frequency spastic jerk to favor smooth, coordinated gaits.
- **Genetic Algorithm**:
  - Multi-Layer Perceptron (MLP) brain for each creature.
  - Elitism preserves the champion's genome across generations.
  - Crossover & Gaussian mutation discover and refine stable locomotion gaits.

---

### 🔬 Observation & Diagnostics Tools
- **Population Selector**: Run 5, 10, 20, 50, or 100 creatures simultaneously!
- **Speed Multipliers**: 0.5x, 1x, 2x, 5x, 10x, 20x, plus **Next Gen** instant skip.
- **Live Neural Brain HUD**: Watch the synapses and neurons fire in real-time as muscles contract (red) and extend (cyan).
- **Fitness Progression Graph**: Tracks Best vs. Average distance across generations.
- **Smart Camera Tracking**: Auto-follow the 👑 pack leader or pan/zoom freely.
- **Diverse Terrains**: Flat Track, Rolling Hills, Obstacle Hurdles, and Stepped Stairs.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📜 License
MIT
