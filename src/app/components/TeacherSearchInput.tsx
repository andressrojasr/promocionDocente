import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './ui/input';
import { searchTeachers } from '../services/teacher-service';
import type { TeacherSummary } from '../types/api';

interface TeacherSearchInputProps {
  value: TeacherSummary | null;
  onChange: (teacher: TeacherSummary | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Buscador de docentes/autoridades por nombre o cédula (vía backendSimulado), usado
 * para integrar comisiones. Al seleccionar un resultado, congela identificación,
 * nombre completo e id externo del docente.
 */
export function TeacherSearchInput({ value, onChange, placeholder, disabled }: TeacherSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TeacherSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      searchTeachers(query.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-input bg-input-background px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium">{value.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {value.identification}
            {value.facultyName ? ` · ${value.facultyName}` : ''}
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex-none text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          value={query}
          disabled={disabled}
          placeholder={placeholder ?? 'Buscar por nombre o cédula...'}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
      </div>
      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            <ul className="max-h-56 overflow-auto py-1">
              {results.map((teacher) => (
                <li key={teacher.identification}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-secondary"
                    onClick={() => {
                      onChange(teacher);
                      setQuery('');
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium">{teacher.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {teacher.identification}
                      {teacher.facultyName ? ` · ${teacher.facultyName}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
