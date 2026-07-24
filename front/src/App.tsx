import { useEffect, useState } from 'react';
import { getMe } from './api/client';
import { Login } from './pages/Login';
import { Captura } from './pages/Captura';

function App() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    getMe()
      .then(() => setLoggedIn(true))
      .catch(() => setLoggedIn(false));
  }, []);

  if (loggedIn === null) {
    return <p>Carregando...</p>;
  }

  return loggedIn ? <Captura /> : <Login onLoggedIn={() => setLoggedIn(true)} />;
}

export default App;