alter table public.simple_messages
  add column if not exists read_at timestamptz;

create or replace function public.mark_simple_messages_read(conversation_value uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.simple_messages as message
  set read_at = now()
  from public.simple_conversations as conversation
  where message.conversation_id = conversation_value
    and conversation.id = message.conversation_id
    and message.sender_id <> auth.uid()
    and auth.uid() in (conversation.user_a, conversation.user_b)
    and message.read_at is null;
$$;

revoke all on function public.mark_simple_messages_read(uuid) from public;
grant execute on function public.mark_simple_messages_read(uuid) to authenticated;