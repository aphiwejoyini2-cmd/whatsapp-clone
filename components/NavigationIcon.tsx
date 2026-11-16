type NavigationIconName = "chats" | "language" | "status" | "call-log" | "settings" | "logout" | "wallet" | "send";

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
    "call-log": <><path d="M8 5.5a2 2 0 0 0-2 2c0 5.8 4.7 10.5 10.5 10.5a2 2 0 0 0 2-2v-1.3l-4-1-1.1 1.6a12 12 0 0 1-4.7-4.7L10.3 9l-1-3.5Z"/><path d="M14.5 3.5A6 6 0 0 1 20.5 9"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.3a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.3a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.3a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.3a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9z"/></>,
    logout: <><path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10"/><path d="M14 8l4 4-4 4M18 12H9"/></>,
    wallet: <><rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18M16 15h.01"/><path d="M6 6V4.8A1.8 1.8 0 0 1 7.8 3h10"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
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
