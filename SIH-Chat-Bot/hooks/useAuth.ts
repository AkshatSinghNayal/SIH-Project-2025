
import { useContext } from 'react';
// This is a re-export for convenience from the context file.
// The primary definition and hook logic reside in AuthContext.tsx.
// To avoid circular dependencies or complex setups, we'll just import directly from context where needed.
// This file can be seen as a placeholder for a more complex hook if needed in the future.
// For now, we directly use the hook exported from AuthContext.
export { useAuth } from '../context/AuthContext';
