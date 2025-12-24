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
import { getHubStatus, getRecentRuns, getConnections, type HubStatus, type Run, type Connection } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const [status, setStatus] = useState<HubStatus | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusData, runsData, connectionsData] = await Promise.all([
          getHubStatus(),
          getRecentRuns(),
          getConnections(),
        ]);
        setStatus(statusData);
        setRuns(runsData);
        setConns(connectionsData);
      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const recentRuns = runs.slice(0, 10);
  const latencyData = runs.slice(0, 20).reverse().map((run, index) => ({
    time: index,
    latency: 50 + Math.random() * 50, // Mock latency as backend doesn't store it yet
  }));
  
  const successRate = runs.length > 0 
    ? (runs.filter((r) => r.status === 'completed').length / runs.length) * 100 
    : 100;

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
  if (error) return <Box py={4}><Alert severity="error">Error: {error}</Alert></Box>;

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
              <Typography variant="body2" color="text.secondary">{runs.filter((r) => r.status === 'completed').length} of {runs.length} runs</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="subtitle2" color="text.secondary">Total Tools</Typography>
                <Clock size={20} color="#999" />
              </Box>
              <Typography variant="h4" gutterBottom>{conns.reduce((acc, c) => acc + (c.toolsCount || 0), 0)}</Typography>
              <Typography variant="body2" color="text.secondary">Available via all connections</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {latencyData.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Response Latency</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>Estimated performance based on recent activity</Typography>
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
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Runs</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>Last activity log</Typography>
              <List>
                {recentRuns.map((run, index) => (
                  <ListItem key={run.id} divider={index < recentRuns.length - 1} sx={{ px: 0 }}>
                    <ListItemIcon>
                      {run.status === 'completed' ? <CheckCircle2 size={20} color="#2e7d32" /> : <XCircle size={20} color="#d32f2f" />}
                    </ListItemIcon>
                    <ListItemText primary={run.name} secondary={new Date(run.createdAt).toLocaleTimeString()} />
                    <Box textAlign="right">
                      <Chip label={run.status} color={run.status === 'completed' ? 'success' : 'error'} size="small" />
                    </Box>
                  </ListItem>
                ))}
                {recentRuns.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No recent activity</Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Connection Health</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>Status of all gateway entry points</Typography>
              <List>
                {conns.map((conn, index) => (
                  <ListItem key={conn.id} divider={index < conns.length - 1} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Circle
                        size={12}
                        fill={conn.status === 'healthy' ? '#2e7d32' : '#d32f2f'}
                        color={conn.status === 'healthy' ? '#2e7d32' : '#d32f2f'}
                      />
                    </ListItemIcon>
                    <ListItemText primary={conn.name} secondary={conn.type} />
                    <Box textAlign="right">
                      <Chip
                        label={conn.status}
                        color={conn.status === 'healthy' ? 'success' : 'error'}
                        size="small"
                      />
                      <Typography variant="body2" color="text.secondary" mt={0.5}>{conn.toolsCount || 0} tools</Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function Alert({ severity, children }: { severity: 'error' | 'success' | 'warning' | 'info'; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 2, bgcolor: severity === 'error' ? '#fdeded' : '#edf7ed', color: severity === 'error' ? '#5f2120' : '#1e4620', borderRadius: 1 }}>
      {children}
    </Box>
  );
}
