import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { Search, Play, Code, FileJson } from 'lucide-react';
import { getTools, Tool } from '../services/api';

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function ToolsCatalog() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    getTools()
      .then(setTools)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tool.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>;
  if (error) return <Box py={4}><Typography color="error">Error: {error}</Typography></Box>;

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>Tools Catalog</Typography>
        <Typography variant="body2" color="text.secondary">Real-time catalog of tools registered on your Hub</Typography>
      </Box>

      <TextField
        fullWidth
        placeholder="Search tools by name or description..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search size={20} /></InputAdornment>,
        }}
        sx={{ mb: 4 }}
      />

      <Grid container spacing={3}>
        {filteredTools.map((tool) => (
          <Grid item xs={12} md={6} lg={4} key={tool.name}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Code size={18} />
                  <Typography variant="h6">{tool.name}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  {tool.description || 'No description provided.'}
                </Typography>
                
                <Box display="flex" flexDirection="column" gap={1}>
                  <Button variant="outlined" fullWidth startIcon={<FileJson size={16} />} onClick={() => { setSelectedTool(tool); setDialogOpen(true); }}>
                    View Schema
                  </Button>
                  <Button variant="contained" fullWidth startIcon={<Play size={16} />}>Try It</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedTool && (
          <>
            <DialogTitle>
              <Typography variant="h6">{selectedTool.name}</Typography>
              <Typography variant="body2" color="text.secondary">{selectedTool.description}</Typography>
            </DialogTitle>
            <DialogContent>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label="Input" />
                <Tab label="Output" />
                <Tab label="Examples" />
              </Tabs>
              <TabPanel value={tabValue} index={0}>
                <Typography variant="subtitle2" gutterBottom>Input Schema</Typography>
                <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>
                  {JSON.stringify(selectedTool.inputSchema, null, 2)}
                </Box>
              </TabPanel>
              <TabPanel value={tabValue} index={1}>
                <Typography variant="subtitle2" gutterBottom>Output Schema</Typography>
                <Box component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>
                  {JSON.stringify(selectedTool.outputSchema, null, 2)}
                </Box>
              </TabPanel>
              <TabPanel value={tabValue} index={2}>
                <Typography variant="subtitle2" gutterBottom>Usage Examples</Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  {selectedTool.examples?.map((example, idx) => (
                    <Box key={idx} component="pre" sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, overflow: 'auto' }}>{example}</Box>
                  )) || <Typography variant="body2" color="text.secondary">No examples available.</Typography>}
                </Box>
              </TabPanel>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

