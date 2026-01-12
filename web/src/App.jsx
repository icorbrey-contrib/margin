import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Feed from "./pages/Feed";
import Url from "./pages/Url";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import New from "./pages/New";
import Bookmarks from "./pages/Bookmarks";
import Highlights from "./pages/Highlights";
import Notifications from "./pages/Notifications";
import AnnotationDetail from "./pages/AnnotationDetail";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import Privacy from "./pages/Privacy";

function AppContent() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/url" element={<Url />} />
          <Route path="/new" element={<New />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/highlights" element={<Highlights />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile/:handle" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          {}
          <Route path="/at/:did/:rkey" element={<AnnotationDetail />} />
          {}
          <Route path="/annotation/:uri" element={<AnnotationDetail />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:rkey" element={<CollectionDetail />} />
          <Route path="/collection/*" element={<CollectionDetail />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </AuthProvider>
  );
}
