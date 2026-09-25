<template>
  <main class="app-shell">
    <!-- ⭐ ШАПКА С ДАННЫМИ ЮЗЕРА -->
    <header v-if="user.isFromApp" class="aura-header">
      <div class="user-info">
        <span class="avatar">{{ user.avatar }}</span>
        <div class="user-text">
          <div class="user-name">
            {{ user.name }}
            <span v-if="user.isVip" class="vip-badge">VIP</span>
          </div>
          <div class="user-id">ID: {{ user.userId }}</div>
        </div>
      </div>

      <div class="coins-box">
        <span class="coin-icon">🪙</span>
        <span class="balance">{{ coins.toLocaleString() }}</span>
        <span v-if="isLive" class="live-dot" title="Синхронизировано"></span>
      </div>
    </header>

    <!-- ⭐ ИГРА -->
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

    <!-- ⭐ ФУТЕР -->
    <footer class="aura-footer">
      <span class="footer-text">
        🎤 Играйте и зарабатывайте монеты в <strong>Aura</strong>
      </span>
    </footer>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import StarTreasureGame from './components/StarTreasureGame.vue';
import { getAuraUser, fetchCoins } from './services/auraApi';
import { db } from './services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

// ============================================================================
// СОСТОЯНИЕ
// ============================================================================
const user = ref(getAuraUser());
const coins = ref(user.value.coins);
const isLive = ref(false);

let unsubscribe = null;

// ============================================================================
// СИНХРОНИЗАЦИЯ В РЕАЛЬНОМ ВРЕМЕНИ (Firestore)
// ============================================================================
function startFirestoreListener() {
  if (!user.value.userId) return;

  const userDocRef = doc(db, 'aura_users', user.value.userId);

  unsubscribe = onSnapshot(userDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newBalance = data.coins || 0;

        isLive.value = true;

        if (newBalance !== coins.value) {
          console.log('🔥 Firestore sync:', coins.value, '→', newBalance);
          coins.value = newBalance;
        }
      } else {
        console.warn('⚠️ User doc not found');
        isLive.value = false;
      }
    },
    (error) => {
      console.error('❌ Firestore listener error:', error);
      isLive.value = false;
    }
  );

  console.log('👂 Firestore real-time listener started');
}

function stopFirestoreListener() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    console.log('🔇 Firestore listener stopped');
  }
}

// ============================================================================
// ЖИЗНЕННЫЙ ЦИКЛ
// ============================================================================
onMounted(async () => {
  if (user.value.userId) {
    console.log('👤 Aura user:', user.value.name, '| ID:', user.value.userId);

    // Один раз синхронизируем баланс при загрузке
    const actual = await fetchCoins(user.value.userId);
    if (actual !== null && actual !== coins.value) {
      coins.value = actual;
    }

    startFirestoreListener();
  } else {
    console.log('🌐 Демо-режим');
  }
});

onUnmounted(() => {
  stopFirestoreListener();
});

// ============================================================================
// ОБНОВЛЕНИЕ МОНЕТ ОТ ИГРЫ
// ============================================================================
function handleCoinsUpdated(newBalance) {
  console.log('💰 Баланс обновлён игрой:', newBalance);
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
  display: flex;
  flex-direction: column;
  background-color: #05010d;
  overflow: hidden;
  position: relative;
}

/* ============ ШАПКА ============ */
.aura-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(180deg, rgba(5, 1, 13, 0.95) 0%, rgba(5, 1, 13, 0.6) 100%);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #F6F2E8;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.avatar {
  font-size: 28px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FF2E80, #D4AF37);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(255, 46, 128, 0.4);
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
  color: #6B6862;
  margin-top: 1px;
}

/* ============ МОНЕТЫ ============ */
.coins-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(212, 175, 55, 0.15);
  padding: 8px 14px;
  border-radius: 14px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
  position: relative;
}

.coin-icon {
  font-size: 18px;
  filter: drop-shadow(0 0 6px rgba(212, 175, 55, 0.6));
}

.balance {
  font-size: 18px;
  font-weight: 800;
  color: #D4AF37;
  letter-spacing: 0.5px;
}

/* Индикатор живой синхронизации */
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

/* ============ ИГРА ============ */
.game-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;
}

/* ============ ФУТЕР ============ */
.aura-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 8px 16px;
  text-align: center;
  background: linear-gradient(0deg, rgba(5, 1, 13, 0.95) 0%, rgba(5, 1, 13, 0.6) 100%);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(212, 175, 55, 0.1);
  font-family: 'Inter', sans-serif;
}

.footer-text {
  font-size: 11px;
  color: #A8A29A;
  letter-spacing: 0.5px;
}

.footer-text strong {
  color: #D4AF37;
  font-weight: 700;
}

/* ============ МОБИЛЬНАЯ АДАПТАЦИЯ ============ */
@media (max-width: 600px) {
  .aura-header { padding: 10px 12px; }
  .avatar { width: 36px; height: 36px; font-size: 22px; }
  .user-name { font-size: 13px; }
  .coins-box { padding: 6px 12px; }
  .balance { font-size: 16px; }
  .aura-footer { padding: 6px 12px; }
  .footer-text { font-size: 10px; }
}
</style>