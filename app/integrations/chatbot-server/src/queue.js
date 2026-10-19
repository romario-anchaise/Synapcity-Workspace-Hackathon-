import { enviarMensaje } from './whatsapp.js';

const DELAY_MIN_MS = 15_000;
const DELAY_MAX_MS = 45_000;

function retrasoAleatorio() {
  return Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ColaMensajes {
  constructor() {
    this._cola = [];
    this._procesando = false;
    this._stats = { enviados: 0, errores: 0 };
  }

  agregar(mensajes) {
    this._cola.push(...mensajes);

    if (!this._procesando) {
      this._procesar();
    }
  }

  async _procesar() {
    this._procesando = true;
    console.log(`[Cola] Iniciando. Mensajes pendientes: ${this._cola.length}`);

    while (this._cola.length > 0) {
      const item = this._cola.shift();

      try {
        console.log(`[Cola] Enviando a ${item.telefono} (${this._cola.length} restantes)...`);
        await enviarMensaje(item.telefono, item.mensaje);
        this._stats.enviados++;
        console.log(`[Cola] ✓ Enviado a ${item.telefono}.`);
      } catch (err) {
        this._stats.errores++;
        console.error(`[Cola] ✗ Error enviando a ${item.telefono}:`, err.message);
      }

      if (this._cola.length > 0) {
        const delay = retrasoAleatorio();
        console.log(`[Cola] Pausa de ${(delay / 1000).toFixed(1)}s antes del siguiente...`);
        await esperar(delay);
      }
    }

    this._procesando = false;
    console.log(
      `[Cola] Procesamiento completado. ` +
      `Enviados: ${this._stats.enviados}, Errores: ${this._stats.errores}`
    );
  }

  obtenerEstado() {
    return {
      enCola: this._cola.length,
      procesando: this._procesando,
      enviados: this._stats.enviados,
      errores: this._stats.errores,
    };
  }
}

const cola = new ColaMensajes();
export default cola;
