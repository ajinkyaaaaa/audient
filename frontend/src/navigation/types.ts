export type DrawerParamList = {
  Home: undefined;
  'Geo-Sense': undefined;
  Engagements: undefined;
  Tasks: undefined;
  Sentry: undefined;
  Config: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  RecordingDetail: { recordingId: number };
};

export type EngagementsStackParamList = {
  EngagementsList: undefined;
  ClientDetail: { clientId: number };
};
