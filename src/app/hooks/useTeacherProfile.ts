import { useEffect, useState } from 'react';
import { fetchMyProfile } from '../services/teacher-service';
import { getExternalAccessToken } from '../services/session-service';
import type { TeacherProfileData } from '../types/api';

let cache: { token: string; promise: Promise<TeacherProfileData> } | null = null;

/** Una sola consulta de la hoja de vida por sesión, compartida por la barra superior y el panel. */
function loadProfile(token: string): Promise<TeacherProfileData> {
  if (!cache || cache.token !== token) {
    const promise = fetchMyProfile(token);
    cache = { token, promise };
    // Si falla no se queda cacheado el error
    promise.catch(() => {
      if (cache?.promise === promise) cache = null;
    });
  }
  return cache.promise;
}

/** Datos del docente autenticado (RRHH). Devuelve null si no aplica o no están disponibles. */
export function useTeacherProfile(enabled = true): TeacherProfileData | null {
  const [profile, setProfile] = useState<TeacherProfileData | null>(null);

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      return;
    }

    const token = getExternalAccessToken();
    if (!token) return;

    let cancelled = false;
    loadProfile(token)
      .then((data) => !cancelled && setProfile(data))
      .catch(() => !cancelled && setProfile(null));

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return profile;
}
