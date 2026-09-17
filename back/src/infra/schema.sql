CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  google_sub TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- `sessoes_processamento` (padrão sessão+polling pro processar-dia rodando neste
-- repo) foi removida nesta revisão — o processamento saiu daqui e agora é feito
-- pelo `sync/` (fora deste repo, ver README), que lê/escreve `inbox` direto sem
-- precisar de sessão própria.
CREATE TABLE IF NOT EXISTS inbox (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('texto', 'audio', 'imagem')),
  conteudo TEXT,
  audio_blob BYTEA,
  imagem_blob BYTEA,
  tags TEXT[] NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'processada')),
  vault_path TEXT
);

-- `inbox.tags` continua um TEXT[] livre (o `sync/` não precisa de FK pra
-- escrever). Esta tabela é só o catálogo de nomes que o front oferece pra
-- escolher — renomear aqui propaga pros itens existentes (ver models/tags.ts).
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO tags (nome) VALUES ('pessoal'), ('trabalho'), ('ideia'), ('compra'), ('saúde')
ON CONFLICT (nome) DO NOTHING;
