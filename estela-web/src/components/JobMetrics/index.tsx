import React, { useEffect, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    BarElement,
    ArcElement,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { Layout, Typography, Row, Col, Card, Progress, Table, Button } from "antd";
import { ApiService } from "../../services";
import { formatBytes } from "../../utils";
import { ApiProjectsSpidersJobsDataListRequest } from "../../services/api";
import { Spin } from "../../shared";
import Export from "../../assets/icons/export.svg";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const { Content } = Layout;
const { Text } = Typography;

interface JobMetricsProps {
    projectId: string;
    spiderId: string;
    jobId: string;
    jobStatus?: string;
}

interface StatsData {
    [key: string]: string | number | object;
    // Core metrics (Scrapy built-in)
    item_scraped_count?: number;
    response_received_count?: number;
    elapsed_time_seconds: number;
    success_rate: number;
    http_success_rate: number;
    goal_achievement?: number | null;
    items_per_minute: number;
    pages_per_minute: number;
    time_per_page_seconds: number;
    "resources/peak_memory_bytes": number;
    "downloader/response_bytes": number;
    // Advanced metrics (optional, prefixed with advanced_metrics/)
    "advanced_metrics/items_duplicates"?: number;
    coverage?: {
        [key: string]: number;
        total_items: number;
        total_items_coverage: number;
    };
}

const formatElapsedTime = (totalSeconds: number): string => {
    if (!totalSeconds || totalSeconds <= 0) return "0:00:00";

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Helper function to get metric value with backward compatibility
 * Supports both old metric names and new advanced_metrics/ prefix
 */
const getMetricValue = (stats: StatsData | null, key: string, defaultValue = 0): number => {
    if (!stats) return defaultValue;

    // Try direct key first
    if (stats[key] !== undefined) {
        return Number(stats[key]) || defaultValue;
    }

    // Try with advanced_metrics/ prefix
    const advancedKey = `advanced_metrics/${key}`;
    if (stats[advancedKey] !== undefined) {
        return Number(stats[advancedKey]) || defaultValue;
    }

    return defaultValue;
};

const extractHttpStatusCodes = (statsData: StatsData): { [key: string]: number } => {
    const statusCodes: { [key: string]: number } = {};

    Object.keys(statsData).forEach((key) => {
        const match = key.match(/^downloader\/response_status_count\/(\d+)$/);
        if (match) {
            const statusCode = match[1];
            statusCodes[statusCode] = Number(statsData[key]) || 0;
        }
    });

    return statusCodes;
};

export function JobMetrics({ projectId, spiderId, jobId, jobStatus }: JobMetricsProps) {
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState<StatsData | null>(null);

    const apiService = ApiService();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const requestParams: ApiProjectsSpidersJobsDataListRequest = {
                    pid: projectId,
                    sid: spiderId,
                    jid: jobId,
                    type: "stats",
                    page: 1,
                    pageSize: 1,
                };

                const response = await apiService.apiProjectsSpidersJobsDataList(requestParams);
                if (response.results && response.results.length > 0) {
                    const data = response.results[0] as StatsData;
                    const processedData: StatsData = {};
                    Object.entries(data).forEach(([key, value]) => {
                        const decodedKey = key.replace(/\\u002e/g, ".").replace(/\\u002f/g, "/");
                        processedData[decodedKey] = value;
                    });

                    setStatsData(processedData);
                }
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        // Si el job está corriendo, actualizar cada 5 segundos
        let interval: NodeJS.Timeout;
        if (jobStatus === "RUNNING") {
            interval = setInterval(fetchStats, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [projectId, spiderId, jobId, jobStatus]);

    const downloadMetrics = () => {
        if (!statsData) return;

        const metricsReport = {
            jobId: jobId,
            projectId: projectId,
            spiderId: spiderId,
            status: jobStatus,
            timestamp: new Date().toISOString(),
            metrics: {
                performance: {
                    itemsScraped: statsData["item_scraped_count"] || 0,
                    pagesProcessed: statsData["response_received_count"] || 0,
                    elapsedTimeSeconds: statsData["elapsed_time_seconds"] || 0,
                    successRate: statsData["success_rate"] || 0,
                    httpSuccessRate: statsData["http_success_rate"] || 0,
                    goalAchievement: statsData["goal_achievement"] || null,
                    itemsPerMinute: statsData["items_per_minute"] || 0,
                    pagesPerMinute: statsData["pages_per_minute"] || 0,
                    timePerPageSeconds: statsData["time_per_page_seconds"] || 0,
                    peakMemoryBytes: statsData["resources/peak_memory_bytes"] || 0,
                },
                httpResponses: extractHttpStatusCodes(statsData),
                downloads: {
                    responseBytes: statsData["downloader/response_bytes"] || 0,
                    requestCount: statsData["downloader/request_count"] || 0,
                },
                coverage: statsData.coverage || {},
                advancedMetrics: {
                    itemsDuplicates: getMetricValue(statsData, "items_duplicates"),
                    schemaValidation: {
                        percentage: getMetricValue(statsData, "schema_coverage/percentage"),
                        valid: getMetricValue(statsData, "schema_coverage/valid"),
                        checked: getMetricValue(statsData, "schema_coverage/checked"),
                    },
                },
                timeline: (() => {
                    const timeline: Array<{ interval: string; items: number }> = [];
                    for (let i = 0; i < 20; i++) {
                        // Timeline is a new feature - only in advanced_metrics
                        const timelineKey = `advanced_metrics/timeline/${i}/items`;
                        const intervalKey = `advanced_metrics/timeline/${i}/interval`;

                        if (statsData[timelineKey] !== undefined) {
                            timeline.push({
                                interval: String(statsData[intervalKey]) || `${i}-${i + 1}m`,
                                items: Number(statsData[timelineKey]),
                            });
                        }
                    }
                    return timeline;
                })(),
            },
        };

        const dataStr = JSON.stringify(metricsReport, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `job-${jobId}-metrics-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return <Spin />;
    }

    if (!statsData) {
        // If job is running, show a message indicating metrics will be available when job completes
        if (jobStatus === "RUNNING" || jobStatus === "IN_QUEUE" || jobStatus === "WAITING") {
            return (
                <Content className="space-y-4 mt-8">
                    {/* Metrics Header */}
                    <Row justify="space-between" align="middle" className="mb-6">
                        <Col>
                            <Text className="text-estela-black-medium font-medium text-xl">Job Metrics</Text>
                        </Col>
                    </Row>
                    <Content className="text-center py-12">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                <span className="text-2xl">📊</span>
                            </div>
                            <div>
                                <Text className="text-lg font-medium text-estela-black-full block">
                                    Metrics will be available when the job completes
                                </Text>
                                <Text className="text-sm text-estela-black-medium">Current status: {jobStatus}</Text>
                            </div>
                        </div>
                    </Content>
                </Content>
            );
        }

        // For completed jobs without stats data
        return (
            <Content className="space-y-4 mt-8">
                {/* Metrics Header */}
                <Row justify="space-between" align="middle" className="mb-6">
                    <Col>
                        <Text className="text-estela-black-medium font-medium text-xl">Job Metrics</Text>
                    </Col>
                </Row>
                <Content className="text-center py-8">
                    <Text className="text-estela-black-medium">No metrics data available</Text>
                </Content>
            </Content>
        );
    }

    // Extract metrics from the actual stats response
    const itemsScraped = Number(statsData["item_scraped_count"]) || 0;
    const pagesProcessed = Number(statsData["response_received_count"]) || 0;
    const elapsedTimeSeconds = Number(statsData["elapsed_time_seconds"]) || 0;
    const successRate = Number(statsData["success_rate"]) || 0;
    const httpSuccessRate = Number(statsData["http_success_rate"]) || 0;
    const goalAchievement =
        statsData["goal_achievement"] !== undefined && statsData["goal_achievement"] !== null
            ? Number(statsData["goal_achievement"])
            : null;
    const itemsPerMinute = Number(statsData["items_per_minute"]) || 0;
    const pagesPerMinute = Number(statsData["pages_per_minute"]) || 0;
    const timePerPageSeconds = Number(statsData["time_per_page_seconds"]) || 0;
    const peakMemoryBytes = Number(statsData["resources/peak_memory_bytes"]) || 0;
    const responseBytes = Number(statsData["downloader/response_bytes"]) || 0;

    const statusCodes = extractHttpStatusCodes(statsData);

    const successCodes: { [key: string]: number } = {};
    const errorCodes: { [key: string]: number } = {};

    Object.entries(statusCodes).forEach(([code, count]) => {
        const codeNum = parseInt(code);
        if (codeNum >= 200 && codeNum < 400) {
            successCodes[code] = count;
        } else if (codeNum >= 400) {
            errorCodes[code] = count;
        }
    });

    // Calculate total errors and successes
    const totalErrors = Object.values(errorCodes).reduce((sum, count) => sum + count, 0);
    const totalSuccess = Object.values(successCodes).reduce((sum, count) => sum + count, 0);

    // Retry reasons - dynamic from stats
    const retryReasonsData: Array<{
        reason: string;
        count: number;
        percentage: string;
        description: string;
    }> = [];

    Object.keys(statsData).forEach((key) => {
        const match = key.match(/^retry\/reason_count\/(.+)$/);
        if (match) {
            const reason = match[1];
            const count = Number(statsData[key]) || 0;

            if (count > 0) {
                const totalRetries = Number(statsData["retry/count"]) || count;
                const percentage = totalRetries > 0 ? ((count / totalRetries) * 100).toFixed(1) + "%" : "0%";

                // Decode reason (handle escaped characters)
                const decodedReason =
                    reason
                        .replace(/\\u002e/g, ".")
                        .replace(/\\u002f/g, "/")
                        .split(".")
                        .pop() || reason;

                const descriptions: { [key: string]: string } = {
                    TimeoutError: "Request timed out - server took too long to respond",
                    ConnectionRefusedError: "Server refused the connection",
                    DNSLookupError: "DNS lookup failed - domain not found",
                    ResponseNeverReceived: "Server did not respond or connection was closed",
                    ConnectionLost: "Connection was lost during the request",
                };

                retryReasonsData.push({
                    reason: decodedReason,
                    count: count,
                    percentage: percentage,
                    description: descriptions[decodedReason] || "Network or connection error",
                });
            }
        }
    });

    console.log("=== DEBUG JOB METRICS ===");
    console.log("jobStatus:", jobStatus);
    console.log("statusCodes:", statusCodes);
    console.log("successCodes:", successCodes);
    console.log("errorCodes:", errorCodes);
    console.log("totalSuccess:", totalSuccess);
    console.log("totalErrors:", totalErrors);
    console.log("successRate:", successRate);
    console.log("httpSuccessRate:", httpSuccessRate);
    console.log("goalAchievement:", goalAchievement);
    console.log("retryReasonsData:", retryReasonsData);
    console.log("========================");

    const getStatusColor = () => {
        if (successRate >= 90) return "green";
        if (successRate >= 70) return "blue";
        if (successRate >= 50) return "yellow";
        return "red";
    };

    const statusColor = getStatusColor();

    const getStatusText = () => {
        if (successRate >= 90) return "Completed Successfully";
        if (successRate >= 70) return "Completed with Warnings";
        if (successRate >= 50) return "Below Target";
        return "Critical Error";
    };

    const statusText = getStatusText();

    const httpLabels = Object.keys(statusCodes).map((code) => {
        const codeNum = parseInt(code);
        if (code === "200") return "200 OK";
        if (code === "301") return "301 Redirect";
        if (code === "404") return "404 Not Found";
        if (code === "403") return "403 Forbidden";
        if (code === "500") return "500 Server Error";
        if (code === "503") return "503 Unavailable";
        if (codeNum >= 200 && codeNum < 300) return `${code} Success`;
        if (codeNum >= 300 && codeNum < 400) return `${code} Redirect`;
        if (codeNum >= 400 && codeNum < 500) return `${code} Client Error`;
        if (codeNum >= 500) return `${code} Server Error`;
        return `${code}`;
    });

    const httpValues = Object.values(statusCodes);

    const httpColors = Object.keys(statusCodes).map((code) => {
        const codeNum = parseInt(code);
        if (codeNum >= 200 && codeNum < 300) return "#10B981";
        if (codeNum >= 300 && codeNum < 400) return "#3B82F6";
        if (codeNum >= 400 && codeNum < 500) return "#F59E0B";
        if (codeNum >= 500) return "#EF4444";
        return "#6B7280";
    });

    const httpResponseData = {
        labels: httpLabels,
        datasets: [
            {
                label: "Count",
                data: httpValues,
                backgroundColor: httpColors,
                borderWidth: 0,
                borderRadius: 8,
            },
        ],
    };

    const timelineData: number[] = [];
    const timelineLabels: string[] = [];

    for (let i = 0; i < 20; i++) {
        const timelineKey = `advanced_metrics/timeline/${i}/items`;
        const intervalKey = `advanced_metrics/timeline/${i}/interval`;

        if (statsData[timelineKey] !== undefined) {
            timelineData.push(Number(statsData[timelineKey]));
            timelineLabels.push(String(statsData[intervalKey]) || `${i}-${i + 1}m`);
        }
    }

    if (timelineData.length === 0 && (jobStatus === "RUNNING" || jobStatus === "IN_QUEUE" || jobStatus === "WAITING")) {
        timelineData.push(0);
        timelineLabels.push("0-1m");
    }

    const scrapingSpeedData = {
        labels: timelineLabels.length > 0 ? timelineLabels : ["No data"],
        datasets: [
            {
                label: "Items Processed",
                data: timelineData.length > 0 ? timelineData : [0],
                borderColor: "#3B82F6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
        ],
    };

    const fieldsData: Array<{ name: string; coverage: number; complete: number; empty: number }> = [];

    if (statsData.coverage) {
        const coverage = statsData.coverage;
        const totalItems = coverage.total_items || itemsScraped;

        // Extract all field coverage data
        Object.keys(coverage).forEach((key) => {
            // Skip non-field keys
            if (key === "total_items" || key === "total_items_coverage") return;

            // Look for field_count and coverage pairs
            if (key.endsWith("_field_count")) {
                const fieldName = key.replace("_field_count", "");
                const coverageKey = `${fieldName}_coverage`;

                const fieldCount = Number(coverage[key]) || 0;
                const fieldCoverage = Number(coverage[coverageKey]) || 0;
                const empty = totalItems - fieldCount;

                if (fieldCount > 0 || fieldCoverage > 0) {
                    fieldsData.push({
                        name: fieldName,
                        coverage: fieldCoverage,
                        complete: fieldCount,
                        empty: empty > 0 ? empty : 0,
                    });
                }
            }
        });
    }

    fieldsData.sort((a, b) => {
        if (b.coverage !== a.coverage) {
            return b.coverage - a.coverage;
        }
        return b.complete - a.complete;
    });

    const retryColumns = [
        { title: "Reason", dataIndex: "reason", key: "reason" },
        { title: "Count", dataIndex: "count", key: "count" },
        { title: "Percentage", dataIndex: "percentage", key: "percentage" },
        { title: "Description", dataIndex: "description", key: "description" },
    ];

    return (
        <Content className="space-y-6 mt-4">
            {/* Header with Download Button */}
            <Row justify="end" align="middle">
                <Col>
                    <Button
                        onClick={downloadMetrics}
                        icon={<Export className="h-4 w-4 mr-2" />}
                        size="middle"
                        className="flex items-center stroke-gray-600 border-gray-200 bg-white text-gray-700 hover:text-gray-900 text-sm hover:border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm"
                    >
                        Export
                    </Button>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col flex="1" style={{ minWidth: "200px" }}>
                    <Card
                        className="border-0 shadow-sm hover:shadow-md transition-shadow"
                        style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <div>
                            <Text className="text-sm text-gray-500 block mb-1">Status</Text>
                            <Text
                                className={`text-2xl font-semibold ${
                                    statsData["status"] === "running"
                                        ? "text-blue-600"
                                        : statusColor === "green"
                                        ? "text-green-600"
                                        : statusColor === "blue"
                                        ? "text-blue-600"
                                        : statusColor === "yellow"
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                }`}
                            >
                                {statsData["status"] === "running" ? "Running" : statusText}
                            </Text>
                        </div>
                    </Card>
                </Col>
                <Col flex="1" style={{ minWidth: "200px" }}>
                    <Card
                        className="border-0 shadow-sm hover:shadow-md transition-shadow"
                        style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <Text className="text-sm text-gray-500 block mb-1">Items Scraped</Text>
                                <Text className="text-3xl font-semibold text-gray-900">
                                    {itemsScraped.toLocaleString()}
                                </Text>
                            </div>
                            <div
                                className={`w-2 h-2 rounded-full mt-2 ${
                                    statusColor === "green"
                                        ? "bg-green-400"
                                        : statusColor === "blue"
                                        ? "bg-blue-400"
                                        : statusColor === "yellow"
                                        ? "bg-yellow-400"
                                        : "bg-red-400"
                                }`}
                            ></div>
                        </div>
                    </Card>
                </Col>
                <Col flex="1" style={{ minWidth: "200px" }}>
                    <Card
                        className="border-0 shadow-sm hover:shadow-md transition-shadow"
                        style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <div>
                            <Text className="text-sm text-gray-500 block mb-1">HTTP Success Rate</Text>
                            <Text className="text-3xl font-semibold text-gray-900">{httpSuccessRate.toFixed(1)}%</Text>
                        </div>
                    </Card>
                </Col>
                <Col flex="1" style={{ minWidth: "200px" }}>
                    <Card
                        className="border-0 shadow-sm hover:shadow-md transition-shadow"
                        style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <div>
                            <Text className="text-sm text-gray-500 block mb-1">Goal Achievement</Text>
                            <Text className="text-3xl font-semibold text-gray-900">
                                {goalAchievement !== null ? `${goalAchievement.toFixed(1)}%` : "N/A"}
                            </Text>
                        </div>
                    </Card>
                </Col>
                <Col flex="1" style={{ minWidth: "200px" }}>
                    <Card
                        className="border-0 shadow-sm hover:shadow-md transition-shadow"
                        style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <div>
                            <Text className="text-sm text-gray-500 block mb-1">Duration</Text>
                            <Text className="text-3xl font-semibold text-gray-900">
                                {elapsedTimeSeconds > 0 ? formatElapsedTime(elapsedTimeSeconds) : "0:00:00"}
                            </Text>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Performance Metrics */}
            <Card
                className="border-0 shadow-sm"
                style={{ borderRadius: "12px", backgroundColor: "#FFFFFF" }}
                bodyStyle={{ padding: "28px" }}
            >
                <Text className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6 block">
                    Performance
                </Text>
                <Row className="grid grid-cols-5 gap-6">
                    <Col className="text-left">
                        <Text className="text-sm text-gray-500 block mb-2">Pages</Text>
                        <Text className="text-2xl font-semibold text-gray-900">{pagesProcessed.toLocaleString()}</Text>
                    </Col>
                    <Col className="text-left">
                        <Text className="text-sm text-gray-500 block mb-2">Items/Min</Text>
                        <Text className="text-2xl font-semibold text-gray-900">{itemsPerMinute.toFixed(1)}</Text>
                    </Col>
                    <Col className="text-left">
                        <Text className="text-sm text-gray-500 block mb-2">Pages/Min</Text>
                        <Text className="text-2xl font-semibold text-gray-900">{pagesPerMinute.toFixed(2)}</Text>
                    </Col>
                    <Col className="text-left">
                        <Text className="text-sm text-gray-500 block mb-2">Time/Page</Text>
                        <Text className="text-2xl font-semibold text-gray-900">{timePerPageSeconds.toFixed(2)}s</Text>
                    </Col>
                    <Col className="text-left">
                        <Text className="text-sm text-gray-500 block mb-2">Peak Memory</Text>
                        <Text className="text-2xl font-semibold text-gray-900">
                            {formatBytes(peakMemoryBytes).quantity} {formatBytes(peakMemoryBytes).type}
                        </Text>
                    </Col>
                </Row>
            </Card>

            <Row gutter={[16, 16]}>
                <Col span={12}>
                    <Card
                        className="border-0 shadow-sm h-80"
                        style={{ borderRadius: "12px" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <Text className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4 block">
                            HTTP Responses
                        </Text>
                        <div className="h-56">
                            <Bar
                                data={httpResponseData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        x: {
                                            grid: { display: false },
                                            ticks: { color: "#6B7280" },
                                        },
                                        y: {
                                            grid: { color: "#F3F4F6", borderDash: [3, 3] },
                                            ticks: { color: "#6B7280" },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </Card>
                </Col>

                {/* Error Distribution - Using Retry Reasons */}
                <Col span={12}>
                    <Card
                        className="border-0 shadow-sm h-80"
                        style={{ borderRadius: "12px" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <Text className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4 block">
                            Retry Errors
                        </Text>
                        <Row>
                            <Col span={12} className="h-56">
                                <Doughnut
                                    data={{
                                        labels:
                                            retryReasonsData.length > 0
                                                ? retryReasonsData.map((item) => item.reason)
                                                : ["No errors"],
                                        datasets: [
                                            {
                                                data:
                                                    retryReasonsData.length > 0
                                                        ? retryReasonsData.map((item) => item.count)
                                                        : [1],
                                                backgroundColor:
                                                    retryReasonsData.length > 0
                                                        ? [
                                                              "#EF4444", // Red
                                                              "#F59E0B", // Orange
                                                              "#FBBF24", // Amber
                                                              "#F87171", // Light red
                                                              "#FB923C", // Light orange
                                                              "#FCD34D", // Light amber
                                                          ].slice(0, retryReasonsData.length)
                                                        : ["#e5e7eb"],
                                                borderWidth: 0,
                                            },
                                        ],
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                    }}
                                />
                            </Col>
                            <Col span={12} className="pl-4">
                                <div className="space-y-2 max-h-56 overflow-y-auto">
                                    {retryReasonsData.length > 0 ? (
                                        retryReasonsData.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between space-x-2">
                                                <div className="flex items-center space-x-2 flex-1">
                                                    <div
                                                        className="w-3 h-3 rounded flex-shrink-0"
                                                        style={{
                                                            backgroundColor: [
                                                                "#EF4444",
                                                                "#F59E0B",
                                                                "#FBBF24",
                                                                "#F87171",
                                                                "#FB923C",
                                                                "#FCD34D",
                                                            ][index % 6],
                                                        }}
                                                    ></div>
                                                    <Text className="text-sm truncate">{item.reason}</Text>
                                                </div>
                                                <Text className="text-sm font-medium text-gray-600 ml-2">
                                                    {item.count}
                                                </Text>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 bg-gray-300 rounded"></div>
                                            <Text className="text-sm">No errors recorded</Text>
                                        </div>
                                    )}
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                {/* Scraping Speed */}
                <Col span={24}>
                    <Card
                        className="border-0 shadow-sm h-80"
                        style={{ borderRadius: "12px" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <Text className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4 block">
                            Scraping Timeline
                        </Text>
                        <div className="h-56">
                            <Line
                                data={scrapingSpeedData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        x: {
                                            grid: { display: false },
                                            ticks: { color: "#6B7280", font: { size: 11 } },
                                        },
                                        y: {
                                            grid: { color: "#F3F4F6", borderDash: [3, 3] },
                                            ticks: { color: "#6B7280" },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Scraped Fields Completeness */}
            <Row gutter={[16, 16]}>
                {fieldsData.length > 0 && (
                    <Col flex="auto">
                        <Card
                            className="border-0 shadow-sm"
                            style={{ borderRadius: "12px" }}
                            bodyStyle={{ padding: "28px" }}
                        >
                            <Text className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6 block">
                                Field Coverage
                            </Text>
                            <div className="space-y-4">
                                {fieldsData.map((field, index) => (
                                    <Row key={index} className="items-center">
                                        <Col span={4}>
                                            <Text className="text-sm text-gray-700 font-medium">{field.name}</Text>
                                        </Col>
                                        <Col span={16}>
                                            <Progress
                                                percent={field.coverage}
                                                strokeColor="#10B981"
                                                showInfo={false}
                                                size="small"
                                                trailColor="#F3F4F6"
                                            />
                                        </Col>
                                        <Col span={4} className="text-right">
                                            <Text className="text-sm text-gray-600">{field.coverage.toFixed(1)}%</Text>
                                        </Col>
                                    </Row>
                                ))}
                            </div>
                        </Card>
                    </Col>
                )}
                <Col flex="0 0 auto" style={{ width: fieldsData.length > 0 ? "350px" : "100%" }}>
                    <Card
                        className="border-0 shadow-sm"
                        style={{ borderRadius: "12px" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <Text className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4 block">
                            Additional Stats
                        </Text>
                        <div className="space-y-4 mt-4">
                            <div className="px-3 py-2 bg-gray-50 rounded-lg">
                                <Text className="text-sm text-gray-500 block mb-1">Retries</Text>
                                <Text className="text-2xl font-semibold text-gray-900">
                                    {statsData["retry/count"] || 0}
                                </Text>
                            </div>
                            <div className="px-3 py-2 bg-gray-50 rounded-lg">
                                <Text className="text-sm text-gray-500 block mb-1">Duplicates</Text>
                                <Text className="text-2xl font-semibold text-gray-900">
                                    {getMetricValue(statsData, "items_duplicates")}
                                </Text>
                            </div>
                            <div className="px-3 py-2 bg-gray-50 rounded-lg">
                                <Text className="text-sm text-gray-500 block mb-1">Timeouts</Text>
                                <Text className="text-2xl font-semibold text-gray-900">
                                    {statsData["downloader/exception_type_count/twisted.internet.error.TimeoutError"] ||
                                        0}
                                </Text>
                            </div>
                            <div className="px-3 py-2 bg-gray-50 rounded-lg">
                                <Text className="text-sm text-gray-500 block mb-1">Downloaded</Text>
                                <Text className="text-2xl font-semibold text-gray-900">
                                    {formatBytes(responseBytes).quantity} {formatBytes(responseBytes).type}
                                </Text>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Retry Reasons Breakdown */}
            {retryReasonsData.length > 0 && (
                <Card className="border-0 shadow-sm" style={{ borderRadius: "12px" }} bodyStyle={{ padding: "28px" }}>
                    <Text className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6 block">
                        Error Breakdown
                    </Text>
                    <Table
                        dataSource={retryReasonsData}
                        columns={retryColumns}
                        pagination={false}
                        size="middle"
                        rowKey="reason"
                        className="modern-table"
                    />
                </Card>
            )}
        </Content>
    );
}
