import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="feed-page">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} />
        <span>Home</span>
      </Link>

      <div className="legal-content">
        <h1>Terms of Service</h1>
        <p className="text-secondary">Last updated: January 17, 2026</p>

        <section>
          <h2>Overview</h2>
          <p>
            Margin is an open-source project. By using our service, you agree to
            these terms (&quot;Terms&quot;). If you do not agree to these Terms,
            please do not use the Service.
          </p>
        </section>

        <section>
          <h2>Open Source</h2>
          <p>
            Margin is open source software. The code is available publicly and
            is provided &quot;as is&quot;, without warranty of any kind, express
            or implied.
          </p>
        </section>

        <section>
          <h2>User Conduct</h2>
          <p>
            You are responsible for your use of the Service and for any content
            you provide, including compliance with applicable laws, rules, and
            regulations.
          </p>
          <p>
            We reserve the right to remove any content that violates these
            terms, including but not limited to:
          </p>
          <ul>
            <li>Illegal content</li>
            <li>Harassment or hate speech</li>
            <li>Spam or malicious content</li>
          </ul>
        </section>

        <section>
          <h2>Decentralized Nature</h2>
          <p>
            Margin interacts with the AT Protocol network. We do not control the
            network itself or the data stored on your Personal Data Server
            (PDS). Please refer to the terms of your PDS provider for data
            storage policies.
          </p>
        </section>

        <section>
          <h2>Disclaimer</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
            AVAILABLE&quot;. WE DISCLAIM ALL CONDITIONS, REPRESENTATIONS AND
            WARRANTIES NOT EXPRESSLY SET OUT IN THESE TERMS.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For questions about these Terms, please contact us at{" "}
            <a href="mailto:hello@margin.at">hello@margin.at</a>
          </p>
        </section>
      </div>
    </div>
  );
}
