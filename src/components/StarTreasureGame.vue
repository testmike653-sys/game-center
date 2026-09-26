<template>
  <div class="starmaker-clone-viewport">

    <header class="video-header">
      <div class="top-row">
        <button class="back-icon">‹</button>
        <div class="star-balance-box">
          <span class="star-label">SUPER JACKPOT</span>
          <span class="star-value">{{ Math.floor(jackpots.grand).toLocaleString('ru-RU') }}</span>
        </div>
        <button class="info-icon">i</button>
      </div>
      <div class="jackpots-row">
        <div class="jackpot grand">
          <span class="jp-title">GRAND</span>
          <span class="jp-val">{{ Math.floor(jackpots.grand).toLocaleString('ru-RU') }}</span>
        </div>
        <div class="jackpot major">
          <span class="jp-title">MAJOR</span>
          <span class="jp-val">{{ Math.floor(jackpots.major).toLocaleString('ru-RU') }}</span>
        </div>
        <div class="jackpot minor">
          <span class="jp-title">MINOR</span>
          <span class="jp-val">{{ Math.floor(jackpots.minor).toLocaleString('ru-RU') }}</span>
        </div>
        <div class="jackpot mini">
          <span class="jp-title">MINI</span>
          <span class="jp-val">{{ Math.floor(jackpots.mini).toLocaleString('ru-RU') }}</span>
        </div>
      </div>

      <div class="history-bar" @click="showHistoryPage = true">
        <span class="history-title">Result</span>
        <div class="history-mini-list">
          <div class="hist-mini-item" v-for="(item, idx) in roundHistory.slice(0, 6)" :key="idx">
            <img :src="item.img" class="hist-mini-img" />
            <span class="hist-mini-mult">x{{ item.mult }}</span>
          </div>
        </div>
        <button class="history-more">Больше ❯</button>
      </div>
    </header>

    <div ref="canvasWrapper" class="engine-container">
      <div class="center-ui" v-show="!spinning">
        <span class="timer-text">
          {{ roundActive ? 'До конца раунда' : 'Крутится...' }}
        </span>
        <span class="timer-number">{{ roundTimeLeft }}</span>
        <span class="timer-text" style="margin-top:4px; font-size:10px;">
          Раунд #{{ currentRound }}
        </span>
      </div>
    </div>

    <div v-if="showHistoryPage" class="history-full-page">
      <div class="history-page-header">
        <button class="back-icon" @click="showHistoryPage = false">‹</button>
        <span class="history-page-title">История Раундов</span>
        <div style="width: 24px;"></div>
      </div>

      <div class="history-scroll-area">
        <div class="history-card" v-for="(item, idx) in roundHistory" :key="idx">
          <div class="card-left">
            <span class="round-number">Раунд {{ item.round }}</span>
          </div>
          <div class="card-right">
            <img :src="item.img" class="history-list-img" />
            <span class="history-list-mult" :class="'mult-' + item.mult">x{{ item.mult }}</span>
          </div>
        </div>
        <div v-if="roundHistory.length === 0" class="empty-history">
          Пока нет сыгранных раундов
        </div>
      </div>
    </div>

    <div v-if="showResultModal" class="result-overlay">
      <div v-if="isWin" class="modal-box win-box-modal">
        <button class="close-btn" @click="closeResult">×</button>
        <img :src="resultPlanetImg" class="res-img win-glow" />
        <h2>Поздравляем! Вы получили</h2>
        <div class="win-sum">+{{ winAmount.toLocaleString('ru-RU') }}</div>
        <div>монет</div>
      </div>
      <div v-else class="modal-box lose-box-modal">
        <button class="close-btn" @click="closeResult">×</button>
        <img :src="resultPlanetImg" class="res-img lose-img" />
        <h2>😭 Не успех!<br>Повезет в следующий раз!</h2>
      </div>
    </div>

    <footer class="video-footer">
      <button
        v-if="!showBetModal"
        class="main-bet-btn"
        :class="{ 'disabled': spinning || selectedPlanetIndex === null || loading || !roundActive }"
        @click="openBetModal"
      >
        <template v-if="spinning">КОЛЕСО КРУТИТСЯ...</template>
        <template v-else-if="!roundActive">РАУНД ЗАВЕРШЁН</template>
        <template v-else-if="loading">ОБРАБОТКА...</template>
        <template v-else-if="selectedPlanetIndex === null">ВЫБЕРИТЕ ПЛАНЕТУ</template>
        <template v-else>СДЕЛАТЬ СТАВКУ</template>
      </button>

      <div v-if="showBetModal" class="betting-sheet">
        <div class="sheet-header">
          <span>Сколько монет вы хотите поставить?</span>
          <button class="close-sheet" @click="showBetModal = false">×</button>
        </div>
        <div class="input-area">
          <span>Сумма</span>
          <input type="number" v-model.number="betInput" class="bet-input" min="1" />
        </div>
        <div class="quick-btns">
          <button @click="betInput = 10">10</button>
          <button @click="betInput = 50">50</button>
          <button @click="betInput = 100">100</button>
          <button @click="betInput = 1000">1000</button>
        </div>
        <button class="submit-btn" @click="placeBet" :disabled="loading">
          {{ loading ? 'ЖДЁМ СЕРВЕР...' : 'СТАВКА' }}
        </button>
      </div>

      <div class="stats-row">
        <div class="stat-item stat-left">
          <span>Сумма Ставки</span>
          <strong>🟡 {{ totalBetTokens }}</strong>
        </div>

        <div class="stat-item stat-center">
          <span>Мои монеты</span>
          <strong class="balance-value">🪙 {{ Math.floor(localBalance).toLocaleString('ru-RU') }}</strong>
        </div>

        <div class="stat-item stat-right">
          <span>Сегодняшний бонус</span>
          <strong>🟡 0</strong>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { Application, Container, Sprite, Assets, Text, TextStyle, Graphics } from 'pixi.js';
