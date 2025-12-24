import { useState, useEffect } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { getConnections, deleteConnection, type Connection } from '../services/api';

export function Connections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchConnections = async () => {
    try {
      const data = await getConnections();
      setConnections(data);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
      setError('Failed to load connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      try {
        await deleteConnection(id);
        setConnections(connections.filter(c => c.id !== id));
      } catch (err) {
        console.error('Failed to delete connection:', err);
        alert('Failed to delete connection.');
      }
    }
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? <CheckCircle2 size={20} color="#2e7d32" /> : <XCircle size={20} color="#d32f2f" />;
  };

  if (loading) return <Typography>Loading connections...</Typography>;

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

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box display="flex" flexDirection="column" gap={3}>
        {connections.map((connection) => (
          <Card key={connection.id}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box display="flex" gap={2}>
                  {getStatusIcon(connection.enabled)}
                  <Box>
                    <Typography variant="h6" gutterBottom>{connection.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{connection.type} • {connection.endpoint}</Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Switch checked={connection.enabled} readOnly />
                  <IconButton size="small"><Settings size={18} /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(connection.id)}><Trash2 size={18} /></IconButton>
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Status</Typography>
                  <Chip label={connection.enabled ? 'Enabled' : 'Disabled'} color={connection.enabled ? 'success' : 'default'} size="small" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Created At</Typography>
                  <Typography variant="body2">{new Date(connection.createdAt).toLocaleDateString()}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
        {connections.length === 0 && !loading && (
          <Typography variant="body1" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            No connections found. Add one to get started!
          </Typography>
        )}
      </Box>
    </Box>
  );
}
