import { ChevronLeft } from 'lucide-react';
import type { InboxItem } from '../api/client';
import { formatarQuando, LABEL_TIPO, LABEL_TIPO_DETALHE } from '../format';

const NOTA_STATUS: Record<InboxItem['status'], string> = {
  pendente: 'Pendente. Ainda pode ser editado ou excluído — o processamento não pegou esse item.',
  processando: 'O sync está processando agora. Edição e exclusão ficam bloqueadas até terminar.',
  processada: 'Processada. Já foi escrita no vault e não é mais editável por aqui.',
};

interface ItemDetalheProps {
  item: InboxItem;
  onVoltar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}

export function ItemDetalhe({ item, onVoltar, onEditar, onExcluir }: ItemDetalheProps) {
  const podeAgir = item.status === 'pendente';

  const campos = [
    { label: 'Tipo', valor: LABEL_TIPO_DETALHE[item.tipo].replace('Captura por ', '') },
    { label: 'Quando', valor: formatarQuando(item.timestamp) },
    { label: 'Status', valor: item.status },
    { label: 'Vault', valor: item.status === 'processada' ? item.vault_path : '—' },
  ];

  return (
    <div>
      <header className="screen-header">
        <button type="button" className="icon-btn" onClick={onVoltar} aria-label="Voltar">
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <span className="screen-header-title">Inbox / item {item.id}</span>
      </header>

      <div className="detail-kicker">{LABEL_TIPO_DETALHE[item.tipo]}</div>
      <div className="detail-title">
        <h2>{item.conteudo ?? `(${LABEL_TIPO[item.tipo]} sem legenda)`}</h2>
      </div>

      <div className="detail-table">
        {campos.map((campo) => (
          <div key={campo.label} className="detail-row">
            <span className="detail-row-label">{campo.label}</span>
            <span className="detail-row-valor">{campo.valor}</span>
          </div>
        ))}
      </div>

      <div className="detail-tags">
        <span className="detail-tags-label">Tags</span>
        <div className="tag-chips">
          {item.tags.map((tag) => (
            <span key={tag} className="chip chip-emphasis">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="detail-state">
        <span className="detail-state-label">Estado</span>
        <p>{NOTA_STATUS[item.status]}</p>
      </div>

      <div className="detail-actions">
        <button type="button" className="detail-action" disabled={!podeAgir} onClick={onEditar}>
          Editar
        </button>
        <button
          type="button"
          className="detail-action detail-action-excluir"
          disabled={!podeAgir}
          onClick={onExcluir}
        >
          Excluir
        </button>
      </div>
    </div>
  );
}
