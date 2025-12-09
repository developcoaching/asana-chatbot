const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

class SupabaseClient {
  constructor() {
    // Trim whitespace/newlines from env vars (Railway can add these)
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️  Supabase credentials not configured - using in-memory storage');
      this.client = null;
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');
  }

  isConnected() {
    return this.client !== null;
  }

  // ==========================================
  // CHAT SESSIONS
  // ==========================================

  async createSession(sessionId, userId = null) {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('chat_sessions')
      .insert({
        session_id: sessionId,
        user_id: userId,
        current_client: null,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    return data;
  }

  async getSession(sessionId) {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('chat_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - session doesn't exist
        return null;
      }
      console.error('Error getting session:', error);
      return null;
    }

    return data;
  }

  async updateSessionClient(sessionId, clientName) {
    if (!this.client) return;

    const { error } = await this.client
      .from('chat_sessions')
      .update({
        current_client: clientName,
        last_activity: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error updating session client:', error);
    }
  }

  // ==========================================
  // CHAT MESSAGES
  // ==========================================

  async saveMessage(sessionId, role, content, clientContext = null) {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: role,
        content: content,
        client_context: clientContext,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      return null;
    }

    return data;
  }

  async getSessionMessages(sessionId, limit = 20) {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error getting messages:', error);
      return [];
    }

    return data || [];
  }

  async getRecentMessages(sessionId, limit = 10) {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }

    // Return in chronological order
    return (data || []).reverse();
  }

  // ==========================================
  // CONVERSATION HISTORY (formatted for OpenAI)
  // ==========================================

  async getConversationHistory(sessionId, limit = 10) {
    const messages = await this.getRecentMessages(sessionId, limit);

    return messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  // ==========================================
  // SESSION + MESSAGES COMBINED
  // ==========================================

  async getOrCreateSession(sessionId) {
    let session = await this.getSession(sessionId);

    if (!session) {
      session = await this.createSession(sessionId);
    }

    return session;
  }

  async saveConversationTurn(sessionId, userMessage, assistantResponse, clientName) {
    if (!this.client) return;

    // Save user message
    await this.saveMessage(sessionId, 'user', userMessage, clientName);

    // Save assistant response
    await this.saveMessage(sessionId, 'assistant', assistantResponse, clientName);

    // Update session
    await this.updateSessionClient(sessionId, clientName);
  }
}

module.exports = SupabaseClient;
