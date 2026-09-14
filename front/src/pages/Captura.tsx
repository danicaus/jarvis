import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  addInboxItem,
  deleteInboxItem,
  getInbox,
  updateInboxItem,
  ApiError,
  type InboxItem,
} from '../api/client';

// Lista fixa, não campo livre — editar aqui se o conjunto de tags mudar.
const TAGS_DISPONIVEIS = ['pessoal', 'trabalho', 'ideia', 'compra', 'saúde'];

const DURACAO_MAX_AUDIO_S = 60;
const IMAGEM_MAX_DIMENSAO_PX = 1600;
const IMAGEM_QUALIDADE = 0.8;

type Modo = 'texto' | 'audio' | 'imagem';

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = () => reject(new Error('falha ao ler arquivo'));
    reader.readAsDataURL(blob);
  });
}

// Redimensiona no canvas antes de mandar — sem isso, foto de celular moderno
// facilmente passa do limite de corpo de Serverless Function da Vercel (~4.5MB).
function redimensionarImagem(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, IMAGEM_MAX_DIMENSAO_PX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas indisponível'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('falha ao gerar imagem'))),
        'image/jpeg',
        IMAGEM_QUALIDADE,
      );
    };
    img.onerror = () => reject(new Error('falha ao carregar imagem'));
    img.src = url;
  });
}

function escolherMimeTypeAudio(): string | undefined {
  const candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidatos.find((tipo) => MediaRecorder.isTypeSupported(tipo));
}

