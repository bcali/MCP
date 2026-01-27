/**
 * Metrics and monitoring utilities for MCP Hub
 * Tracks startup health, database connectivity, and tool execution
 */

interface StartupMetrics {
  startTime: number;
  databaseConnected: boolean;
  databaseConnectionTime?: number;
  serverListening: boolean;
  serverStartTime?: number;
  errors: string[];
}

interface ToolExecutionMetrics {
  toolName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

interface ConnectionPoolMetrics {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

class MetricsCollector {
  private startupMetrics: StartupMetrics = {
    startTime: Date.now(),
    databaseConnected: false,
    serverListening: false,
    errors: [],
  };

  private toolExecutions: ToolExecutionMetrics[] = [];
  private connectionPoolStats: ConnectionPoolMetrics | null = null;

  // Startup tracking
  markDatabaseConnected(connectionTime: number) {
    this.startupMetrics.databaseConnected = true;
    this.startupMetrics.databaseConnectionTime = connectionTime;
  }

  markServerListening(listenTime: number) {
    this.startupMetrics.serverListening = true;
    this.startupMetrics.serverStartTime = listenTime;
  }

  recordStartupError(error: string) {
    this.startupMetrics.errors.push(error);
  }

  getStartupMetrics(): StartupMetrics {
    return {
      ...this.startupMetrics,
    };
  }

  // Tool execution tracking
  startToolExecution(toolName: string): number {
    const startTime = Date.now();
    this.toolExecutions.push({
      toolName,
      startTime,
      success: false,
    });
    return this.toolExecutions.length - 1;
  }

  endToolExecution(index: number, success: boolean, error?: string) {
    if (index >= 0 && index < this.toolExecutions.length) {
      const execution = this.toolExecutions[index];
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.success = success;
      if (error) execution.error = error;
    }
  }

  getToolExecutionStats() {
    const total = this.toolExecutions.length;
    const successful = this.toolExecutions.filter((e) => e.success).length;
    const failed = total - successful;
    const avgDuration =
      this.toolExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / total || 0;

    const byTool: Record<string, { count: number; successRate: number; avgDuration: number }> = {};
    this.toolExecutions.forEach((e) => {
      if (!byTool[e.toolName]) {
        byTool[e.toolName] = { count: 0, successRate: 0, avgDuration: 0 };
      }
      byTool[e.toolName].count++;
    });

    Object.keys(byTool).forEach((tool) => {
      const executions = this.toolExecutions.filter((e) => e.toolName === tool);
      const success = executions.filter((e) => e.success).length;
      byTool[tool].successRate = (success / executions.length) * 100;
      byTool[tool].avgDuration =
        executions.reduce((sum, e) => sum + (e.duration || 0), 0) / executions.length;
    });

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgDuration,
      byTool,
    };
  }

  // Connection pool tracking
  updateConnectionPoolStats(stats: ConnectionPoolMetrics) {
    this.connectionPoolStats = stats;
  }

  getConnectionPoolStats(): ConnectionPoolMetrics | null {
    return this.connectionPoolStats;
  }

  // Overall health check
  getHealthStatus() {
    const startupTime = Date.now() - this.startupMetrics.startTime;
    const toolStats = this.getToolExecutionStats();

    return {
      healthy: this.startupMetrics.databaseConnected && this.startupMetrics.serverListening,
      uptime: startupTime,
      startup: {
        databaseConnected: this.startupMetrics.databaseConnected,
        databaseConnectionTime: this.startupMetrics.databaseConnectionTime,
        serverListening: this.startupMetrics.serverListening,
        totalStartupTime: this.startupMetrics.serverStartTime
          ? this.startupMetrics.serverStartTime - this.startupMetrics.startTime
          : null,
        errors: this.startupMetrics.errors,
      },
      tools: toolStats,
      connectionPool: this.connectionPoolStats,
    };
  }
}

export const metrics = new MetricsCollector();
