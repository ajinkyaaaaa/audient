import React, { createContext, useContext } from 'react';

type AuthUser = {
  id: number;
  name: string;
  email: string;
  login_count?: number;
  role?: string;
  organization_id?: number;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
};

const AuthContext = createContext<AuthContextType>({ user: null, token: null });

export const AuthContextProvider = AuthContext.Provider;
export const useAuth = () => useContext(AuthContext);
