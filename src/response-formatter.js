/**
 * ResponseFormatter - Convert Asana data into readable Slack messages
 */
class ResponseFormatter {
  /**
   * Format project status for Slack
   */
  formatProjectStatus(projectName, stats) {
    if (!stats) {
      return `❌ Could not fetch data for "${projectName}"`;
    }

    const tasks = stats.allTasks || [];
    const completed = stats.completedTasks || 0;
    const total = stats.totalTasks || 0;
    const percent = stats.percentComplete || 0;
    const overdue = stats.overdueCount || 0;
    const openTasks = stats.openTasks || [];

    // Create progress bar
    const barLength = 20;
    const filledLength = Math.round((percent / 100) * barLength);
    const emptyLength = barLength - filledLength;
    const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);

    let message = `📊 *${projectName}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `*Overall Progress*\n`;
    message += `${progressBar} ${percent}%\n`;
    message += `${completed}/${total} tasks complete\n\n`;

    // Show overdue warning
    if (overdue > 0) {
      message += `⚠️  *${overdue} OVERDUE* task${overdue !== 1 ? 's' : ''}\n\n`;
    } else {
      message += `✅ No overdue tasks\n\n`;
    }

    // Show top open tasks
    if (openTasks.length > 0) {
      message += `*Open Tasks (${openTasks.length} remaining)*:\n`;
      openTasks.slice(0, 5).forEach((task, index) => {
        const dueStr = task.due_on ? ` - Due ${task.due_on}` : '';
        message += `${index + 1}. ${task.name}${dueStr}\n`;
      });

      if (openTasks.length > 5) {
        message += `... and ${openTasks.length - 5} more\n`;
      }
    } else {
      message += `✅ All tasks complete!\n`;
    }

    return message;
  }

  /**
   * Format error message
   */
  formatError(clientName, error) {
    if (error.includes('not found')) {
      return `🔍 Could not find a project matching "*${clientName}*"\n\nTry:\n• Using full name\n• Using different search terms\n• Ask for help with \`help\``;
    }

    return `❌ Error: ${error}`;
  }

  /**
   * Format help message
   */
  formatHelp() {
    return `
📖 *Coaching Bot Help*

I can fetch project status from Asana!

*How to use:*
Ask me about any client project:
• "What's the status on Brad?"
• "Status for Brad Goodridge?"
• "Tell me about John Smith"
• "Show me Brad's progress"

I'll show you:
✅ Project completion percentage
✅ Tasks completed vs total
✅ Top open items
✅ Any overdue tasks

*Just mention me and ask!*
    `.trim();
  }

  /**
   * Format multiple matches (ambiguous)
   */
  formatAmbiguous(matches) {
    let message = `🤔 Found multiple matches:\n\n`;

    matches.forEach((m, index) => {
      message += `${index + 1}. ${m.name}\n`;
    });

    message += `\nPlease try with a more specific name.`;

    return message;
  }

  /**
   * Format a generic message for Slack
   */
  formatMessage(text) {
    return text;
  }
}

module.exports = ResponseFormatter;
