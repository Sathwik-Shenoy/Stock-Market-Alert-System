import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  useScrollTrigger,
  Slide
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AccountCircle as AccountCircleIcon,
  Dashboard as DashboardIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const HideOnScroll = ({ children }) => {
  const trigger = useScrollTrigger();
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
};

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleMenuClose();
    navigate('/');
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleMenuClose();
  };

  const isActive = (path) => location.pathname === path;

  return (
    <HideOnScroll>
      <AppBar position="fixed" sx={{ zIndex: 1300 }}>
        <Toolbar>
          {/* Logo */}
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              mr: 3
            }}
          >
            <TrendingUpIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography
              variant="h6"
              component="span"
              sx={{
                fontWeight: 'bold',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              StockAlert
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            {isAuthenticated && (
              <>
                <Button
                  color="inherit"
                  component={Link}
                  to="/dashboard"
                  startIcon={<DashboardIcon />}
                  sx={{
                    bgcolor: isActive('/dashboard') ? 'rgba(255,255,255,0.1)' : 'transparent'
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  color="inherit"
                  component={Link}
                  to="/alerts"
                  startIcon={<NotificationsIcon />}
                  sx={{
                    bgcolor: isActive('/alerts') ? 'rgba(255,255,255,0.1)' : 'transparent'
                  }}
                >
                  Alerts
                </Button>
              </>
            )}
          </Box>

          {/* User Menu or Auth Buttons */}
          <Box>
            {isAuthenticated ? (
              <>
                <IconButton
                  size="large"
                  edge="end"
                  aria-label="account menu"
                  aria-controls="account-menu"
                  aria-haspopup="true"
                  onClick={handleMenuOpen}
                  color="inherit"
                >
                  {user?.profilePicture ? (
                    <Avatar
                      src={user.profilePicture}
                      alt={user.fullName}
                      sx={{ width: 32, height: 32 }}
                    />
                  ) : (
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                      {user?.firstName?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                  )}
                </IconButton>
                <Menu
                  id="account-menu"
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  onClick={handleMenuClose}
                  PaperProps={{
                    elevation: 3,
                    sx: {
                      mt: 1.5,
                      minWidth: 200,
                      '& .MuiAvatar-root': {
                        width: 24,
                        height: 24,
                        ml: -0.5,
                        mr: 1,
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem onClick={() => handleNavigation('/profile')}>
                    <AccountCircleIcon fontSize="small" sx={{ mr: 1 }} />
                    Profile
                  </MenuItem>
                  <MenuItem onClick={() => handleNavigation('/dashboard')}>
                    <DashboardIcon fontSize="small" sx={{ mr: 1 }} />
                    Dashboard
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  color="inherit"
                  component={Link}
                  to="/login"
                  sx={{
                    bgcolor: isActive('/login') ? 'rgba(255,255,255,0.1)' : 'transparent'
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  component={Link}
                  to="/register"
                  sx={{
                    borderColor: 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Sign Up
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>
    </HideOnScroll>
  );
};

export default Navbar;
