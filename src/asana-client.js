const https = require('https');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * AsanaClient - Wrapper around Asana API
 * Fetches project and task data for coaching insights
 */
class AsanaClient {
  constructor() {
    const token = process.env.ASANA_API_TOKEN;

    // Validate API token
    if (!token) {
      throw new Error('ASANA_API_TOKEN is not set in environment variables');
    }

    if (token === 'your-asana-api-token' || token.startsWith('your-')) {
      throw new Error('ASANA_API_TOKEN appears to be a placeholder. Please set a valid API key in .env file');
    }

    console.log('✅ Asana Client initialized');

    this.token = token;
    this.workspaceId = '237098990512572'; // Develop Coaching workspace
    this.baseUrl = 'app.asana.com';
  }

  /**
   * Make HTTP request to Asana API
   */
  async request(endpoint, method = 'GET') {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: `/api/1.0${endpoint}`,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            if (res.statusCode >= 400) {
              reject(new Error(`Asana API error: ${jsonData.errors?.[0]?.message || 'Unknown error'}`));
            } else {
              resolve(jsonData);
            }
          } catch (e) {
            reject(new Error(`Failed to parse Asana response: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Get all teams (clients) in workspace
   */
  async getClientTeams() {
    console.log('👥 Fetching all teams (clients)...');

    const response = await this.request(`/organizations/${this.workspaceId}/teams`);
    const teams = response.data || [];

    console.log(`✅ Found ${teams.length} teams (clients)`);

    return teams;
  }

  /**
   * Get all projects in Develop Coaching workspace
   * DEPRECATED: Use getClientTeams() instead - teams = clients
   */
  async getClientProjects() {
    console.log('📁 Fetching all projects...');

    const response = await this.request(`/workspaces/${this.workspaceId}/projects`);
    const projects = response.data || [];

    console.log(`✅ Found ${projects.length} projects`);

    return projects;
  }

  /**
   * Get the "Progress" project for a specific team (client)
   */
  async getTeamProgressProject(teamGid) {
    console.log(`📊 Fetching projects for team ${teamGid}...`);

    const response = await this.request(`/teams/${teamGid}/projects`);
    const projects = response.data || [];

    // Find the "Progress" project
    const progressProject = projects.find(p =>
      p.name.toLowerCase() === 'progress' ||
      p.name.toLowerCase() === 'progress '
    );

    if (progressProject) {
      console.log(`✅ Found Progress project: ${progressProject.name} (${progressProject.gid})`);
      return progressProject;
    }

    // If no "Progress" project, return first project
    if (projects.length > 0) {
      console.log(`⚠️  No "Progress" project found, using first project: ${projects[0].name}`);
      return projects[0];
    }

    console.log(`❌ No projects found in team ${teamGid}`);
    return null;
  }

  /**
   * Get all tasks in a specific project
   */
  async getProjectTasks(projectId, timeRange = null) {
    console.log(`📋 Fetching tasks for project ${projectId}...`);

    const response = await this.request(
      `/projects/${projectId}/tasks?limit=100&opt_fields=name,completed,due_on,custom_fields,assignee,notes,created_at,modified_at,completed_at,gid`
    );

    let tasks = response.data || [];

    // Filter by time range if specified (includes comment checking)
    if (timeRange) {
      tasks = await this.filterTasksByTime(tasks, timeRange);
      console.log(`🔍 Filtered to ${tasks.length} tasks (${timeRange})`);
    } else {
      console.log(`✅ Found ${tasks.length} tasks`);
    }

    return tasks;
  }

  /**
   * Filter tasks by time range (including comment activity)
   */
  async filterTasksByTime(tasks, timeRange) {
    const now = new Date();
    let cutoffDate;

    // Parse time range
    if (timeRange === 'last_week' || timeRange === '1_week') {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'last_2_weeks' || timeRange === '2_weeks') {
      cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'last_3_weeks' || timeRange === '3_weeks') {
      cutoffDate = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'last_4_weeks' || timeRange === '4_weeks' || timeRange === 'last_month') {
      cutoffDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'last_2_months' || timeRange === '2_months') {
      cutoffDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else {
      // Default to last 30 days if unrecognized
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // First pass: Fast filtering by task timestamps
    const recentTasks = [];
    const possiblyOldTasks = [];

    for (const task of tasks) {
      const createdAt = task.created_at ? new Date(task.created_at) : null;
      const modifiedAt = task.modified_at ? new Date(task.modified_at) : null;
      const completedAt = task.completed_at ? new Date(task.completed_at) : null;

      if (
        (createdAt && createdAt >= cutoffDate) ||
        (modifiedAt && modifiedAt >= cutoffDate) ||
        (completedAt && completedAt >= cutoffDate)
      ) {
        recentTasks.push(task);
      } else {
        possiblyOldTasks.push(task);
      }
    }

    console.log(`📊 Fast filter: ${recentTasks.length} recent tasks, checking ${possiblyOldTasks.length} for comments...`);

    // Second pass: Check comments for tasks that didn't pass fast filter
    // Only check first 20 to avoid too many API calls
    const tasksToCheckComments = possiblyOldTasks.slice(0, 20);

    const commentCheckPromises = tasksToCheckComments.map(async (task) => {
      const lastCommentDate = await this.getLastCommentDate(task.gid);
      if (lastCommentDate && new Date(lastCommentDate) >= cutoffDate) {
        console.log(`💬 Task "${task.name}" has recent comment from ${lastCommentDate}`);
        return task;
      }
      return null;
    });

    const tasksWithRecentComments = (await Promise.all(commentCheckPromises)).filter(t => t !== null);

    console.log(`💬 Found ${tasksWithRecentComments.length} tasks with recent comments`);

    return [...recentTasks, ...tasksWithRecentComments];
  }

  /**
   * Get detailed information about a specific task
   */
  async getTaskDetails(taskId) {
    const response = await this.request(
      `/tasks/${taskId}?opt_fields=*`
    );

    return response.data;
  }

  /**
   * Get stories (comments/activity) for a task
   */
  async getTaskStories(taskId) {
    try {
      const response = await this.request(
        `/tasks/${taskId}/stories?opt_fields=created_at,text,type`
      );
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching stories for task ${taskId}:`, error.message);
      return [];
    }
  }

