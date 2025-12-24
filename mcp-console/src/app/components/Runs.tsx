import { useState } from 'react';
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
} from '@mui/material';
import { FileJson, Download, CheckCircle2, XCircle, Clock, Circle } from 'lucide-react';
import { runs } from '../services/mockData';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function Runs() {
  const [selectedRun, setSelectedRun] = useState<typeof runs[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>Runs</Typography>
        <Typography variant="body2" color="text.secondary">View execution history and trace details</Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Execution History</Typography>
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
                  {run.status === 'success' ? <CheckCircle2 size={24} color="#2e7d32" /> : <XCircle size={24} color="#d32f2f" />}
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography variant="subtitle1">{run.toolName}</Typography>
                      <Chip label={run.status} color={run.status === 'success' ? 'success' : 'error'} size="small" />
                    </Box>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="body2" color="text.secondary">{run.timestamp.toLocaleString()}</Typography>
                      <Typography variant="body2" color="text.secondary">{run.latency}ms</Typography>
                    </Box>
                  </Box>
                </Box>
                <Button variant="contained" size="small" startIcon={<FileJson size={16} />} onClick={() => { setSelectedRun(run); setDialogOpen(true); }}>
                  View Details
                </Button>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedRun && (
          <>
            <DialogTitle>
              <Typography variant="h6">{selectedRun.toolName} - Run {selectedRun.id}</Typography>
              <Typography variant="body2" color="text.secondary">Executed at {selectedRun.timestamp.toLocaleString()}</Typography>
            </DialogTitle>
            <DialogContent>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label="Timeline" />
                <Tab label="Input" />
                <Tab label="Output" />
              </Tabs>
              <TabPanel value={tabValue} index={0}>
                <List>
                  <ListItem><ListItemText primary="Request Initiated" secondary={selectedRun.timestamp.toLocaleTimeString()} /></ListItem>
                  <ListItem><ListItemText primary="Tool Execution" secondary="Processing..." /></ListItem>
                  <ListItem><ListItemText primary={selectedRun.status === 'success' ? 'Completed' : 'Failed'} secondary={`${selectedRun.latency}ms`} /></ListItem>
                </List>
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>
                  {JSON.stringify(selectedRun.input, null, 2)}
                </Box>
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>
                  {JSON.stringify(selectedRun.output, null, 2)}
                </Box>
              </TabPanel>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

