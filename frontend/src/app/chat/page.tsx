import { ChatShell } from '../../components/chat-shell';

export default function ChatPage() {
  return (
    <main className='hero chat-page'>
      <div className='shell'>
        <ChatShell />
      </div>
    </main>
  );
}
