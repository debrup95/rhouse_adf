interface Window {
  env?: {
    REACT_APP_Maps_API_KEY: string;
    REACT_APP_GOOGLE_MAP_ID: string;
    REACT_APP_API_URL: string;
    REACT_APP_GOOGLE_CLIENT_ID: string;
    [key: string]: any;
  };
  google?: {
    maps: {
      Geocoder: new () => any;
      GeocoderStatus: any;
    };
  };
} 