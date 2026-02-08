import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { $user, logout } from "../../store/auth";
import { $theme, setTheme, type Theme } from "../../store/theme";
import {
  getAPIKeys,
  createAPIKey,
  deleteAPIKey,
  type APIKey,
} from "../../api/client";
import {
  Copy,
  Trash2,
  Key,
  Plus,
  Check,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronRight,
} from "lucide-react";
import {
  Avatar,
  Button,
  Input,
  Skeleton,
  EmptyState,
} from "../../components/ui";
import { AppleIcon } from "../../components/common/Icons";

export default function Settings() {
  const user = useStore($user);
  const theme = useStore($theme);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const loadKeys = async () => {
      setLoading(true);
      const data = await getAPIKeys();
      setKeys(data);
      setLoading(false);
    };
    loadKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreating(true);
    const res = await createAPIKey(newKeyName);
    if (res) {
      setKeys([res, ...keys]);
      setCreatedKey(res.key || null);
      setNewKeyName("");
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Revoke this key? Apps using it will stop working.")) {
      const success = await deleteAPIKey(id);
      if (success) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
  };

  if (!user) return null;

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <h1 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-8">
        Settings
      </h1>

      <div className="space-y-6">
        <section className="card p-5">
          <h2 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-4">
            Profile
          </h2>
          <div className="flex gap-4 items-center">
            <Avatar did={user.did} avatar={user.avatar} size="lg" />
            <div className="flex-1">
              <p className="font-semibold text-surface-900 dark:text-white text-lg">
                {user.displayName || user.handle}
              </p>
              <p className="text-surface-500 dark:text-surface-400">
                @{user.handle}
              </p>
            </div>
            <ChevronRight
              className="text-surface-300 dark:text-surface-600"
              size={20}
            />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-4">
            Appearance
          </h2>
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === opt.value
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600"
                }`}
              >
                <opt.icon
                  size={24}
                  className={
                    theme === opt.value
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-surface-400 dark:text-surface-500"
                  }
                />
                <span
                  className={`text-sm font-medium ${theme === opt.value ? "text-primary-600 dark:text-primary-400" : "text-surface-600 dark:text-surface-400"}`}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-1">
            API Keys
          </h2>
          <p className="text-sm text-surface-400 dark:text-surface-500 mb-5">
            For the browser extension and other apps
          </p>

          <form onSubmit={handleCreate} className="flex gap-2 mb-5">
            <div className="flex-1">
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name, e.g. Chrome Extension"
              />
            </div>
            <Button
              type="submit"
              disabled={!newKeyName.trim()}
              loading={creating}
              icon={<Plus size={16} />}
            >
              Generate
            </Button>
          </form>

          {createdKey && (
            <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-scale-in">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <Key
                    size={16}
                    className="text-green-600 dark:text-green-400"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-green-800 dark:text-green-200 text-sm font-medium mb-2">
                    Copy now - you won't see this again!
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-surface-900 border border-green-200 dark:border-green-800 px-3 py-2 rounded-lg text-xs font-mono text-green-900 dark:text-green-100 break-all">
                      {createdKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(createdKey)}
                      icon={
                        justCopied ? <Check size={16} /> : <Copy size={16} />
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : keys.length === 0 ? (
            <EmptyState
              icon={<Key size={40} />}
              message="No API keys yet. Create one to use with the browser extension."
            />
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl group transition-all hover:bg-surface-100 dark:hover:bg-surface-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface-200 dark:bg-surface-700 rounded-lg">
                      <Key
                        size={16}
                        className="text-surface-500 dark:text-surface-400"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-surface-900 dark:text-white">
                        {key.name}
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="p-2 text-surface-400 dark:text-surface-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-1">
            iOS Shortcut
          </h2>
          <p className="text-sm text-surface-400 dark:text-surface-500 mb-4">
            Save pages to Margin from Safari on iPhone and iPad
          </p>
          <a
            href="https://www.icloud.com/shortcuts/21c87edf29b046db892c9e57dac6d1fd"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-surface-900 dark:bg-white text-white dark:text-surface-900 rounded-xl font-medium text-sm transition-all hover:opacity-90"
          >
            <AppleIcon size={16} />
            Get iOS Shortcut
          </a>
        </section>

        <section className="card p-5">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-3 -m-3 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Log out</span>
          </button>
        </section>
      </div>
    </div>
  );
}
