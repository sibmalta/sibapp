import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const sourcePath = (...parts) => path.join(process.cwd(), 'src', ...parts)
const chatPageSource = fs.readFileSync(sourcePath('pages', 'ChatPage.jsx'), 'utf8')
const chatListPageSource = fs.readFileSync(sourcePath('pages', 'ChatListPage.jsx'), 'utf8')
const appContextSource = fs.readFileSync(sourcePath('context', 'AppContext.jsx'), 'utf8')
const systemMessagesSource = fs.readFileSync(sourcePath('lib', 'orderSystemMessages.js'), 'utf8')

describe('chat order lifecycle system messages', () => {
  it('renders system messages as timeline cards with timestamps', () => {
    expect(chatPageSource).toContain("msg?.type === 'system'")
    expect(chatPageSource).toContain('renderSystemEvent')
    expect(chatPageSource).toContain('formatMessageTime(msg.timestamp)')
    expect(chatPageSource).toContain('msg.lines')
  })

  it('shows system messages in chat list previews', () => {
    expect(chatListPageSource).toContain("msg?.type === 'system'")
    expect(chatListPageSource).toContain('isSystemMessage(lastMsg)')
  })

  it('triggers order lifecycle system events from backend lifecycle transitions', () => {
    expect(appContextSource).toContain('buildDropoffConfirmedSystemMessage')
    expect(appContextSource).toContain('buildCourierCollectedSystemMessage')
    expect(appContextSource).toContain('buildDeliveredSystemMessage')
    expect(appContextSource).toContain('buildOrderCompletedSystemMessage')
    expect(appContextSource).toContain('addOrderSystemMessage')
    expect(systemMessagesSource).toContain('dropoff_confirmed')
    expect(systemMessagesSource).toContain('courier_collected')
    expect(systemMessagesSource).toContain('delivered')
    expect(systemMessagesSource).toContain('completed')
  })
})
