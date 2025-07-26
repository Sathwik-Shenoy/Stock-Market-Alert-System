import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Fade,
  Slide
} from '@mui/material';
import { 
  Visibility, 
  VisibilityOff, 
  Email, 
  Lock, 
  TrendingUp,
  ShowChart
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2
      }}
    >
      <Container maxWidth="sm">
        <Slide direction="up" in={true} mountOnEnter unmountOnExit timeout={800}>
          <Paper 
            elevation={24} 
            sx={{ 
              p: 5, 
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}
          >
            {/* Header with Logo */}
            <Fade in={true} timeout={1000}>
              <Box textAlign="center" mb={4}>
                <Box 
                  sx={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    mb: 2,
                    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  <ShowChart sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography 
                  variant="h3" 
                  component="h1" 
                  gutterBottom 
                  fontWeight="800"
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1
                  }}
                >
                  Welcome Back
                </Typography>
                <Typography 
                  variant="h6" 
                  color="text.secondary"
                  sx={{ fontWeight: 400, opacity: 0.8 }}
                >
                  Sign in to your trading dashboard
                </Typography>
              </Box>
            </Fade>

            {error && (
              <Fade in={Boolean(error)} timeout={500}>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: '1.5rem'
                    }
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                margin="normal"
                autoComplete="email"
                autoFocus
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'rgba(102, 126, 234, 0.7)' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                margin="normal"
                autoComplete="current-password"
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'white',
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'rgba(102, 126, 234, 0.7)' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={togglePasswordVisibility}
                        edge="end"
                        sx={{ color: 'rgba(102, 126, 234, 0.7)' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ 
                  mt: 2, 
                  mb: 3, 
                  py: 1.8,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  textTransform: 'none',
                  boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    boxShadow: '0 12px 30px rgba(102, 126, 234, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                  '&:disabled': {
                    background: 'rgba(102, 126, 234, 0.5)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' }
                        }
                      }}
                    />
                    Signing In...
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrendingUp />
                    Sign In to Dashboard
                  </Box>
                )}
              </Button>

              <Box textAlign="center">
                <Link
                  component={RouterLink}
                  to="/forgot-password"
                  variant="body2"
                  sx={{ 
                    textDecoration: 'none',
                    color: 'rgba(102, 126, 234, 0.8)',
                    fontWeight: 500,
                    '&:hover': {
                      color: '#667eea',
                      textDecoration: 'underline'
                    }
                  }}
                >
                  Forgot your password?
                </Link>
              </Box>
            </Box>

            <Divider sx={{ my: 3, opacity: 0.6 }} />

            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Don't have an account?
              </Typography>
              <Button
                component={RouterLink}
                to="/register"
                variant="outlined"
                fullWidth
                sx={{
                  borderColor: 'rgba(102, 126, 234, 0.3)',
                  color: '#667eea',
                  borderRadius: 2,
                  py: 1.2,
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.05)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Create New Account
              </Button>
            </Box>
          </Paper>
        </Slide>
      </Container>
    </Box>
  );
};

export default Login;
