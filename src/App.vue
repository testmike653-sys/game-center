<template>
  <main class="app-shell">
    <header class="aura-header">
      <div class="user-info">
        <span class="avatar">{{ user.avatar }}</span>
        <div class="user-text">
          <div class="user-name">
            {{ user.name }}
            <span v-if="user.isVip" class="vip-badge">VIP</span>
          </div>
          <div class="user-id">ID: {{ user.userId || 'DEMO' }}</div>
        </div>
      </div>

      <div class="coins-box">
        <span class="coin-icon">🪙</span>
        <span class="balance">{{ Math.floor(coins).toLocaleString('ru-RU') }}</span>
        <span v-if="isLive" class="live-dot" title="Синхронизировано"></span>
      </div>
    </header>

    <div class="game-wrapper">
      <StarTreasureGame
        :user-coins="coins"
        :user-id="user.userId"
        :user-name="user.name"
        :user-ts="user.ts"
        :user-sig="user.sig"
        @coins-updated="handleCoinsUpdated"
      />
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import StarTreasureGame from './components/StarTreasureGame.vue';
import { getAuraUser, fetchCoins } from './services/auraApi';
import { db } from './services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const user = ref(getAuraUser());
const coins = ref(user.value.coins || 1000);
const isLive = ref(false);

let unsubscribe = null;

function startFirestoreListener() {
  if (!user.value.userId) return;

  const userDocRef = doc(db, 'aura_users', user.value.userId);

  unsubscribe = onSnapshot(userDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newBalance = data.coins || 0;

        isLive.value = true;
        coins.value = newBalance;
      } else {
        isLive.value = false;
      }
    },
    (error) => {
      console.error('❌ Firestore listener error:', error);
      isLive.value = false;
    }
  );
}

function stopFirestoreListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

onMounted(async () => {
  if (user.value.userId) {
    const actual = await fetchCoins(user.value.userId);
    if (actual !== null) {
      coins.value = actual;
    }
    startFirestoreListener();
  }
});

onUnmounted(() => {
  stopFirestoreListener();
});

function handleCoinsUpdated(newBalance) {
  coins.value = newBalance;
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.app-shell {
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: #05010d;
  overflow: hidden;
  position: relative;
}

.aura-header {
  position: relative;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: linear-gradient(180deg, rgba(5, 1, 13, 0.98) 0%, rgba(14, 5, 28, 0.95) 100%);
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #F6F2E8;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.avatar {
  font-size: 24px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FF2E80, #D4AF37);
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(255, 46, 128, 0.4);
  flex-shrink: 0;
}

.user-text {
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 6px;
}

.vip-badge {
  background: linear-gradient(135deg, #FF2E80, #D4AF37);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.5px;
}

.user-id {
  font-size: 10px;
  color: #A8A29A;
  margin-top: 1px;
}

.coins-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(212, 175, 55, 0.15);
  padding: 6px 14px;
  border-radius: 14px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  box-shadow: 0 0 15px rgba(212, 175, 55, 0.2);
}

.coin-icon {
  font-size: 18px;
  filter: drop-shadow(0 0 6px rgba(212, 175, 55, 0.6));
}

.balance {
  font-size: 16px;
  font-weight: 800;
  color: #D4AF37;
  letter-spacing: 0.5px;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  margin-left: 4px;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.game-wrapper {
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  overflow: hidden;
  position: relative;
}
</style>