import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Pencil, Settings, Trash2 } from 'lucide-react';
import {
  addInboxItem,
  addTag,
  ApiError,
  deleteInboxItem,
  deleteTag,
  getInbox,
  getTags,
  renameTag,
  updateInboxItem,
  type InboxItem,
  type NovoItem,
  type Tag,
} from '../api/client';
import { DURACAO_MAX_AUDIO_S, IMAGEM_MAX_DIMENSAO_PX, IMAGEM_QUALIDADE } from '../constants';
import { formatarDataHora, LABEL_TIPO } from '../format';
import { Configuracoes } from './Configuracoes';
import { ItemDetalhe } from './ItemDetalhe';

type Modo = 'texto' | 'audio' | 'imagem';

const ALTURAS_NIVEL_AUDIO = [30, 62, 44, 88, 54, 100, 38, 70, 26, 58, 34, 76];
const BARRAS_ATIVAS_AUDIO = new Set([3, 5]);

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
  opcoes,
  selecionadas,
  onToggle,
}: {
  opcoes: string[];
  selecionadas: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="tag-chips" role="group" aria-label="Tags">
      {opcoes.map((tag) => (
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

type Tela = 'lista' | 'detalhe' | 'config';

interface CapturaProps {
  email: string;
  onSair: () => void;
}

export function Captura({ email, onSair }: CapturaProps) {
  const [tela, setTela] = useState<Tela>('lista');
  const [itemDetalheId, setItemDetalheId] = useState<number | null>(null);

  const [itens, setItens] = useState<InboxItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);

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
    getTags().then(setTags);
  }, []);

  async function adicionarTag(nome: string) {
    const tag = await addTag(nome);
    setTags((atual) => [...atual, tag]);
  }

  async function renomearTag(id: number, nome: string) {
    const tag = await renameTag(id, nome);
    setTags((atual) => atual.map((t) => (t.id === id ? tag : t)));
  }

  async function removerTag(id: number) {
    await deleteTag(id);
    setTags((atual) => atual.filter((t) => t.id !== id));
  }

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
      let item: NovoItem;
      if (modo === 'texto') {
        item = { tipo: 'texto', conteudo: texto.trim(), tags: tagsSelecionadas };
      } else if (modo === 'audio' && audioBlob) {
        item = {
          tipo: 'audio',
          audio: await blobParaBase64(audioBlob),
          conteudo: legenda.trim() || undefined,
          tags: tagsSelecionadas,
        };
      } else if (modo === 'imagem' && imagemBlob) {
        item = {
          tipo: 'imagem',
          imagem: await blobParaBase64(imagemBlob),
          conteudo: legenda.trim() || undefined,
          tags: tagsSelecionadas,
        };
      } else {
        return;
      }

      const novoItem = await addInboxItem(item);
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

  async function excluirItem(id: number) {
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

  if (tela === 'config') {
    return (
      <Configuracoes
        email={email}
        tags={tags}
        onAdicionarTag={adicionarTag}
        onRenomearTag={renomearTag}
        onRemoverTag={removerTag}
        onVoltar={() => setTela('lista')}
        onSair={onSair}
      />
    );
  }

  if (tela === 'detalhe') {
    const item = itens.find((atual) => atual.id === itemDetalheId);
    if (item) {
      return (
        <ItemDetalhe
          item={item}
          onVoltar={() => setTela('lista')}
          onEditar={() => {
            iniciarEdicao(item);
            setTela('lista');
          }}
          onExcluir={async () => {
            await excluirItem(item.id);
            setTela('lista');
          }}
        />
      );
    }
  }

  return (
    <div>
      <header className="captura-header">
        <div className="captura-header-top">
          <span className="brand">Jarvis</span>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTela('config')}
            aria-label="Configurações"
          >
            <Settings size={20} strokeWidth={2} />
          </button>
        </div>
        <h2>Captura</h2>
      </header>

      {erro && (
        <p role="alert" className="alert">
          {erro}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mode-tabs" role="tablist" aria-label="Forma de captura">
          {(['audio', 'texto', 'imagem'] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              role="tab"
              aria-selected={modo === opcao}
              className={modo === opcao ? 'mode-tab mode-tab-ativa' : 'mode-tab'}
              onClick={() => setModo(opcao)}
            >
              {LABEL_TIPO[opcao]}
            </button>
          ))}
        </div>

        <div className="capture-block">
          {modo === 'texto' && (
            <textarea
              className="capture-textarea"
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              placeholder="O que você quer capturar?"
            />
          )}

          {modo === 'audio' && (
            <div>
              {!gravando && !audioBlob && (
                <button type="button" className="btn-secundario" onClick={iniciarGravacao}>
                  Gravar
                </button>
              )}
              {gravando && (
                <div>
                  <button type="button" className="btn-secundario" onClick={pararGravacao}>
                    Parar
                  </button>
                  <div className="audio-counter" style={{ marginTop: 10 }}>
                    {String(Math.floor(audioSegundos / 60)).padStart(2, '0')}:
                    {String(audioSegundos % 60).padStart(2, '0')} / 01:00
                  </div>
                  <div className="audio-levels" aria-hidden="true">
                    {ALTURAS_NIVEL_AUDIO.map((altura, indice) => (
                      <span
                        key={indice}
                        className={BARRAS_ATIVAS_AUDIO.has(indice) ? 'ativa' : undefined}
                        style={{ height: `${altura}%` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {!gravando && audioBlob && (
                <div className="audio-player">
                  <audio controls src={URL.createObjectURL(audioBlob)} />
                  <button type="button" className="btn-secundario" onClick={() => setAudioBlob(null)}>
                    Regravar
                  </button>
                </div>
              )}
              <textarea
                className="capture-textarea capture-textarea-legenda"
                value={legenda}
                onChange={(event) => setLegenda(event.target.value)}
                placeholder="Legenda do áudio (opcional)"
              />
            </div>
          )}

          {modo === 'imagem' && (
            <div>
              {!imagemPreviewUrl && (
                <label className="photo-preview photo-picker">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onSelecionarImagem}
                    hidden
                  />
                  <span className="photo-preview-label">Prévia · 1600 px máx.</span>
                </label>
              )}
              {imagemPreviewUrl && (
                <div>
                  <div className="photo-preview">
                    <img src={imagemPreviewUrl} alt="Prévia da foto capturada" />
                    <span className="photo-preview-label">Prévia · 1600 px máx.</span>
                  </div>
                  <button
                    type="button"
                    className="btn-secundario"
                    style={{ marginTop: 12 }}
                    onClick={removerImagem}
                  >
                    Remover
                  </button>
                </div>
              )}
              <textarea
                className="capture-textarea capture-textarea-legenda"
                value={legenda}
                onChange={(event) => setLegenda(event.target.value)}
                placeholder="Legenda da foto (opcional)"
              />
            </div>
          )}

          <TagChips
            opcoes={tags.map((tag) => tag.nome)}
            selecionadas={tagsSelecionadas}
            onToggle={(tag) => alternarTag(tagsSelecionadas, setTagsSelecionadas, tag)}
          />

          <button type="submit" className="btn-capturar" disabled={!podeSubmeter}>
            Capturar
          </button>
        </div>
      </form>

      <div className="list-header">
        <span className="list-header-title">Inbox pendente</span>
        <span className="list-header-count">
          {itens.length} {itens.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {itens.length === 0 && <div className="inbox-vazio">Inbox vazio — nada pendente.</div>}

      {itens.map((item) =>
        editandoId === item.id ? (
          <div key={item.id} className="inbox-edit">
            <textarea
              className="capture-textarea"
              value={rascunho}
              onChange={(event) => setRascunho(event.target.value)}
            />
            <TagChips
              opcoes={tags.map((tag) => tag.nome)}
              selecionadas={rascunhoTags}
              onToggle={(tag) => alternarTag(rascunhoTags, setRascunhoTags, tag)}
            />
            <div className="inbox-edit-acoes">
              <button
                type="button"
                className="btn-primario-sm"
                disabled={rascunhoTags.length === 0}
                onClick={() => salvarEdicao(item.id)}
              >
                Salvar
              </button>
              <button type="button" className="btn-secundario" onClick={cancelarEdicao}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div
            key={item.id}
            className="inbox-item"
            onClick={() => {
              setItemDetalheId(item.id);
              setTela('detalhe');
            }}
          >
            <span className="inbox-item-tipo">{LABEL_TIPO[item.tipo]}</span>
            <div className="inbox-item-corpo">
              <div className="inbox-item-conteudo">
                {item.conteudo ?? `(${LABEL_TIPO[item.tipo]} sem legenda)`}
              </div>
              <div className="inbox-item-meta">
                {item.tags.join(', ')} · {formatarDataHora(item.timestamp)}
              </div>
            </div>
            <div className="inbox-item-acoes">
              <button
                type="button"
                aria-label="Editar"
                onClick={(event) => {
                  event.stopPropagation();
                  iniciarEdicao(item);
                }}
              >
                <Pencil size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="acao-excluir"
                aria-label="Excluir"
                onClick={(event) => {
                  event.stopPropagation();
                  excluirItem(item.id);
                }}
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        ),
      )}

      <div className="list-footer">Só itens pendentes aparecem aqui</div>
    </div>
  );
}