import gsap from 'gsap';
import { placeBetAPI } from '../services/auraApi';

const props = defineProps({
  userCoins: { type: Number, default: 0 },
  userId: { type: String, default: '' },
  userName: { type: String, default: 'Гость' },
  userTs: { type: String, default: '' },
  userSig: { type: String, default: '' },
});

const emit = defineEmits(['coins-updated']);

const localBalance = ref(props.userCoins || 1000);
const isFromApp = computed(() => !!props.userId && !!props.userSig);

watch(() => props.userCoins, (v) => {
  if (v !== null && v !== undefined) localBalance.value = v;
});

const canvasWrapper = ref(null);
const spinning = ref(false);
const loading = ref(false);
const totalBetTokens = ref(0);

const ROUND_SECONDS = 15;
const roundTimeLeft = ref(ROUND_SECONDS);
const roundActive = ref(false);
const currentRound = ref(2188);
let roundTimerId = null;
let roundStartTime = 0;

let myBetsThisRound = [];

const jackpots = ref({ grand: 2858888.0, major: 13055.0, minor: 1755.0, mini: 156.0 });
let animationFrameId = null;

const showHistoryPage = ref(false);
const roundHistory = ref([
  { round: 2187, mult: 5,  img: '/planet_pink.png' },
  { round: 2186, mult: 25, img: '/planet_gold.png' },
  { round: 2185, mult: 10, img: '/planet_fire.png' },
]);

const selectedPlanetIndex = ref(null);
const showBetModal = ref(false);
const betInput = ref(10);

const showResultModal = ref(false);
const isWin = ref(false);
const winAmount = ref(0);
const resultPlanetImg = ref('');

const sectorsData = [
  { mult: 5,  img: '/planet_pink.png',  text: 'выиграл 5 раз' },
  { mult: 5,  img: '/planet_green.png', text: 'выиграл 5 раз' },
  { mult: 5,  img: '/planet_blue.png',  text: 'выиграл 5 раз' },
  { mult: 5,  img: '/planet_cyan.png',  text: 'выиграл 5 раз' },
  { mult: 10, img: '/planet_fire.png',  text: 'выиграл 10 раз' },
  { mult: 15, img: '/planet_ruby.png',  text: 'выиграл 15 раз' },
  { mult: 25, img: '/planet_gold.png',  text: 'выиграл 25 раз' },
  { mult: 50, img: '/planet_dark.png',  text: 'выиграл 50 раз' },
];

