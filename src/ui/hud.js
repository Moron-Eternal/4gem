export class HUDManager {
  constructor() {
    this.healthBar = document.getElementById('health-bar');
    this.healthValue = document.getElementById('health-value');
    this.dashChargesContainer = document.getElementById('dash-charges');
    this.itemsList = document.getElementById('items-list');

    this.promptContainer = document.getElementById('interaction-prompt');
    this.promptText = document.getElementById('prompt-text');

    this.roomBanner = document.getElementById('room-banner');
    this.roomBannerTitle = document.getElementById('room-banner-title');
    this.roomBannerSubtitle = document.getElementById('room-banner-subtitle');

    this.collectedItems = [];
  }

  updateHealth(currentHp, maxHp) {
    if (!this.healthBar || !this.healthValue) return;
    const pct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
    this.healthBar.style.width = `${pct}%`;
    this.healthValue.innerText = `${Math.ceil(currentHp)} / ${maxHp}`;
  }

  updateDashCharges(currentCharges, maxCharges) {
    if (!this.dashChargesContainer) return;
    let html = '';
    for (let i = 0; i < maxCharges; i++) {
      const filled = (i < currentCharges) ? 'filled' : '';
      html += `<div class="dash-pip ${filled}"></div>`;
    }
    this.dashChargesContainer.innerHTML = html;
  }

  showInteractionPrompt(text) {
    if (this.promptContainer && this.promptText) {
      this.promptText.innerText = text;
      this.promptContainer.classList.remove('hidden');
    }
  }

  hideInteractionPrompt() {
    if (this.promptContainer) {
      this.promptContainer.classList.add('hidden');
    }
  }

  updateWeaponCooldowns(weapons) {
    weapons.forEach((w, idx) => {
      const cdElem = document.getElementById(`cd-${idx + 1}`);
      if (!cdElem) return;

      if (!w.unlocked) {
        cdElem.innerText = `LOCKED`;
        cdElem.style.color = '#556688';
        return;
      }

      if (w.id === 1 || w.id === 2) {
        if (w.altCd > 0) {
          cdElem.innerText = `ALT: ${w.altCd.toFixed(1)}s`;
          cdElem.style.color = '#ff2a4b';
        } else {
          cdElem.innerText = `ALT: READY`;
          cdElem.style.color = '#00f0ff';
        }
      } else if (w.id === 3) {
        cdElem.innerText = `AMMO: ${w.ammo}`;
        cdElem.style.color = '#00f0ff';
      } else if (w.id === 4) {
        const pct = Math.floor(w.charge);
        cdElem.innerText = `CHARGE: ${pct}%`;
        cdElem.style.color = (pct >= 100) ? '#00f0ff' : '#ffaa00';
      }
    });
  }

  addCollectedItem(itemData) {
    this.collectedItems.push(itemData);
    if (!this.itemsList) return;

    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-icon">${itemData.icon}</div>
      <div class="item-details">
        <div class="item-name">${itemData.name}</div>
        <div class="item-desc">${itemData.desc}</div>
      </div>
    `;
    this.itemsList.appendChild(card);
  }

  showRoomBanner(title, subtitle) {
    if (!this.roomBanner) return;
    this.roomBannerTitle.innerText = title;
    this.roomBannerSubtitle.innerText = subtitle;
    this.roomBanner.classList.remove('hidden');

    setTimeout(() => {
      this.roomBanner.classList.add('hidden');
    }, 2500);
  }
}
