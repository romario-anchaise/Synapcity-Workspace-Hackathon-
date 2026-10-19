import 'dotenv/config';
import express from 'express';
import { conectar } from './whatsapp.js';
import enviarRouter from './routes/enviar.js';

const app = express();
const PORT = process.env.PORT || 3000;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

if (!INTERNAL_API_KEY) {
  console.error('[Config] INTERNAL_API_KEY no está definida. El servicio no iniciará.');
  process.exit(1);
}

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  const clave = req.headers['x-api-key'];
  if (clave !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'No autorizado.' });
  }
  next();
});

app.use('/', enviarRouter);

app.use((err, _req, res, _next) => {
  console.error('[Express] Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

async function iniciar() {
  console.log('[Microservicio] Iniciando conexión con WhatsApp...');
  await conectar();

  app.listen(PORT, () => {
    console.log(`[Microservicio] Escuchando en http://localhost:${PORT}`);
  });
}

iniciar().catch((err) => {
  console.error('[Microservicio] Error fatal al iniciar:', err);
  process.exit(1);
});
