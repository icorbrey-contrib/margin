import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { $user } from "../store/auth";
import Profile from "../views/profile/Profile";
import CollectionDetail from "../views/collections/CollectionDetail";
import AnnotationDetail from "../views/content/AnnotationDetail";
import UserUrlPage from "../views/content/UserUrl";

export function ProfileWrapper() {
  const { did } = useParams();
  if (!did) return <Navigate to="/home" replace />;
  return <Profile did={did} />;
}

export function SelfProfileWrapper() {
  const user = useStore($user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/profile/${user.did}`} replace />;
}

export function CollectionDetailWrapper() {
  const { handle, rkey } = useParams();
  return <CollectionDetail handle={handle} rkey={rkey} />;
}

export function AnnotationDetailWrapper() {
  return <AnnotationDetail />;
}

export function UserUrlWrapper() {
  return <UserUrlPage />;
}
