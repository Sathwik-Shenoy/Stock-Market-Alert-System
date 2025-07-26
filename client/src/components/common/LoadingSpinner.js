import React from 'react';
import { CircularProgress, Box } from '@mui/material';

const LoadingSpinner = ({ size = 40, message = 'Loading...' }) => {
  return (
    <Box className="loading-container">
      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
        <CircularProgress size={size} />
        {message && (
          <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            {message}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LoadingSpinner;
