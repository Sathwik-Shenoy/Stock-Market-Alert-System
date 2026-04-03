const LOCAL_API_BASE_URL = 'http://localhost:5000/api';
const PRODUCTION_API_BASE_URL = 'https://stock-market-alert-system.onrender.com/api';

const getDefaultApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_API_BASE_URL;
  }

  return LOCAL_API_BASE_URL;
};

export const getApiBaseUrl = () => {
  const rawBaseUrl = (process.env.REACT_APP_API_URL || getDefaultApiBaseUrl()).trim();
  const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');

  if (/\/api$/i.test(normalizedBaseUrl)) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}/api`;
};
