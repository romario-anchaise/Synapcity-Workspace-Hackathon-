# Chatbot Rapicostura

Chatbot de postulación para costureras. Sigue el guion del prototipo (`docs/prototipo.html`), responde preguntas sobre la empresa con IA (Gemini u Ollama) y funciona en la web, por WhatsApp con QR y por la API oficial de Meta.

> ¿Usas Claude Code o Codex? Lee primero **`AGENTS.md`**: explica cómo funciona todo sin leer el proyecto completo.

## Arrancar

Requiere Node.js 22.13 o más reciente.

```bash
npm ci
npm test
npm run bot
```

- Chat: http://localhost:8090
- Panel de configuración (solo se abre desde la misma computadora): http://localhost:8090/setup/

## Configurar en el panel

1. **IA que responde:** elige Gemini y pega la clave de Google AI Studio, u Ollama para usar una IA local.
2. **Información de la empresa:** instrucciones para la IA, contexto y preguntas frecuentes.
3. **Preguntas que hicieron:** lo que preguntaron las postulantes; lo que quedó sin respuesta se convierte en pregunta frecuente con un clic.
4. **WhatsApp por QR:** números autorizados, velocidad de respuesta y QR.
5. **WhatsApp oficial (Meta):** Phone number ID, token y App secret, y luego el webhook en developers.facebook.com.

Las claves, la sesión de WhatsApp y la base de datos se guardan en `~/.local/share/rapicostura-bot/`, fuera del proyecto. No se suben a Git.
