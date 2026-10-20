"use client";

export default function Sidebar() {
const chats = [
{ name: "John", message: "Hey, how are you?", time: "10:30" },
{ name: "Sarah", message: "See you tomorrow!", time: "09:45" },
{ name: "Mike", message: "Thanks!", time: "Yesterday" },
{ name: "David", message: "Let's talk later.", time: "Yesterday" },
];

return (
<aside
style={{
width: "350px",
height: "100vh",
borderRight: "1px solid #ddd",
backgroundColor: "#fff",
display: "flex",
flexDirection: "column",
}}
>
<div
style={{
padding: "20px",
borderBottom: "1px solid #ddd",
}}
>
<h2 style={{ margin: 0 }}>WhatsApp</h2>


    <input
      type="text"
      placeholder="Search or start new chat"
      style={{
        width: "100%",
        marginTop: "15px",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #ddd",
        boxSizing: "border-box",
      }}
    />
  </div>

  <div>
    {chats.map((chat) => (
      <div
        key={chat.name}
        style={{
          padding: "15px 20px",
          borderBottom: "1px solid #eee",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <strong>{chat.name}</strong>
          <small>{chat.time}</small>
        </div>

        <p
          style={{
            margin: "5px 0 0",
            color: "#666",
          }}
        >
          {chat.message}
        </p>
      </div>
    ))}
  </div>
</aside>

);
}
