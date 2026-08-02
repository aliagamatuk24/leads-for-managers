ADVERTENCIA (1 de agosto de 2026): este documento describe un sitio que YA NO SE USA.
El sitio real y activo ahora es https://regal-hamster-65a058.netlify.app
La documentacion correcta y actualizada esta en el repositorio aliagamatuk-code/gestion-de-managers, archivo CONFIGURACION-CRITICA.md.
Este documento se deja aqui solo como registro historico.

Configuracion critica - NO TOCAR sin leer esto
================================================

Este documento explica como funciona la automatizacion de reservas
(GoHighLevel -> Netlify -> gestion de managers). Si algo deja de
funcionar (por ejemplo, si los managers dejan de ver el idioma o la
hora de la cita en sus registros), revisa primero esta lista antes de
cambiar nada.

Que hace el sistema, en resumen
--------------------------------

Paso 1. Un cliente reserva una cita de "Water Quality Assessment" en
el calendario de GoHighLevel (GHL).

Paso 2. Un Workflow en GHL detecta esa reserva, espera 3 minutos,
guarda el idioma y la hora en dos campos personalizados del contacto,
y manda toda la informacion a una funcion en Netlify por medio de un
Webhook.

Paso 3. La funcion receive-booking.js recibe esos datos y los guarda,
ordenados por manager, en un almacen de datos (Netlify Blobs).

Paso 4. La funcion get-bookings.js permite ver esos datos guardados
desde la pagina web protegida con una clave.

Configuracion critica en GoHighLevel (NO cambiar sin avisar)
--------------------------------------------------------------

Workflow: "03 Appointment Booking", ubicacion Quantica360.

El disparador (trigger) debe ser "Estado de la cita". El filtro "El
estado de la cita es" debe estar en "confirmado". Probamos "nuevo"
primero y nunca se disparaba, porque las citas reales de este
calendario llegan con estado "Confirmada", no "nueva". Si alguien
cambia este filtro, el workflow deja de dispararse por completo (sin
dar ningun error visible) y ningun dato llega a Netlify.

El paso "Esperar" debe quedar en 3 minutos. Le da tiempo a GHL a
terminar de guardar los datos de la cita antes de continuar.

El paso "Actualizar campo de contacto" copia el valor de
contact.preferred_analyst_language al campo personalizado Language
Text Sync, y el valor de appointment.start_time al campo Appointment
Time Text Sync.

El paso "Webhook" manda los Datos personalizados (custom data) con
estos nombres exactos: calendar_id, full_name, phone, address,
appointment_start_time (igual a Appointment Time Text Sync), y
language (igual a Language Text Sync).

Como llegan los datos a Netlify (esto costo mucho tiempo descubrirlo)
-----------------------------------------------------------------------

GoHighLevel no manda los Datos personalizados sueltos en el JSON del
webhook. Los manda todos juntos, anidados dentro de un objeto llamado
customData. Por ejemplo, el JSON que llega tiene una parte asi:

customData: { calendar_id: "...", full_name: "...", phone: "...",
address: "...", appointment_start_time: "...", language: "..." }

La funcion receive-booking.js primero busca cada dato dentro de
payload.customData, y solo si no lo encuentra ahi, busca en el nivel
de afuera (por compatibilidad con versiones anteriores). Si en el
futuro alguien agrega un nuevo Dato personalizado en el Webhook de
GHL, debe leerse igual: dentro de customData, no suelto.

Blindaje que ya esta puesto
-----------------------------

Si language o appointment_time llegan vacios, la funcion
receive-booking.js escribe un aviso (console.warn) en los registros
de Netlify (Netlify, Logs and metrics, Functions, receive-booking).
Si un dia esos campos vuelven a llegar vacios, ese aviso va a aparecer
ahi de inmediato.

Netlify vuelve a publicar el sitio automaticamente cada vez que se
sube un cambio a la rama main del repositorio en GitHub
(aliagamatuk24/leads-for-managers).

Si algo se rompe, revisa en este orden
------------------------------------------

Primero: en Netlify, Deploys, revisa si el ultimo deploy dice
"Published" en verde, o si fallo.

Segundo: en GHL, Automatizacion, 03 Appointment Booking, Registros de
ejecucion, revisa si el workflow se esta disparando con las citas
nuevas, y si dice "Finished" o se queda pegado en algun paso.

Tercero: en Netlify, Logs and metrics, Functions, receive-booking,
revisa si hay avisos que digan "AVISO: llego una reserva con datos
incompletos".

Cuarto: si el workflow no se dispara, revisa que el filtro "El estado
de la cita es" siga en "confirmado" (no "nuevo").

Quinto: si el workflow se dispara pero los datos igual llegan vacios,
revisa que el Webhook siga mandando los mismos nombres de campos
personalizados descritos arriba.
