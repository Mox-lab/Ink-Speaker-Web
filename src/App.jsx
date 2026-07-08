import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import MainLayout from './pages/MainLayout.jsx';
import Chat from './pages/Chat.jsx';
import Writing from './pages/Writing.jsx';
import Outline from './pages/Outline.jsx';
import Chapter from './pages/Chapter.jsx';
import Character from './pages/Character.jsx';
import Lore from './pages/Lore.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<Chat />} />
        <Route path="writing" element={<Writing />} />
        <Route path="outline" element={<Outline />} />
        <Route path="chapter" element={<Chapter />} />
        <Route path="character" element={<Character />} />
        <Route path="lore" element={<Lore />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
