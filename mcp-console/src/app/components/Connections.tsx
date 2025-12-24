import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Switch,
  IconButton,
  Grid,
  Alert,
} from '@mui/material';
import { Plus, Settings, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { connections as mockConnections } from '../services/mockData';
import { useNavigate } from 'react-router-dom';

export function Connections() {
  const [connections, setConnections] = useState(mockConnections);
  const navigate = useNavigate();

  const toggleConnection = (id: string) => {
    setConnections(connections.map((conn) => conn.id === id ? { ...conn, enabled: !conn.enabled } : conn));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 size={20} color="#2e7d32" />;
      case 'degraded': return <AlertCircle size={20} color="#ed6c02" />;
      case 'down': return <XCircle size={20} color="#d32f2f" />;
      default: return null;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom>Connections</Typography>
          <Typography variant="body2" color="text.secondary">Manage MCP server connections</Typography>
        </Box>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => navigate('/add-connection')}>
          Add Connection
        </Button>
      </Box>

      <Box display="flex" flexDirection="column" gap={3}>
        {connections.map((connection) => (
          <Card key={connection.id}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box display="flex" gap={2}>
                  {getStatusIcon(connection.status)}
                  <Box>
                    <Typography variant="h6" gutterBottom>{connection.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{connection.type} • {connection.endpoint}</Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Switch checked={connection.enabled} onChange={() => toggleConnection(connection.id)} />
                  <IconButton size="small"><Settings size={18} /></IconButton>
                  <IconButton size="small" color="error"><Trash2 size={18} /></IconButton>
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Status</Typography>
                  <Chip label={connection.status} color={connection.status === 'healthy' ? 'success' : connection.status === 'degraded' ? 'warning' : 'error'} size="small" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Last Check</Typography>
                  <Typography variant="body2">{Math.round((Date.now() - connection.lastCheck.getTime()) / 60000)} min ago</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Latency</Typography>
                  <Typography variant="body2">{connection.status === 'down' ? 'N/A' : `${connection.latency}ms`}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Tools</Typography>
                  <Typography variant="body2">{connection.toolsCount} available</Typography>
                </Grid>
              </Grid>

              {connection.error && <Alert severity="error" sx={{ mt: 2 }}>{connection.error}</Alert>}
              {connection.enabled && connection.status === 'healthy' && <Alert severity="success" sx={{ mt: 2 }}>Connection is healthy and active</Alert>}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

