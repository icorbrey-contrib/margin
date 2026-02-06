
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
    return (
        <div className="max-w-3xl mx-auto py-12 px-4">
            <Link to="/home" className="inline-flex items-center gap-2 text-sm font-medium text-surface-500 hover:text-surface-900 transition-colors mb-8">
                <ArrowLeft size={18} />
                <span>Home</span>
            </Link>

            <div className="prose prose-surface max-w-none">
                <h1 className="font-display font-bold text-3xl mb-2 text-surface-900">Terms of Service</h1>
                <p className="text-surface-500 mb-8">Last updated: January 17, 2026</p>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Overview</h2>
                    <p className="text-surface-700 leading-relaxed">
                        Margin is an open-source project. By using our service, you agree to these terms ("Terms"). If you do not agree to these Terms, please do not use the Service.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Open Source</h2>
                    <p className="text-surface-700 leading-relaxed">
                        Margin is open source software. The code is available publicly and is provided "as is", without warranty of any kind, express or implied.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">User Conduct</h2>
                    <p className="text-surface-700 mb-4">
                        You are responsible for your use of the Service and for any content you provide, including compliance with applicable laws, rules, and regulations.
                    </p>
                    <p className="text-surface-700 mb-4">
                        We reserve the right to remove any content that violates these terms, including but not limited to:
                    </p>
                    <ul className="list-disc pl-5 mb-4 text-surface-700 space-y-1">
                        <li>Illegal content</li>
                        <li>Harassment or hate speech</li>
                        <li>Spam or malicious content</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Decentralized Nature</h2>
                    <p className="text-surface-700 leading-relaxed">
                        Margin interacts with the AT Protocol network. We do not control the network itself or the data stored on your Personal Data Server (PDS). Please refer to the terms of your PDS provider for data storage policies.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Disclaimer</h2>
                    <p className="text-surface-700 leading-relaxed uppercase">
                        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". WE DISCLAIM ALL CONDITIONS, REPRESENTATIONS AND WARRANTIES NOT EXPRESSLY SET OUT IN THESE TERMS.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-surface-900 mb-4">Contact</h2>
                    <p className="text-surface-700">
                        For questions about these Terms, please contact us at <a href="mailto:hello@margin.at" className="text-primary-600 hover:text-primary-700 hover:underline">hello@margin.at</a>
                    </p>
                </section>
            </div>
        </div>
    );
}
