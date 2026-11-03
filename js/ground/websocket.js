/**
 * WebSocket client for ground-station live telemetry.
 * Reconnects with backoff. Works against local ESP32 AP or host demo server.
 */
const GroundSocket = (() => {
  function connect(url, handlers = {}) {
    let ws = null;
    let closed = false;
    let attempt = 0;
    let timer = null;

    function open() {
      if (closed) return;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        if (handlers.onError) handlers.onError(e);
        schedule();
        return;
      }
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        attempt = 0;
        if (handlers.onOpen) handlers.onOpen();
      };

      ws.onmessage = (ev) => {
        if (handlers.onMessage) handlers.onMessage(ev.data);
      };

      ws.onerror = (ev) => {
        if (handlers.onError) handlers.onError(ev);
      };

      ws.onclose = () => {
        if (handlers.onClose) handlers.onClose();
        if (!closed) schedule();
      };
    }

    function schedule() {
      if (closed) return;
      const delay = Math.min(8000, 400 * Math.pow(1.6, attempt++));
      timer = setTimeout(open, delay);
    }

    function close() {
      closed = true;
      if (timer) clearTimeout(timer);
      if (ws) {
        try {
          ws.close();
        } catch (_) {}
      }
    }

    function send(data) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
    }

    open();
    return { close, send };
  }

  return { connect };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = GroundSocket;
}
