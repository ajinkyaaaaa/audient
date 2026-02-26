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
  VisitDetail: { visitId: string; clientName: string };
};

export type EngagementsStackParamList = {
  EngagementsList: undefined;
  ClientDetail: { clientId: number };
};

export type SentryStackParamList = {
  SentryList: undefined;
  EmployeeDetail: { employeeId: number; employeeName: string };
};
