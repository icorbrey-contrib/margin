import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import RightSidebar from "./components/RightSidebar";
import MobileNav from "./components/MobileNav";
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

import Terms from "./pages/Terms";

function AppContent() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-layout">
        <main className="main-content-wrapper">
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/url" element={<Url />} />
            <Route path="/new" element={<New />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/highlights" element={<Highlights />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile/:handle" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/at/:did/:rkey" element={<AnnotationDetail />} />
            <Route path="/annotation/:uri" element={<AnnotationDetail />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/collections/:rkey" element={<CollectionDetail />} />
            <Route
              path="/:handle/collection/:rkey"
              element={<CollectionDetail />}
            />
            <Route
              path="/:handle/annotation/:rkey"
              element={<AnnotationDetail />}
            />
            <Route
              path="/:handle/highlight/:rkey"
              element={<AnnotationDetail />}
            />
            <Route
              path="/:handle/bookmark/:rkey"
              element={<AnnotationDetail />}
            />
            <Route path="/collection/*" element={<CollectionDetail />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </main>
      </div>
      <RightSidebar />
      <MobileNav />
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
