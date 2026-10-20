"use client";

import { useState } from "react";

export default function ChatWindow() {
const [message, setMessage] = useState("");

const [messages, setMessages] = useState([
{
id: 1,
text: "Hey! How are you?",
sender: "John",
},
{
id: 2,
text: "I'm good, thanks! How about you?",
sender: "Me",
},
]);

function sendMessage() {
if (message.trim() === "") {
return;
}

```
const newMessage = {
  id: Date.now(),
  text: message,
  sender: "Me",
};

setMessages((currentMessages) => [
  ...currentMessages,
  newMessage,
]);

setMessage("");
```

}

return (
<section
style={{
flex: 1,
height: "100vh",
display: "flex",
flexDirection: "column",
backgroundColor: "#efeae2",
}}
>
<header
style={{
padding: "15px 20px",
backgroundColor: "#f0f2f5",
borderBottom: "1px solid #ddd",
}}
> <strong>John</strong> </header>

```
  <div
    style={{
      flex: 1,
      padding: "20px",
      overflowY: "auto",
    }}
  >
    {messages.map((msg) => (
      <div
        key={msg.id}
        style={{
          display: "flex",
          justifyContent:
            msg.sender === "Me" ? "flex-end" : "flex-start",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            backgroundColor:
              msg.sender === "Me" ? "#d9fdd3" : "#ffffff",
            padding: "10px 14px",
            borderRadius: "8px",
            maxWidth: "60%",
          }}
        >
          {msg.text}
        </div>
      </div>
    ))}
  </div>

  <div
    style={{
      display: "flex",
      gap: "10px",
      padding: "15px",
      backgroundColor: "#f0f2f5",
    }}
  >
    <input
      type="text"
      value={message}
      onChange={(event) => setMessage(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          sendMessage();
        }
      }}
      placeholder="Type a message"
      style={{
        flex: 1,
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #ddd",
      }}
    />

    <button
      onClick={sendMessage}
      style={{
        padding: "12px 20px",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    >
      Send
    </button>
  </div>
</section>

);
}
