
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <Link to="/home" className="inline-flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-surface-900 transition-colors mb-8">
                <ArrowLeft size={18} />
                <span>Home</span>
            </Link>

            <div className="prose prose-surface max-w-none">
                <h1 className="font-display font-bold text-3xl mb-2 text-surface-900">Privacy Policy</h1>
                <p className="text-surface-500 mb-8">Last updated: January 11, 2026</p>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Overview</h2>
                    <p className="text-surface-700 leading-relaxed">
                        Margin ("we", "our", or "us") is a web annotation tool that lets you highlight, annotate, and bookmark any webpage. Your data is stored on the decentralized AT Protocol network, giving you ownership and control over your content.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Data We Collect</h2>
                    <h3 className="text-lg font-semibold text-surface-900 mb-2">Account Information</h3>
                    <p className="text-surface-700 mb-4">
                        When you log in with your Bluesky/AT Protocol account, we access your:
                    </p>
                    <ul className="list-disc pl-5 mb-4 text-surface-700 space-y-1">
                        <li>Decentralized Identifier (DID)</li>
                        <li>Handle (username)</li>
                        <li>Display name and avatar (for showing your profile)</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-surface-900 mb-2">Annotations & Content</h3>
                    <p className="text-surface-700 mb-4">When you use Margin, we store:</p>
                    <ul className="list-disc pl-5 mb-4 text-surface-700 space-y-1">
                        <li>URLs of pages you annotate</li>
                        <li>Text you highlight or select</li>
                        <li>Annotations and comments you create</li>
                        <li>Bookmarks you save</li>
                        <li>Collections you organize content into</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-surface-900 mb-2">Authentication</h3>
                    <p className="text-surface-700 mb-4">
                        We store OAuth session tokens locally in your browser to keep you logged in. These tokens are used solely for authenticating API requests.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">How We Use Your Data</h2>
                    <p className="text-surface-700 mb-4">Your data is used exclusively to:</p>
                    <ul className="list-disc pl-5 mb-4 text-surface-700 space-y-1">
                        <li>Display your annotations on webpages</li>
                        <li>Sync your content across devices</li>
                        <li>Show your public annotations to other users</li>
                        <li>Enable social features like replies and likes</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Data Storage</h2>
                    <p className="text-surface-700 mb-4">
                        Your annotations are stored on the AT Protocol network through your Personal Data Server (PDS). This means:
                    </p>
                    <ul className="list-disc pl-5 mb-4 text-surface-700 space-y-1">
                        <li>You own your data</li>
                        <li>You can export or delete it at any time</li>
                        <li>Your data is portable across AT Protocol services</li>
                    </ul>
                    <p className="text-surface-700">
                        We also maintain a local index of annotations to provide faster search and discovery features.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Data Sharing</h2>
                    <p className="text-surface-700 mb-4">
                        <strong>We do not sell your data.</strong> We do not share your data with third parties for advertising or marketing purposes.
                    </p>
                    <p className="text-surface-700 mb-4">Your public annotations may be visible to:</p>
                    <ul className="list-disc pl-5 mb-4 text-surface-700 space-y-1">
                        <li>Other Margin users viewing the same webpage</li>
                        <li>Anyone on the AT Protocol network (for public content)</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Browser Extension Permissions</h2>
                    <p className="text-surface-700 mb-4">The Margin browser extension requires certain permissions:</p>
                    <ul className="list-disc pl-5 mb-4 text-surface-700 space-y-1">
                        <li><strong>All URLs:</strong> To display and create annotations on any webpage</li>
                        <li><strong>Storage:</strong> To save your preferences and session locally</li>
                        <li><strong>Cookies:</strong> To maintain your logged-in session</li>
                        <li><strong>Tabs:</strong> To know which page you're viewing</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Your Rights</h2>
                    <p className="text-surface-700 mb-4">You can:</p>
                    <ul className="list-disc pl-5 mb-4 text-surface-700 space-y-1">
                        <li>Delete any annotation, highlight, or bookmark you've created</li>
                        <li>Delete your collections</li>
                        <li>Export your data from your PDS</li>
                        <li>Revoke the extension's access at any time</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Contact</h2>
                    <p className="text-surface-700">
                        For privacy questions or concerns, contact us at <a href="mailto:hello@margin.at" className="text-primary-600 hover:text-primary-700 hover:underline">hello@margin.at</a>
                    </p>
                </section>
            </div>
        </div>
    );
}
