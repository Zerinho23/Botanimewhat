import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
  import Layout from './components/Layout'
  import Overview from './pages/Overview'
  import Users from './pages/Users'
  import Groups from './pages/Groups'
  import Config from './pages/Config'
  import Moderation from './pages/Moderation'
  import Activity from './pages/Activity'
  import Connect from './pages/Connect'

  export default function App() {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="users" element={<Users />} />
            <Route path="groups" element={<Groups />} />
            <Route path="config" element={<Config />} />
            <Route path="moderation" element={<Moderation />} />
            <Route path="activity" element={<Activity />} />
            <Route path="connect" element={<Connect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    )
  }
  