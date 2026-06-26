import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CreatePaper from './pages/CreatePaper';
import Copyright from './pages/Copyright';
import Privacy from './pages/Privacy';
import OMRScanner from './pages/OMRScanner';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<CreatePaper />} />
        <Route path="/copyright" element={<Copyright />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/omr-scanner" element={<OMRScanner />} />
      </Routes>
    </Router>
  );
}

export default App;
