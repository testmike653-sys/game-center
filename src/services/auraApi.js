// ============================================================================
// AURA · API-клиент игры
// ============================================================================

// В dev — проксируется через Vite на localhost:3000
// В prod — тот же origin (если сервер раздаёт и фронт, и API)
const API_BASE = import.meta.env.VITE_API_BASE || '';

// ============================================================================
// ДАННЫЕ ЮЗЕРА ИЗ URL (передаёт Flutter-приложение)
// ============================================================================
export function getAuraUser() {
  const params = new URLSearchParams(window.location.search);

  const userId = params.get('userId') || '';
  const sig    = params.get('sig')    || '';
  const ts     = params.get('ts')     || '';

  return {
    userId,
    name:    params.get('name')   || 'Гость',
    coins:   Number(params.get('coins')) || 0,
    avatar:  params.get('avatar') || '🎤',
    isVip:   params.get('vip') === '1',
    ts,
    sig,
    isFromApp: !!userId && !!sig && !!ts,
  };
}

// ============================================================================
// СИНХРОНИЗАЦИЯ БАЛАНСА
// ============================================================================
export async function fetchCoins(userId) {
  try {
    const res = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.coins === 'number' ? data.coins : null;
  } catch (e) {
    console.error('fetchCoins error:', e);
    return null;
  }
}

// ============================================================================
// СТАВКА
// ============================================================================
export async function placeBetAPI(userId, bets, ts, sig) {
  const res = await fetch(`${API_BASE}/api/bet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, bets, ts, sig }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Server error');
  }
  return data;
}