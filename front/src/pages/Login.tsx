import { useEffect, useRef } from 'react';
import { loginWithGoogle } from '../api/client';

interface LoginProps {
  onLoggedIn: () => void;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function Login({ onLoggedIn }: LoginProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (!buttonRef.current || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          await loginWithGoogle(response.credential);
          onLoggedIn();
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [onLoggedIn]);

  return (
    <div>
      <h1>jarvis</h1>
      <div ref={buttonRef} />
    </div>
  );
}