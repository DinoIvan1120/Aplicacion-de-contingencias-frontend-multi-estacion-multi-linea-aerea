import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const clientRef = useRef(null);

  // Guarda las suscripciones activas de disponibilidad para poder limpiarlas
  const dispSubsRef = useRef({});
  const pendingSubsRef = useRef(new Set()); // ← FALTABA ESTA LÍNEA

  const doSubscribeRef = useRef(null);

  // Definir ANTES del useEffect
  const _doSubscribe = useCallback(
    (stompClient, registroId) => {
      if (!registroId || dispSubsRef.current[registroId]) return;
      const topic = `/topic/disponibilidad/${registroId}`;
      console.log("✅ SUSCRITO a:", topic);
      const sub = stompClient.subscribe(topic, () => {
        console.log("📡 DISPONIBILIDAD actualizada para registro:", registroId);
        queryClient.invalidateQueries({
          queryKey: ["disponibilidad", registroId],
        });
      });
      dispSubsRef.current[registroId] = sub;
    },
    [queryClient],
  );

  // Mantener ref actualizada siempre
  doSubscribeRef.current = _doSubscribe;

  useEffect(() => {
    if (!token) return;

    // NOTA: El endpoint del backend está en /api/ws (no /ws).
    // El JwtFilter solo lee el JWT del header Authorization pero SockJS
    // hace un GET /api/ws/info que no puede llevar headers custom.
    // Por eso Spring Security responde 403 en ese handshake.
    //
    // Fix definitivo en el BACKEND — agregar en SecurityConfig.java:
    //   .requestMatchers("/api/ws/**").permitAll()
    //
    // En el frontend: silenciamos errores para que la app no se rompa.
    let client;
    try {
      client = new Client({
        webSocketFactory: () =>
          new SockJS(`${import.meta.env.VITE_API_BASE_URL}/api/ws`),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 0, // sin reintentos si hay 403
        onConnect: () => {
          client.subscribe("/topic/atenciones", (message) => {
            console.log("📩 MENSAJE CRUDO:", message);
            console.log("📩 BODY:", message.body);
            try {
              const event = JSON.parse(message.body);
              console.log("✅ EVENTO:", event);
              if (
                event.tipo === "NUEVA_ATENCION" ||
                event.tipo === "ATENCION_ANULADA"
              ) {
                console.log("🔄 INVALIDANDO QUERIES");
                queryClient.invalidateQueries({ queryKey: ["atenciones"] });
                queryClient.invalidateQueries({ queryKey: ["reportes"] });
              }
            } catch (e) {
              console.error("❌ ERROR PARSEANDO:", e);
              /* ignorar mensajes malformados */
            }
          });

          // Procesar suscripciones pendientes que llegaron antes de conectar
          // ✅ CORRECTO — lee la función actualizada via ref
          pendingSubsRef.current.forEach((registroId) => {
            doSubscribeRef.current?.(client, registroId);
          });
          pendingSubsRef.current.clear();
        },

        onStompError: () => {
          /* silenciar — no crash */
        },
        onWebSocketError: () => {
          /* 403 del backend — silenciar */
        },
      });
      client.activate();
      clientRef.current = client;
    } catch {
      /* SockJS no disponible — ignorar */
    }

    return () => {
      try {
        client?.deactivate();
      } catch {
        /* ignorar */
      }
    };
  }, [token, queryClient]);

  const subscribeDisponibilidad = useCallback(
    (registroId) => {
      if (!registroId) return;
      const client = clientRef.current;
      if (client?.connected) {
        // Cliente ya conectado: suscribir de inmediato
        _doSubscribe(client, registroId);
      } else {
        // Cliente aún conectándose: encolar para cuando llegue onConnect
        pendingSubsRef.current.add(registroId);
      }
    },
    [_doSubscribe],
  );

  const unsubscribeDisponibilidad = useCallback((registroId) => {
    pendingSubsRef.current.delete(registroId);
    const sub = dispSubsRef.current[registroId];
    if (sub) {
      try {
        sub.unsubscribe();
      } catch {
        /* ignorar */
      }
      delete dispSubsRef.current[registroId];
    }
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        client: clientRef.current,
        subscribeDisponibilidad,
        unsubscribeDisponibilidad,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
