// ============================================================================
// AURA · Локальный сервер игры (Express)
// ============================================================================
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import { db, admin } from './firebase.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================================================
// СЕКРЕТ
// ============================================================================
const AURA_SECRET = process.env.AURA_SECRET;
if (!AURA_SECRET) {
  throw new Error('AURA_SECRET не задан в .env');
}

// ============================================================================
// ПРОВЕРКА HMAC-ПОДПИСИ
// Формат: HMAC_SHA256(userId|ts) → base64url (без padding)
// ============================================================================
function verifySignature(userId, ts, signature) {
  const data = `${userId}|${ts}`;
  const expected = crypto
    .createHmac('sha256', AURA_SECRET)
    .update(data)
    .digest('base64url');

  // Timing-safe сравнение
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ============================================================================
// РАНДОМ (та же математика)
// ============================================================================
function rollWinner() {
  const r = Math.random() * 100;
  if (r < 0.5)  return { index: 7, mult: 50 };
  if (r < 2.0)  return { index: 6, mult: 25 };
  if (r < 5.0)  return { index: 5, mult: 15 };
  if (r < 10.0) return { index: 4, mult: 10 };
  if (r < 30.0) return { index: 3, mult: 5 };
  if (r < 55.0) return { index: 2, mult: 5 };
  if (r < 80.0) return { index: 1, mult: 5 };
  return { index: 0, mult: 5 };
}

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'aura-game', time: Date.now() });
});

// ============================================================================
// POST /api/bet — ставка
// ============================================================================
app.post('/api/bet', async (req, res) => {
  try {
    const { userId, betAmount, planetIndex, ts, sig } = req.body;

    // 1. ВАЛИДАЦИЯ
    if (!userId || typeof userId !== 'string' || userId.length > 50) {
      return res.status(400).json({ success: false, error: 'Invalid userId' });
    }
    if (!Number.isInteger(betAmount) || betAmount <= 0 || betAmount > 100000) {
      return res.status(400).json({ success: false, error: 'Invalid betAmount' });
    }
    if (!Number.isInteger(planetIndex) || planetIndex < 0 || planetIndex > 7) {
      return res.status(400).json({ success: false, error: 'Invalid planetIndex' });
    }

    // 2. ПОДПИСЬ
    const tsNum = parseInt(ts, 10);
    if (!tsNum || Math.abs(Date.now() - tsNum) > 3600000) {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    if (!verifySignature(userId, tsNum, sig)) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    // 3. ТРАНЗАКЦИЯ FIRESTORE
    const userRef = db.collection('aura_users').doc(userId);

    const result = await db.runTransaction(async (t) => {
      const snap = await t.get(userRef);
      if (!snap.exists) throw new Error('User not found');

      const userData = snap.data();
      if (userData.isBanned === true) throw new Error('User banned');

      const balance = userData.coins || 0;
      if (balance < betAmount) throw new Error('Insufficient balance');

      const afterBet = balance - betAmount;
      const winner = rollWinner();
      const isWin = winner.index === planetIndex;
      const winAmount = isWin ? betAmount * winner.mult : 0;
      const finalBalance = afterBet + winAmount;

      t.update(userRef, {
        coins: finalBalance,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        lastGamePlayed: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        winnerIndex: winner.index,
        mult: winner.mult,
        isWin,
        winAmount,
        newBalance: finalBalance,
      };
    });

    return res.json({ success: true, ...result });

  } catch (e) {
    console.error('❌ Bet error:', e.message);
    return res.status(400).json({ success: false, error: e.message || 'Server error' });
  }
});

// ============================================================================
// POST /api/sync — синхронизация баланса
// ============================================================================
app.post('/api/sync', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'No userId' });

  try {
    const doc = await db.collection('aura_users').doc(userId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });

    return res.json({
      coins: doc.data().coins || 0,
      vip: doc.data().vipTier || 'none',
      banned: doc.data().isBanned === true,
    });
  } catch (e) {
    console.error('❌ sync error:', e);
    return res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// РАЗДАЧА ФРОНТЕНДА (только для production)
// ============================================================================
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');

// Отдаём статику (собранный Vue)
app.use(express.static(distPath));

// SPA fallback — все остальные маршруты отдают index.html
app.get('*', (req, res) => {
  // Пропускаем /api/* — их обрабатывают выше
  if (req.path.startsWith('/api/')) return;
  res.sendFile(path.join(distPath, 'index.html'));
});

// ============================================================================
// СТАРТ
// ============================================================================
app.listen(PORT, () => {
  console.log(`🎮 Aura game server running on http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/api/bet`);
  console.log(`   POST http://localhost:${PORT}/api/sync`);
});