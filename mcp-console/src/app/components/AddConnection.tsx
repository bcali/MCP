import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addConnection } from '../services/api';

export function AddConnection() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [connectionType, setConnectionType] = useState('SSE MCP Server');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', endpoint: '', apiKey: '', metadata: '' });

  const steps = ['Select Type', 'Configuration'];

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      let metadataObj = {};
      if (formData.metadata) {
        try {
          metadataObj = JSON.parse(formData.metadata);
        } catch (e) {
          throw new Error('Metadata must be valid JSON');
        }
      }

      await addConnection({
        name: formData.name,
        type: connectionType,
        endpoint: formData.endpoint,
        apiKey: formData.apiKey || undefined,
        enabled: true,
        metadata: metadataObj,
      });
      navigate('/connections');
    } catch (err: any) {
      console.error('Failed to save connection:', err);
      setError(err.message || 'Failed to save connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <IconButton onClick={() => navigate('/connections')}><ArrowLeft size={20} /></IconButton>
        <Typography variant="h4">Add Connection</Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Select Connection Type</Typography>
            <RadioGroup value={connectionType} onChange={(e) => setConnectionType(e.target.value)}>
              <FormControlLabel value="SSE MCP Server" control={<Radio />} label="SSE MCP Server" />
              <FormControlLabel value="stdio MCP Server" control={<Radio disabled />} label="stdio MCP Server (Cloud Hub only supports SSE/HTTP)" />
            </RadioGroup>
            <Box display="flex" justifyContent="flex-end" mt={3}>
              <Button variant="contained" onClick={() => setActiveStep(1)}>Next</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeStep === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Configuration</Typography>
            <Box display="flex" flexDirection="column" gap={3}>
              <TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. My Remote Gamma Server" />
              <TextField fullWidth label="Endpoint" value={formData.endpoint} onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })} placeholder="https://..." />
              <TextField fullWidth label="API Key (Optional)" value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} type="password" />
              <TextField fullWidth label="Metadata (JSON Optional)" value={formData.metadata} onChange={(e) => setFormData({ ...formData, metadata: e.target.value })} multiline rows={3} placeholder="{}" />
            </Box>
            <Box display="flex" justifyContent="space-between" mt={3}>
              <Button onClick={() => setActiveStep(0)}>Back</Button>
              <Button variant="contained" onClick={handleSave} disabled={!formData.name || !formData.endpoint || saving}>
                {saving ? <CircularProgress size={20} /> : 'Save Connection'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
