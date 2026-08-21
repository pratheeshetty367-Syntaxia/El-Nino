import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Predict from './components/Predict'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <h2>El Nino Prediction</h2>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/predict">Live Prediction</Link>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/predict" element={<Predict />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App