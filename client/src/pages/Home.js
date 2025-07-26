import React from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  useTheme
} from '@mui/material';
import {
  TrendingUp,
  Notifications,
  Analytics,
  Speed,
  Security,
  CloudSync
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const theme = useTheme();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <TrendingUp sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Real-time Stock Data',
      description: 'Get live stock prices and technical indicators powered by Alpha Vantage API',
      badge: 'Live Data'
    },
    {
      icon: <Notifications sx={{ fontSize: 40, color: theme.palette.secondary.main }} />,
      title: 'Smart Alerts',
      description: 'Automated notifications based on RSI, MACD, and custom technical conditions',
      badge: 'AI Powered'
    },
    {
      icon: <Analytics sx={{ fontSize: 40, color: theme.palette.success.main }} />,
      title: 'Technical Analysis',
      description: 'Advanced indicators including RSI, MACD, Moving Averages, and Bollinger Bands',
      badge: 'Professional'
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: theme.palette.warning.main }} />,
      title: 'Fast Monitoring',
      description: 'Background monitoring every 15 minutes during market hours',
      badge: 'High Speed'
    },
    {
      icon: <Security sx={{ fontSize: 40, color: theme.palette.error.main }} />,
      title: 'Secure & Reliable',
      description: 'JWT authentication and encrypted data storage for your security',
      badge: 'Secure'
    },
    {
      icon: <CloudSync sx={{ fontSize: 40, color: theme.palette.info.main }} />,
      title: 'Cloud Sync',
      description: 'Access your alerts and data from anywhere, anytime',
      badge: 'Cloud Based'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Enhanced Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          px: 3,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            pointerEvents: 'none'
          }
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              mb: 4,
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <TrendingUp sx={{ fontSize: 60, color: 'white' }} />
          </Box>
          <Typography
            variant="h1"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2.5rem', md: '4rem' },
              mb: 3,
              background: 'linear-gradient(45deg, #ffffff 30%, #e0e7ff 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
          >
            Smart Stock Alerts
          </Typography>
          <Typography
            variant="h4"
            sx={{
              mb: 6,
              opacity: 0.9,
              fontSize: { xs: '1.2rem', md: '1.8rem' },
              fontWeight: 300,
              maxWidth: 800,
              mx: 'auto',
              lineHeight: 1.4
            }}
          >
            Monitor your portfolio with AI-powered analysis and get instant notifications when market conditions match your strategy.
          </Typography>
          
                    <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <Button
                variant="contained"
                size="large"
                component={Link}
                to="/dashboard"
                sx={{
                  bgcolor: 'white',
                  color: '#667eea',
                  px: 6,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: 3,
                  textTransform: 'none',
                  boxShadow: '0 8px 24px rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(255, 255, 255, 0.4)',
                  },
                  transition: 'all 0.3s ease'
                }}
                startIcon={<Analytics />}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="large"
                  component={Link}
                  to="/register"
                  sx={{
                    bgcolor: 'white',
                    color: '#667eea',
                    px: 6,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderRadius: 3,
                    textTransform: 'none',
                    boxShadow: '0 8px 24px rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.95)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 32px rgba(255, 255, 255, 0.4)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                  startIcon={<TrendingUp />}
                >
                  Start Trading
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  component={Link}
                  to="/login"
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    color: 'white',
                    px: 6,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderRadius: 3,
                    textTransform: 'none',
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease'
                  }}
                  startIcon={<Security />}
                >
                  Sign In
                </Button>
              </>
            )}
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography
          variant="h3"
          component="h2"
          textAlign="center"
          gutterBottom
          sx={{ mb: 6, fontWeight: 'bold' }}
        >
          Powerful Features
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8]
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
                  <Box sx={{ mb: 2, position: 'relative' }}>
                    {feature.icon}
                    <Chip
                      label={feature.badge}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: '50%',
                        transform: 'translateX(50%)',
                        bgcolor: 'primary.main',
                        color: 'white',
                        fontSize: '0.7rem'
                      }}
                    />
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: 'grey.100',
          py: 8,
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Ready to Start Smart Trading?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, color: 'text.secondary' }}>
            Join thousands of traders who trust our platform for their stock monitoring needs.
          </Typography>
          
          {!isAuthenticated && (
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/register"
              sx={{
                px: 6,
                py: 2,
                fontSize: '1.2rem',
                borderRadius: 3
              }}
            >
              Start Free Trial
            </Button>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
