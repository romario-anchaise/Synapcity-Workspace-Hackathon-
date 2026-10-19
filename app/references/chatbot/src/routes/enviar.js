import { Router } from 'express';
import { enviarMensaje } from '../whatsapp.js';
import cola from '../queue.js';

const router = Router();

router.post('/enviar', async (req, res) => {
  const { telefono, mensaje } = req.body ?? {};

  if (!telefono || !mensaje) {
    return res.status(400).json({ error: 'Los campos telefono y mensaje son requeridos.' });
  }

  try {
    await enviarMensaje(telefono, mensaje);
    return res.status(200).json({ success: true, destinatario: telefono });
  } catch (err) {
    console.error('[POST /enviar] Error:', err.message);
    return res.status(500).json({ error: 'Error al enviar mensaje.', detalle: err.message });
  }
});

router.post('/enviar-campana', (req, res) => {
  const { destinatarios } = req.body ?? {};

  if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
    return res.status(400).json({ error: 'destinatarios debe ser un array no vacío.' });
  }

  const invalidos = destinatarios.filter((d) => !d?.telefono || !d?.mensaje);
  if (invalidos.length > 0) {
    return res.status(400).json({
      error: 'Cada elemento debe tener los campos telefono y mensaje.',
      invalidos: invalidos.length,
    });
  }

  cola.agregar(destinatarios);

  return res.status(202).json({
    success: true,
    encolados: destinatarios.length,
    estado: cola.obtenerEstado(),
  });
});

router.get('/estado-cola', (_req, res) => {
  return res.status(200).json(cola.obtenerEstado());
});

export default router;
