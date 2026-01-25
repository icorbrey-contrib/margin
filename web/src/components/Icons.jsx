import tangledLogo from "../assets/tangled.svg";
import { FaGithub, FaLinkedin } from "react-icons/fa";

export function HeartIcon({ filled = false, size = 18 }) {
  return filled ? (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export function MessageIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </svg>
  );
}

export function ShareIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

export function TrashIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export function LinkIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export function PenIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export function HighlightIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 11-6 6v3h9l3-3" />
      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
    </svg>
  );
}

export function BookmarkIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

export function TagIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

export function AlertIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

export function FileTextIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

export function SearchIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function InboxIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function BlueskyIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
    >
      <path
        fill={color}
        d="M111.8 62.2C170.2 105.9 233 194.7 256 242.4c23-47.6 85.8-136.4 144.2-180.2c42.1-31.6 110.3-56 110.3 21.8c0 15.5-8.9 130.5-14.1 149.2C478.2 298 412 314.6 353.1 304.5c102.9 17.5 129.1 75.5 72.5 133.5c-107.4 110.2-154.3-27.6-166.3-62.9l0 0c-1.7-4.9-2.6-7.8-3.3-7.8s-1.6 3-3.3 7.8l0 0c-12 35.3-59 173.1-166.3 62.9c-56.5-58-30.4-116 72.5-133.5C100 314.6 33.8 298 15.7 233.1C10.4 214.4 1.5 99.4 1.5 83.9c0-77.8 68.2-53.4 110.3-21.8z"
      />
    </svg>
  );
}

export function LogoutIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export function BellIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function ReplyIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

export function AturiIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

export function BlackskyIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 285 285" width={size} height={size}>
      <path
        fill="currentColor"
        d="M148.846 144.562C148.846 159.75 161.158 172.062 176.346 172.062H207.012V185.865H176.346C161.158 185.865 148.846 198.177 148.846 213.365V243.045H136.029V213.365C136.029 198.177 123.717 185.865 108.529 185.865H77.8633V172.062H108.529C123.717 172.062 136.029 159.75 136.029 144.562V113.896H148.846V144.562Z"
      />
      <path
        fill="currentColor"
        d="M170.946 31.8766C160.207 42.616 160.207 60.0281 170.946 70.7675L192.631 92.4516L182.871 102.212L161.186 80.5275C150.447 69.7881 133.035 69.7881 122.296 80.5275L101.309 101.514L92.2456 92.4509L113.232 71.4642C123.972 60.7248 123.972 43.3128 113.232 32.5733L91.5488 10.8899L101.309 1.12988L122.993 22.814C133.732 33.5533 151.144 33.5534 161.884 22.814L183.568 1.12988L192.631 10.1925L170.946 31.8766Z"
      />
      <path
        fill="currentColor"
        d="M79.0525 75.3259C75.1216 89.9962 83.8276 105.076 98.498 109.006L128.119 116.943L124.547 130.275L94.9267 122.338C80.2564 118.407 65.1772 127.113 61.2463 141.784L53.5643 170.453L41.1837 167.136L48.8654 138.467C52.7963 123.797 44.0902 108.718 29.4199 104.787L-0.201172 96.8497L3.37124 83.5173L32.9923 91.4542C47.6626 95.3851 62.7419 86.679 66.6728 72.0088L74.6098 42.3877L86.9895 45.7048L79.0525 75.3259Z"
      />
      <path
        fill="currentColor"
        d="M218.413 71.4229C222.344 86.093 237.423 94.7992 252.094 90.8683L281.715 82.9313L285.287 96.2628L255.666 104.2C240.995 108.131 232.29 123.21 236.22 137.88L243.902 166.55L231.522 169.867L223.841 141.198C219.91 126.528 204.831 117.822 190.16 121.753L160.539 129.69L156.967 116.357L186.588 108.42C201.258 104.49 209.964 89.4103 206.033 74.74L198.096 45.1189L210.476 41.8018L218.413 71.4229Z"
      />
    </svg>
  );
}

