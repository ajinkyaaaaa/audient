export type DrawerParamList = {
  Home: undefined;
  'Geo-Sense': undefined;
  Engagements: undefined;
  Tasks: undefined;
  Sentry: undefined;
  Config: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  RecordingDetail: { recordingId: number };
  VisitDetail: {
    visitId: string;
    clientCode: string;
    clientName: string;
    time: string;
    location: string;
    status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled' | 'postponed';
    type: 'assigned' | 'self';
  };
};

export type EngagementsStackParamList = {
  EngagementsList: undefined;
  ClientDetail: { clientId: number };
  CreateEngagement: undefined;
};

export type SentryStackParamList = {
  SentryList: undefined;
  EmployeeDetail: { employeeId: number; employeeName: string };
};

export type ConfigStackParamList = {
  ConfigMain: {
    pickedLat?: number;
    pickedLng?: number;
    pickedAddress?: string;
    pickedLabel?: string;
    pickedOfficeDetails?: string;
  } | undefined;
  BaseLocationPicker: {
    initialLat: number | null;
    initialLng: number | null;
    initialLabel: string;
    initialAddress: string;
    initialOfficeDetails: string;
  };
};
