const { getStore, connectLambda } = require('@netlify/blobs');

// Nombres EXACTOS (sin distinguir mayusculas/minusculas) de los contactos de
// prueba usados durante la construccion y las pruebas de esta automatizacion.
// Esta funcion borra SOLO estos registros y nada mas.
const TEST_NAMES = [
    'Prueba Fix CustomData',
    'Prueba Debug Payload',
    'Prueba Confirmado Final',
    'Prueba Fix Campos Texto',
    'Prueba Wait Tres Minutos',
    'Prueba Final Omar Dos',
    'Prueba Final Omar',
    'Cliente de Prueba',
    'cliente de prueba no te emociones',
    'Cliente de prueba No te emociones',
    'Cliente de prueba no se emocionen',
    'PERICO DE LOS PALITOS',
    'PERICO DE LOS PALOTES',
  ];

exports.handler = async (event) => {
    connectLambda(event);

    if (event.httpMethod !== 'POST') {
          return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const adminKey = process.env.ADMIN_KEY;
    const providedKey =
          (event.queryStringParameters && event.queryStringParameters.key) ||
          event.headers['x-admin-key'];

    if (adminKey && providedKey !== adminKey) {
          return { statusCode: 401, body: 'Unauthorized' };
    }

    const store = getStore('bookings');
    const { blobs } = await store.list();

    const removed = [];
    for (const blob of blobs) {
          const data = await store.get(blob.key, { type: 'json' });
          const list = Array.isArray(data) ? data : [];
          const kept = [];
          for (const record of list) {
                  const isTest = TEST_NAMES.some(
                            (name) =>
                                        name.toLowerCase() === String(record.client_name || '').toLowerCase()
                          );
                  if (isTest) {
                            removed.push({
                                        manager: blob.key,
                                        client_name: record.client_name,
                                        received_at: record.received_at,
                            });
                  } else {
                            kept.push(record);
                  }
          }
          if (kept.length !== list.length) {
                  await store.setJSON(blob.key, kept);
          }
    }

    return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true, removed_count: removed.length, removed }),
    };
};
