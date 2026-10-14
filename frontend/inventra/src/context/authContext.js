import { createContext } from 'react';

// Keep one context identity when Vite replaces the provider or its consumers.
// Provider state still belongs to React and is never stored outside the tree.
const AuthContext = import.meta.hot?.data.authContext || createContext(null);

if (import.meta.hot) {
  import.meta.hot.data.authContext = AuthContext;
}

export default AuthContext;
