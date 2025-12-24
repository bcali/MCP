import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { FileJson, CheckCircle2, XCircle, Clock, Circle, PlayCircle } from 'lucide-react';
import { getRecentRuns } from '../services/api';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function Runs() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    getRecentRuns()
      .then(setRuns)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={24} color="#2e7d32" />;
      case 'failed': return <XCircle size={24} color="#d32f2f" />;
      case 'running': return <PlayCircle size={24} color="#1976d2" />;
      default: return <Circle size={24} color="#999" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'running': return 'primary';
      default: return 'default';
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
  if (error) return <Box py={4}><Typography color="error">Error: {error}</Typography></Box>;

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>Runs</Typography>
        <Typography variant="body2" color="text.secondary">Real-time execution history and trace details from your Hub</Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Execution History</Typography>
          {runs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No runs found yet. Use a tool to see it here!</Typography>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              {runs.map((run) => (
                <Box
                  key={run.id}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2,
                    border: '1px solid', borderColor: 'divider', borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    {getStatusIcon(run.status)}
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography variant="subtitle1">{run.name}</Typography>
                        <Chip label={run.status} color={getStatusColor(run.status) as any} size="small" />
                      </Box>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="body2" color="text.secondary">{new Date(run.createdAt).toLocaleString()}</Typography>
                        <Typography variant="body2" color="text.secondary">ID: {run.id.slice(0, 8)}...</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Button variant="contained" size="small" startIcon={<FileJson size={16} />} onClick={() => { setSelectedRun(run); setDialogOpen(true); }}>
                    View Details
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedRun && (
          <>
            <DialogTitle>
              <Typography variant="h6">{selectedRun.name} - Run {selectedRun.id}</Typography>
              <Typography variant="body2" color="text.secondary">Created at {new Date(selectedRun.createdAt).toLocaleString()}</Typography>
            </DialogTitle>
            <DialogContent>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label="Timeline" />
                <Tab label="Steps" />
              </Tabs>
              <TabPanel value={tabValue} index={0}>
                <List>
                  <ListItem><ListItemText primary="Request Initiated" secondary={new Date(selectedRun.createdAt).toLocaleTimeString()} /></ListItem>
                  <ListItem><ListItemText primary="Current Status" secondary={selectedRun.status} /></ListItem>
                  <ListItem><ListItemText primary="Last Updated" secondary={new Date(selectedRun.updatedAt).toLocaleTimeString()} /></ListItem>
                </List>
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <Typography variant="body2" color="text.secondary">Step details are currently available via the MCP SDK.</Typography>
              </TabPanel>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

