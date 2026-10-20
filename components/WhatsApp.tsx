"use client";

import { useState } from "react";

type Message = {
  id: number;
  text: string;
  sender: "me" | "them";
};

type Chat = {
  id: number;
  name: string;
  avatar: string;
  online: boolean;
  messages: Message[];
};

export default function WhatsApp() {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: 1,
      name: "John",
      avatar: "J",
      online: true,
      messages: [
        {
          id: 1,
          text: "Hey! How are you?",
          sender: "them",
        },
        {
          id: 2,
          text: "I'm good, thanks! How about you?",
          sender: "me",
        },
      ],
    },
    {
      id: 2,
      name: "Sarah",
      avatar: "S",
      online: true,
      messages: [
        {
          id: 3,
          text: "Are we still meeting tomorrow?",
          sender: "them",
        },
      ],
    },
    {
      id: 3,
      name: "Mike",
      avatar: "M",
      online: false,
      messages: [
        {
          id: 4,
          text: "Thanks!",
          sender: "them",
        },
      ],
    },
    {
      id: 4,
      name: "David",
      avatar: "D",
      online: false,
      messages: [
        {
          id: 5,
          text: "Let's talk later.",
          sender: "them",
        },
      ],
    },
  ]);

  const [selectedChatId, setSelectedChatId] = useState(1);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const selectedChat = chats.find(
    (chat) => chat.id === selectedChatId
  );

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(search.toLowerCase())
  );

  function sendMessage() {
    if (!message.trim()) {
      return;
    }

    setChats((currentChats) =>
      currentChats.map((chat) => {
        if (chat.id !== selectedChatId) {
          return chat;
        }

        return {
          ...chat,
          messages: [
            ...chat.messages,
            {
              id: Date.now(),
              text: message,
              sender: "me",
            },
          ],
        };
      })
    );

    setMessage("");
  }

  return (
    <main className="whatsapp">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>WhatsApp</h1>

          <button className="icon-button">
            ⋮
          </button>
        </div>

        <div className="search-container">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search or start new chat"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="chat-list">
          {filteredChats.map((chat) => {
            const lastMessage =
              chat.messages[chat.messages.length - 1];

            return (
              <button
                key={chat.id}
                className={`chat-item ${
                  selectedChatId === chat.id
                    ? "chat-item-active"
                    : ""
                }`}
                onClick={() => setSelectedChatId(chat.id)}
              >
                <div className="avatar">
                  {chat.avatar}
                </div>

                <div className="chat-info">
                  <div className="chat-top">
                    <strong>{chat.name}</strong>
                    <span>10:30</span>
                  </div>

                  <p>
                    {lastMessage?.text}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* CHAT AREA */}
      <section className="chat-area">
        {selectedChat ? (
          <>
            {/* CHAT HEADER */}
            <header className="chat-header">
              <div className="avatar">
                {selectedChat.avatar}
              </div>

              <div>
                <strong>{selectedChat.name}</strong>

                <p>
                  {selectedChat.online
                    ? "online"
                    : "offline"}
                </p>
              </div>
            </header>

            {/* MESSAGES */}
            <div className="messages">
              {selectedChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-row ${
                    msg.sender === "me"
                      ? "message-row-me"
                      : ""
                  }`}
                >
                  <div
                    className={`message ${
                      msg.sender === "me"
                        ? "message-me"
                        : "message-them"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* MESSAGE INPUT */}
            <div className="message-input-area">
              <input
                type="text"
                placeholder="Type a message"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    sendMessage();
                  }
                }}
              />

              <button onClick={sendMessage}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="empty-chat">
            <h2>WhatsApp Clone</h2>
            <p>Select a conversation to start chatting.</p>
          </div>
        )}
      </section>
    </main>
  );
}