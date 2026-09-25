// ============================================================================
// AURA · Firebase Admin init
// ============================================================================
import admin from 'firebase-admin';
import 'dotenv/config';

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY_BASE64;

  if (!raw) {
    throw new Error('FIREBASE_PRIVATE_KEY_BASE64 отсутствует в .env');
  }

  // Декодируем Base64 → получаем строку с \n
  const decoded = Buffer.from(raw, 'base64').toString('utf-8');

  // Меняем литеральные \n на реальные переносы
  const key = decoded.replace(/\\n/g, '\n').trim();

  if (!key.includes('BEGIN PRIVATE KEY') || !key.includes('END PRIVATE KEY')) {
    console.error('❌ Ключ повреждён. Длина:', key.length);
    throw new Error('Приватный ключ повреждён');
  }

  return key;
}

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  console.log('✅ Firebase Admin initialized');
}

export const db = admin.firestore();
export { admin };