export function NorthskyIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size}>
      <defs>
        <linearGradient
          id="north_a"
          x1="564.17"
          y1="22.4"
          x2="374.54"
          y2="1187.29"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1 0 0 1.03 31.9 91.01)"
        >
          <stop offset="0" stopColor="#2affba" />
          <stop offset="0.02" stopColor="#31f4bd" />
          <stop offset="0.14" stopColor="#53bccc" />
          <stop offset="0.25" stopColor="#718ada" />
          <stop offset="0.37" stopColor="#8a5fe5" />
          <stop offset="0.49" stopColor="#9f3def" />
          <stop offset="0.61" stopColor="#af22f6" />
          <stop offset="0.74" stopColor="#bb0ffb" />
          <stop offset="0.87" stopColor="#c204fe" />
          <stop offset="1" stopColor="#c400ff" />
        </linearGradient>
        <linearGradient
          id="north_b"
          x1="554.29"
          y1="20.79"
          x2="364.65"
          y2="1185.68"
          xlinkHref="#north_a"
        />
        <linearGradient
          id="north_c"
          x1="561.1"
          y1="21.9"
          x2="371.47"
          y2="1186.79"
          xlinkHref="#north_a"
        />
        <linearGradient
          id="north_d"
          x1="530.57"
          y1="16.93"
          x2="340.93"
          y2="1181.82"
          xlinkHref="#north_a"
        />
      </defs>
      <path
        d="m275.87 880.64 272-184.16 120.79 114 78.55-56.88 184.6 125.1a485.5 485.5 0 0 0 55.81-138.27c-64.41-21.42-127-48.15-185.92-73.32-97-41.44-188.51-80.52-253.69-80.52-59.57 0-71.53 18.85-89.12 55-16.89 34.55-37.84 77.6-139.69 77.6-81.26 0-159.95-29.93-243.27-61.61-17.07-6.5-34.57-13.14-52.49-19.69A486.06 486.06 0 0 0 95.19 884l91.29-62.16Z"
        fill="url(#north_a)"
      />
      <path
        d="M295.26 506.52c53.69 0 64.49-17.36 80.41-50.63 15.46-32.33 34.7-72.56 128.36-72.56 75 0 154.6 33.2 246.78 71.64 74.85 31.21 156.89 65.34 241 81.63a485.6 485.6 0 0 0-64.23-164.85c-108.88-6-201.82-43.35-284.6-76.69-66.77-26.89-129.69-52.22-182.84-52.22-46.88 0-56.43 15.74-70.55 45.89-13.41 28.65-31.79 67.87-118.24 67.87-44.25 0-90.68-13.48-141-33.11A488.3 488.3 0 0 0 62.86 435.7c8.3 3.38 16.55 6.74 24.68 10.08 76.34 31.22 148.3 60.74 207.72 60.74"
        fill="url(#north_b)"
      />
      <path
        d="M319.2 687.81c61.24 0 73.38-19.09 91.18-55.66 16.7-34.28 37.48-76.95 137.58-76.95 81.4 0 174.78 39.89 282.9 86.09 52.19 22.29 107.38 45.84 163.42 65.43a483 483 0 0 0 2.72-136.5C898.41 554.4 806 516 722.27 481.05c-81.88-34.14-159.08-66.33-218.27-66.33-53.25 0-64 17.29-79.84 50.42-15.51 32.42-34.8 72.77-128.93 72.77-75.08 0-153.29-32-236.08-66l-8.91-3.64A487 487 0 0 0 24 601.68c27.31 9.55 53.55 19.52 79 29.19 80.24 30.55 149.61 56.94 216.2 56.94"
        fill="url(#north_c)"
      />
      <path
        d="M341 279.65c13.49-28.78 31.95-68.19 119.16-68.19 68.59 0 137.73 27.84 210.92 57.32 70.14 28.22 148.13 59.58 233.72 69.37C815.77 218 673 140 511.88 140c-141.15 0-268.24 59.92-357.45 155.62 44 17.32 84.15 29.6 116.89 29.6 46.24 0 55.22-14.79 69.68-45.57"
        fill="url(#north_d)"
      />
    </svg>
  );
}

export function TopphieIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 344 538"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="268.5" cy="455.5" rx="34.5" ry="35.5" fill="currentColor" />
      <ellipse cx="76" cy="75.5" rx="35" ry="35.5" fill="currentColor" />
      <circle cx="268.5" cy="75.5" r="75.5" fill="currentColor" />
      <ellipse cx="76" cy="274.5" rx="76" ry="75.5" fill="currentColor" />
      <ellipse cx="76" cy="462.5" rx="76" ry="75.5" fill="currentColor" />
      <circle cx="268.5" cy="269.5" r="75.5" fill="currentColor" />
    </svg>
  );
}

export function GithubIcon({ size = 18 }) {
  return <FaGithub size={size} />;
}

export function LinkedinIcon({ size = 18 }) {
  return <FaLinkedin size={size} />;
}

export function TangledIcon({ size = 18 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
        WebkitMask: `url(${tangledLogo}) no-repeat center / contain`,
        mask: `url(${tangledLogo}) no-repeat center / contain`,
        display: "inline-block",
      }}
    />
  );
}