let app = null;
let wheelContainer = null;
const planetsArray = [];
let portalSprite = null;
let bgSprite = null;

onMounted(async () => {
  await nextTick();
  await initPixiEngine();
  startJackpotAnimation();
  startRound();
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (roundTimerId) clearInterval(roundTimerId);
  if (window._auraPixiRO) {
    window._auraPixiRO.disconnect();
    window._auraPixiRO = null;
  }
  if (app) app.destroy(true, { children: true, texture: true });
});

function startRound() {
  roundStartTime = Date.now();
  roundTimeLeft.value = ROUND_SECONDS;
  roundActive.value = true;
  spinning.value = false;
  loading.value = false;
  showBetModal.value = false;
  myBetsThisRound = [];
  selectedPlanetIndex.value = null;
  totalBetTokens.value = 0;

  planetsArray.forEach((p) => {
    p.betText.text = '';
    p.highlight.visible = false;
  });

  if (roundTimerId) clearInterval(roundTimerId);
  roundTimerId = setInterval(() => {
    const elapsedMs = Date.now() - roundStartTime;
    const elapsedSec = elapsedMs / 1000;
    const remaining = Math.max(0, ROUND_SECONDS - elapsedSec);
    roundTimeLeft.value = Math.ceil(remaining);

    if (remaining <= 0) {
      clearInterval(roundTimerId);
      roundTimerId = null;
      finishRound();
    }
  }, 100);
}

async function finishRound() {
  roundActive.value = false;
  spinning.value = true;

  if (myBetsThisRound.length > 0) {
    await resolveBets();
  } else {
    spinWheelOnly();
  }
}

function startJackpotAnimation() {
  const tick = () => {
    jackpots.value.grand += 0.2;
    jackpots.value.major += 0.05;
    jackpots.value.minor += 0.02;
    jackpots.value.mini  += 0.005;
    animationFrameId = requestAnimationFrame(tick);
  };
  animationFrameId = requestAnimationFrame(tick);
}

