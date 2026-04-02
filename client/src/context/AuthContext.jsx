import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, loginUser, signupUser } from "../lib/api";

const AuthContext = createContext(null);
const storageKey = "drive-for-good-auth";

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    token: "",
    user: null,
    loading: true,
  });

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (!saved) {
      setAuthState({
        token: "",
        user: null,
        loading: false,
      });
      return;
    }

    let parsed;

    try {
      parsed = JSON.parse(saved);
    } catch {
      window.localStorage.removeItem(storageKey);
      setAuthState({
        token: "",
        user: null,
        loading: false,
      });
      return;
    }

    getCurrentUser(parsed.token)
      .then((data) => {
        setAuthState({
          token: parsed.token,
          user: data.user,
          loading: false,
        });
      })
      .catch(() => {
        window.localStorage.removeItem(storageKey);
        setAuthState({
          token: "",
          user: null,
          loading: false,
        });
      });
  }, []);

  async function login(credentials) {
    const response = await loginUser(credentials);
    window.localStorage.setItem(storageKey, JSON.stringify(response));
    setAuthState({
      token: response.token,
      user: response.user,
      loading: false,
    });
    return response;
  }

  async function signup(payload) {
    const response = await signupUser(payload);
    window.localStorage.setItem(storageKey, JSON.stringify(response));
    setAuthState({
      token: response.token,
      user: response.user,
      loading: false,
    });
    return response;
  }

  function logout() {
    window.localStorage.removeItem(storageKey);
    setAuthState({
      token: "",
      user: null,
      loading: false,
    });
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        isAuthenticated: Boolean(authState.token && authState.user),
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}