function TagChips({
  selecionadas,
  onToggle,
}: {
  selecionadas: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="tag-chips" role="group" aria-label="Tags">
      {TAGS_DISPONIVEIS.map((tag) => (
        <button
          key={tag}
          type="button"
          className={selecionadas.includes(tag) ? 'chip chip-ativa' : 'chip'}
          aria-pressed={selecionadas.includes(tag)}
          onClick={() => onToggle(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

const ICONE_TIPO: Record<InboxItem['tipo'], string> = {
  texto: '📝',
  audio: '🎤',
  imagem: '📷',
};

export function Captura() {
  const [itens, setItens] = useState<InboxItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [modo, setModo] = useState<Modo>('texto');
  const [texto, setTexto] = useState('');
  const [legenda, setLegenda] = useState('');
  const [tagsSelecionadas, setTagsSelecionadas] = useState<string[]>([]);

  const [gravando, setGravando] = useState(false);
  const [audioSegundos, setAudioSegundos] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [imagemBlob, setImagemBlob] = useState<Blob | null>(null);
  const [imagemPreviewUrl, setImagemPreviewUrl] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState('');
  const [rascunhoTags, setRascunhoTags] = useState<string[]>([]);

  useEffect(() => {
    getInbox().then(setItens);
  }, []);

  // Solta a stream do microfone e o timer se o componente desmontar no meio de
  // uma gravação — evita deixar o indicador de "gravando" ligado pra sempre.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function alternarTag(lista: string[], setLista: (tags: string[]) => void, tag: string) {
    setLista(lista.includes(tag) ? lista.filter((t) => t !== tag) : [...lista, tag]);
  }

  function pararGravacao() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setGravando(false);
  }

  async function iniciarGravacao() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = escolherMimeTypeAudio();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType }));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setAudioBlob(null);
      setAudioSegundos(0);
      setGravando(true);

      intervalRef.current = setInterval(() => {
        setAudioSegundos((atual) => {
          const proximo = atual + 1;
          if (proximo >= DURACAO_MAX_AUDIO_S) {
            pararGravacao();
          }
          return proximo;
        });
      }, 1000);
    } catch {
      setErro('Não foi possível acessar o microfone — verifique a permissão do navegador.');
    }
  }

  async function onSelecionarImagem(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = ''; // permite escolher o mesmo arquivo de novo depois
    if (!arquivo) return;

    setErro(null);
    try {
      const redimensionada = await redimensionarImagem(arquivo);
      if (imagemPreviewUrl) URL.revokeObjectURL(imagemPreviewUrl);
      setImagemBlob(redimensionada);
      setImagemPreviewUrl(URL.createObjectURL(redimensionada));
    } catch {
      setErro('Não foi possível processar essa imagem.');
    }
  }

  function removerImagem() {
    if (imagemPreviewUrl) URL.revokeObjectURL(imagemPreviewUrl);
    setImagemBlob(null);
    setImagemPreviewUrl(null);
  }

  function limparCapturaAtual() {
    setTexto('');
    setLegenda('');
    setAudioBlob(null);
    setAudioSegundos(0);
    removerImagem();
    // Tags ficam como estavam — capturas seguidas costumam repetir a mesma tag.
  }

  const podeSubmeter =
    tagsSelecionadas.length > 0 &&
    ((modo === 'texto' && texto.trim().length > 0) ||
      (modo === 'audio' && audioBlob !== null && !gravando) ||
      (modo === 'imagem' && imagemBlob !== null));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!podeSubmeter) return;
    setErro(null);

    try {
      let novoItem: InboxItem;
      if (modo === 'texto') {
        novoItem = await addInboxItem({ tipo: 'texto', conteudo: texto.trim(), tags: tagsSelecionadas });
      } else if (modo === 'audio' && audioBlob) {
        const audio = await blobParaBase64(audioBlob);
        novoItem = await addInboxItem({
          tipo: 'audio',
          audio,
          conteudo: legenda.trim() || undefined,
          tags: tagsSelecionadas,
        });
      } else if (modo === 'imagem' && imagemBlob) {
        const imagem = await blobParaBase64(imagemBlob);
        novoItem = await addInboxItem({
          tipo: 'imagem',
          imagem,
          conteudo: legenda.trim() || undefined,
          tags: tagsSelecionadas,
        });
      } else {
        return;
      }

      setItens((atual) => [novoItem, ...atual]);
      limparCapturaAtual();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar a captura.');
    }
  }

  function iniciarEdicao(item: InboxItem) {
    setEditandoId(item.id);
    setRascunho(item.conteudo ?? '');
    setRascunhoTags(item.tags);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setRascunho('');
    setRascunhoTags([]);
  }

  async function salvarEdicao(id: number) {
    setErro(null);
    try {
      const dados: { conteudo?: string; tags?: string[] } = { tags: rascunhoTags };
      if (rascunho.trim()) dados.conteudo = rascunho.trim();

      const itemAtualizado = await updateInboxItem(id, dados);
      setItens((atual) => atual.map((item) => (item.id === id ? itemAtualizado : item)));
      cancelarEdicao();
    } catch (err) {
      await tratarConflito(err);
    }
  }

  async function excluir(id: number) {
    setErro(null);
    try {
      await deleteInboxItem(id);
      setItens((atual) => atual.filter((item) => item.id !== id));
    } catch (err) {
      await tratarConflito(err);
    }
  }

  // 409: o `sync/` (fora deste repo) já pegou o item pra processar entre o
  // carregamento da lista e a ação — recarrega a lista pra refletir a realidade.
  async function tratarConflito(err: unknown) {
    if (err instanceof ApiError && err.status === 409) {
      setErro(`${err.message} — lista atualizada.`);
      setItens(await getInbox());
      return;
    }
    setErro(err instanceof Error ? err.message : 'Erro inesperado.');
  }

  return (
    <div>
      <h1>Captura</h1>

      {erro && <p role="alert">{erro}</p>}

      <form onSubmit={handleSubmit}>
        <div className="tabs" role="tablist" aria-label="Forma de captura">
          {(['texto', 'audio', 'imagem'] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              role="tab"
              aria-selected={modo === opcao}
              className={modo === opcao ? 'tab tab-ativa' : 'tab'}
              onClick={() => setModo(opcao)}
            >
              {ICONE_TIPO[opcao]} {opcao}
            </button>
          ))}
        </div>

        {modo === 'texto' && (
          <textarea
            value={texto}
            onChange={(event) => setTexto(event.target.value)}
            placeholder="O que você quer capturar?"
          />
        )}

        {modo === 'audio' && (
          <div>
            {!gravando && !audioBlob && (
              <button type="button" onClick={iniciarGravacao}>
                🎤 Gravar
              </button>
            )}
            {gravando && (
              <button type="button" onClick={pararGravacao}>
                ⏹ Parar ({audioSegundos}s / {DURACAO_MAX_AUDIO_S}s)
              </button>
            )}
            {!gravando && audioBlob && (
              <div>
                <audio controls src={URL.createObjectURL(audioBlob)} />
                <button type="button" onClick={() => setAudioBlob(null)}>
                  Regravar
                </button>
              </div>
            )}
            <textarea
              value={legenda}
              onChange={(event) => setLegenda(event.target.value)}
              placeholder="Legenda (opcional)"
            />
          </div>
        )}

        {modo === 'imagem' && (
          <div>
            {!imagemPreviewUrl && (
              <input type="file" accept="image/*" capture="environment" onChange={onSelecionarImagem} />
            )}
            {imagemPreviewUrl && (
              <div>
                <img src={imagemPreviewUrl} alt="Prévia da foto capturada" style={{ maxWidth: '100%' }} />
                <button type="button" onClick={removerImagem}>
                  Remover
                </button>
              </div>
            )}
            <textarea
              value={legenda}
              onChange={(event) => setLegenda(event.target.value)}
              placeholder="Legenda (opcional)"
            />
          </div>
        )}

        <TagChips
          selecionadas={tagsSelecionadas}
          onToggle={(tag) => alternarTag(tagsSelecionadas, setTagsSelecionadas, tag)}
        />

        <button type="submit" disabled={!podeSubmeter}>
          Capturar
        </button>
      </form>

      <ul>
        {itens.map((item) =>
          editandoId === item.id ? (
            <li key={item.id}>
              <textarea value={rascunho} onChange={(event) => setRascunho(event.target.value)} />
              <TagChips
                selecionadas={rascunhoTags}
                onToggle={(tag) => alternarTag(rascunhoTags, setRascunhoTags, tag)}
              />
              <button type="button" disabled={rascunhoTags.length === 0} onClick={() => salvarEdicao(item.id)}>
                Salvar
              </button>
              <button type="button" onClick={cancelarEdicao}>
                Cancelar
              </button>
            </li>
          ) : (
            <li key={item.id}>
              {ICONE_TIPO[item.tipo]} {item.conteudo ?? `(${item.tipo} sem legenda)`}
              {' — '}
              {item.tags.join(', ')}
              <button type="button" onClick={() => iniciarEdicao(item)}>
                Editar
              </button>
              <button type="button" onClick={() => excluir(item.id)}>
                Excluir
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
