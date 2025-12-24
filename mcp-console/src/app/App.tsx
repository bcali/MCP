import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AppBar, Toolbar, Typography, Box, Container, Button } from '@mui/material';
import { LayoutDashboard, Cable, Wrench, Activity } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Connections } from './components/Connections';
import { ToolsCatalog } from './components/ToolsCatalog';
import { Runs } from './components/Runs';
import { AddConnection } from './components/AddConnection';
import { theme } from './theme';

function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/connections', icon: Cable, label: 'Connections' },
    { path: '/tools', icon: Wrench, label: 'Tools' },
    { path: '/runs', icon: Activity, label: 'Runs' },
  ];

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Box display="flex" alignItems="center" gap={1} mr={4}>
          <Cable size={24} />
          <Typography variant="h6" component="div">
            MCP Hub Console
          </Typography>
        </Box>
        <Box display="flex" gap={1} flexGrow={1}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                component={Link}
                to={item.path}
                startIcon={<Icon size={18} />}
                sx={{
                  color: 'white',
                  bgcolor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function AppContent() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navigation />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/tools" element={<ToolsCatalog />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/add-connection" element={<AddConnection />} />
        </Routes>
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