async function initPixiEngine() {
  const container = canvasWrapper.value;
  if (!container) return;

  const width = container.clientWidth || 360;
  const height = container.clientHeight || 500;

  app = new Application();
  await app.init({
    width,
    height,
    backgroundAlpha: 1,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    antialias: true,
  });
  container.appendChild(app.canvas);

  try {
    const bgTex = await Assets.load('/bg_space.png');
    bgSprite = new Sprite(bgTex);
    app.stage.addChild(bgSprite);
  } catch (e) {
    console.warn("Фон bg_space.png не найден");
  }

  try {
    const portalTex = await Assets.load('/portal_core.png');
    portalSprite = new Sprite(portalTex);
    portalSprite.anchor.set(0.5);
    portalSprite.blendMode = 'screen';
    app.stage.addChild(portalSprite);

    app.ticker.add((ticker) => {
      portalSprite.rotation -= 0.002 * ticker.deltaTime;
    });
  } catch (e) {
    console.warn("Кольцо portal_core.png не найдено");
  }

  wheelContainer = new Container();
  app.stage.addChild(wheelContainer);

  const angleStep = (Math.PI * 2) / sectorsData.length;

  for (let i = 0; i < sectorsData.length; i++) {
    const sec = sectorsData[i];

    const planetWrapper = new Container();

    const highlight = new Graphics();
    highlight.circle(0, 0, 42);
    highlight.stroke({ width: 4, color: 0xfacc15, alpha: 0.9 });
    highlight.visible = false;
    planetWrapper.addChild(highlight);

    let spr;
    try {
      const tex = await Assets.load(sec.img);
      spr = new Sprite(tex);
      spr.anchor.set(0.5);
      spr.width = 66;
      spr.height = 66;
      spr.blendMode = 'screen';
      planetWrapper.addChild(spr);
    } catch (e) {
      console.warn(`Планета ${sec.img} не найдена`);
    }

    const text = new Text({
      text: sec.text,
      style: new TextStyle({
        fontFamily: 'system-ui, sans-serif',
        fontSize: 11,
        fontWeight: '800',
        fill: '#d8b4fe',
      }),
    });
    text.anchor.set(0.5, 0);
    text.y = 36;
    planetWrapper.addChild(text);

    const betAmountText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'system-ui',
        fontSize: 16,
        fontWeight: '900',
        fill: '#facc15',
        stroke: { color: '#000000', width: 4 },
      }),
    });
    betAmountText.anchor.set(0.5);
    betAmountText.y = -38;
    planetWrapper.addChild(betAmountText);

    planetWrapper.eventMode = 'static';
    planetWrapper.cursor = 'pointer';
    planetWrapper.on('pointerdown', () => selectPlanet(i));

    wheelContainer.addChild(planetWrapper);
    planetsArray.push({ group: planetWrapper, highlight, sprite: spr, betText: betAmountText });
  }

  function layout() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    app.renderer.resize(w, h);

    const sizeBase = Math.min(w, h);
    const cx = w / 2;
    const cy = h / 2;

    if (bgSprite) {
      bgSprite.width = w;
      bgSprite.height = h;
    }

    if (portalSprite) {
      portalSprite.width = sizeBase * 0.52;
      portalSprite.height = sizeBase * 0.52;
      portalSprite.x = cx;
      portalSprite.y = cy;
    }

    wheelContainer.x = cx;
    wheelContainer.y = cy;

    const radius = sizeBase * 0.36;
    const scale = Math.max(0.75, Math.min(1.15, sizeBase / 500));
    const step = (Math.PI * 2) / sectorsData.length;

    for (let i = 0; i < planetsArray.length; i++) {
      const angle = i * step - Math.PI / 2;
      planetsArray[i].group.x = Math.cos(angle) * radius;
      planetsArray[i].group.y = Math.sin(angle) * radius;

      if (planetsArray[i].sprite) {
        planetsArray[i].sprite.width = 66 * scale;
        planetsArray[i].sprite.height = 66 * scale;
      }
      planetsArray[i].group.scale.set(scale);
    }
  }

  layout();

  const ro = new ResizeObserver(() => layout());
  ro.observe(container);
  window._auraPixiRO = ro;

  window.addEventListener('orientationchange', () => setTimeout(layout, 200));
  window.addEventListener('resize', () => setTimeout(layout, 100));

  app.ticker.add((ticker) => {
    if (!spinning.value && roundActive.value) {
      wheelContainer.rotation += 0.0018 * ticker.deltaTime;
    }
    planetsArray.forEach((p) => {
      p.group.rotation = -wheelContainer.rotation;
    });
  });
}

function selectPlanet(index) {
  if (!roundActive.value) return;
  if (spinning.value || loading.value) return;

  selectedPlanetIndex.value = index;
  planetsArray.forEach((p, i) => {
    p.highlight.visible = (i === index);
  });
}

function openBetModal() {
  if (!roundActive.value) {
    alert('Дождитесь следующего раунда');
    return;
  }
  if (selectedPlanetIndex.value === null) {
    alert('Сначала выберите планету');
    return;
  }
  showBetModal.value = true;
}

function placeBet() {
  if (!roundActive.value) { alert('Раунд завершён'); return; }

  const amount = Number(betInput.value);
  if (amount <= 0) { alert('Введите сумму'); return; }
  if (amount > localBalance.value) { alert('Недостаточно монет'); return; }

  const planet = selectedPlanetIndex.value;

  myBetsThisRound.push({ planetIndex: planet, amount });

  const currentText = planetsArray[planet].betText.text;
  const currentSum = currentText ? parseInt(currentText, 10) : 0;
  planetsArray[planet].betText.text = (currentSum + amount).toString();

  totalBetTokens.value += amount;
  localBalance.value -= amount;

  showBetModal.value = false;
}

