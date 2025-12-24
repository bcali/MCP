import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Circle,
} from 'lucide-react';
import { connections, runs } from '../services/mockData';
import { getHubStatus, HubStatus } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const [status, setStatus] = useState<HubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHubStatus()
      .then(setStatus)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const recentRuns = runs.slice(0, 10);
  const latencyData = runs.slice(0, 20).reverse().map((run, index) => ({
    time: index,
    latency: run.latency,
  }));
  const successRate = (runs.filter((r) => r.status === 'success').length / runs.length) * 100;

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
  if (error) return <Box py={4}><Typography color="error">Error: {error}</Typography></Box>;

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Real-time MCP Hub status and metrics</Typography>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="subtitle2" color="text.secondary">Hub Status</Typography>
                <Server size={20} color="#999" />
              </Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Chip
                  label={status?.status === 'up' ? 'ONLINE' : 'OFFLINE'}
                  color={status?.status === 'up' ? 'success' : 'error'}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">v{status?.version}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Uptime: {formatUptime(status?.uptime || 0)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="subtitle2" color="text.secondary">Active Connections</Typography>
                <Activity size={20} color="#999" />
              </Box>
              <Typography variant="h4" gutterBottom>{status?.activeConnections || 0}</Typography>
              <Typography variant="body2" color="text.secondary">SSE sessions established</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="subtitle2" color="text.secondary">Success Rate</Typography>
                <CheckCircle2 size={20} color="#999" />
              </Box>
              <Typography variant="h4" gutterBottom>{successRate.toFixed(1)}%</Typography>
              <Typography variant="body2" color="text.secondary">{runs.filter((r) => r.status === 'success').length} of {runs.length} runs</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="subtitle2" color="text.secondary">Avg Latency</Typography>
                <Clock size={20} color="#999" />
              </Box>
              <Typography variant="h4" gutterBottom>{Math.round(runs.reduce((sum, r) => sum + r.latency, 0) / runs.length)}ms</Typography>
              <Typography variant="body2" color="text.secondary">Last 24 hours</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Response Latency</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>Average response time over recent runs</Typography>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="latency" stroke="#1976d2" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Recent Runs</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>Last 10 tool executions</Typography>
          <List>
            {recentRuns.map((run, index) => (
              <ListItem key={run.id} divider={index < recentRuns.length - 1} sx={{ px: 0 }}>
                <ListItemIcon>
                  {run.status === 'success' ? <CheckCircle2 size={20} color="#2e7d32" /> : <XCircle size={20} color="#d32f2f" />}
                </ListItemIcon>
                <ListItemText primary={run.toolName} secondary={run.timestamp.toLocaleTimeString()} />
                <Box textAlign="right">
                  <Chip label={run.status} color={run.status === 'success' ? 'success' : 'error'} size="small" />
                  <Typography variant="body2" color="text.secondary" mt={0.5}>{run.latency}ms</Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Connection Health</Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>Status of all configured connections</Typography>
          <List>
            {connections.map((conn, index) => (
              <ListItem key={conn.id} divider={index < connections.length - 1} sx={{ px: 0 }}>
                <ListItemIcon>
                  <Circle
                    size={12}
                    fill={conn.status === 'healthy' ? '#2e7d32' : conn.status === 'degraded' ? '#ed6c02' : '#d32f2f'}
                    color={conn.status === 'healthy' ? '#2e7d32' : conn.status === 'degraded' ? '#ed6c02' : '#d32f2f'}
                  />
                </ListItemIcon>
                <ListItemText primary={conn.name} secondary={conn.type} />
                <Box textAlign="right">
                  <Chip
                    label={conn.status}
                    color={conn.status === 'healthy' ? 'success' : conn.status === 'degraded' ? 'warning' : 'error'}
                    size="small"
                  />
                  {conn.status === 'healthy' && (
                    <Typography variant="body2" color="text.secondary" mt={0.5}>{conn.latency}ms</Typography>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}