  /**
   * Get the most recent comment timestamp for a task
   */
  async getLastCommentDate(taskId) {
    const stories = await this.getTaskStories(taskId);

    // Filter for actual comments (not system updates)
    const comments = stories.filter(s => s.type === 'comment' && s.text);

    if (comments.length === 0) return null;

    // Get most recent comment
    const sortedComments = comments.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    return sortedComments[0].created_at;
  }

  /**
   * Get project details including custom fields
   */
  async getProjectDetails(projectId) {
    console.log(`📊 Fetching project details for ${projectId}...`);

    const response = await this.request(`/projects/${projectId}`);

    return response.data;
  }

  /**
   * Calculate project progress stats
   */
  async getProjectStats(projectId, timeRange = null) {
    try {
      const tasks = await this.getProjectTasks(projectId, timeRange);

      const completed = tasks.filter(t => t.completed).length;
      const total = tasks.length;
      const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

      const overdue = tasks.filter(t => {
        if (t.completed || !t.due_on) return false;
        const dueDate = new Date(t.due_on);
        return dueDate < new Date();
      });

      const topOpen = tasks.filter(t => !t.completed).slice(0, 5);

      // Fetch recent comments for tasks (important for coach/client conversations)
      console.log('💬 Fetching recent comments...');
      const recentComments = await this.getRecentComments(tasks.slice(0, 10));

      return {
        totalTasks: total,
        completedTasks: completed,
        completionPercentage: percentComplete,
        percentComplete,
        overdueCount: overdue.length,
        overdueTasks: overdue.length,
        openTasks: topOpen,
        allTasks: tasks,
        timeRange: timeRange,
        recentComments: recentComments,
      };
    } catch (error) {
      console.error('❌ Error calculating project stats:', error);
      throw error;
    }
  }

  /**
   * Get all projects for a team
   */
  async getTeamProjects(teamGid) {
    const response = await this.request(`/teams/${teamGid}/projects`);
    return response.data || [];
  }

