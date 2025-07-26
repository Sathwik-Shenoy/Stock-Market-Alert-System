import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  Lock,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    preferences: {
      emailNotifications: user?.preferences?.emailNotifications || true,
      alertFrequency: user?.preferences?.alertFrequency || 'immediate',
      timezone: user?.preferences?.timezone || 'UTC'
    }
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleProfileChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData({
        ...profileData,
        [parent]: {
          ...profileData[parent],
          [child]: value
        }
      });
    } else {
      setProfileData({
        ...profileData,
        [field]: value
      });
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage('');

    try {
      const result = await updateProfile(profileData);
      if (result.success) {
        setEditing(false);
        setMessage('Profile updated successfully!');
      } else {
        setMessage(result.message || 'Failed to update profile');
      }
    } catch (error) {
      setMessage('An error occurred while updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (result.success) {
        setShowPasswordDialog(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setMessage('Password changed successfully!');
      } else {
        setMessage(result.message || 'Failed to change password');
      }
    } catch (error) {
      setMessage('An error occurred while changing password');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const handleCancel = () => {
    setProfileData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      preferences: {
        emailNotifications: user?.preferences?.emailNotifications || true,
        alertFrequency: user?.preferences?.alertFrequency || 'immediate',
        timezone: user?.preferences?.timezone || 'UTC'
      }
    });
    setEditing(false);
    setMessage('');
  };

  return (
    <div className="dashboard-container fade-in">
      <Container maxWidth="md">
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            Profile Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your account information and preferences.
          </Typography>
        </Box>

        {message && (
          <Alert 
            severity={message.includes('success') ? 'success' : 'error'} 
            sx={{ mb: 3 }}
          >
            {message}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Profile Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">Personal Information</Typography>
                  {!editing ? (
                    <Button
                      startIcon={<Edit />}
                      onClick={() => setEditing(true)}
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <Box display="flex" gap={1}>
                      <Button
                        startIcon={<Save />}
                        variant="contained"
                        onClick={handleSaveProfile}
                        disabled={loading}
                      >
                        Save
                      </Button>
                      <Button
                        startIcon={<Cancel />}
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>

                <Box display="flex" alignItems="center" mb={3}>
                  <Avatar
                    sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}
                    src={user?.profilePicture}
                  >
                    {user?.firstName?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {user?.fullName || 'User Name'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {user?.email}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<PhotoCamera />}
                      disabled={!editing}
                    >
                      Change Photo
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileData.firstName}
                      onChange={(e) => handleProfileChange('firstName', e.target.value)}
                      disabled={!editing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileData.lastName}
                      onChange={(e) => handleProfileChange('lastName', e.target.value)}
                      disabled={!editing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      value={profileData.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      disabled={!editing}
                      type="email"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Security */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Security
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body1">Password</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last changed: Never
                    </Typography>
                  </Box>
                  <Button
                    startIcon={<Lock />}
                    onClick={() => setShowPasswordDialog(true)}
                  >
                    Change Password
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Preferences */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Alert Preferences
                </Typography>
                
                <Box mb={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={profileData.preferences.emailNotifications}
                        onChange={(e) => handleProfileChange('preferences.emailNotifications', e.target.checked)}
                        disabled={!editing}
                      />
                    }
                    label="Email Notifications"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Receive email alerts when your conditions are triggered
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editing}>
                      <InputLabel>Alert Frequency</InputLabel>
                      <Select
                        value={profileData.preferences.alertFrequency}
                        onChange={(e) => handleProfileChange('preferences.alertFrequency', e.target.value)}
                      >
                        <MenuItem value="immediate">Immediate</MenuItem>
                        <MenuItem value="hourly">Hourly Digest</MenuItem>
                        <MenuItem value="daily">Daily Summary</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editing}>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        value={profileData.preferences.timezone}
                        onChange={(e) => handleProfileChange('preferences.timezone', e.target.value)}
                      >
                        <MenuItem value="UTC">UTC</MenuItem>
                        <MenuItem value="America/New_York">Eastern Time</MenuItem>
                        <MenuItem value="America/Chicago">Central Time</MenuItem>
                        <MenuItem value="America/Denver">Mountain Time</MenuItem>
                        <MenuItem value="America/Los_Angeles">Pacific Time</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Subscription */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Subscription
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body1" textTransform="capitalize">
                      {user?.subscription?.plan || 'Free'} Plan
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user?.subscription?.plan === 'free' 
                        ? 'Upgrade to unlock premium features'
                        : 'Thank you for being a premium member'
                      }
                    </Typography>
                  </Box>
                  {user?.subscription?.plan === 'free' && (
                    <Button variant="contained" color="primary">
                      Upgrade Plan
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Change Password Dialog */}
        <Dialog 
          open={showPasswordDialog} 
          onClose={() => setShowPasswordDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <Box component="form" sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Current Password"
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => togglePasswordVisibility('current')}>
                        {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="New Password"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => togglePasswordVisibility('new')}>
                        {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => togglePasswordVisibility('confirm')}>
                        {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
            <Button
              onClick={handleChangePassword}
              variant="contained"
              disabled={loading || !passwordData.currentPassword || !passwordData.newPassword}
            >
              Change Password
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </div>
  );
};

export default Profile;
