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

// Clients (Engagements)

export type Client = {
  id: number;
  user_id: number;
  client_name: string;
  client_code: string;
  industry_sector: string | null;
  company_size: string | null;
  headquarters_location: string | null;
  primary_office_location: string | null;
  website_domain: string | null;
  client_tier: 'Strategic' | 'Normal' | 'Low Touch';
  engagement_health: 'Good' | 'Neutral' | 'Risk';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Stakeholder = {
  id: number;
  client_id: number;
  contact_name: string;
  designation_role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function createClient(
  token: string,
  data: {
    client_name: string;
    client_code: string;
    industry_sector?: string;
    company_size?: string;
    headquarters_location?: string;
    primary_office_location?: string;
    website_domain?: string;
    client_tier?: string;
  }
): Promise<{ client: Client }> {
  return request<{ client: Client }>('/clients', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function getClients(token: string): Promise<{ clients: Client[] }> {
  return request<{ clients: Client[] }>('/clients', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getClient(token: string, clientId: number): Promise<{ client: Client }> {
  return request<{ client: Client }>(`/clients/${clientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteClient(token: string, clientId: number): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/clients/${clientId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createStakeholder(
  token: string,
  clientId: number,
  data: {
    contact_name: string;
    designation_role?: string;
    email?: string;
    phone?: string;
    notes?: string;
  }
): Promise<{ stakeholder: Stakeholder }> {
  return request<{ stakeholder: Stakeholder }>(`/clients/${clientId}/stakeholders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function getStakeholders(
  token: string,
  clientId: number
): Promise<{ stakeholders: Stakeholder[] }> {
  return request<{ stakeholders: Stakeholder[] }>(`/clients/${clientId}/stakeholders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteStakeholder(
  token: string,
  clientId: number,
  stakeholderId: number
): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/clients/${clientId}/stakeholders/${stakeholderId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Recordings

export type Recording = {
  id: number;
  user_id: number;
  transcript: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export async function createRecording(
  token: string,
  data: { transcript?: string; duration_seconds?: number }
): Promise<{ recording: Recording }> {
  return request<{ recording: Recording }>('/recordings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function getRecordings(token: string): Promise<{ recordings: Recording[] }> {
  return request<{ recordings: Recording[] }>('/recordings', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getRecording(
  token: string,
  recordingId: number
): Promise<{ recording: Recording }> {
  return request<{ recording: Recording }>(`/recordings/${recordingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteRecording(
  token: string,
  recordingId: number
): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/recordings/${recordingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
