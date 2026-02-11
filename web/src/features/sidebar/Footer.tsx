export const Footer = ({ children }: { children: React.ReactNode }) => (
  <div className="px-1 pt-2">
    <div
      className="
        flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-surface-400 dark:text-surface-500
        leading-relaxed
      "
    >
      {children}
      <span>© 2026 Margin</span>
    </div>
  </div>
);

export const FooterLink = ({
  openInNewTab,
  children,
  href,
}: {
  children: React.ReactNode;
  openInNewTab?: boolean;
  href: string;
}) => (
  <a
    {...{
      href,
      className:
        "hover:underline hover:text-surface-600 dark:hover:text-surface-300",
      ...(openInNewTab && {
        target: "_blank",
        rel: "noreferrer",
      }),
    }}
  >
    {children}
  </a>
);

Footer.Link = FooterLink;

export default Footer;
