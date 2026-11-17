import Sidebar from "../../components/Sidebar/Sidebar.jsx";
import Chat from "../../components/Chat/Chat.jsx";
import "./ChatPage.css";

export default function ChatPage() {
  return (
    <main className="app-shell">
      <Sidebar />
      <Chat />
    </main>
  );
}
