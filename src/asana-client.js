const https = require('https');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * AsanaClient - Comprehensive Asana API wrapper
 * Supports full retrieval and write operations for coaching insights
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
   * Make HTTP request to Asana API (supports GET, POST, PUT, DELETE)
   */
  async request(endpoint, method = 'GET', body = null) {
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

      if (body) {
        req.write(JSON.stringify(body));
      }

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
   * Now includes author name for coach/client context
   */
  async getTaskStories(taskId) {
    try {
      const response = await this.request(
        `/tasks/${taskId}/stories?opt_fields=created_at,text,type,created_by.name`
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
   * Get sections in a project (for finding meeting sections in Progress)
   */
  async getProjectSections(projectId) {
    console.log(`📑 Fetching sections for project ${projectId}...`);
    try {
      const response = await this.request(`/projects/${projectId}/sections`);
      const sections = response.data || [];
      console.log(`   Found ${sections.length} sections: ${sections.map(s => s.name).join(', ')}`);
      return sections;
    } catch (error) {
      console.error('Error fetching sections:', error.message);
      return [];
    }
  }

  /**
   * Get tasks in a specific section
   */
  async getSectionTasks(sectionGid) {
    console.log(`📋 Fetching tasks for section ${sectionGid}...`);
    try {
      const response = await this.request(
        `/sections/${sectionGid}/tasks?opt_fields=name,completed,due_on,notes,created_at,modified_at,gid`
      );
      return response.data || [];
    } catch (error) {
      console.error('Error fetching section tasks:', error.message);
      return [];
    }
  }

  /**
   * Search for meeting transcripts - now searches SECTIONS within Progress project first
   * Meetings are stored in sections named "1-1 Meetings", "Meetings", etc.
   */
  async getMeetingTranscripts(teamGid, afterDate = null, progressProjectId = null) {
    console.log(`📝 Searching for meeting transcripts in team ${teamGid}...`);

    try {
      const allTranscripts = [];
      const sectionsSearched = [];

      // FIRST: Search for meetings in sections within the Progress project
      if (progressProjectId) {
        console.log(`   Checking sections within Progress project ${progressProjectId}...`);
        const sections = await this.getProjectSections(progressProjectId);

        // Find meeting-related sections
        const meetingSections = sections.filter(s => {
          const name = s.name.toLowerCase().trim();
          return name.includes('meeting') ||
                 name.includes('1-1') ||
                 name.includes('1:1') ||
                 name.includes('boardroom') ||
                 name.includes('call');
        });

        console.log(`📁 Found ${meetingSections.length} meeting sections: ${meetingSections.map(s => s.name).join(', ')}`);

        // Get tasks from meeting sections
        for (const section of meetingSections.slice(0, 3)) {
          sectionsSearched.push(section.name);
          console.log(`🔍 Searching section: ${section.name}`);

          const tasks = await this.getSectionTasks(section.gid);
          console.log(`   Found ${tasks.length} tasks in section "${section.name}"`);

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

          // Get comments/notes from tasks (meeting notes are in task notes or comments)
          for (const task of relevantTasks.slice(0, 8)) {
            const stories = await this.getTaskStories(task.gid);
            const comments = stories.filter(s => s.type === 'comment' && s.text);

            // Include task if it has notes or comments
            if (comments.length > 0 || task.notes) {
              allTranscripts.push({
                taskName: task.name,
                taskDate: task.created_at || task.modified_at,
                notes: task.notes ? task.notes.substring(0, 2000) : null,
                comments: comments.slice(0, 5).map(c => ({
                  text: c.text.substring(0, 1000),
                  date: c.created_at,
                  author: c.created_by?.name || 'Unknown' // Include who wrote the comment
                })),
                sectionName: section.name,
                projectName: 'Progress'
              });
            }
          }
        }
      }

      // SECOND: Also check for separate Meeting projects (fallback)
      if (allTranscripts.length === 0) {
        console.log(`   No meetings in sections, checking separate Meeting projects...`);
        const projects = await this.getTeamProjects(teamGid);

        const meetingProjects = projects.filter(p => {
          const name = p.name.toLowerCase().trim();
          return name === 'meetings' || name === 'meeting' ||
                 name === '1:1' || name === '1-1' ||
                 name.includes('meeting') || name.includes('1:1');
        });

        for (const project of meetingProjects.slice(0, 2)) {
          sectionsSearched.push(`Project: ${project.name}`);
          const tasks = await this.getProjectTasks(project.gid);

          for (const task of tasks.slice(0, 5)) {
            const stories = await this.getTaskStories(task.gid);
            const comments = stories.filter(s => s.type === 'comment' && s.text);

            if (comments.length > 0 || task.notes) {
              allTranscripts.push({
                taskName: task.name,
                taskDate: task.created_at,
                notes: task.notes ? task.notes.substring(0, 2000) : null,
                comments: comments.slice(0, 5).map(c => ({
                  text: c.text.substring(0, 1000),
                  date: c.created_at,
                  author: c.created_by?.name || 'Unknown' // Include who wrote the comment
                })),
                projectName: project.name
              });
            }
          }
        }
      }

      // Sort by date (most recent first)
      allTranscripts.sort((a, b) => new Date(b.taskDate) - new Date(a.taskDate));

      console.log(`✅ Found ${allTranscripts.length} meeting transcripts/notes`);

      return {
        found: allTranscripts.length > 0,
        transcripts: allTranscripts.slice(0, 8),
        sectionsSearched
      };
    } catch (error) {
      console.error('Error searching for transcripts:', error.message);
      return { found: false, transcripts: [], sectionsSearched: [], error: error.message };
    }
  }

  /**
   * Get recent comments from tasks (coach/client conversations)
   * Fetches in parallel for speed
   * Now includes author names to distinguish coach from client
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
            // Get more comments (up to 8) for fuller context - now with author
            comments: comments.slice(0, 8).map(c => ({
              text: c.text.substring(0, 500), // Allow longer text for context
              date: c.created_at,
              author: c.created_by?.name || 'Unknown', // Include who wrote the comment
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

  // ============================================================
  // NEW METHODS: Advanced Retrieval Capabilities
  // ============================================================

  /**
   * Get ALL projects for a team (not just Progress)
   */
  async getAllTeamProjects(teamGid) {
    console.log(`📁 Fetching ALL projects for team ${teamGid}...`);
    try {
      const response = await this.request(`/teams/${teamGid}/projects?opt_fields=name,gid,archived,created_at,modified_at`);
      const projects = (response.data || []).filter(p => !p.archived);
      console.log(`✅ Found ${projects.length} projects in team`);
      return projects;
    } catch (error) {
      console.error('Error fetching team projects:', error.message);
      return [];
    }
  }

  /**
   * Find a project by name within a team
   */
  async findProjectByName(teamGid, projectName) {
    console.log(`🔍 Searching for project "${projectName}" in team ${teamGid}...`);
    const projects = await this.getAllTeamProjects(teamGid);

    // Exact match first
    let match = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());

    // Partial match if no exact match
    if (!match) {
      match = projects.find(p => p.name.toLowerCase().includes(projectName.toLowerCase()));
    }

    // Fuzzy match - check if project name contains any word from search
    if (!match) {
      const searchWords = projectName.toLowerCase().split(/\s+/);
      match = projects.find(p => {
        const pName = p.name.toLowerCase();
        return searchWords.some(word => pName.includes(word));
      });
    }

    if (match) {
      console.log(`✅ Found project: ${match.name} (${match.gid})`);
    } else {
      console.log(`❌ No project found matching "${projectName}"`);
    }

    return match;
  }

  /**
   * Search for a task by name across all projects in a team
   */
  async findTaskByName(teamGid, taskName, projectGid = null) {
    console.log(`🔍 Searching for task "${taskName}"...`);

    let projectsToSearch = [];

    if (projectGid) {
      projectsToSearch = [{ gid: projectGid }];
    } else {
      projectsToSearch = await this.getAllTeamProjects(teamGid);
    }

    // Helper to extract key terms from a search query (removes common words)
    const extractKeyTerms = (query) => {
      const stopWords = ['the', 'a', 'an', 'from', 'to', 'for', 'in', 'on', 'at', 'by', 'with', 'latest', 'recent', 'last', 'new', 'current', 'up'];
      return query.toLowerCase().split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
    };

    const searchTerms = extractKeyTerms(taskName);
    console.log(`🔍 Search terms: ${searchTerms.join(', ')}`);

    for (const project of projectsToSearch) {
      try {
        const tasks = await this.getProjectTasks(project.gid);

        // Exact match (case insensitive)
        let match = tasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());

        // Partial match: search query appears in task name
        if (!match) {
          match = tasks.find(t => t.name.toLowerCase().includes(taskName.toLowerCase()));
        }

        // Reverse partial match: task name appears in search query (e.g., "MAPs" in "Latest MAP")
        if (!match) {
          match = tasks.find(t => {
            const taskNameLower = t.name.toLowerCase();
            return taskName.toLowerCase().includes(taskNameLower);
          });
        }

        // Fuzzy match: any key term matches the task name
        if (!match && searchTerms.length > 0) {
          match = tasks.find(t => {
            const taskNameLower = t.name.toLowerCase();
            return searchTerms.some(term => taskNameLower.includes(term) || term.includes(taskNameLower.replace(/s$/, '')));
          });
        }

        if (match) {
          console.log(`✅ Found task: "${match.name}" in project ${project.gid}`);
          // Get full task details
          const fullTask = await this.getTaskDetails(match.gid);
          return { ...fullTask, projectGid: project.gid };
        }
      } catch (err) {
        // Continue to next project
      }
    }

    console.log(`❌ No task found matching "${taskName}"`);
    return null;
  }

  /**
   * Search tasks by keywords across all projects in a team
   */
  async searchTasksByKeywords(teamGid, keywords, options = {}) {
    console.log(`🔍 Searching tasks for keywords: ${keywords.join(', ')}...`);

    const { projectGid, taskStatus, assignee, limit = 20 } = options;
    const results = [];

    let projectsToSearch = [];
    if (projectGid) {
      projectsToSearch = [{ gid: projectGid }];
    } else {
      projectsToSearch = await this.getAllTeamProjects(teamGid);
    }

    for (const project of projectsToSearch.slice(0, 10)) { // Limit to 10 projects
      try {
        const tasks = await this.getProjectTasks(project.gid);

        for (const task of tasks) {
          // Filter by status if specified
          if (taskStatus === 'completed' && !task.completed) continue;
          if (taskStatus === 'open' && task.completed) continue;
          if (taskStatus === 'overdue' && (task.completed || !task.due_on || new Date(task.due_on) >= new Date())) continue;

          // Check if task matches any keyword
          const taskText = `${task.name} ${task.notes || ''}`.toLowerCase();
          const matches = keywords.some(kw => taskText.includes(kw.toLowerCase()));

          if (matches) {
            results.push({
              ...task,
              projectGid: project.gid,
              projectName: project.name,
            });
          }

          if (results.length >= limit) break;
        }

        if (results.length >= limit) break;
      } catch (err) {
        // Continue to next project
      }
    }

    console.log(`✅ Found ${results.length} tasks matching keywords`);
    return results;
  }

  /**
   * Get tasks with pagination support
   */
  async getProjectTasksPaginated(projectId, options = {}) {
    const { limit = 100, taskStatus, assignee } = options;
    console.log(`📋 Fetching tasks for project ${projectId} (limit: ${limit})...`);

    let allTasks = [];
    let hasMore = true;
    let nextPageToken = null;

    while (hasMore && allTasks.length < limit) {
      // Build URL - Asana uses offset tokens, not numeric offsets
      let url = `/projects/${projectId}/tasks?limit=100&opt_fields=name,completed,due_on,custom_fields,assignee,assignee.name,notes,created_at,modified_at,completed_at,gid`;

      if (nextPageToken) {
        url += `&offset=${nextPageToken}`;
      }

      const response = await this.request(url);

      const tasks = response.data || [];
      allTasks = allTasks.concat(tasks);

      // Check if there are more pages - Asana returns the offset token
      if (response.next_page && response.next_page.offset) {
        nextPageToken = response.next_page.offset;
      } else {
        hasMore = false;
      }

      // Stop if we've fetched enough
      if (allTasks.length >= limit) {
        allTasks = allTasks.slice(0, limit);
        break;
      }
    }

    // Apply filters
    if (taskStatus) {
      if (taskStatus === 'completed') {
        allTasks = allTasks.filter(t => t.completed);
      } else if (taskStatus === 'open') {
        allTasks = allTasks.filter(t => !t.completed);
      } else if (taskStatus === 'overdue') {
        allTasks = allTasks.filter(t => !t.completed && t.due_on && new Date(t.due_on) < new Date());
      }
    }

    if (assignee) {
      allTasks = allTasks.filter(t => t.assignee?.name?.toLowerCase().includes(assignee.toLowerCase()));
    }

    console.log(`✅ Found ${allTasks.length} tasks (filtered)`);
    return allTasks;
  }

  /**
   * Get subtasks for a task
   */
  async getSubtasks(taskGid) {
    console.log(`📋 Fetching subtasks for task ${taskGid}...`);
    try {
      const response = await this.request(
        `/tasks/${taskGid}/subtasks?opt_fields=name,completed,due_on,assignee,notes,created_at,gid`
      );
      const subtasks = response.data || [];
      console.log(`✅ Found ${subtasks.length} subtasks`);
      return subtasks;
    } catch (error) {
      console.error('Error fetching subtasks:', error.message);
      return [];
    }
  }

  /**
   * Get attachments for a task
   */
  async getTaskAttachments(taskGid) {
    console.log(`📎 Fetching attachments for task ${taskGid}...`);
    try {
      const response = await this.request(
        `/tasks/${taskGid}/attachments?opt_fields=name,download_url,host,created_at,gid`
      );
      const attachments = response.data || [];
      console.log(`✅ Found ${attachments.length} attachments`);
      return attachments;
    } catch (error) {
      console.error('Error fetching attachments:', error.message);
      return [];
    }
  }

  /**
   * Search comments by date across all tasks in projects
   */
  async searchCommentsByDate(teamGid, specificDate, options = {}) {
    console.log(`💬 Searching comments from ${specificDate}...`);

    const { projectGid, authorName, limit = 20 } = options;
    const targetDate = new Date(specificDate);
    const results = [];

    let projectsToSearch = [];
    if (projectGid) {
      projectsToSearch = [{ gid: projectGid }];
    } else {
      projectsToSearch = await this.getAllTeamProjects(teamGid);
    }

    for (const project of projectsToSearch.slice(0, 5)) { // Limit to 5 projects
      try {
        const tasks = await this.getProjectTasks(project.gid);

        for (const task of tasks.slice(0, 30)) { // Limit to 30 tasks per project
          const stories = await this.getTaskStories(task.gid);
          const comments = stories.filter(s => s.type === 'comment' && s.text);

          for (const comment of comments) {
            const commentDate = new Date(comment.created_at);

            // Check if comment is from the specific date
            if (
              commentDate.getFullYear() === targetDate.getFullYear() &&
              commentDate.getMonth() === targetDate.getMonth() &&
              commentDate.getDate() === targetDate.getDate()
            ) {
              // Filter by author if specified
              if (authorName && !comment.created_by?.name?.toLowerCase().includes(authorName.toLowerCase())) {
                continue;
              }

              results.push({
                taskName: task.name,
                taskGid: task.gid,
                projectName: project.name,
                projectGid: project.gid,
                comment: {
                  text: comment.text,
                  date: comment.created_at,
                  author: comment.created_by?.name || 'Unknown',
                },
              });

              if (results.length >= limit) break;
            }
          }

          if (results.length >= limit) break;
        }

        if (results.length >= limit) break;
      } catch (err) {
        // Continue to next project
      }
    }

    console.log(`✅ Found ${results.length} comments from ${specificDate}`);
    return results;
  }

  /**
   * Get all comments from all tasks across all projects for a client
   * Sorted by date (most recent first)
   */
  async getAllConversations(teamGid, options = {}) {
    console.log(`💬 Fetching ALL conversations for team ${teamGid}...`);

    const { projectGid, limit = 30, timeRange } = options;
    const allComments = [];

    let projectsToSearch = [];
    if (projectGid) {
      projectsToSearch = [{ gid: projectGid }];
    } else {
      projectsToSearch = await this.getAllTeamProjects(teamGid);
    }

    // Calculate cutoff date if time range specified
    let cutoffDate = null;
    if (timeRange) {
      cutoffDate = this.calculateCutoffDate(timeRange);
    }

    for (const project of projectsToSearch.slice(0, 8)) { // Limit to 8 projects
      try {
        const tasks = await this.getProjectTasks(project.gid);

        for (const task of tasks.slice(0, 20)) { // Limit to 20 tasks per project
          const stories = await this.getTaskStories(task.gid);
          const comments = stories.filter(s => s.type === 'comment' && s.text);

          for (const comment of comments) {
            const commentDate = new Date(comment.created_at);

            // Apply time filter if specified
            if (cutoffDate && commentDate < cutoffDate) continue;

            allComments.push({
              taskName: task.name,
              taskGid: task.gid,
              taskCompleted: task.completed,
              projectName: project.name,
              projectGid: project.gid,
              text: comment.text,
              date: comment.created_at,
              author: comment.created_by?.name || 'Unknown',
            });
          }
        }
      } catch (err) {
        // Continue to next project
      }
    }

    // Sort by date (most recent first)
    allComments.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(`✅ Found ${allComments.length} total comments`);
    return allComments.slice(0, limit);
  }

  /**
   * Helper: Calculate cutoff date from time range string
   */
  calculateCutoffDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'yesterday':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'last_week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last_2_weeks':
        return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      case 'last_3_weeks':
        return new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
      case 'last_month':
      case 'last_4_weeks':
        return new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
      case 'last_2_months':
        return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      case 'last_3_months':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }

  /**
   * Workspace-level task search (requires Premium workspace)
   * Falls back to manual search if Premium not available
   */
  async searchTasksInWorkspace(searchText, options = {}) {
    console.log(`🔍 Workspace search for: "${searchText}"...`);

    const { completed, modifiedAfter, dueOnBefore, dueOnAfter, limit = 50 } = options;

    try {
      // Build query parameters
      let queryParams = `text=${encodeURIComponent(searchText)}`;

      if (completed !== undefined) {
        queryParams += completed ? '&completed=true' : '&completed_since=now';
      }

      if (modifiedAfter) {
        queryParams += `&modified_at.after=${modifiedAfter}`;
      }

      if (dueOnBefore) {
        queryParams += `&due_on.before=${dueOnBefore}`;
      }

      if (dueOnAfter) {
        queryParams += `&due_on.after=${dueOnAfter}`;
      }

      const response = await this.request(
        `/workspaces/${this.workspaceId}/tasks/search?${queryParams}&opt_fields=name,completed,due_on,assignee,notes,projects,gid&limit=${limit}`
      );

      const tasks = response.data || [];
      console.log(`✅ Workspace search found ${tasks.length} tasks`);
      return tasks;
    } catch (error) {
      // 402 error means Premium required
      if (error.message.includes('402') || error.message.includes('Payment Required')) {
        console.log('⚠️  Workspace search requires Premium - falling back to manual search');
        return []; // Caller should use fallback search
      }
      console.error('Error in workspace search:', error.message);
      return [];
    }
  }

  // ============================================================
  // NEW METHODS: Write Capabilities
  // ============================================================

  /**
   * Create a new task
   */
  async createTask(projectGid, taskData) {
    console.log(`➕ Creating task in project ${projectGid}...`);

    const body = {
      data: {
        name: taskData.name,
        notes: taskData.notes || '',
        projects: [projectGid],
      },
    };

    if (taskData.due_on) {
      body.data.due_on = taskData.due_on;
    }

    if (taskData.assignee) {
      body.data.assignee = taskData.assignee;
    }

    try {
      const response = await this.request('/tasks', 'POST', body);
      console.log(`✅ Task created: ${response.data.name} (${response.data.gid})`);
      return response.data;
    } catch (error) {
      console.error('Error creating task:', error.message);
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskGid, updates) {
    console.log(`✏️  Updating task ${taskGid}...`);

    const body = { data: updates };

    try {
      const response = await this.request(`/tasks/${taskGid}`, 'PUT', body);
      console.log(`✅ Task updated: ${response.data.name}`);
      return response.data;
    } catch (error) {
      console.error('Error updating task:', error.message);
      throw error;
    }
  }

  /**
   * Mark a task as complete
   */
  async completeTask(taskGid) {
    return this.updateTask(taskGid, { completed: true });
  }

  /**
   * Add a comment to a task
   */
  async addComment(taskGid, commentText) {
    console.log(`💬 Adding comment to task ${taskGid}...`);

    const body = {
      data: {
        text: commentText,
      },
    };

    try {
      const response = await this.request(`/tasks/${taskGid}/stories`, 'POST', body);
      console.log(`✅ Comment added`);
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive data for a client - searches ALL projects
   */
  async getComprehensiveClientData(teamGid, options = {}) {
    console.log(`📊 Fetching comprehensive data for team ${teamGid}...`);

    const { projectName, taskName, specificDate, timeRange, searchKeywords, taskStatus, assignee } = options;

    const result = {
      projects: [],
      tasks: [],
      conversations: [],
      targetTask: null,
      targetProject: null,
      targetComments: [],
    };

    // Get all projects
    result.projects = await this.getAllTeamProjects(teamGid);

    // If specific project requested, focus on it
    if (projectName) {
      const project = await this.findProjectByName(teamGid, projectName);
      if (project) {
        result.targetProject = project;
        result.tasks = await this.getProjectTasksPaginated(project.gid, { taskStatus, assignee, limit: 50 });
      }
    }

    // If specific task requested, find it
    if (taskName) {
      const task = await this.findTaskByName(teamGid, taskName, result.targetProject?.gid);
      if (task) {
        result.targetTask = task;
        // Get comments for this specific task
        const stories = await this.getTaskStories(task.gid);
        result.targetComments = stories
          .filter(s => s.type === 'comment' && s.text)
          .map(c => ({
            text: c.text,
            date: c.created_at,
            author: c.created_by?.name || 'Unknown',
          }));

        // Filter by date if specified
        if (specificDate) {
          const targetDate = new Date(specificDate);
          result.targetComments = result.targetComments.filter(c => {
            const commentDate = new Date(c.date);
            return (
              commentDate.getFullYear() === targetDate.getFullYear() &&
              commentDate.getMonth() === targetDate.getMonth() &&
              commentDate.getDate() === targetDate.getDate()
            );
          });
        }

        // Get attachments
        result.targetTask.attachments = await this.getTaskAttachments(task.gid);

        // Get subtasks
        result.targetTask.subtasks = await this.getSubtasks(task.gid);
      }
    }

    // If searching by keywords
    if (searchKeywords && searchKeywords.length > 0) {
      result.tasks = await this.searchTasksByKeywords(teamGid, searchKeywords, {
        projectGid: result.targetProject?.gid,
        taskStatus,
        assignee,
      });
    }

    // If searching comments by specific date
    if (specificDate && !taskName) {
      result.targetComments = await this.searchCommentsByDate(teamGid, specificDate, {
        projectGid: result.targetProject?.gid,
      });
    }

    // Get recent conversations
    result.conversations = await this.getAllConversations(teamGid, {
      projectGid: result.targetProject?.gid,
      timeRange,
      limit: 20,
    });

    console.log(`✅ Comprehensive data gathered:`, {
      projects: result.projects.length,
      tasks: result.tasks.length,
      conversations: result.conversations.length,
      targetTask: result.targetTask?.name || null,
      targetProject: result.targetProject?.name || null,
      targetComments: result.targetComments.length,
    });

    return result;
  }
}

module.exports = AsanaClient;
