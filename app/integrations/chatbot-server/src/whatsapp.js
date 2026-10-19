import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { homedir } from 'node:os';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.join(process.env.BOT_STATE_DIR || path.join(homedir(), '.local/share/rapicostura-bot'), 'whatsapp-auth');
const TIMEOUT_CONEXION_MS = 120_000;
const RECONEXION_MS = 5_000;
const MAX_MENSAJES_RECORDADOS = 500;

const logger = pino({ level: 'warn' });

let connectionListener = null;
export function setConnectionListener(listener) { connectionListener = listener; }
let incomingHandler = null;
export function setIncomingHandler(handler) { incomingHandler = handler; }
let sock = null;
let estaConectado = false;
let resolversConexion = [];

// WhatsApp puede pedir reenviar un mensaje que el destinatario no pudo descifrar.
// Guardamos los últimos enviados para responder con el contenido real y no con un texto vacío.
const mensajesEnviados = new Map();
export function recordarEnviado(resultado) {
  if (!resultado?.key?.id || !resultado.message) return;
  mensajesEnviados.set(resultado.key.id, resultado.message);
  if (mensajesEnviados.size > MAX_MENSAJES_RECORDADOS) {
    mensajesEnviados.delete(mensajesEnviados.keys().next().value);
  }
}
export async function obtenerMensaje(key) {
  return mensajesEnviados.get(key?.id);
}
export function obtenerSocket() { return sock; }

function programarReconexion() {
  setTimeout(() => {
    conectar().catch((err) => {
      console.error('[WhatsApp] No se pudo reconectar:', err.message);
      connectionListener?.({status:'reconnecting',qr:null});
      programarReconexion();
    });
  }, RECONEXION_MS);
}

async function conectar() {
  mkdirSync(AUTH_DIR, { recursive: true, mode: 0o700 });
  connectionListener?.({status:"connecting",qr:null});
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
    getMessage: obtenerMensaje,
  });

  const currentSocket = sock;
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      connectionListener?.({status:'qr',qr});
      console.log('\n[WhatsApp] Escanea el QR para vincular tu cuenta:\n');
      if (!connectionListener) qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('[WhatsApp] ✓ Conexión establecida correctamente.');
      estaConectado = true;
      connectionListener?.({status:'connected',qr:null});
      resolversConexion.forEach(({ resolve }) => resolve());
      resolversConexion = [];
    }

    if (connection === 'close') {
      estaConectado = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      connectionListener?.({status:statusCode === DisconnectReason.loggedOut?'logged_out':'reconnecting',qr:null});
      const debeReconectar = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[WhatsApp] Conexión cerrada. Código: ${statusCode ?? 'desconocido'}. ` +
        `Reconectar: ${debeReconectar}`
      );

      resolversConexion.forEach(({ reject }) =>
        reject(new Error(`Conexión cerrada con código ${statusCode}`))
      );
      resolversConexion = [];

      if (debeReconectar) {
        console.log('[WhatsApp] Reconectando en 5 segundos...');
        programarReconexion();
      } else {
        // WhatsApp ya revocó estas credenciales: si se quedan en disco, el próximo intento vuelve a fallar.
        currentSocket.ev.removeAllListeners('creds.update');
        rmSync(AUTH_DIR, { recursive: true, force: true });
        console.error(
          '[WhatsApp] ✗ Sesión cerrada desde el teléfono. Se borraron las credenciales; ' +
          'vuelve a conectar (o reinicia el servicio) para escanear un QR nuevo.'
        );
      }
    }
  });

  sock.ev.on('creds.update', () => saveCreds().catch((err) =>
    console.error('[WhatsApp] No se pudieron guardar las credenciales:', err.message)
  ));
  sock.ev.on('messages.upsert', async ({type, messages}) => {
    if (type !== 'notify' || !incomingHandler) return;
    console.log(`[WhatsApp] ${messages.length} mensaje(s) recibido(s).`);
    for (const message of messages) {
      try { await incomingHandler(message, currentSocket); }
      catch { console.error('[Rapicostura] No se pudo procesar un mensaje entrante.'); }
    }
  });
}

function esperarConexion() {
  if (estaConectado) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const resolver = {
      resolve: () => { clearTimeout(timer); resolve(); },
      reject: (err) => { clearTimeout(timer); reject(err); },
    };
    const timer = setTimeout(() => {
      resolversConexion = resolversConexion.filter((r) => r !== resolver);
      reject(new Error('Timeout: WhatsApp no conectó en el tiempo esperado.'));
    }, TIMEOUT_CONEXION_MS);

    resolversConexion.push(resolver);
  });
}

async function enviarMensaje(telefono, mensaje) {
  await esperarConexion();

  const numeroLimpio = telefono.replace(/[\s\-\+\(\)]/g, '');
  const jid = `${numeroLimpio}@s.whatsapp.net`;

  const resultado = await sock.sendMessage(jid, { text: mensaje });
  recordarEnviado(resultado);
  return resultado;
}

export { conectar, enviarMensaje, estaConectado };
