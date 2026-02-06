
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useStore } from '@nanostores/react';
import { $user, initAuth } from './store/auth';
import { $theme } from './store/theme';

import AppLayout, { LandingLayout } from './layouts/AppLayout';
import Feed from './views/Feed';
import Profile from './views/Profile';
import Login from './views/Login';
import Notifications from './views/Notifications';
import MasonryFeed from './components/MasonryFeed';
import Collections from './views/Collections';
import CollectionDetail from './views/CollectionDetail';
import Settings from './views/Settings';
import UrlPage from './views/Url';
import UserUrlPage from './views/UserUrl';
import NewAnnotationPage from './views/New';
import AnnotationDetail from './views/AnnotationDetail';
import Privacy from './views/Privacy';
import Terms from './views/Terms';


const ProfileWrapper = () => {
    const { did } = useParams();
    if (!did) return <Navigate to="/home" replace />;
    return <Profile did={did} />;
}

const SelfProfileWrapper = () => {
    const user = useStore($user);
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to={`/profile/${user.did}`} replace />;
}

const CollectionDetailWrapper = () => {
    const { handle, rkey } = useParams();
    return <CollectionDetail handle={handle} rkey={rkey} />;
}

export default function App() {
    React.useEffect(() => {
        initAuth();
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/settings" element={
                    <AppLayout>
                        <Settings />
                    </AppLayout>
                } />

                <Route path="/login" element={<Login />} />

                <Route path="/home" element={
                    <AppLayout>
                        <Feed initialType="all" />
                    </AppLayout>
                } />

                <Route path="/my-feed" element={<Navigate to="/home" replace />} />

                <Route path="/notifications" element={
                    <AppLayout>
                        <Notifications />
                    </AppLayout>
                } />

                <Route path="/bookmarks" element={
                    <AppLayout>
                        <div className="max-w-2xl mx-auto mb-6 text-center lg:text-left">
                            <h1 className="text-3xl font-display font-bold text-surface-900">Bookmarks</h1>
                        </div>
                        <MasonryFeed motivation="bookmarking" emptyMessage="You haven't bookmarked anything yet." />
                    </AppLayout>
                } />

                <Route path="/highlights" element={
                    <AppLayout>
                        <div className="max-w-2xl mx-auto mb-6 text-center lg:text-left">
                            <h1 className="text-3xl font-display font-bold text-surface-900">Highlights</h1>
                        </div>
                        <MasonryFeed motivation="highlighting" emptyMessage="You haven't highlighted anything yet." />
                    </AppLayout>
                } />

                <Route path="/collections" element={
                    <AppLayout>
                        <Collections />
                    </AppLayout>
                } />

                <Route path="/:handle/collection/:rkey" element={
                    <AppLayout>
                        <CollectionDetailWrapper />
                    </AppLayout>
                } />

                <Route path="/profile/:did" element={
                    <AppLayout>
                        <ProfileWrapper />
                    </AppLayout>
                } />

                <Route path="/profile" element={
                    <AppLayout>
                        <SelfProfileWrapper />
                    </AppLayout>
                } />

                <Route path="/url" element={
                    <AppLayout>
                        <UrlPage />
                    </AppLayout>
                } />

                <Route path="/new" element={
                    <AppLayout>
                        <NewAnnotationPage />
                    </AppLayout>
                } />

                <Route path="/privacy" element={
                    <AppLayout>
                        <Privacy />
                    </AppLayout>
                } />

                <Route path="/terms" element={
                    <AppLayout>
                        <Terms />
                    </AppLayout>
                } />

                <Route path="/at/:did/:rkey" element={
                    <AppLayout>
                        <AnnotationDetail />
                    </AppLayout>
                } />

                <Route path="/annotation/:uri" element={
                    <AppLayout>
                        <AnnotationDetail />
                    </AppLayout>
                } />

                <Route path="/collections/:rkey" element={
                    <AppLayout>
                        <CollectionDetail handle={undefined} rkey={undefined} />
                    </AppLayout>
                } />

                <Route path="/:handle/annotation/:rkey" element={
                    <AppLayout>
                        <AnnotationDetail />
                    </AppLayout>
                } />

                <Route path="/:handle/highlight/:rkey" element={
                    <AppLayout>
                        <AnnotationDetail />
                    </AppLayout>
                } />

                <Route path="/:handle/bookmark/:rkey" element={
                    <AppLayout>
                        <AnnotationDetail />
                    </AppLayout>
                } />

                <Route path="/:handle/url/*" element={
                    <AppLayout>
                        <UserUrlPage />
                    </AppLayout>
                } />

                <Route path="/auth/*" element={<div>Redirecting...</div>} />

                <Route path="*" element={<Navigate to="/home" replace />} />

            </Routes>
        </BrowserRouter>
    );
}