  /**
   * Search for meeting transcripts in a team's "Meetings" or "1:1" projects
   * Meeting transcripts are typically stored in projects named:
   * - "Meetings" or "Meeting"
   * - "1:1" or "1-1"
   * Returns transcripts from tasks created after a given date
   */
  async getMeetingTranscripts(teamGid, afterDate = null) {
    console.log(`📝 Searching for meeting transcripts in team ${teamGid}...`);
    console.log(`   Looking in projects named "Meetings" or "1:1"...`);

    try {
      const projects = await this.getTeamProjects(teamGid);
      console.log(`   Team has ${projects.length} total projects: ${projects.map(p => p.name).join(', ')}`);

      // Look for Meeting/1:1 projects - these are where transcripts are stored
      const meetingProjects = projects.filter(p => {
        const name = p.name.toLowerCase().trim();
        // Prioritize exact matches first
        const exactMatch = name === 'meetings' || name === 'meeting' || name === '1:1' || name === '1-1';
        // Then partial matches
        const partialMatch = name.includes('meeting') ||
               name.includes('1:1') ||
               name.includes('1-1') ||
               name.includes('one-on-one') ||
               name.includes('call notes') ||
               name.includes('transcript');
        return exactMatch || partialMatch;
      });

      console.log(`📁 Found ${meetingProjects.length} meeting-related projects: ${meetingProjects.map(p => p.name).join(', ')}`);

      if (meetingProjects.length === 0) {
        return { found: false, transcripts: [], projectsSearched: [] };
      }

      const allTranscripts = [];
      const projectsSearched = [];

      // Search each meeting project for transcripts
      for (const project of meetingProjects.slice(0, 3)) { // Limit to 3 projects
        projectsSearched.push(project.name);
        console.log(`🔍 Searching project: ${project.name}`);

        const tasks = await this.getProjectTasks(project.gid);

        // Filter for recent tasks if afterDate provided
        let relevantTasks = tasks;
        if (afterDate) {
          const cutoff = new Date(afterDate);
          relevantTasks = tasks.filter(t => {
            const created = new Date(t.created_at);
            const modified = new Date(t.modified_at);
            return created >= cutoff || modified >= cutoff;
          });
        }

        // Get comments/notes from tasks (transcripts are often in notes or comments)
        for (const task of relevantTasks.slice(0, 5)) { // Limit to 5 tasks per project
          const stories = await this.getTaskStories(task.gid);
          const comments = stories.filter(s => s.type === 'comment' && s.text);

          // Check if task name or notes suggest it's a transcript
          const isTranscript = task.name.toLowerCase().includes('transcript') ||
                              task.name.toLowerCase().includes('notes') ||
                              task.name.toLowerCase().includes('call') ||
                              task.name.toLowerCase().includes('meeting');

          if (isTranscript || comments.length > 0 || task.notes) {
            allTranscripts.push({
              taskName: task.name,
              taskDate: task.created_at,
              notes: task.notes ? task.notes.substring(0, 1000) : null,
              comments: comments.slice(0, 3).map(c => ({
                text: c.text.substring(0, 500),
                date: c.created_at
              })),
              projectName: project.name
            });
          }
        }
      }

      // Sort by date (most recent first)
      allTranscripts.sort((a, b) => new Date(b.taskDate) - new Date(a.taskDate));

      console.log(`✅ Found ${allTranscripts.length} potential transcripts`);

      return {
        found: allTranscripts.length > 0,
        transcripts: allTranscripts.slice(0, 5), // Return top 5
        projectsSearched
      };
    } catch (error) {
      console.error('Error searching for transcripts:', error.message);
      return { found: false, transcripts: [], projectsSearched: [], error: error.message };
    }
  }

  /**
   * Get recent comments from tasks (coach/client conversations)
   * Fetches in parallel for speed
   */
  async getRecentComments(tasks, limit = 8) {
    console.log(`💬 Fetching comments for ${Math.min(tasks.length, 15)} tasks in parallel...`);

    // Fetch comments in parallel for speed (limit to 15 tasks max)
    const taskPromises = tasks.slice(0, 15).map(async (task) => {
      try {
        const stories = await this.getTaskStories(task.gid);
        const comments = stories.filter(s => s.type === 'comment' && s.text);

        if (comments.length > 0) {
          // Sort by date descending (most recent first)
          comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          return {
            taskName: task.name,
            taskCompleted: task.completed,
            taskNotes: task.notes ? task.notes.substring(0, 200) : null,
            // Get more comments (up to 8) for fuller context
            comments: comments.slice(0, 8).map(c => ({
              text: c.text.substring(0, 500), // Allow longer text for context
              date: c.created_at,
            })),
            totalComments: comments.length,
          };
        }
        return null;
      } catch (err) {
        return null;
      }
    });

    const results = await Promise.all(taskPromises);
    const tasksWithComments = results.filter(r => r !== null);

    // Sort by most recent comment date
    tasksWithComments.sort((a, b) => {
      const aDate = new Date(a.comments[0]?.date || 0);
      const bDate = new Date(b.comments[0]?.date || 0);
      return bDate - aDate;
    });

    console.log(`✅ Found ${tasksWithComments.length} tasks with comments`);
    return tasksWithComments.slice(0, limit);
  }
}

module.exports = AsanaClient;
