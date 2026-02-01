import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppLayout from "./components/AppLayout";
import Feed from "./pages/Feed";
import Url from "./pages/Url";
import UserUrl from "./pages/UserUrl";
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
import Settings from "./pages/Settings";
import Landing from "./pages/Landing";
import ScrollToTop from "./components/ScrollToTop";
import { ThemeProvider } from "./context/ThemeContext";

function AppContent() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetch("/api/sync", { method: "POST" }).catch(console.error);
    }
  }, [user]);

  return (
    <AppLayout>
      <ScrollToTop />
      <Routes>
        <Route path="/home" element={<Feed />} />
        <Route path="/url" element={<Url />} />
        <Route path="/new" element={<New />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/highlights" element={<Highlights />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
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
        <Route path="/:handle/highlight/:rkey" element={<AnnotationDetail />} />
        <Route path="/:handle/bookmark/:rkey" element={<AnnotationDetail />} />
        <Route path="/:handle/url/*" element={<UserUrl />} />
        <Route path="/collection/*" element={<CollectionDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
