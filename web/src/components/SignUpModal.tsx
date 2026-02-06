
import React, { useState, useEffect } from "react";
import { X, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import {
    BlackskyIcon,
    NorthskyIcon,
    BlueskyIcon,
    TophhieIcon,
    MarginIcon,
} from "./Icons";
import { startSignup } from "../api/client";

interface Provider {
    id: string;
    name: string;
    service: string;
    Icon: any;
    description: string;
    custom?: boolean;
    wide?: boolean;
}

const RECOMMENDED_PROVIDER: Provider = {
    id: "margin",
    name: "Margin",
    service: "https://margin.cafe",
    Icon: MarginIcon,
    description: "Hosted by Margin, the easiest way to get started",
};

const OTHER_PROVIDERS: Provider[] = [
    {
        id: "bluesky",
        name: "Bluesky",
        service: "https://bsky.social",
        Icon: BlueskyIcon,
        description: "The most popular option on the AT Protocol",
    },
    {
        id: "blacksky",
        name: "Blacksky",
        service: "https://blacksky.app",
        Icon: BlackskyIcon,
        description: "For the Culture. A safe space for users and allies",
    },
    {
        id: "selfhosted.social",
        name: "selfhosted.social",
        service: "https://selfhosted.social",
        Icon: null,
        description: "For hackers, designers, and ATProto enthusiasts.",
    },
    {
        id: "northsky",
        name: "Northsky",
        service: "https://northsky.social",
        Icon: NorthskyIcon,
        description: "A Canadian-based worker-owned cooperative",
    },
    {
        id: "tophhie",
        name: "Tophhie",
        service: "https://tophhie.social",
        Icon: TophhieIcon,
        description: "A welcoming and friendly community",
    },
    {
        id: "altq",
        name: "AltQ",
        service: "https://altq.net",
        Icon: null,
        description: "An independent, self-hosted PDS instance",
    },
    {
        id: "custom",
        name: "Custom",
        service: "",
        custom: true,
        Icon: null,
        description: "Connect to your own or another custom PDS",
    },
];

interface SignUpModalProps {
    onClose: () => void;
}

export default function SignUpModal({ onClose }: SignUpModalProps) {
    const [showOtherProviders, setShowOtherProviders] = useState(false);
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customService, setCustomService] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    const handleProviderSelect = async (provider: Provider) => {
        if (provider.custom) {
            setShowCustomInput(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await startSignup(provider.service);
            if (result.authorizationUrl) {
                window.location.href = result.authorizationUrl;
            }
        } catch (err) {
            console.error(err);
            setError("Could not connect to this provider. Please try again.");
            setLoading(false);
        }
    };

    const handleCustomSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customService.trim()) return;

        setLoading(true);
        setError(null);

        let serviceUrl = customService.trim();
        if (!serviceUrl.startsWith("http")) {
            serviceUrl = `https://${serviceUrl}`;
        }

        try {
            const result = await startSignup(serviceUrl);
            if (result.authorizationUrl) {
                window.location.href = result.authorizationUrl;
            }
        } catch (err) {
            console.error(err);
            setError("Could not connect to this PDS. Please check the URL.");
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="p-4 flex justify-end">
                    <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-900 hover:bg-surface-50 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-8 pb-10">
                    {loading ? (
                        <div className="text-center py-10">
                            <Loader2 size={40} className="animate-spin text-primary-600 mx-auto mb-4" />
                            <p className="text-surface-600 font-medium">Connecting to provider...</p>
                        </div>
                    ) : showCustomInput ? (
                        <div>
                            <h2 className="text-2xl font-display font-bold text-surface-900 mb-6">Custom Provider</h2>
                            <form onSubmit={handleCustomSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-surface-700 mb-1">
                                        PDS address (e.g. pds.example.com)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all"
                                        value={customService}
                                        onChange={(e) => setCustomService(e.target.value)}
                                        placeholder="pds.example.com"
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        className="flex-1 py-3 bg-white border border-surface-200 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors"
                                        onClick={() => {
                                            setShowCustomInput(false);
                                            setError(null);
                                        }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!customService.trim()}
                                    >
                                        Continue
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">Create your account</h2>
                            <p className="text-surface-500 mb-6">
                                Margin adheres to the AT Protocol. Choose a provider to host your account.
                            </p>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <div className="mb-6">
                                <div className="inline-block px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-bold uppercase tracking-wider rounded-md mb-2">Recommended</div>
                                <button
                                    className="w-full flex items-center gap-4 p-4 bg-white border-2 border-primary-100 hover:border-primary-300 rounded-2xl shadow-sm hover:shadow-md transition-all group text-left"
                                    onClick={() => handleProviderSelect(RECOMMENDED_PROVIDER)}
                                >
                                    <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 flex-shrink-0">
                                        {RECOMMENDED_PROVIDER.Icon && <RECOMMENDED_PROVIDER.Icon size={24} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-surface-900 group-hover:text-primary-700 transition-colors">{RECOMMENDED_PROVIDER.name}</h3>
                                        <span className="text-sm text-surface-500 line-clamp-1">{RECOMMENDED_PROVIDER.description}</span>
                                    </div>
                                    <ChevronRight size={20} className="text-surface-300 group-hover:text-primary-500" />
                                </button>
                            </div>

                            <div className="border-t border-surface-100 pt-4">
                                <button
                                    type="button"
                                    className="flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-surface-900 transition-colors mb-4"
                                    onClick={() => setShowOtherProviders(!showOtherProviders)}
                                >
                                    {showOtherProviders ? "Hide other options" : "More options"}
                                    <ChevronRight
                                        size={14}
                                        className={`transition-transform duration-200 ${showOtherProviders ? "rotate-90" : ""}`}
                                    />
                                </button>

                                {showOtherProviders && (
                                    <div className="space-y-2 animate-fade-in">
                                        {OTHER_PROVIDERS.map((p) => (
                                            <button
                                                key={p.id}
                                                className="w-full flex items-center gap-3 p-3 bg-surface-50 hover:bg-surface-100 rounded-xl transition-colors text-left group"
                                                onClick={() => handleProviderSelect(p)}
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-surface-600">
                                                    {p.Icon ? (
                                                        <p.Icon size={18} />
                                                    ) : (
                                                        <span className="font-bold text-xs">{p.name[0]}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-bold text-surface-900">{p.name}</h3>
                                                    <p className="text-xs text-surface-500 line-clamp-1">{p.description}</p>
                                                </div>
                                                <ChevronRight size={16} className="text-surface-300 group-hover:text-surface-600" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
