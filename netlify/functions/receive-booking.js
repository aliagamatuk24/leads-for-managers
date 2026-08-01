const { getStore, connectLambda } = require('@netlify/blobs');

const MANAGERS_URL = 'https://calendarios-managers-quantica360.netlify.app/api/managers';

function slug(name) {
      return String(name)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'sin-asignar';
}

exports.handler = async (event) => {
      connectLambda(event);

      if (event.httpMethod !== 'POST') {
              return { statusCode: 405, body: 'Method Not Allowed' };
      }

      const secret = process.env.WEBHOOK_SECRET;
      const providedSecret =
              (event.queryStringParameters && event.queryStringParameters.secret) ||
              event.headers['x-webhook-secret'];
      if (secret && providedSecret !== secret) {
              return { statusCode: 401, body: 'Unauthorized' };
      }

      let payload;
      try {
              payload = JSON.parse(event.body || '{}');
      } catch (err) {
              return { statusCode: 400, body: 'Invalid JSON' };
      }

      // GoHighLevel envia los Datos personalizados del Webhook dentro de un
      // objeto anidado llamado customData, no en el nivel raiz del JSON.
      const customData = payload.customData || {};

      const calendarId =
              customData.calendar_id ||
              payload.calendar_id ||
              payload.calendarId ||
              (payload.calendar && payload.calendar.id) ||
              '';

      const clientName =
              customData.full_name ||
              payload.full_name ||
              payload.contact_name ||
              [payload.first_name, payload.last_name].filter(Boolean).join(' ') ||
              'Sin nombre';

      const phone =
              customData.phone || payload.phone || payload.contact_phone || '';

      const address =
              customData.address ||
              payload.address ||
              payload.full_address ||
              payload.contact_address ||
              '';

      const language =
              customData.language ||
              payload.language ||
              payload.idioma ||
              payload.preferred_language ||
              '';

      const appointmentTime =
              customData.appointment_start_time ||
              payload.appointment_start_time ||
              payload.start_time ||
              payload.startTime ||
              payload.calendar_appointment_start_time ||
              '';

      // AVISO DE SEGURIDAD (blindaje):
      // Si language o appointment_time llegan vacios, lo anotamos en los
      // registros de la funcion (Netlify > Logs) para detectar rapido si algo
      // cambio en GHL (el trigger, el mapeo de customData, etc.) y esto se
      // rompio de nuevo. No se imprime el payload completo, solo un aviso corto.
      if (!language || !appointmentTime) {
              console.warn(
                        'AVISO: llego una reserva con datos incompletos.',
                        JSON.stringify({
                                    client_name: clientName,
                                    language_vacio: !language,
                                    appointment_time_vacio: !appointmentTime,
                        })
                      );
      }

      let managerName = payload.manager_name || payload.manager || 'Sin asignar';
      if (calendarId) {
              try {
                        const res = await fetch(MANAGERS_URL);
                        const managers = await res.json();
                        const match = managers.find((m) => m.url && m.url.includes(calendarId));
                        if (match) managerName = match.name;
              } catch (err) {
              }
      }

      const record = {
              manager: managerName,
              client_name: clientName,
              phone,
              address,
              language,
              appointment_time: appointmentTime,
              received_at: new Date().toISOString(),
      };

      const store = getStore('bookings');
      const key = slug(managerName);
      const existingRaw = await store.get(key, { type: 'json' });
      const existing = Array.isArray(existingRaw) ? existingRaw : [];
      existing.unshift(record);
      await store.setJSON(key, existing);

      return {
              statusCode: 200,
              body: JSON.stringify({ ok: true, manager: managerName }),
      };
};
