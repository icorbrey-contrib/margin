import React, { useEffect, useState } from "react";
import { getProfile, getFeed, getCollections } from "../../api/client";
import Card from "../../components/common/Card";
import RichText from "../../components/common/RichText";
import {
  Edit2,
  Github,
  Linkedin,
  Loader2,
  Folder,
  MessageSquare,
  PenTool,
  Bookmark,
  Link2,
} from "lucide-react";
import { TangledIcon } from "../../components/common/Icons";
import type { UserProfile, AnnotationItem, Collection } from "../../types";
import { useStore } from "@nanostores/react";
import { $user } from "../../store/auth";
import EditProfileModal from "../../components/modals/EditProfileModal";
import ExternalLinkModal from "../../components/modals/ExternalLinkModal";
import CollectionIcon from "../../components/common/CollectionIcon";
import { $preferences, loadPreferences } from "../../store/preferences";
import { Link } from "react-router-dom";
import {
  Avatar,
  Tabs,
  EmptyState,
  Button,
  Skeleton,
} from "../../components/ui";

interface ProfileProps {
  did: string;
}

type Tab = "annotations" | "highlights" | "bookmarks" | "collections";

export default function Profile({ did }: ProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("annotations");

  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [highlights, setHighlights] = useState<AnnotationItem[]>([]);
  const [bookmarks, setBookmarks] = useState<AnnotationItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const user = useStore($user);
  const isOwner = user?.did === did;
  const [showEdit, setShowEdit] = useState(false);
  const [externalLink, setExternalLink] = useState<string | null>(null);

  const formatLinkText = (url: string) => {
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      const domain = urlObj.hostname.replace(/^www\./, "");
      const path = urlObj.pathname.replace(/^\/|\/$/g, "");

      if (
        domain.includes("github.com") ||
        domain.includes("twitter.com") ||
        domain.includes("x.com")
      ) {
        return path ? `${domain}/${path}` : domain;
      }
      if (domain.includes("linkedin.com") && path.includes("in/")) {
        return `linkedin.com/${path.split("in/")[1]}`;
      }
      if (domain.includes("tangled")) {
        return path ? `${domain}/${path}` : domain;
      }

      return domain + (path && path.length < 20 ? `/${path}` : "");
    } catch {
      return url;
    }
  };

  useEffect(() => {
    setProfile(null);
    setAnnotations([]);
    setHighlights([]);
    setBookmarks([]);
    setCollections([]);
    setActiveTab("annotations");
    setLoading(true);

    const loadProfile = async () => {
      try {
        const marginPromise = getProfile(did);
        const bskyPromise = fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
        )
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null);

        const [marginData, bskyData] = await Promise.all([
          marginPromise,
          bskyPromise,
        ]);

        const merged: UserProfile = {
          did: bskyData?.did || marginData?.did || did,
          handle: bskyData?.handle || marginData?.handle || "",
          displayName: bskyData?.displayName || marginData?.displayName,
          avatar: bskyData?.avatar || marginData?.avatar,
          description: bskyData?.description || marginData?.description,
          banner: bskyData?.banner || marginData?.banner,
          website: marginData?.website,
          links: marginData?.links || [],
          followersCount:
            bskyData?.followersCount || marginData?.followersCount,
          followsCount: bskyData?.followsCount || marginData?.followsCount,
          postsCount: bskyData?.postsCount || marginData?.postsCount,
        };

        setProfile(merged);
      } catch (e) {
        console.error("Profile load failed", e);
      } finally {
        setLoading(false);
      }
    };
    if (did) loadProfile();
  }, [did]);

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    const loadTabContent = async () => {
      const isHandle = !did.startsWith("did:");
      const resolvedDid = isHandle ? profile?.did : did;

      if (!resolvedDid) return;

      setDataLoading(true);
      try {
        if (activeTab === "annotations") {
          const res = await getFeed({
            creator: resolvedDid,
            motivation: "commenting",
            limit: 50,
          });
          setAnnotations(res.items || []);
        } else if (activeTab === "highlights") {
          const res = await getFeed({
            creator: resolvedDid,
            motivation: "highlighting",
            limit: 50,
          });
          setHighlights(res.items || []);
        } else if (activeTab === "bookmarks") {
          const res = await getFeed({
            creator: resolvedDid,
            motivation: "bookmarking",
            limit: 50,
          });
          setBookmarks(res.items || []);
        } else if (activeTab === "collections") {
          const res = await getCollections(resolvedDid);
          setCollections(res);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setDataLoading(false);
      }
    };
    loadTabContent();
  }, [profile?.did, did, activeTab]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="card p-5 mb-4">
          <div className="flex items-start gap-4">
            <Skeleton variant="circular" className="w-16 h-16" />
            <div className="flex-1 space-y-2">
              <Skeleton width="40%" className="h-6" />
              <Skeleton width="25%" className="h-4" />
              <Skeleton width="60%" className="h-4" />
            </div>
          </div>
        </div>
        <Skeleton className="h-10 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        title="User not found"
        message="This profile doesn't exist or couldn't be loaded."
      />
    );
  }

  const tabs = [
    { id: "annotations", label: "Notes" },
    { id: "highlights", label: "Highlights" },
    { id: "bookmarks", label: "Bookmarks" },
    { id: "collections", label: "Collections" },
  ];

  const currentItems =
    activeTab === "annotations"
      ? annotations
      : activeTab === "highlights"
        ? highlights
        : bookmarks;

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <div className="card p-5 mb-4">
        <div className="flex items-start gap-4">
          <Avatar
            did={profile.did}
            avatar={profile.avatar}
            size="xl"
            className="ring-4 ring-surface-100 dark:ring-surface-800"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-surface-900 dark:text-white truncate">
                  {profile.displayName || profile.handle}
                </h1>
                <p className="text-surface-500 dark:text-surface-400">
                  @{profile.handle}
                </p>
              </div>
              {isOwner && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEdit(true)}
                  icon={<Edit2 size={14} />}
                >
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
            </div>

            {profile.description && (
              <p className="text-surface-600 dark:text-surface-300 text-sm mt-3 whitespace-pre-line">
                <RichText text={profile.description} />
              </p>
            )}

            <div className="flex flex-wrap gap-3 mt-3">
              {[
                ...(profile.website ? [profile.website] : []),
                ...(profile.links || []),
              ]
                .filter((link, index, self) => self.indexOf(link) === index)
                .map((link) => {
                  let icon;
                  if (link.includes("github.com")) {
                    icon = <Github size={16} />;
                  } else if (link.includes("linkedin.com")) {
                    icon = <Linkedin size={16} />;
                  } else if (
                    link.includes("tangled.sh") ||
                    link.includes("tangled.org")
                  ) {
                    icon = <TangledIcon size={16} />;
                  } else {
                    icon = <Link2 size={16} />;
                  }

                  return (
                    <button
                      key={link}
                      onClick={() => {
                        const fullUrl = link.startsWith("http")
                          ? link
                          : `https://${link}`;
                        try {
                          const hostname = new URL(fullUrl).hostname;
                          const skipped =
                            $preferences.get().externalLinkSkippedHostnames;
                          if (skipped.includes(hostname)) {
                            window.open(
                              fullUrl,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          } else {
                            setExternalLink(fullUrl);
                          }
                        } catch {
                          setExternalLink(fullUrl);
                        }
                      }}
                      className="flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {icon}
                      <span className="truncate max-w-[200px]">
                        {formatLinkText(link)}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as Tab)}
        className="mb-4"
      />

      <div className="min-h-[200px]">
        {dataLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2
              className="animate-spin text-primary-600 dark:text-primary-400"
              size={24}
            />
            <p className="text-sm text-surface-400 dark:text-surface-500">
              Loading...
            </p>
          </div>
        ) : activeTab === "collections" ? (
          collections.length === 0 ? (
            <EmptyState
              icon={<Folder size={40} />}
              message={
                isOwner
                  ? "You haven't created any collections yet."
                  : "No collections"
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  to={`/${collection.creator?.handle || profile.handle}/collection/${(collection.uri || "").split("/").pop()}`}
                  className="group card p-4 hover:ring-primary-300 dark:hover:ring-primary-600 transition-all flex items-center gap-4"
                >
                  <div className="p-2.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl">
                    <CollectionIcon icon={collection.icon} size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-surface-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {collection.name}
                    </h3>
                    <p className="text-sm text-surface-500 dark:text-surface-400">
                      {collection.itemCount}{" "}
                      {collection.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : currentItems.length > 0 ? (
          <div className="space-y-3">
            {currentItems.map((item) => (
              <Card key={item.uri || item.cid} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={
              activeTab === "annotations" ? (
                <MessageSquare size={40} />
              ) : activeTab === "highlights" ? (
                <PenTool size={40} />
              ) : (
                <Bookmark size={40} />
              )
            }
            message={
              isOwner
                ? `You haven't added any ${activeTab} yet.`
                : `No ${activeTab}`
            }
          />
        )}
      </div>

      {showEdit && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onUpdate={(updated) => setProfile(updated)}
        />
      )}

      <ExternalLinkModal
        isOpen={!!externalLink}
        onClose={() => setExternalLink(null)}
        url={externalLink}
      />
    </div>
  );
}
