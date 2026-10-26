import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then(setHealth);
  }, []);
  return <pre>{JSON.stringify(health)}</pre>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
