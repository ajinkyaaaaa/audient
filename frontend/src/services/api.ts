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

// Location Profiles

export type LocationProfile = {
  id: number;
  user_id: number;
  name: string;
  type: 'base' | 'client';
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  use_current_location: boolean;
  created_at: string;
};

export async function createLocationProfile(
  token: string,
  data: {
    name: string;
    type: 'base' | 'client';
    address?: string;
    latitude?: number;
    longitude?: number;
    use_current_location?: boolean;
  }
): Promise<{ profile: LocationProfile }> {
  return request<{ profile: LocationProfile }>('/locations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function getLocationProfiles(
  token: string
): Promise<{ profiles: LocationProfile[] }> {
  return request<{ profiles: LocationProfile[] }>('/locations', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteLocationProfile(
  token: string,
  profileId: number
): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/locations/${profileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
