import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import type { ApplicationSummary } from '../types/api';

type UpdateCallback = (application: ApplicationSummary) => void;
type StatusChangeCallback = (data: { applicationId: string; newStatus: string }) => void;

export function useApplicationUpdates() {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const updateCallbacksRef = useRef<Set<UpdateCallback>>(new Set());
  const statusChangeCallbacksRef = useRef<Set<StatusChangeCallback>>(new Set());
  const subscribedRef = useRef(false);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5080/hubs/applications', {
        withCredentials: true
      })
      .withAutomaticReconnect([0, 1000, 3000, 5000])
      .withHubProtocol(new signalR.JsonHubProtocol())
      .build();

    connection.onreconnected(() => {
      console.log('🔄 Reconectado a WebSocket');
      if (subscribedRef.current) {
        connection.invoke('SubscribeToApplicationUpdates')
          .then(() => console.log('✅ Resuscrito a actualizaciones'))
          .catch(err => console.error('❌ Error al resuscribirse:', err));
      }
    });

    connection.onreconnecting(() => {
      console.log('⚠️ Reconectando a WebSocket...');
    });

    connection.onclose(() => {
      console.log('❌ Desconectado de WebSocket');
    });

    connection.on('ApplicationUpdated', (application: ApplicationSummary) => {
      console.log('📨 Actualización recibida:', application);
      updateCallbacksRef.current.forEach(cb => cb(application));
    });

    connection.on('ApplicationStatusChanged', (data: { applicationId: string; newStatus: string }) => {
      console.log('📨 Cambio de estado recibido:', data);
      statusChangeCallbacksRef.current.forEach(cb => cb(data));
    });

    console.log('🔗 Conectando a WebSocket...');
    connection.start()
      .then(() => {
        console.log('✅ Conectado a WebSocket');
        if (subscribedRef.current && updateCallbacksRef.current.size > 0) {
          return connection.invoke('SubscribeToApplicationUpdates')
            .then(() => console.log('✅ Suscrito a actualizaciones'));
        }
      })
      .catch(err => console.error('❌ Error de conexión:', err));

    connectionRef.current = connection;

    return () => {
      console.log('🔌 Desconectando WebSocket...');
      connection.stop();
    };
  }, []);

  const subscribe = useCallback((callback: UpdateCallback) => {
    console.log('📌 Nuevo suscriptor registrado');
    updateCallbacksRef.current.add(callback);
    subscribedRef.current = true;

    const doSubscribe = async () => {
      if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
        try {
          console.log('📡 Enviando comando SubscribeToApplicationUpdates...');
          await connectionRef.current.invoke('SubscribeToApplicationUpdates');
          console.log('✅ Comando enviado exitosamente');
        } catch (err) {
          console.error('❌ Error en subscribe:', err);
        }
      } else {
        console.warn('⚠️ No conectado. Estado:', connectionRef.current?.state);
      }
    };
    doSubscribe();

    return () => {
      console.log('🗑️ Suscriptor removido');
      updateCallbacksRef.current.delete(callback);
    };
  }, []);

  const subscribeToStatusChanges = useCallback((callback: StatusChangeCallback) => {
    console.log('📌 Nuevo suscriptor de cambios de estado registrado');
    statusChangeCallbacksRef.current.add(callback);
    subscribedRef.current = true;

    const doSubscribe = async () => {
      if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
        try {
          console.log('📡 Enviando comando SubscribeToApplicationUpdates...');
          await connectionRef.current.invoke('SubscribeToApplicationUpdates');
          console.log('✅ Comando enviado exitosamente');
        } catch (err) {
          console.error('❌ Error en subscribeToStatusChanges:', err);
        }
      } else {
        console.warn('⚠️ No conectado. Estado:', connectionRef.current?.state);
      }
    };
    doSubscribe();

    return () => {
      console.log('🗑️ Suscriptor de cambios removido');
      statusChangeCallbacksRef.current.delete(callback);
    };
  }, []);

  return { subscribe, subscribeToStatusChanges };
}
