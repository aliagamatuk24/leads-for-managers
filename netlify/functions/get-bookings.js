const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== 'GET') {
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

  const result = {};
  for (const blob of blobs) {
    const data = await store.get(blob.key, { type: 'json' });
    result[blob.key] = Array.isArray(data) ? data : [];
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
};
