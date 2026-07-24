import { useEffect, useState, type FormEvent } from 'react';
import { addInboxItem, getInbox, type InboxItem } from '../api/client';

export function Captura() {
  const [conteudo, setConteudo] = useState('');
  const [itens, setItens] = useState<InboxItem[]>([]);

  useEffect(() => {
    getInbox().then(setItens);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const novoItem = await addInboxItem(conteudo);
    setItens((atual) => [novoItem, ...atual]);
    setConteudo('');
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
        {itens.map((item) => (
          <li key={item.id}>{item.conteudo}</li>
        ))}
      </ul>
    </div>
  );
}