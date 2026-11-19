const PUSH_URL = 'https://exp.host/--/api/v2/push';
const TOKEN = /^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;
const RECEIPT_DELAY_MS = 15 * 60 * 1000;
const RECEIPT_EXPIRY_MS = 24 * 60 * 60 * 1000;

async function registerPushDevice(prisma, userId, token) {
  if (typeof token !== 'string' || token.length > 200 || !TOKEN.test(token)) {
    return false;
  }
  await prisma.pushDevice.upsert({
    where: { token },
    update: { user_id: userId },
    create: { token, user_id: userId },
  });
  return true;
}

async function unregisterPushDevice(prisma, userId, token) {
  if (typeof token !== 'string' || !TOKEN.test(token)) return false;
  await prisma.pushDevice.deleteMany({ where: { token, user_id: userId } });
  return true;
}

async function notifyFocus(prisma, userId, accepted = false, fetchImpl = fetch) {
  const devices = await prisma.pushDevice.findMany({ where: { user_id: userId } });
  if (!devices.length) return 'unavailable';
  let failures = 0;
  let queued = 0;
  for (let start = 0; start < devices.length; start += 100) {
    const chunk = devices.slice(start, start + 100);
    try {
      const response = await fetchImpl(`${PUSH_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify(chunk.map(({ token }) => ({
          to: token,
          title: 'Foco com amigos',
          body: accepted ? 'Seu amigo aceitou o convite de foco.' : 'Você recebeu um convite para focar junto.',
          sound: 'default',
          channelId: 'focus-invites',
          data: { type: 'focus-invite' },
        }))),
      });
      if (!response.ok) throw new Error(`Expo Push respondeu HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.data) || payload.data.length !== chunk.length) {
        throw new Error('Expo Push retornou uma resposta inválida.');
      }
      for (let index = 0; index < chunk.length; index += 1) {
        const ticket = payload.data[index];
        if (ticket.status === 'ok' && typeof ticket.id === 'string') {
          await prisma.pushReceipt.create({
            data: { id: ticket.id, device_token: chunk[index].token },
          });
          queued += 1;
        } else {
          failures += 1;
          console.error('Expo Push recusou uma notificação:', ticket.message || ticket.details?.error || 'erro desconhecido');
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await prisma.pushDevice.deleteMany({ where: { token: chunk[index].token, user_id: userId } });
          }
        }
      }
    } catch (error) {
      failures += chunk.length;
      console.error('Não foi possível enviar a notificação de foco:', error.message);
    }
  }
  return queued && failures ? 'partial' : queued ? 'queued' : 'failed';
}

async function checkPushReceipts(prisma, fetchImpl = fetch) {
  const now = Date.now();
  const expired = await prisma.pushReceipt.deleteMany({
    where: { created_at: { lt: new Date(now - RECEIPT_EXPIRY_MS) } },
  });
  if (expired.count) console.error(`${expired.count} comprovante(s) de push expiraram sem confirmação.`);
  const receipts = await prisma.pushReceipt.findMany({
    where: { created_at: { lte: new Date(now - RECEIPT_DELAY_MS) } },
    take: 100,
    orderBy: { created_at: 'asc' },
  });
  if (!receipts.length) return;
  const response = await fetchImpl(`${PUSH_URL}/getReceipts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({ ids: receipts.map((receipt) => receipt.id) }),
  });
  if (!response.ok) throw new Error(`Comprovantes Expo Push: HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Expo Push retornou comprovantes inválidos.');
  }
  for (const receipt of receipts) {
    const result = payload.data[receipt.id];
    if (!result) continue;
    if (result.status !== 'ok') {
      console.error('Entrega de notificação falhou:', result.message || result.details?.error || 'erro desconhecido');
      if (result.details?.error === 'DeviceNotRegistered') {
        await prisma.pushDevice.deleteMany({ where: { token: receipt.device_token } });
      }
    }
    await prisma.pushReceipt.deleteMany({ where: { id: receipt.id } });
  }
}

function startPushReceiptWorker(prisma) {
  const check = () => checkPushReceipts(prisma).catch((error) => {
    console.error('Não foi possível verificar comprovantes de push:', error.message);
  });
  const timer = setInterval(check, 60 * 1000);
  timer.unref();
  check();
}

module.exports = { registerPushDevice, unregisterPushDevice, notifyFocus, checkPushReceipts, startPushReceiptWorker };
