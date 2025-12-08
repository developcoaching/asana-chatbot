const { App } = require('@slack/bolt');
const AsanaClient = require('./asana-client');
const OpenAIIntentExtractor = require('./openai-intent-extractor');
const ClientMatcher = require('./client-matcher');
const ResponseFormatter = require('./response-formatter');

/**
 * SlackBot - Main Slack integration
 * Handles all bot interactions and routes to Asana
 */
class SlackBot {
  constructor() {
    // Initialize Slack app with webhooks
    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
    });

    // Initialize components
    this.asanaClient = new AsanaClient();
    this.intentExtractor = new OpenAIIntentExtractor();
    this.clientMatcher = new ClientMatcher();
    this.formatter = new ResponseFormatter();

    // Cache for projects
    this.projectsCache = null;
    this.projectsCacheTime = 0;
  }

  /**
   * Start the bot with Socket Mode
   */
  async start() {
    // Listen for app mentions
    this.app.event('app_mention', async ({ event, client, logger }) => {
      try {
        console.log('🎯 APP_MENTION EVENT RECEIVED:', {
          user: event.user,
          text: event.text,
          channel: event.channel,
          ts: event.ts
        });
        logger.info(`Got mention from ${event.user}: ${event.text}`);
        await this.handleMention(event, client);
      } catch (error) {
        console.error('❌ ERROR IN APP_MENTION HANDLER:', error);
        logger.error(`Error handling mention: ${error}`);
        try {
          await client.chat.postMessage({
            channel: event.channel,
            thread_ts: event.ts,
            text: `❌ Error: ${error.message}`,
          });
        } catch (e) {
          logger.error(`Failed to post error message: ${e}`);
        }
      }
    });

    // Listen for direct messages (DMs)
    this.app.message(async ({ message, client, logger }) => {
      if (!message.subtype && message.channel_type === 'im') {
        try {
          console.log('💬 DM EVENT RECEIVED:', {
            user: message.user,
            text: message.text,
            channel: message.channel
          });
          logger.info(`Got DM from ${message.user}: ${message.text}`);
          await this.handleMention({ ...message, text: message.text }, client);
        } catch (error) {
          console.error('❌ ERROR IN DM HANDLER:', error);
          logger.error(`Error handling DM: ${error}`);
        }
      }
    });

    console.log('✅ Slack bot ready for webhooks!');
  }

  /**
   * Get the Slack Bolt app
   */
  getApp() {
    return this.app;
  }

  /**
   * Handle a mention event
   */
  async handleMention(event, client) {
    console.log('🔧 HANDLING MENTION...');
    const userId = event.user;
    const channel = event.channel;
    const ts = event.ts;
    const text = event.text;

    console.log('📝 Message details:', { userId, channel, ts, text });

    // Remove the bot mention from the text
    const cleanMessage = text.replace(/<@.*?>/g, '').trim();
    console.log('✏️  Clean message:', cleanMessage);

    // Show typing indicator
    await client.chat.postMessage({
      channel: channel,
      thread_ts: ts,
      text: '🔍 Looking that up...',
    });

    // Use OpenAI to extract intent and client name
    console.log('🤖 Using OpenAI to extract intent...');
    const intentResult = await this.intentExtractor.extractIntent(cleanMessage);
    console.log('📊 Intent extracted:', intentResult);

    if (!intentResult.success) {
      await client.chat.postMessage({
        channel: channel,
        thread_ts: ts,
        text: '❌ Sorry, I had trouble understanding that. Could you rephrase?',
      });
      return;
    }

    const { clientName, intent } = intentResult;

    if (clientName === 'unknown') {
      await client.chat.postMessage({
        channel: channel,
        thread_ts: ts,
        text: '❌ I couldn\'t identify which client or project you\'re asking about. Could you be more specific?',
      });
      return;
    }

    // Get or cache projects
    if (!this.projectsCache || Date.now() - this.projectsCacheTime > 3600000) {
      console.log('📦 Refreshing project cache...');
      this.projectsCache = await this.asanaClient.getClientProjects();
      this.projectsCacheTime = Date.now();
    }

    const projects = this.projectsCache;

    // Try to match client name
    const match = await this.clientMatcher.findProject(clientName, projects);

    if (!match) {
      const errorMsg = this.formatter.formatError(clientName, 'Project not found');
      await client.chat.postMessage({
        channel: channel,
        thread_ts: ts,
        text: errorMsg,
        mrkdwn: true,
      });
      return;
    }

    if (match.ambiguous) {
      const msg = this.formatter.formatAmbiguous(match.matches);
      await client.chat.postMessage({
        channel: channel,
        thread_ts: ts,
        text: msg,
        mrkdwn: true,
      });
      return;
    }

    // Fetch project stats
    const projectId = match.gid;
    const projectName = match.name;

    try {
      const stats = await this.asanaClient.getProjectStats(projectId);

      // Format and send response
      const responseText = this.formatter.formatProjectStatus(projectName, stats);

      await client.chat.postMessage({
        channel: channel,
        thread_ts: ts,
        text: responseText,
        mrkdwn: true,
      });
    } catch (error) {
      console.error('Error fetching project stats:', error);
      const errorMsg = this.formatter.formatError(projectName, error.message);
      await client.chat.postMessage({
        channel: channel,
        thread_ts: ts,
        text: errorMsg,
        mrkdwn: true,
      });
    }
  }

  /**
   * Generic event handler for non-Bolt events
   */
  async handleEvent(event) {
    console.log('📨 Event:', event);
    // This is called from Express server for generic events
    // Slack Bolt will handle most things, but this is a fallback
  }
}

module.exports = SlackBot;
