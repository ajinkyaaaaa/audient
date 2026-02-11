const API_URL = 'http://localhost:3001/api';

type User = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

type AuthResponse = {
  user: User;
  token: string;
};

type ErrorResponse = {
  error: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error((data as ErrorResponse).error || 'Something went wrong');
  }

  return data as T;
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(token: string): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
