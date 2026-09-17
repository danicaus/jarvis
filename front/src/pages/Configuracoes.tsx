import { ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Tag } from '../api/client';
import { DURACAO_MAX_AUDIO_S, IMAGEM_MAX_DIMENSAO_PX } from '../constants';

const INFORMACOES = [
  { label: 'Limite de gravação', valor: `${DURACAO_MAX_AUDIO_S} s` },
  { label: 'Foto redimensionada em', valor: `${IMAGEM_MAX_DIMENSAO_PX} px` },
];

interface ConfiguracoesProps {
  email: string;
  tags: Tag[];
  onAdicionarTag: (nome: string) => Promise<void>;
  onRenomearTag: (id: number, nome: string) => Promise<void>;
  onRemoverTag: (id: number) => Promise<void>;
  onVoltar: () => void;
  onSair: () => void;
}

export function Configuracoes({
  email,
  tags,
  onAdicionarTag,
  onRenomearTag,
  onRemoverTag,
  onVoltar,
  onSair,
}: ConfiguracoesProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState('');
  const [novaTag, setNovaTag] = useState('');

  function iniciarEdicao(tag: Tag) {
    setErro(null);
    setEditandoId(tag.id);
    setRascunho(tag.nome);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setRascunho('');
  }

  async function salvarEdicao(id: number) {
    const nome = rascunho.trim();
    if (!nome) return;
    setErro(null);
    try {
      await onRenomearTag(id, nome);
      cancelarEdicao();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao renomear a tag.');
    }
  }

  async function remover(id: number) {
    if (!window.confirm('Remover essa tag da lista? Itens já capturados continuam com ela.')) return;
    setErro(null);
    try {
      await onRemoverTag(id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover a tag.');
    }
  }

  async function adicionar(event: FormEvent) {
    event.preventDefault();
    const nome = novaTag.trim();
    if (!nome) return;
    setErro(null);
    try {
      await onAdicionarTag(nome);
      setNovaTag('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao adicionar a tag.');
    }
  }

  return (
    <div>
      <header className="screen-header">
        <button type="button" className="icon-btn" onClick={onVoltar} aria-label="Voltar">
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <span className="screen-header-title">Configurações</span>
      </header>

      {erro && (
        <p role="alert" className="alert">
          {erro}
        </p>
      )}

      <div className="settings-section">
        <span className="settings-label">Conta</span>
        <div className="settings-email">{email}</div>
        <div className="settings-sub">Entrou com Google</div>
        <button type="button" className="btn-secundario" style={{ marginTop: 14 }} onClick={onSair}>
          Sair
        </button>
      </div>

      <div className="settings-section">
        <span className="settings-label">Tags disponíveis</span>

        <div className="tag-manage-list">
          {tags.map((tag) =>
            editandoId === tag.id ? (
              <div key={tag.id} className="tag-manage-row">
                <input
                  className="tag-input"
                  value={rascunho}
                  onChange={(event) => setRascunho(event.target.value)}
                  autoFocus
                />
                <div className="tag-manage-acoes">
                  <button
                    type="button"
                    className="btn-primario-sm"
                    disabled={!rascunho.trim()}
                    onClick={() => salvarEdicao(tag.id)}
                  >
                    Salvar
                  </button>
                  <button type="button" className="btn-secundario" onClick={cancelarEdicao}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div key={tag.id} className="tag-manage-row">
                <span className="chip chip-outline">{tag.nome}</span>
                <div className="tag-manage-acoes">
                  <button type="button" aria-label="Renomear" onClick={() => iniciarEdicao(tag)}>
                    <Pencil size={16} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="acao-excluir"
                    aria-label="Remover"
                    onClick={() => remover(tag.id)}
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>

        <form className="tag-add-form" onSubmit={adicionar}>
          <input
            className="tag-input"
            placeholder="Nova tag"
            value={novaTag}
            onChange={(event) => setNovaTag(event.target.value)}
          />
          <button type="submit" className="btn-primario-sm" disabled={!novaTag.trim()}>
            Adicionar
          </button>
        </form>
      </div>

      <div>
        {INFORMACOES.map((info) => (
          <div key={info.label} className="settings-row">
            <span className="settings-row-label">{info.label}</span>
            <span className="settings-row-valor">{info.valor}</span>
          </div>
        ))}
      </div>

      <div className="settings-footer">
        <p>O processamento roda fora do app, no servidor da Atena. Nada aqui assume prazos ou datas.</p>
      </div>
    </div>
  );
}
