import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

const PRESETS_MIN = [5, 10, 15, 25, 30, 45, 60, 90];
// A primeira é o --color-accent do Modernist.
const CORES = ['#ec3013', '#e8a33d', '#4f9dde', '#5fb878', '#9a7fd6'];
const SEGURAR_PARA_ENCERRAR_MS = 800;
const CHAVE_ESTADO = 'timer';
const CHAVE_COR = 'timer-cor';

// `fim` preenchido = rodando; `resta` preenchido = pausado (0 = terminou).
// Guardado no localStorage pra sobreviver a recarregar a página no meio.
type Estado = { total: number; fim: number | null; resta: number | null };

function carregarEstado(): Estado | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_ESTADO) ?? 'null');
  } catch {
    return null;
  }
}

function restante(estado: Estado, agora: number): number {
  return estado.fim !== null ? Math.max(0, estado.fim - agora) : (estado.resta ?? 0);
}

function formatar(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s % 60)}` : `${p(m)}:${p(s % 60)}`;
}

// Tela cheia + trava na horizontal. Nem todo navegador suporta — segue sem.
async function entrarTelaCheia() {
  try {
    await document.documentElement.requestFullscreen();
    const orientacao = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientacao.lock?.('landscape');
  } catch {
    /* sem suporte */
  }
}

export function Timer({ onVoltar }: { onVoltar: () => void }) {
  const [estado, setEstado] = useState<Estado | null>(carregarEstado);
  const [agora, setAgora] = useState(Date.now());
  const [cor, setCor] = useState(() => localStorage.getItem(CHAVE_COR) ?? CORES[0]);
  const [minutosLivre, setMinutosLivre] = useState('');
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const segurandoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibrouRef = useRef(false);

  const rodando = estado?.fim != null;
  const resta = estado ? restante(estado, agora) : 0;
  const terminou = estado !== null && resta === 0;

  useEffect(() => {
    if (estado) localStorage.setItem(CHAVE_ESTADO, JSON.stringify(estado));
    else localStorage.removeItem(CHAVE_ESTADO);
  }, [estado]);

  // Atualiza a tela a cada frame enquanto roda.
  useEffect(() => {
    if (!rodando) return;
    let raf = 0;
    const tick = () => {
      setAgora(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rodando]);

  // Chegou a zero: congela como "pausado em 0" e vibra uma vez.
  useEffect(() => {
    if (!rodando || !terminou) return;
    setEstado((atual) => atual && { ...atual, fim: null, resta: 0 });
    if (!vibrouRef.current) navigator.vibrate?.([400, 200, 400, 200, 800]);
    vibrouRef.current = true;
  }, [rodando, terminou]);

  // Mantém a tela acesa enquanto o timer estiver aberto. O navegador solta o
  // wake lock quando a aba some, então pede de novo ao voltar.
  useEffect(() => {
    if (!estado) return;
    const pedir = async () => {
      try {
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {
        /* sem suporte */
      }
    };
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') {
        setAgora(Date.now());
        pedir();
      }
    };
    pedir();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [estado !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  async function iniciar(minutos: number) {
    const total = minutos * 60_000;
    vibrouRef.current = false;
    setAgora(Date.now());
    setEstado({ total, fim: Date.now() + total, resta: null });
    await entrarTelaCheia();
  }

  function alternarPausa() {
    if (!estado) return;
    if (terminou) return encerrar();
    const t = Date.now();
    setAgora(t);
    setEstado(
      rodando
        ? { ...estado, fim: null, resta: restante(estado, t) }
        : { ...estado, fim: t + (estado.resta ?? 0), resta: null },
    );
  }

  function encerrar() {
    setEstado(null);
    if (document.fullscreenElement) document.exitFullscreen();
  }

  function escolherCor(c: string) {
    setCor(c);
    localStorage.setItem(CHAVE_COR, c);
  }

  if (estado) {
    const texto = formatar(resta);
    const classes = ['timer-tela', !rodando && !terminou && 'timer-pausado', terminou && 'timer-fim']
      .filter(Boolean)
      .join(' ');
    return (
      <div
        className={classes}
        style={{ '--timer-cor': cor } as CSSProperties}
        onPointerDown={() => {
          segurandoRef.current = setTimeout(() => {
            segurandoRef.current = null;
            encerrar();
          }, SEGURAR_PARA_ENCERRAR_MS);
        }}
        onPointerUp={() => {
          if (segurandoRef.current) {
            clearTimeout(segurandoRef.current);
            segurandoRef.current = null;
            alternarPausa();
          }
        }}
        onPointerCancel={() => segurandoRef.current && clearTimeout(segurandoRef.current)}
      >
        <div className="timer-barra" style={{ width: `${(resta / estado.total) * 100}%` }} />
        <div className="timer-numeros" style={{ fontSize: texto.length > 5 ? '26vw' : '38vw' }}>
          {texto}
        </div>
        <div className="timer-dica">toque: continuar · segurar: encerrar</div>
      </div>
    );
  }

  return (
    <div>
      <header className="screen-header">
        <button type="button" className="icon-btn" onClick={onVoltar} aria-label="Voltar">
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <span className="screen-header-title">Timer</span>
      </header>

      <div className="settings-section">
        <span className="settings-label">Duração (min)</span>
        <div className="timer-presets">
          {PRESETS_MIN.map((m) => (
            <button key={m} type="button" className="btn-secundario" onClick={() => iniciar(m)}>
              {m}
            </button>
          ))}
        </div>
        <form
          className="timer-livre"
          onSubmit={(event) => {
            event.preventDefault();
            const m = parseFloat(minutosLivre);
            if (m > 0) iniciar(m);
          }}
        >
          <input
            type="number"
            inputMode="decimal"
            min="0.1"
            step="any"
            placeholder="Outro valor"
            value={minutosLivre}
            onChange={(event) => setMinutosLivre(event.target.value)}
          />
          <button type="submit" className="btn-primario-sm" disabled={!(parseFloat(minutosLivre) > 0)}>
            Iniciar
          </button>
        </form>
      </div>

      <div className="settings-section">
        <span className="settings-label">Cor</span>
        <div className="timer-cores" role="group" aria-label="Cor">
          {CORES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={c === cor}
              className={c === cor ? 'timer-cor timer-cor-ativa' : 'timer-cor'}
              style={{ background: c }}
              onClick={() => escolherCor(c)}
            />
          ))}
        </div>
      </div>

      <div className="settings-footer">
        <p>
          Abre em tela cheia, na horizontal, e mantém a tela acesa. Toque pra pausar ou continuar;
          segure pra encerrar.
        </p>
      </div>
    </div>
  );
}
