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
import { ApiProjectsSpidersJobsDataListRequest } from "../../services/api";
import { formatBytes, durationToString } from "../../utils";
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
    items_per_minute: number;
    pages_per_minute: number;
    time_per_page_seconds: number;
    "resources/peak_memory_bytes": number;
    "downloader/response_status_count/200"?: number;
    "downloader/response_status_count/403"?: number;
    "downloader/response_status_count/404"?: number;
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
                    setStatsData(data);
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
                    itemsPerMinute: statsData["items_per_minute"] || 0,
                    pagesPerMinute: statsData["pages_per_minute"] || 0,
                    timePerPageSeconds: statsData["time_per_page_seconds"] || 0,
                    peakMemoryBytes: statsData["resources/peak_memory_bytes"] || 0,
                },
                httpResponses: {
                    status200: statsData["downloader/response_status_count/200"] || 0,
                    status403: statsData["downloader/response_status_count/403"] || 0,
                    status404: statsData["downloader/response_status_count/404"] || 0,
                },
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
    const itemsPerMinute = Number(statsData["items_per_minute"]) || 0;
    const pagesPerMinute = Number(statsData["pages_per_minute"]) || 0;
    const timePerPageSeconds = Number(statsData["time_per_page_seconds"]) || 0;
    const peakMemoryBytes = Number(statsData["resources/peak_memory_bytes"]) || 0;
    const responseBytes = Number(statsData["downloader/response_bytes"]) || 0;

    // Status codes for HTTP Response Distribution
    const status200Count = Number(statsData["downloader/response_status_count/200"]) || 0;
    const status403Count = Number(statsData["downloader/response_status_count/403"]) || 0;
    const status404Count = Number(statsData["downloader/response_status_count/404"]) || 0;
    const status301Count = Number(statsData["downloader/response_status_count/301"]) || 0;

    // Calcular errores y éxitos
    const totalErrors = status403Count + status404Count;
    const successCount = status200Count + status301Count;

    console.log("=== DEBUG JOB METRICS ===");
    console.log("jobStatus:", jobStatus);
    console.log("status200Count:", status200Count);
    console.log("status301Count:", status301Count);
    console.log("status404Count:", status404Count);
    console.log("successCount:", successCount);
    console.log("totalErrors:", totalErrors);
    console.log("elapsedTimeSeconds:", elapsedTimeSeconds);
    console.log("elapsedTimeSeconds type:", typeof elapsedTimeSeconds);
    console.log("durationToString result:", durationToString(elapsedTimeSeconds));
    console.log("durationToString result 2:", formatElapsedTime(elapsedTimeSeconds));
    console.log("========================");

    const getStatusColor = () => {
        if (jobStatus === "COMPLETED") {
            return totalErrors === 0 ? "green" : "blue";
        }
        if (jobStatus === "RUNNING" || jobStatus === "running") {
            return "green";
        }
        if (jobStatus === "WAITING" || jobStatus === "IN_QUEUE") {
            return "yellow";
        }
        return "red"; // ERROR o cualquier otro
    };

    const statusColor = getStatusColor();

    const getStatusText = () => {
        if (jobStatus === "COMPLETED") {
            return totalErrors === 0 ? "Completed Successfully" : "Completed with Errors";
        }
        if (jobStatus === "RUNNING" || jobStatus === "running") {
            return "Running";
        }
        if (jobStatus === "WAITING" || jobStatus === "IN_QUEUE") {
            return "Waiting";
        }
        return "Error";
    };

    const statusText = getStatusText();

    const httpResponseData = {
        labels: ["200 OK", "403 Error"],
        datasets: [
            {
                label: "Count",
                data: [status200Count, status403Count],
                backgroundColor: ["#10B981", "#F59E0B"],
                borderWidth: 0,
                borderRadius: 8,
            },
        ],
    };

    // Top 5 Errors using actual data
    const errorCounts = [
        { label: "403 Forbidden", count: status403Count, color: "#EF4444" },
        { label: "404 Not Found", count: status404Count, color: "#F59E0B" },
    ].filter((error) => error.count > 0);

    // If no errors, show placeholder data
    const hasErrors = errorCounts.length > 0;
    const errorData = {
        labels: hasErrors ? errorCounts.map((e) => e.label) : ["No errors"],
        datasets: [
            {
                data: hasErrors ? errorCounts.map((e) => e.count) : [1],
                backgroundColor: hasErrors ? errorCounts.map((e) => e.color) : ["#e5e7eb"],
                borderWidth: 0,
            },
        ],
    };

    // Timeline data for scraping speed (new feature - advanced metrics only)
    const timelineData: number[] = [];
    const timelineLabels: string[] = [];

    // Extract timeline data from advanced_metrics
    for (let i = 0; i < 20; i++) {
        const timelineKey = `advanced_metrics/timeline/${i}/items`;
        const intervalKey = `advanced_metrics/timeline/${i}/interval`;

        if (statsData[timelineKey] !== undefined) {
            timelineData.push(Number(statsData[timelineKey]));
            timelineLabels.push(String(statsData[intervalKey]) || `${i}-${i + 1}m`);
        }
    }

    // If no timeline data, create a placeholder for running jobs
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
    const fieldNames = new Set<string>();

    const totalItemsScraped = statsData["item_scraped_count"] || 0;

    // Extract field coverage from advanced_metrics
    Object.keys(statsData).forEach((key) => {
        const match = key.match(/^advanced_metrics\/schema_coverage\/fields\/([^\/]+)\/(complete|empty)$/);
        if (match) {
            fieldNames.add(match[1]);
        }
    });

    fieldNames.forEach((fieldName) => {
        const completeKey = `advanced_metrics/schema_coverage/fields/${fieldName}/complete`;
        const emptyKey = `advanced_metrics/schema_coverage/fields/${fieldName}/empty`;

        const complete = Number(statsData[completeKey]) || 0;
        const empty = Number(statsData[emptyKey]) || 0;

        let coverage = 100;
        let total = complete + empty;

        if (totalItemsScraped > 0) {
            if (empty === 0 && complete < totalItemsScraped) {
                coverage = (complete / totalItemsScraped) * 100;
                total = totalItemsScraped;
            } else if (total > 0) {
                coverage = (complete / total) * 100;
            }
        }

        if (complete > 0 || empty > 0) {
            fieldsData.push({
                name: fieldName,
                coverage: Math.round(coverage * 100) / 100,
                complete: complete,
                empty: empty,
            });
        }
    });

    fieldsData.sort((a, b) => {
        if (b.coverage !== a.coverage) {
            return b.coverage - a.coverage;
        }
        return b.complete - a.complete;
    });

    // Retry reasons using actual error data
    // const totalErrors = status403Count + status404Count;
    const retryReasonsData = [
        {
            reason: "403 Forbidden",
            count: status403Count,
            percentage: totalErrors > 0 ? ((status403Count / totalErrors) * 100).toFixed(1) + "%" : "0%",
            description: "Network or connection error",
        },
        {
            reason: "404 Not Found",
            count: status404Count,
            percentage: totalErrors > 0 ? ((status404Count / totalErrors) * 100).toFixed(1) + "%" : "0%",
            description: "Page or resource not found",
        },
    ].filter((reason) => reason.count > 0);

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

            {/* Key Metrics Cards */}
            <Row gutter={[16, 16]}>
                <Col span={8}>
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
                <Col span={8}>
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
                <Col span={8}>
                    <Card
                        className="border-0 shadow-sm hover:shadow-md transition-shadow"
                        style={{ borderRadius: "12px", backgroundColor: "#FAFAFA" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <div>
                            <Text className="text-sm text-gray-500 block mb-1">Status</Text>
                            <Text
                                className={`text-3xl font-semibold ${
                                    statusColor === "green"
                                        ? "text-green-600"
                                        : statusColor === "blue"
                                        ? "text-blue-600"
                                        : statusColor === "yellow"
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                }`}
                            >
                                {statusText}
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
                {/* HTTP Response Distribution */}
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

                {/* Top 5 Errors */}
                <Col span={12}>
                    <Card
                        className="border-0 shadow-sm h-80"
                        style={{ borderRadius: "12px" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <Text className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4 block">
                            Error Distribution
                        </Text>
                        <Row>
                            <Col span={12} className="h-56">
                                <Doughnut
                                    data={errorData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                    }}
                                />
                            </Col>
                            <Col span={12} className="pl-4">
                                <div className="space-y-2">
                                    {hasErrors ? (
                                        errorCounts.map((error, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <div
                                                    className="w-3 h-3 rounded"
                                                    style={{ backgroundColor: error.color }}
                                                ></div>
                                                <Text className="text-sm">{error.label}</Text>
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
                <Col span={16}>
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

                {/* Additional Metrics */}
                <Col span={8}>
                    <Card
                        className="border-0 shadow-sm h-80"
                        style={{ borderRadius: "12px" }}
                        bodyStyle={{ padding: "24px" }}
                    >
                        <Text className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4 block">
                            Additional Stats
                        </Text>
                        <div className="space-y-6 mt-4">
                            <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                <Text className="text-sm text-gray-500 block mb-1">Retries</Text>
                                <Text className="text-2xl font-semibold text-gray-900">
                                    {statsData["retry/count"] || 0}
                                </Text>
                            </div>
                            <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                <Text className="text-sm text-gray-500 block mb-1">Duplicates</Text>
                                <Text className="text-2xl font-semibold text-gray-900">
                                    {getMetricValue(statsData, "items_duplicates")}
                                </Text>
                            </div>
                            <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                <Text className="text-sm text-gray-500 block mb-1">Timeouts</Text>
                                <Text className="text-2xl font-semibold text-gray-900">
                                    {statsData["scheduler/dequeued"] || 0}
                                </Text>
                            </div>
                            <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                <Text className="text-sm text-gray-500 block mb-1">Downloaded</Text>
                                <Text className="text-2xl font-semibold text-gray-900">
                                    {formatBytes(responseBytes).quantity} {formatBytes(responseBytes).type}
                                </Text>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Scraped Fields Completeness */}
            {fieldsData.length > 0 && (
                <Card className="border-0 shadow-sm" style={{ borderRadius: "12px" }} bodyStyle={{ padding: "28px" }}>
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
            )}

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
