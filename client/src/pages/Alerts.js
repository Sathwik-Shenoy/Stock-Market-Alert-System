import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Pagination,
  Alert,
  CircularProgress,
  Fab
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Notifications,
  NotificationsOff,
  TrendingUp,
  TrendingDown,
  ShowChart,
  PlayArrow,
  Pause
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import AlertService from '../services/alertService';
import AdminService from '../services/adminService';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalAlerts: 0,
    limit: 10
  });
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    alertType: 'price',
    condition: 'above',
    targetValue: '',
    description: '',
    emailNotification: true,
    expiresAt: ''
  });

  // Load alerts on component mount and when page changes
  useEffect(() => {
    loadAlerts();
  }, [pagination.page]);

  // Load alerts from API
  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await AlertService.getAlerts({
        page: pagination.page,
        limit: pagination.limit
      });
      
      setAlerts(response.data.docs || []);
      setPagination({
        page: response.data.page || 1,
        totalPages: response.data.totalPages || 1,
        totalAlerts: response.data.totalDocs || 0,
        limit: response.data.limit || 10
      });
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load alerts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle creating or updating an alert
  const handleSaveAlert = async () => {
    try {
      setSubmitting(true);
      
      // Validate required fields
      if (!newAlert.symbol || !newAlert.targetValue) {
        toast.error('Please fill in all required fields');
        return;
      }

      const alertData = {
        symbol: newAlert.symbol.toUpperCase(),
        alertType: newAlert.alertType,
        condition: newAlert.condition,
        targetValue: parseFloat(newAlert.targetValue),
        description: newAlert.description,
        emailNotification: newAlert.emailNotification,
        expiresAt: newAlert.expiresAt || null
      };

      if (editingAlert) {
        // Update existing alert
        await AlertService.updateAlert(editingAlert._id, alertData);
        toast.success('Alert updated successfully');
      } else {
        // Create new alert
        await AlertService.createAlert(alertData);
        toast.success('Alert created successfully');
      }

      setOpenDialog(false);
      loadAlerts(); // Reload alerts list
    } catch (err) {
      toast.error(`Failed to save alert: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle deleting an alert
  const handleDeleteAlert = async (alertId) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        await AlertService.deleteAlert(alertId);
        toast.success('Alert deleted successfully');
        loadAlerts(); // Reload alerts list
      } catch (err) {
        toast.error(`Failed to delete alert: ${err.message}`);
      }
    }
  };

  // Handle toggling alert status
  const handleToggleAlert = async (alertId) => {
    try {
      await AlertService.toggleAlert(alertId);
      toast.success('Alert status updated');
      loadAlerts(); // Reload alerts list
    } catch (err) {
      toast.error(`Failed to toggle alert: ${err.message}`);
    }
  };

  // Handle testing an alert
  const handleTestAlert = async (alertId) => {
    try {
      const response = await AlertService.testAlert(alertId);
      toast.success(`Alert test: ${response.message}`);
    } catch (err) {
      toast.error(`Failed to test alert: ${err.message}`);
    }
  };

  // Open create dialog
  const handleCreateAlert = () => {
    setEditingAlert(null);
    setNewAlert({
      symbol: '',
      alertType: 'price',
      condition: 'above',
      targetValue: '',
      description: '',
      emailNotification: true,
      expiresAt: ''
    });
    setOpenDialog(true);
  };

  // Open edit dialog
  const handleEditAlert = (alert) => {
    setEditingAlert(alert);
    setNewAlert({
      symbol: alert.symbol,
      alertType: alert.alertType,
      condition: alert.condition,
      targetValue: alert.targetValue.toString(),
      description: alert.description || '',
      emailNotification: alert.emailNotification !== false,
      expiresAt: alert.expiresAt ? alert.expiresAt.split('T')[0] : ''
    });
    setOpenDialog(true);
  };

  // Get alert type icon
  const getAlertIcon = (alertType) => {
    switch (alertType) {
      case 'price':
        return <TrendingUp />;
      case 'volume':
        return <ShowChart />;
      case 'change':
        return <TrendingDown />;
      case 'technical':
        return <ShowChart />;
      default:
        return <Notifications />;
    }
  };

  // Get condition color
  const getConditionColor = (condition) => {
    switch (condition) {
      case 'above':
      case 'crosses_above':
        return 'success';
      case 'below':
      case 'crosses_below':
        return 'error';
      case 'equals':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="dashboard-container fade-in">
      <Container maxWidth="lg">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Alert Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage your stock alerts. Get notified when your conditions are met.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateAlert}
            size="large"
          >
            Create Alert
          </Button>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Stats Summary */}
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>
                Total Alerts: {pagination.totalAlerts} | Active: {alerts.filter(a => a.status === 'active').length}
              </Typography>
            </Box>

            {/* Alerts Grid */}
            {alerts.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No alerts found
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Create your first alert to start monitoring stocks
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateAlert}
                >
                  Create Your First Alert
                </Button>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {alerts.map((alert) => (
                  <Grid item xs={12} md={6} lg={4} key={alert._id}>
                    <Card className={`alert-item ${alert.status === 'active' ? 'active' : 'inactive'} slide-up`}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Box>
                            <Typography variant="h6" component="div" fontWeight="bold">
                              {alert.symbol}
                            </Typography>
                            <Chip
                              label={alert.alertType}
                              color={alert.alertType === 'price' ? 'primary' : 'secondary'}
                              size="small"
                              icon={getAlertIcon(alert.alertType)}
                              sx={{ mt: 1 }}
                            />
                          </Box>
                          <Box display="flex" alignItems="center">
                            {alert.status === 'active' ? (
                              <Notifications color="primary" />
                            ) : (
                              <NotificationsOff color="disabled" />
                            )}
                          </Box>
                        </Box>

                        <Typography variant="body2" color="text.secondary" mb={2}>
                          {alert.description}
                        </Typography>

                        <Box mb={2}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Condition:</strong> {alert.condition} ${alert.targetValue}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            <strong>Status:</strong> 
                            <Chip 
                              label={alert.status} 
                              color={getConditionColor(alert.condition)} 
                              size="small" 
                              sx={{ ml: 1 }} 
                            />
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            <strong>Triggered:</strong> {alert.triggerCount || 0} times
                          </Typography>
                          <Typography variant="body2">
                            <strong>Last Triggered:</strong> {formatDate(alert.lastTriggered)}
                          </Typography>
                        </Box>
                      </CardContent>

                      <CardActions>
                        <Button
                          size="small"
                          startIcon={alert.status === 'active' ? <Pause /> : <PlayArrow />}
                          onClick={() => handleToggleAlert(alert._id)}
                          color={alert.status === 'active' ? 'warning' : 'success'}
                        >
                          {alert.status === 'active' ? 'Pause' : 'Activate'}
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => handleEditAlert(alert)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          startIcon={<ShowChart />}
                          onClick={() => handleTestAlert(alert._id)}
                          color="info"
                        >
                          Test
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Delete />}
                          onClick={() => handleDeleteAlert(alert._id)}
                          color="error"
                        >
                          Delete
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={4}>
                <Pagination
                  count={pagination.totalPages}
                  page={pagination.page}
                  onChange={(e, page) => setPagination(prev => ({ ...prev, page }))}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}

        {/* Floating Action Button for Quick Add */}
        <Fab
          color="primary"
          aria-label="add"
          onClick={handleCreateAlert}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <Add />
        </Fab>

        {/* Create/Edit Alert Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingAlert ? 'Edit Alert' : 'Create New Alert'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Stock Symbol"
                  value={newAlert.symbol}
                  onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase() })}
                  fullWidth
                  required
                  placeholder="e.g., AAPL"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Alert Type</InputLabel>
                  <Select
                    value={newAlert.alertType}
                    onChange={(e) => setNewAlert({ ...newAlert, alertType: e.target.value })}
                    label="Alert Type"
                  >
                    <MenuItem value="price">Price Alert</MenuItem>
                    <MenuItem value="volume">Volume Alert</MenuItem>
                    <MenuItem value="change">Price Change Alert</MenuItem>
                    <MenuItem value="technical">Technical Indicator</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Condition</InputLabel>
                  <Select
                    value={newAlert.condition}
                    onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value })}
                    label="Condition"
                  >
                    <MenuItem value="above">Above</MenuItem>
                    <MenuItem value="below">Below</MenuItem>
                    <MenuItem value="equals">Equals</MenuItem>
                    <MenuItem value="crosses_above">Crosses Above</MenuItem>
                    <MenuItem value="crosses_below">Crosses Below</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Target Value"
                  type="number"
                  value={newAlert.targetValue}
                  onChange={(e) => setNewAlert({ ...newAlert, targetValue: e.target.value })}
                  fullWidth
                  required
                  placeholder="e.g., 150.00"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  value={newAlert.description}
                  onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Optional description for this alert"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Expires At"
                  type="date"
                  value={newAlert.expiresAt}
                  onChange={(e) => setNewAlert({ ...newAlert, expiresAt: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newAlert.emailNotification}
                      onChange={(e) => setNewAlert({ ...newAlert, emailNotification: e.target.checked })}
                    />
                  }
                  label="Email Notification"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveAlert} 
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : (editingAlert ? 'Update Alert' : 'Create Alert')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Coming Soon Notice */}
        <Box mt={4} textAlign="center">
          <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔔 Real-time Alert Processing Coming Soon!
              </Typography>
              <Typography variant="body1">
                Background monitoring, email notifications, and API integration with Alpha Vantage 
                for live technical indicator calculations are being finalized.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </div>
  );
};

export default Alerts;
