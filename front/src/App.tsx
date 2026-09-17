import { useEffect, useState } from 'react';
import { getMe, logout, type Me } from './api/client';
import { Login } from './pages/Login';
import { Captura } from './pages/Captura';

function App() {
  const [usuario, setUsuario] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    getMe()
      .then(setUsuario)
      .catch(() => setUsuario(null));
  }, []);

  if (usuario === undefined) {
    return <p>Carregando...</p>;
  }

  if (!usuario) {
    return <Login onLoggedIn={() => getMe().then(setUsuario)} />;
  }

  async function sair() {
    await logout().catch(() => {});
    setUsuario(null);
  }

  return <Captura email={usuario.email} onSair={sair} />;
}

export default App;
