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
  Chip,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AddConnection() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [connectionType, setConnectionType] = useState('SSE MCP Server');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; tools: string[] } | null>(null);

  const [formData, setFormData] = useState({ name: '', endpoint: '', apiKey: '', description: '' });

  const steps = ['Select Type', 'Configuration', 'Test Connection'];

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <IconButton onClick={() => navigate('/connections')}><ArrowLeft size={20} /></IconButton>
        <Typography variant="h4">Add Connection</Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Select Connection Type</Typography>
            <RadioGroup value={connectionType} onChange={(e) => setConnectionType(e.target.value)}>
              <FormControlLabel value="SSE MCP Server" control={<Radio />} label="SSE MCP Server" />
              <FormControlLabel value="stdio MCP Server" control={<Radio />} label="stdio MCP Server" />
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
              <TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <TextField fullWidth label="Endpoint" value={formData.endpoint} onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })} />
            </Box>
            <Box display="flex" justifyContent="space-between" mt={3}>
              <Button onClick={() => setActiveStep(0)}>Back</Button>
              <Button variant="contained" onClick={() => setActiveStep(2)} disabled={!formData.name || !formData.endpoint}>Next</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {activeStep === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Test Connection</Typography>
            {!testResult && (
              <Button
                fullWidth variant="contained"
                onClick={async () => {
                  setTesting(true);
                  await new Promise(r => setTimeout(r, 1000));
                  setTestResult({ success: true, tools: ['tool1', 'tool2'] });
                  setTesting(false);
                }}
                disabled={testing}
              >
                {testing ? <CircularProgress size={20} /> : 'Run Test'}
              </Button>
            )}
            {testResult && (
              <Box display="flex" flexDirection="column" gap={3}>
                <Alert severity="success">Connection successful!</Alert>
                <Box display="flex" justifyContent="space-between">
                  <Button onClick={() => setActiveStep(1)}>Back</Button>
                  <Button variant="contained" onClick={() => navigate('/connections')}>Save</Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

