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
    [key: string]: any;
    "custom/items_scraped": number;
    "custom/pages_processed": number;
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
    coverage: {
        [key: string]: any;
        total_items: number;
        total_items_coverage: number;
    };
}

export function JobMetrics({ projectId, spiderId, jobId, jobStatus }: JobMetricsProps) {
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState<StatsData | null>(null);

    const apiService = ApiService();

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
                    itemsScraped: statsData["custom/items_scraped"] || 0,
                    pagesProcessed: statsData["custom/pages_processed"] || 0,
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
                timeline: (() => {
                    const timeline: Array<{ interval: string; items: number }> = [];
                    for (let i = 0; i < 20; i++) {
                        const timelineKey = `timeline/${i}/items`;
                        const intervalKey = `timeline/${i}/interval`;
                        if (statsData[timelineKey] !== undefined) {
                            timeline.push({
                                interval: statsData[intervalKey] || `${i}-${i + 1}m`,
                                items: statsData[timelineKey],
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
    }, [projectId, spiderId, jobId]);

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
    const itemsScraped = statsData["custom/items_scraped"] || 0;
    const pagesProcessed = statsData["custom/pages_processed"] || 0;
    const elapsedTimeSeconds = statsData["elapsed_time_seconds"] || 0;
    const itemsPerMinute = statsData["items_per_minute"] || 0;
    const pagesPerMinute = statsData["pages_per_minute"] || 0;
    const timePerPageSeconds = statsData["time_per_page_seconds"] || 0;
    const peakMemoryBytes = statsData["resources/peak_memory_bytes"] || 0;
    const responseBytes = statsData["downloader/response_bytes"] || 0;

    // Status codes for HTTP Response Distribution
    const status200Count = statsData["downloader/response_status_count/200"] || 0;
    const status403Count = statsData["downloader/response_status_count/403"] || 0;
    const status404Count = statsData["downloader/response_status_count/404"] || 0;

    const httpResponseData = {
        labels: ["200 OK", "403 Error"],
        datasets: [
            {
                label: "Count",
                data: [status200Count, status403Count],
                backgroundColor: ["#22c55e", "#f59e0b"],
                borderWidth: 0,
                borderRadius: 4,
            },
        ],
    };

    // Top 5 Errors using actual data
    const errorCounts = [
        { label: "403 Forbidden", count: status403Count, color: "#ef4444" },
        { label: "404 Not Found", count: status404Count, color: "#f59e0b" },
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

    // Timeline data for scraping speed
    const timelineData: number[] = [];
    const timelineLabels: string[] = [];

    // Extract timeline data from the stats response
    for (let i = 0; i < 20; i++) {
        const timelineKey = `timeline/${i}/items`;
        const intervalKey = `timeline/${i}/interval`;
        if (statsData[timelineKey] !== undefined) {
            timelineData.push(statsData[timelineKey]);
            timelineLabels.push(statsData[intervalKey] || `${i}-${i + 1}m`);
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
                borderColor: "#ef4444",
                backgroundColor: "transparent",
                borderWidth: 2,
                tension: 0.4,
            },
        ],
    };

    // Coverage data from the actual coverage object
    const coverage = statsData.coverage || {};
    const fieldsData: Array<{ name: string; coverage: number; complete: number; empty: number }> = [];

    // Extract field coverage data
    Object.keys(coverage).forEach((key) => {
        if (key.endsWith("_coverage") && !key.startsWith("total_")) {
            const fieldName = key.replace("_coverage", "");
            const completeKey = `schema_coverage/fields/${fieldName}/complete`;
            const emptyKey = `schema_coverage/fields/${fieldName}/empty`;

            fieldsData.push({
                name: fieldName,
                coverage: coverage[key] || 0,
                complete: statsData[completeKey] || 0,
                empty: statsData[emptyKey] || 0,
            });
        }
    });

    // Retry reasons using actual error data
    const totalErrors = status403Count + status404Count;
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
        <Content className="space-y-4 mt-8">
            {/* Metrics Header */}
            <Row justify="space-between" align="middle" className="mb-6">
                <Col>
                    <Text className="text-estela-black-medium font-medium text-xl">Job Metrics</Text>
                </Col>
                <Col>
                    <Button
                        onClick={downloadMetrics}
                        icon={<Export className="h-4 w-4 mr-2" />}
                        size="large"
                        className="flex items-center stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                    >
                        Download Metrics
                    </Button>
                </Col>
            </Row>

            {/* Overall Status */}
            <Card className="border border-red-200 bg-red-50" style={{ borderRadius: "8px" }}>
                <Row className="flex items-center justify-between">
                    <Col className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                            <span className="text-white text-sm">✕</span>
                        </div>
                        <Text className="font-semibold text-lg">Overall Status</Text>
                        <Text className="text-red-600">Critical Error</Text>
                    </Col>
                    <Col className="flex space-x-8">
                        <div className="text-center">
                            <Text className="text-2xl font-bold">{itemsScraped}</Text>
                            <Text className="text-sm text-gray-600 block">Items Scraped</Text>
                        </div>
                        <div className="text-center">
                            <Text className="text-2xl font-bold">{durationToString(elapsedTimeSeconds)}</Text>
                            <Text className="text-sm text-gray-600 block">Duration</Text>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Performance Metrics */}
            <Card className="bg-white" style={{ borderRadius: "8px" }}>
                <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                        <span className="text-white text-sm">📊</span>
                    </div>
                    <Text className="font-semibold text-lg">Performance Metrics</Text>
                </div>
                <Row className="grid grid-cols-5 gap-4">
                    <Col className="text-center">
                        <Text className="text-2xl font-bold">{pagesProcessed}</Text>
                        <Text className="text-sm text-gray-600 block">Pages Processed</Text>
                    </Col>
                    <Col className="text-center">
                        <Text className="text-2xl font-bold">{itemsPerMinute.toFixed(1)}</Text>
                        <Text className="text-sm text-gray-600 block">Items/Minute</Text>
                    </Col>
                    <Col className="text-center">
                        <Text className="text-2xl font-bold">{pagesPerMinute.toFixed(2)}</Text>
                        <Text className="text-sm text-gray-600 block">Pages/Minute</Text>
                    </Col>
                    <Col className="text-center">
                        <Text className="text-2xl font-bold">{timePerPageSeconds.toFixed(2)}s</Text>
                        <Text className="text-sm text-gray-600 block">Time/Page</Text>
                    </Col>
                    <Col className="text-center">
                        <Text className="text-2xl font-bold">
                            {formatBytes(peakMemoryBytes).quantity} {formatBytes(peakMemoryBytes).type}
                        </Text>
                        <Text className="text-sm text-gray-600 block">Peak Memory</Text>
                    </Col>
                </Row>
            </Card>

            <Row gutter={16}>
                {/* HTTP Response Distribution */}
                <Col span={12}>
                    <Card className="bg-white h-80" style={{ borderRadius: "8px" }}>
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-6 h-6 bg-teal-500 rounded flex items-center justify-center">
                                <span className="text-white text-sm">📈</span>
                            </div>
                            <Text className="font-semibold text-lg">HTTP Response Distribution</Text>
                        </div>
                        <div className="h-56">
                            <Bar
                                data={httpResponseData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        x: { title: { display: true, text: "Response Code" } },
                                        y: { title: { display: true, text: "Count" } },
                                    },
                                }}
                            />
                        </div>
                    </Card>
                </Col>

                {/* Top 5 Errors */}
                <Col span={12}>
                    <Card className="bg-white h-80" style={{ borderRadius: "8px" }}>
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center">
                                <span className="text-white text-sm">⚠</span>
                            </div>
                            <Text className="font-semibold text-lg">Top 5 Errors</Text>
                        </div>
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

            <Row gutter={16}>
                {/* Scraping Speed */}
                <Col span={16}>
                    <Card className="bg-white h-80" style={{ borderRadius: "8px" }}>
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                                <span className="text-white text-sm">📊</span>
                            </div>
                            <Text className="font-semibold text-lg">Scraping Speed (Items per Interval)</Text>
                        </div>
                        <div className="h-56">
                            <Line
                                data={scrapingSpeedData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        x: { title: { display: true, text: "Time Interval" } },
                                        y: { title: { display: true, text: "Items Processed" } },
                                    },
                                }}
                            />
                        </div>
                    </Card>
                </Col>

                {/* Additional Metrics */}
                <Col span={8}>
                    <Card className="bg-white h-80" style={{ borderRadius: "8px" }}>
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-6 h-6 bg-teal-500 rounded flex items-center justify-center">
                                <span className="text-white text-sm">📋</span>
                            </div>
                            <Text className="font-semibold text-lg">Additional Metrics</Text>
                        </div>
                        <div className="space-y-4">
                            <div className="text-center">
                                <Text className="text-2xl font-bold">{statsData["custom/items_duplicates"] || 0}</Text>
                                <Text className="text-sm text-gray-600 block">Retries</Text>
                            </div>
                            <div className="text-center">
                                <Text className="text-2xl font-bold">{statsData["custom/items_duplicates"] || 0}</Text>
                                <Text className="text-sm text-gray-600 block">Duplicates</Text>
                            </div>
                            <div className="text-center">
                                <Text className="text-2xl font-bold">{statsData["scheduler/dequeued"] || 0}</Text>
                                <Text className="text-sm text-gray-600 block">Timeouts</Text>
                            </div>
                            <div className="text-center">
                                <Text className="text-2xl font-bold">
                                    {formatBytes(responseBytes).quantity} {formatBytes(responseBytes).type}
                                </Text>
                                <Text className="text-sm text-gray-600 block">Downloaded</Text>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Scraped Fields Completeness */}
            {fieldsData.length > 0 && (
                <Card className="bg-white" style={{ borderRadius: "8px" }}>
                    <div className="flex items-center space-x-2 mb-4">
                        <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                        </div>
                        <Text className="font-semibold text-lg">Scraped Fields Completeness</Text>
                    </div>
                    <div className="space-y-2">
                        {fieldsData.map((field, index) => (
                            <Row key={index} className="items-center">
                                <Col span={4}>
                                    <Text className="text-sm">{field.name}</Text>
                                </Col>
                                <Col span={16}>
                                    <Progress
                                        percent={field.coverage}
                                        strokeColor="#22c55e"
                                        showInfo={false}
                                        size="small"
                                    />
                                </Col>
                                <Col span={4} className="text-right">
                                    <Text className="text-sm">{field.complete}</Text>
                                </Col>
                            </Row>
                        ))}
                    </div>
                </Card>
            )}

            {/* Retry Reasons Breakdown */}
            <Card className="bg-white" style={{ borderRadius: "8px" }}>
                <div className="flex items-center space-x-2 mb-4">
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                        <span className="text-white text-sm">🔄</span>
                    </div>
                    <Text className="font-semibold text-lg">Retry Reasons Breakdown</Text>
                </div>
                <Table
                    dataSource={retryReasonsData}
                    columns={retryColumns}
                    pagination={false}
                    size="small"
                    rowKey="reason"
                />
            </Card>
        </Content>
    );
}