async function resolveBets() {
  loading.value = true;

  if (!isFromApp.value) {
    const r = Math.random() * 100;
    let winIndex, mult;
    if (r < 0.5)       { winIndex = 7; mult = 50; }
    else if (r < 2.0)  { winIndex = 6; mult = 25; }
    else if (r < 5.0)  { winIndex = 5; mult = 15; }
    else if (r < 10.0) { winIndex = 4; mult = 10; }
    else if (r < 30.0) { winIndex = 3; mult = 5;  }
    else if (r < 55.0) { winIndex = 2; mult = 5;  }
    else if (r < 80.0) { winIndex = 1; mult = 5;  }
    else               { winIndex = 0; mult = 5;  }

    let totalWin = 0;
    for (const bet of myBetsThisRound) {
      if (bet.planetIndex === winIndex) {
        totalWin += bet.amount * mult;
      }
    }

    localBalance.value += totalWin;

    spinToWinner(winIndex, {
      isWin: totalWin > 0,
      winAmount: totalWin,
      newBalance: localBalance.value,
      winnerIndex: winIndex,
      mult,
    });
    return;
  }

  try {
    const result = await placeBetAPI(
      props.userId,
      myBetsThisRound,
      props.userTs,
      props.userSig
    );

    const winnerIndex = result.winnerIndex;
    const mult = result.mult;
    const serverBalance = result.newBalance;

    let totalWin = 0;
    for (const bet of myBetsThisRound) {
      if (bet.planetIndex === winnerIndex) {
        totalWin += bet.amount * mult;
      }
    }

    localBalance.value = serverBalance;
    emit('coins-updated', serverBalance);

    spinToWinner(winnerIndex, {
      isWin: totalWin > 0,
      winAmount: totalWin,
      newBalance: serverBalance,
      winnerIndex,
      mult,
    });
  } catch (e) {
    console.error('❌ Ошибка ставки:', e);
    alert('Ошибка: ' + e.message);

    for (const bet of myBetsThisRound) {
      localBalance.value += bet.amount;
    }
    loading.value = false;
    spinning.value = false;
    setTimeout(() => {
      currentRound.value++;
      startRound();
    }, 1500);
  }
}

function spinWheelOnly() {
  const r = Math.random() * 100;
  let winIndex, mult;
  if (r < 0.5)       { winIndex = 7; mult = 50; }
  else if (r < 2.0)  { winIndex = 6; mult = 25; }
  else if (r < 5.0)  { winIndex = 5; mult = 15; }
  else if (r < 10.0) { winIndex = 4; mult = 10; }
  else if (r < 30.0) { winIndex = 3; mult = 5;  }
  else if (r < 55.0) { winIndex = 2; mult = 5;  }
  else if (r < 80.0) { winIndex = 1; mult = 5;  }
  else               { winIndex = 0; mult = 5;  }

  resultPlanetImg.value = sectorsData[winIndex].img;

  const anglePerSector = (Math.PI * 2) / sectorsData.length;
  const currentRot = wheelContainer.rotation;
  const targetBase = -(winIndex * anglePerSector);
  const spins = Math.PI * 2 * 6;
  const finalRotation = currentRot + spins + (targetBase - (currentRot % (Math.PI * 2)));

  gsap.to(wheelContainer, {
    rotation: finalRotation,
    duration: 5,
    ease: 'power3.out',
    onComplete: () => {
      roundHistory.value.unshift({
        round: currentRound.value,
        mult,
        img: resultPlanetImg.value,
      });
      if (roundHistory.value.length > 50) roundHistory.value.pop();

      setTimeout(() => {
        currentRound.value++;
        startRound();
      }, 2000);
    },
  });
}

function spinToWinner(winIndex, result) {
  resultPlanetImg.value = sectorsData[winIndex].img;

  const anglePerSector = (Math.PI * 2) / sectorsData.length;
  const currentRot = wheelContainer.rotation;
  const targetBase = -(winIndex * anglePerSector);
  const spins = Math.PI * 2 * 6;
  const finalRotation = currentRot + spins + (targetBase - (currentRot % (Math.PI * 2)));

  gsap.to(wheelContainer, {
    rotation: finalRotation,
    duration: 5,
    ease: 'power3.out',
    onComplete: () => {
      isWin.value = result.isWin;
      winAmount.value = result.winAmount;
      showResultModal.value = true;
      loading.value = false;
    },
  });
}

