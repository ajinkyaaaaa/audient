import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getApiUrl(): string {
  if (__DEV__) {
    // In Expo Go on a physical device, debuggerHost is the Mac's IP:port (e.g. "192.168.1.5:8081")
    const debuggerHost = Constants.expoGoConfig?.debuggerHost;
    if (debuggerHost) {
      const host = debuggerHost.split(':')[0];
      return `http://${host}:3001/api`;
    }
    // Android emulator: 10.0.2.2 routes to the host machine
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3001/api';
    }
  }
  // iOS Simulator and production fallback
  return 'http://localhost:3001/api';
}

const API_URL = getApiUrl();

type User = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export type OrgConfig = {
  login_time: string;
  logoff_time: string;
  timezone: string;
  org_name?: string;
  join_code?: string;
  location_sync_interval?: number;
};

type AuthResponse = {
  user: User;
  token: string;
  org_config?: OrgConfig;
  period?: string | null;
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

export async function register(
  name: string,
  email: string,
  password: string,
  role: 'admin' | 'employee' = 'employee',
  adminSecret?: string,
  organizationName?: string,
  joinCode?: string,
): Promise<AuthResponse> {
  const body: Record<string, unknown> = { name, email, password, role };
  if (role === 'admin') {
    body.admin_secret = adminSecret;
    body.organization_name = organizationName;
  } else {
    body.join_code = joinCode;
  }
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function login(
  email: string,
  password: string,
  latitude?: number,
  longitude?: number
): Promise<AuthResponse> {
  const body: Record<string, unknown> = { email, password };
  if (latitude !== undefined && longitude !== undefined) {
    body.latitude = latitude;
    body.longitude = longitude;
  }
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
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
  office_latitude: number | null;
  office_longitude: number | null;
  created_at: string;
  updated_at: string;
  creator_name?: string | null;
};

export type MasterClient = {
  code: string;
  name: string;
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
    office_latitude?: number;
    office_longitude?: number;
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

export async function getMasterClients(token: string): Promise<{ clients: MasterClient[] }> {
  return request<{ clients: MasterClient[] }>('/clients/master-list', {
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

// Sentry (Admin)

export type Employee = {
  id: number;
  name: string;
  email: string;
  role: string;
  login_count: number;
  created_at: string | null;
  last_login_at: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_sync_at: string | null;
  status: 'Active' | 'Away' | 'Offline';
};

export type AttendanceRecord = {
  id: number;
  login_at: string | null;
  latitude: number | null;
  longitude: number | null;
};

export async function getSentryEmployees(token: string): Promise<{ employees: Employee[] }> {
  return request<{ employees: Employee[] }>('/sentry/employees', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getEmployeeAttendance(
  token: string,
  employeeId: number
): Promise<{ attendance: AttendanceRecord[] }> {
  return request<{ attendance: AttendanceRecord[] }>(`/sentry/employees/${employeeId}/attendance`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export type DateAttendanceRecord = {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  login_at: string | null;
  latitude: number | null;
  longitude: number | null;
  on_time: boolean;
};

export async function getAttendanceByDate(
  token: string,
  date: string,
): Promise<{ records: DateAttendanceRecord[]; date: string }> {
  return request<{ records: DateAttendanceRecord[]; date: string }>(`/sentry/attendance/by-date?date=${date}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMonthSummary(
  token: string,
  year: number,
  month: number,
): Promise<{ days: Record<string, number>; year: number; month: number }> {
  return request<{ days: Record<string, number>; year: number; month: number }>(
    `/sentry/attendance/month-summary?year=${year}&month=${month}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function syncLocation(
  token: string,
  latitude: number,
  longitude: number,
): Promise<{ synced: boolean }> {
  return request<{ synced: boolean }>('/location/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ latitude, longitude }),
  });
}

// Org Config

export async function getOrgConfig(token: string): Promise<{ config: OrgConfig }> {
  return request<{ config: OrgConfig }>('/config', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateOrgConfig(
  token: string,
  data: Partial<OrgConfig>,
): Promise<{ config: OrgConfig }> {
  return request<{ config: OrgConfig }>('/config', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}
