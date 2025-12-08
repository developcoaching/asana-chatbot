# Slack Bot Setup Guide

## Bot Status
✅ Backend is **READY** and running at: `https://noctis-hoofbound-sharlene.ngrok-free.dev`

All code is configured. You just need to add one webhook URL to Slack.

---

## Step 1: Add Event Subscriptions URL

1. Go to https://api.slack.com/apps → Your App
2. Left sidebar → **"Event Subscriptions"**
3. Click **"Enable Events"** (toggle on)
4. Under "Request URL", paste this:
   ```
   https://noctis-hoofbound-sharlene.ngrok-free.dev/slack/events
   ```
5. Wait for ✅ **Verified** to appear (Slack will test it automatically)
6. Click **"Save Changes"**

---

## Step 2: Subscribe to Bot Events

Still in Event Subscriptions, scroll down to "Subscribe to bot events":

Add these events (click "Add Bot User Event"):
- ✅ `app_mention` - Bot responds to @mentions
- ✅ `message.im` - Bot responds to direct messages

Click **"Save Changes"**

---

## Step 3: Check Bot Scopes

1. Go to **"OAuth & Permissions"**
2. Under "Scopes" → "Bot Token Scopes", verify these exist:
   - `app_mentions:read`
   - `chat:write`
   - `im:read`
   - `im:history`

(They should already be set. If any are missing, add them)

---

## Done! 🎉

Your bot is now configured. Try this in Slack:

**In any channel:**
```
@bot What's the status on Brad Goodridge?
```

**In a direct message:**
```
What's the status on Brad Goodridge?
```

---

## Troubleshooting

**Error: "Your URL didn't respond with the value of the challenge parameter"**
- Make sure ngrok tunnel is still running: `ngrok http 3000`
- Verify the URL is correct (copy-paste from above)
- Wait 30 seconds and try again

**Bot doesn't respond**
- Check that Event Subscriptions shows ✅ **Verified**
- Make sure you subscribed to the events above
- Test with: `/health` endpoint → `http://localhost:3000/health`

---

## Need to restart?

If ngrok tunnel dies:
```bash
# Kill and restart everything
pkill node
cd "/Users/equipp/DEVELOP ASANA GPT"
PORT=3000 node server.js

# In another terminal, restart ngrok
ngrok http 3000
# Copy the new ngrok URL and update Slack Event Subscriptions
```

