export class TouchControls {
  constructor(player, weapons) {
    this.player = player;
    this.weapons = weapons;

    this.enabled = false;
    this.container = document.getElementById('touch-controls');

    this.joystickBase = document.getElementById('joystick-base');
    this.joystickStick = document.getElementById('joystick-stick');
    this.joystickZone = document.getElementById('touch-joystick-zone');
    this.lookZone = document.getElementById('touch-look-zone');

    this.moveTouchId = null;
    this.lookTouchId = null;

    this.joystickCenter = { x: 0, y: 0 };
    this.maxRadius = 50;

    this.lastLookPos = { x: 0, y: 0 };

    this.checkMobile();
  }

  checkMobile() {
    // Detect mobile touch capability or screen size
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 900);
    if (isTouch) {
      this.enable();
    }
  }

  enable() {
    this.enabled = true;
    if (this.container) {
      this.container.classList.remove('hidden');
    }
    this.initEvents();
  }

  initEvents() {
    if (!this.container) return;

    // Movement Joystick Touch Events
    if (this.joystickZone) {
      this.joystickZone.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
      this.joystickZone.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false });
      this.joystickZone.addEventListener('touchend', (e) => this.onJoystickEnd(e), { passive: false });
      this.joystickZone.addEventListener('touchcancel', (e) => this.onJoystickEnd(e), { passive: false });
    }

    // Camera Look Touch Events
    if (this.lookZone) {
      this.lookZone.addEventListener('touchstart', (e) => this.onLookStart(e), { passive: false });
      this.lookZone.addEventListener('touchmove', (e) => this.onLookMove(e), { passive: false });
      this.lookZone.addEventListener('touchend', (e) => this.onLookEnd(e), { passive: false });
      this.lookZone.addEventListener('touchcancel', (e) => this.onLookEnd(e), { passive: false });
    }

    // Action Buttons
    this.bindButton('btn-touch-fire', () => {
      this.player.mouseHeld = true;
      this.weapons.shootPrimary();
    }, () => {
      this.player.mouseHeld = false;
    });

    this.bindButton('btn-touch-alt', () => {
      this.weapons.shootAlt();
    });

    this.bindButton('btn-touch-jump', () => {
      this.player.keys.space = true;
      setTimeout(() => { this.player.keys.space = false; }, 200);
    });

    this.bindButton('btn-touch-dash', () => {
      this.player.performDash();
    });

    this.bindButton('btn-touch-interact', () => {
      this.player.keys.e = true;
      if (this.player.onInteractCallback) this.player.onInteractCallback();
      setTimeout(() => { this.player.keys.e = false; }, 200);
    });
  }

  bindButton(id, onPress, onRelease = null) {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('active');
      if (onPress) onPress();
    }, { passive: false });

    const handleRelease = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      if (onRelease) onRelease();
    };

    btn.addEventListener('touchend', handleRelease, { passive: false });
    btn.addEventListener('touchcancel', handleRelease, { passive: false });
  }

  onJoystickStart(e) {
    e.preventDefault();
    if (this.moveTouchId !== null) return;

    const touch = e.changedTouches[0];
    this.moveTouchId = touch.identifier;

    const rect = this.joystickZone.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    if (this.joystickBase) {
      this.joystickBase.style.left = `${touchX}px`;
      this.joystickBase.style.top = `${touchY}px`;
      this.joystickBase.classList.remove('hidden');
    }

    this.joystickCenter = { x: touch.clientX, y: touch.clientY };
  }

  onJoystickMove(e) {
    e.preventDefault();
    if (this.moveTouchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.moveTouchId) {
        const dx = touch.clientX - this.joystickCenter.x;
        const dy = touch.clientY - this.joystickCenter.y;
        const dist = Math.hypot(dx, dy);

        const clampedDist = Math.min(dist, this.maxRadius);
        const angle = Math.atan2(dy, dx);

        const stickX = Math.cos(angle) * clampedDist;
        const stickY = Math.sin(angle) * clampedDist;

        if (this.joystickStick) {
          this.joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;
        }

        // Map joystick vector to WASD keys
        const normX = dx / this.maxRadius;
        const normY = dy / this.maxRadius;

        this.player.keys.w = normY < -0.3;
        this.player.keys.s = normY > 0.3;
        this.player.keys.a = normX < -0.3;
        this.player.keys.d = normX > 0.3;

        break;
      }
    }
  }

  onJoystickEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.moveTouchId) {
        this.moveTouchId = null;
        this.player.keys.w = false;
        this.player.keys.s = false;
        this.player.keys.a = false;
        this.player.keys.d = false;

        if (this.joystickStick) {
          this.joystickStick.style.transform = 'translate(0px, 0px)';
        }
        if (this.joystickBase) {
          this.joystickBase.classList.add('hidden');
        }
        break;
      }
    }
  }

  onLookStart(e) {
    if (this.lookTouchId !== null) return;
    const touch = e.changedTouches[0];
    this.lookTouchId = touch.identifier;
    this.lastLookPos = { x: touch.clientX, y: touch.clientY };
  }

  onLookMove(e) {
    if (this.lookTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.lookTouchId) {
        const dx = touch.clientX - this.lastLookPos.x;
        const dy = touch.clientY - this.lastLookPos.y;

        const sensitivity = 0.005;
        this.player.yaw -= dx * sensitivity;
        this.player.pitch -= dy * sensitivity;

        const maxPitch = Math.PI / 2.1;
        this.player.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.player.pitch));

        this.lastLookPos = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  }

  onLookEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.lookTouchId) {
        this.lookTouchId = null;
        break;
      }
    }
  }
}