function closeResult() {
  showResultModal.value = false;

  if (resultPlanetImg.value) {
    const idx = sectorsData.findIndex(s => s.img === resultPlanetImg.value);
    if (idx >= 0) {
      roundHistory.value.unshift({
        round: currentRound.value,
        mult: sectorsData[idx].mult,
        img: resultPlanetImg.value,
      });
      if (roundHistory.value.length > 50) roundHistory.value.pop();
    }
  }

  planetsArray.forEach((p) => {
    p.betText.text = '';
    p.highlight.visible = false;
  });
  selectedPlanetIndex.value = null;
  totalBetTokens.value = 0;
  spinning.value = false;
  betInput.value = 10;

  setTimeout(() => {
    currentRound.value++;
    startRound();
  }, 1500);
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.starmaker-clone-viewport {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  margin: 0 auto;
  padding: 0;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  background-color: #000;
}

@media (min-width: 500px) {
  .starmaker-clone-viewport {
    max-width: 430px;
    height: 100vh;
  }
}

.video-header {
  padding: 12px 16px 8px;
  z-index: 10;
  position: relative;
  flex-shrink: 0;
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.back-icon, .info-icon {
  background: none;
  border: none;
  color: #c084fc;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
}

.star-balance-box {
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid #facc15;
  border-radius: 20px;
  padding: 4px 12px;
  display: flex;
  gap: 6px;
  align-items: center;
  box-shadow: 0 0 10px rgba(250, 204, 21, 0.25);
  max-width: 60%;
}

.star-label {
  color: #facc15;
  font-weight: 900;
  font-size: 10px;
  font-style: italic;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.star-value {
  font-weight: 900;
  font-size: 17px;
  color: #ffffff;
}

.jackpots-row {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
}

.jackpot {
  flex: 1;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid #8b5cf6;
  border-radius: 6px;
  text-align: center;
  padding: 4px 0;
}

.grand {
  border-color: #facc15;
  box-shadow: 0 0 8px rgba(250, 204, 21, 0.2);
}

.jp-title {
  font-size: 9px;
  font-weight: 800;
  color: #c084fc;
  display: block;
}

.grand .jp-title {
  color: #facc15;
}

.jp-val {
  font-size: 12px;
  font-weight: 800;
}

.history-bar {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
  padding: 6px 12px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.history-title { font-size: 12px; font-weight: bold; color: #a855f7; margin-right: 10px; }
.history-mini-list { flex: 1; display: flex; gap: 8px; overflow: hidden; }
.hist-mini-item { display: flex; flex-direction: column; align-items: center; }
.hist-mini-img { width: 22px; height: 22px; mix-blend-mode: screen; }
.hist-mini-mult { font-size: 8px; color: #fff; font-weight: bold; margin-top: 2px; }
.history-more { background: none; border: none; color: #fff; font-size: 11px; cursor: pointer; }

.engine-container {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  overflow: hidden;
}

.engine-container canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.center-ui {
  position: absolute;
  text-align: center;
  pointer-events: none;
}

.timer-text {
  font-size: 12px;
  color: #e9d5ff;
  display: block;
  margin-bottom: 2px;
}

.timer-number {
  font-size: 46px;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
}

.video-footer {
  padding: 0 16px 24px;
  z-index: 20;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex-shrink: 0;
}

.main-bet-btn {
  background: linear-gradient(90deg, #f97316, #ec4899);
  border: none;
  border-radius: 30px;
  padding: 16px;
  font-size: 15px;
  font-weight: 900;
  color: #fff;
  width: 100%;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(249, 115, 22, 0.4);
}

.main-bet-btn.disabled {
  opacity: 0.45;
  filter: grayscale(80%);
  pointer-events: none;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  gap: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  font-size: 11px;
  color: #a855f7;
  flex: 1;
  min-width: 0;
}

.stat-item strong {
  font-size: 14px;
  color: #fff;
  margin-top: 3px;
}

.stat-center {
  align-items: center;
  flex: 1;
  padding: 0 8px;
  border-left: 1px solid rgba(168, 85, 247, 0.3);
  border-right: 1px solid rgba(168, 85, 247, 0.3);
}

.stat-center .balance-value {
  color: #facc15;
  font-size: 16px;
  font-weight: 900;
  text-shadow: 0 0 8px rgba(250, 204, 21, 0.5);
}

.stat-right {
  align-items: flex-end;
}

.betting-sheet {
  background: #2e0854;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  position: absolute;
  bottom: 74px;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  border-top: 2px solid #a855f7;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.7);
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
  margin-bottom: 14px;
  color: #e9d5ff;
  font-size: 13px;
}

.close-sheet {
  background: none;
  border: none;
  color: #fff;
  font-size: 22px;
  cursor: pointer;
}

.input-area {
  display: flex;
  background: #ffffff;
  border-radius: 8px;
  padding: 8px 14px;
  align-items: center;
  margin-bottom: 14px;
}

.input-area span {
  color: #000;
  font-weight: 700;
  margin-right: 10px;
}

.bet-input {
  flex: 1;
  border: none;
  outline: none;
  text-align: right;
  font-size: 18px;
  font-weight: 900;
  color: #000;
}

.quick-btns {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.quick-btns button {
  flex: 1;
  background: #4c1d95;
  border: 1px solid #a855f7;
  color: #fff;
  padding: 9px 0;
  border-radius: 8px;
  font-weight: 800;
  cursor: pointer;
}

.submit-btn {
  width: 100%;
  background: #f97316;
  border: none;
  padding: 14px;
  border-radius: 30px;
  color: #fff;
  font-weight: 900;
  font-size: 16px;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-box {
  background: #240b47;
  width: 82%;
  max-width: 340px;
  border-radius: 20px;
  border: 2px solid #a855f7;
  text-align: center;
  padding: 28px 20px;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 10px;
  left: 14px;
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
}

.res-img {
  width: 76px;
  height: 76px;
  margin-top: -60px;
  margin-bottom: 12px;
  mix-blend-mode: screen;
}

.win-glow { filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.4)); }
.lose-img { filter: grayscale(100%); }
.win-sum { font-size: 40px; font-weight: 900; color: #facc15; margin: 10px 0; }

.history-full-page {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: #0f0224; z-index: 100;
  display: flex; flex-direction: column;
}

.history-page-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.history-page-title { font-size: 16px; font-weight: bold; }
.history-scroll-area { flex: 1; overflow-y: auto; padding: 15px; }

.history-card {
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(255, 255, 255, 0.05); padding: 12px 20px;
  border-radius: 12px; margin-bottom: 10px; border: 1px solid rgba(255, 255, 255, 0.1);
}

.round-number { font-size: 14px; font-weight: bold; color: #e9d5ff; }
.card-right { display: flex; align-items: center; gap: 15px; }
.history-list-img { width: 35px; height: 35px; mix-blend-mode: screen; }
.history-list-mult { font-size: 16px; font-weight: 900; }
.mult-5 { color: #ec4899; }
.mult-10 { color: #f97316; }
.mult-15 { color: #ef4444; }
.mult-25 { color: #06b6d4; }
.mult-50 { color: #8b5cf6; }
.empty-history { text-align: center; color: #a855f7; margin-top: 40px; font-size: 14px; }

@media (max-height: 700px) {
  .video-header { padding: 8px 12px 6px; }
  .jackpots-row { margin-bottom: 6px; }
  .history-bar { padding: 4px 10px; }
  .timer-number { font-size: 36px; }
  .video-footer { padding: 0 12px 16px; gap: 10px; }
  .main-bet-btn { padding: 13px; font-size: 14px; }
  .stats-row { padding: 8px 12px; }
  .stat-item strong { font-size: 13px; }
  .betting-sheet { bottom: 60px; padding: 16px; }
}

@media (max-width: 360px) {
  .star-balance-box { padding: 3px 12px; }
  .star-value { font-size: 15px; }
  .jp-val { font-size: 11px; }
  .jp-title { font-size: 8px; }
  .hist-mini-img { width: 18px; height: 18px; }
  .history-title { font-size: 11px; margin-right: 6px; }
}
</style>