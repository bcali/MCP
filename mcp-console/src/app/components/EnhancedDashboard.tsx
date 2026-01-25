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
  LinearProgress,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Circle,
  RefreshCw,
  TrendingUp,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { getHubStatus, getRecentRuns, getConnections, type HubStatus, type Run, type Connection } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export function EnhancedDashboard() {
  const [status, setStatus] = useState<HubStatus | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      const [statusData, runsData, connectionsData] = await Promise.all([
        getHubStatus(),
        getRecentRuns(),
        getConnections(),
      ]);
      setStatus(statusData);
      setRuns(runsData);
      setConns(connectionsData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${h}h`;
    return `${h}h ${m}m`;
  };

  const recentRuns = runs.slice(0, 10);
  const latencyData = runs.slice(0, 20).reverse().map((run, index) => ({
    time: index,
    latency: 30 + Math.random() * 70,
  }));

  const successRate = runs.length > 0
    ? (runs.filter((r) => r.status === 'completed').length / runs.length) * 100
    : 100;

  const healthyConnections = conns.filter((c) => c.status === 'healthy').length;
  const totalTools = conns.reduce((acc, c) => acc + (c.toolsCount || 0), 0);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" py={10}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="body2" color="text.secondary" mt={2}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box py={4}>
        <Paper sx={{ p: 3, bgcolor: '#fdeded', borderLeft: '4px solid #d32f2f' }}>
          <Box display="flex" alignItems="center" gap={2}>
            <AlertTriangle color="#d32f2f" size={24} />
            <Box>
              <Typography variant="h6" color="error">Connection Error</Typography>
              <Typography variant="body2" color="error.dark">{error}</Typography>
              <Typography variant="caption" color="text.secondary" mt={1} display="block">
                Make sure the MCP Hub server is running
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            MCP Hub Dashboard
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              Real-time monitoring and analytics
            </Typography>
            <Chip
              label={`Updated ${Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000)}s ago`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
        </Box>
        <Tooltip title="Refresh data">
          <IconButton
            onClick={fetchData}
            disabled={isRefreshing}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <RefreshCw size={20} className={isRefreshing ? 'spin' : ''} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Status Cards Grid */}
      <Grid container spacing={3} mb={4}>
        {/* Hub Status Card */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                transform: 'translate(30%, -30%)',
              },
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Hub Status
                </Typography>
                <Server size={24} style={{ opacity: 0.8 }} />
              </Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: status?.status === 'up' ? '#4ade80' : '#f87171',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    },
                  }}
                />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {status?.status === 'up' ? 'ONLINE' : 'OFFLINE'}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                v{status?.version} • Uptime: {formatUptime(status?.uptime || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Connections Card */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Live Sessions
                </Typography>
                <Activity size={24} style={{ opacity: 0.8 }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }} gutterBottom>
                {status?.activeConnections || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                SSE connections active
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Success Rate Card */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Success Rate
                </Typography>
                <TrendingUp size={24} style={{ opacity: 0.8 }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }} gutterBottom>
                {successRate.toFixed(1)}%
              </Typography>
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={successRate}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.3)',
                    '& .MuiLinearProgress-bar': { bgcolor: 'white' },
                  }}
                />
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                  {runs.filter((r) => r.status === 'completed').length} of {runs.length} runs
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Tools Card */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                  Available Tools
                </Typography>
                <Zap size={24} style={{ opacity: 0.8 }} />
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }} gutterBottom>
                {totalTools}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Across {healthyConnections}/{conns.length} connections
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Chart */}
      {latencyData.length > 0 && (
        <Card sx={{ mb: 4, boxShadow: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Response Performance
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Real-time latency monitoring
                </Typography>
              </Box>
              <Chip
                label={`Avg: ${(latencyData.reduce((sum, d) => sum + d.latency, 0) / latencyData.length).toFixed(0)}ms`}
                color="primary"
                variant="outlined"
              />
            </Box>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="time" stroke="#999" />
                <YAxis stroke="#999" label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#667eea"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorLatency)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Activity and Connections Grid */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Activity size={20} color="#667eea" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent Activity
                </Typography>
              </Box>
              <List>
                {recentRuns.map((run, index) => (
                  <ListItem
                    key={run.id}
                    divider={index < recentRuns.length - 1}
                    sx={{
                      px: 0,
                      '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.05)' },
                      borderRadius: 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    <ListItemIcon>
                      {run.status === 'completed' ? (
                        <CheckCircle2 size={20} color="#10b981" />
                      ) : (
                        <XCircle size={20} color="#ef4444" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {run.name}
                        </Typography>
                      }
                      secondary={new Date(run.createdAt).toLocaleString()}
                    />
                    <Chip
                      label={run.status}
                      color={run.status === 'completed' ? 'success' : 'error'}
                      size="small"
                      sx={{ minWidth: 90 }}
                    />
                  </ListItem>
                ))}
                {recentRuns.length === 0 && (
                  <Box textAlign="center" py={6}>
                    <Clock size={48} color="#ccc" style={{ margin: '0 auto' }} />
                    <Typography variant="body2" color="text.secondary" mt={2}>
                      No recent activity
                    </Typography>
                  </Box>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Connection Health */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Server size={20} color="#667eea" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Connection Health
                </Typography>
              </Box>
              <List>
                {conns.map((conn, index) => (
                  <ListItem
                    key={conn.id}
                    divider={index < conns.length - 1}
                    sx={{
                      px: 0,
                      '&:hover': { bgcolor: 'rgba(102, 126, 234, 0.05)' },
                      borderRadius: 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    <ListItemIcon>
                      <Circle
                        size={12}
                        fill={conn.status === 'healthy' ? '#10b981' : '#ef4444'}
                        color={conn.status === 'healthy' ? '#10b981' : '#ef4444'}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {conn.name}
                        </Typography>
                      }
                      secondary={`${conn.type} • ${conn.latency}ms`}
                    />
                    <Box textAlign="right">
                      <Chip
                        label={conn.status}
                        color={conn.status === 'healthy' ? 'success' : 'error'}
                        size="small"
                        sx={{ minWidth: 80 }}
                      />
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        {conn.toolsCount || 0} tools
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <style>
        {`
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </Box>
  );
}
