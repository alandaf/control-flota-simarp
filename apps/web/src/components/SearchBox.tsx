import { useEffect, useRef, useState } from 'react';
import { geoSearch, type GeoResult } from '../lib/api';
import { Search, Pin } from './Icons';

interface Props {
  placeholder: string;
  value?: string;                       // texto a mostrar (p.ej. tras tocar el mapa)
  dot?: 'o' | 'd';                      // color del indicador
  getViewbox?: () => string | undefined; // sesga la búsqueda a la vista del mapa
  onSelect: (r: GeoResult) => void;
}

export default function SearchBox({ placeholder, value, dot, getViewbox, onSelect }: Props) {
  const [q, setQ] = useState(value ?? '');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // Sincroniza cuando el texto llega desde fuera (toque en el mapa)
  useEffect(() => { if (value !== undefined) setQ(value); }, [value]);

  // Cierra al tocar fuera
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function onChange(text: string) {
    setQ(text);
    if (timer.current) window.clearTimeout(timer.current);
    if (text.trim().length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true); setOpen(true);
    timer.current = window.setTimeout(async () => {
      const r = await geoSearch(text.trim(), getViewbox?.());
      setResults(r); setLoading(false);
    }, 400);
  }

  function pick(r: GeoResult) {
    setQ(r.label); setOpen(false); setResults([]);
    onSelect(r);
  }

  return (
    <div className="searchbox" ref={box}>
      <span className={`sb-dot ${dot ?? ''}`}>{dot ? '' : <Search />}</span>
      <input
        value={q}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true); }}
      />
      {open && (
        <div className="sb-list">
          {loading && <div className="sb-item muted">Buscando…</div>}
          {!loading && results.length === 0 && <div className="sb-item muted">Sin resultados</div>}
          {results.map((r, i) => (
            <div key={i} className="sb-item" onMouseDown={() => pick(r)}>
              <Pin /> <span>{r.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
