type NavigationIconName = "chats" | "language" | "status" | "settings";

export default function NavigationIcon({
  name,
  size = 28,
}: {
  name: NavigationIconName;
  size?: number;
}) {
  const shapes = {
    chats: <><rect x="1.5" y="2" width="21" height="20" rx="3"/><rect x="5" y="5.5" width="5" height="4.5" rx=".7"/><path d="M12.5 6.5h6M12.5 9h6M5 13h13.5M5 16h13.5M5 19h9"/></>,
    language: <><text x="1" y="16" fill="currentColor" stroke="none" fontSize="10" fontFamily="Arial,sans-serif">文</text><text x="15" y="17" fill="currentColor" stroke="none" fontSize="12" fontFamily="Arial,sans-serif">A</text><path d="M13 5h7m-3.5-2v2M13 7c-.4 2.5-2.2 4.5-4.5 6M10 8c.7 1 1.6 1.8 2.7 2.4"/></>,
    status: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.3a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.3a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.3a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.3a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9z"/></>,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shapes[name]}
    </svg>
  );
}
