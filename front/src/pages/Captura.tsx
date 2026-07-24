import { useEffect, useState, type FormEvent } from 'react';
import {
  addInboxItem,
  deleteInboxItem,
  getInbox,
  updateInboxItem,
  type InboxItem,
} from '../api/client';

export function Captura() {
  const [conteudo, setConteudo] = useState('');
  const [itens, setItens] = useState<InboxItem[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState('');

  useEffect(() => {
    getInbox().then(setItens);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const novoItem = await addInboxItem(conteudo);
    setItens((atual) => [novoItem, ...atual]);
    setConteudo('');
  }

  function iniciarEdicao(item: InboxItem) {
    setEditandoId(item.id);
    setRascunho(item.conteudo);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setRascunho('');
  }

  async function salvarEdicao(id: number) {
    const itemAtualizado = await updateInboxItem(id, rascunho);
    setItens((atual) => atual.map((item) => (item.id === id ? itemAtualizado : item)));
    cancelarEdicao();
  }

  async function excluir(id: number) {
    await deleteInboxItem(id);
    setItens((atual) => atual.filter((item) => item.id !== id));
  }

  return (
    <div>
      <h1>Captura</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          value={conteudo}
          onChange={(event) => setConteudo(event.target.value)}
          placeholder="O que você quer capturar?"
        />
        <button type="submit" disabled={!conteudo.trim()}>
          Capturar
        </button>
      </form>
      <ul>
        {itens.map((item) =>
          editandoId === item.id ? (
            <li key={item.id}>
              <textarea value={rascunho} onChange={(event) => setRascunho(event.target.value)} />
              <button type="button" disabled={!rascunho.trim()} onClick={() => salvarEdicao(item.id)}>
                Salvar
              </button>
              <button type="button" onClick={cancelarEdicao}>
                Cancelar
              </button>
            </li>
          ) : (
            <li key={item.id}>
              {item.conteudo}
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