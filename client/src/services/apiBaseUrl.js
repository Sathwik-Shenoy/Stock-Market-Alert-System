const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

export const getApiBaseUrl = () => {
  const rawBaseUrl = (process.env.REACT_APP_API_URL || DEFAULT_API_BASE_URL).trim();

  if (/\/api\/?$/i.test(rawBaseUrl)) {
    return rawBaseUrl.replace(/\/$/, '');
  }

  return `${rawBaseUrl.replace(/\/$/, '')}/api`;
};
