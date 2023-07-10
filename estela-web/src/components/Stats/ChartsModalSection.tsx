import React, { Component } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataset,
    ChartData,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { StatType } from "../../shared";
import { GetJobsStats } from "../../services";
import { Tabs } from "antd";
import "./ChartsSection.scss";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ChartsModalSectionProps {
    stats: GetJobsStats | GetJobsStats[];
    pages?: boolean;
    items?: boolean;
    runtime?: boolean;
    successRate?: boolean;
    statusCodes?: boolean;
    coverage?: boolean;
    logs?: boolean;
}

const setVal = ({ arr, val, index }: { arr: number[]; val: number; index: number }) => {
    arr.fill(val, index, index + 1);
    return arr;
};

export class ChartsModalSection extends Component<ChartsModalSectionProps, unknown> {
    datasetsGenerator = (statOption: StatType) => {
        const { stats } = this.props;
        if (Array.isArray(stats)) {
            if (statOption === StatType.PAGES)
                return [
                    {
                        label: "scraped",
                        data: [
                            stats.map((jobsStats) => jobsStats.stats?.pages.scrapedPages ?? 0).reduce((a, b) => a + b),
                            0,
                        ],
                        backgroundColor: "#32C3A4",
                    },
                    {
                        label: "missed",
                        data: [
                            0,
                            stats.map((jobsStats) => jobsStats.stats?.pages.missedPages ?? 0).reduce((a, b) => a + b),
                        ],
                        backgroundColor: "#A13764",
                    },
                ];
            if (statOption === StatType.ITEMS)
                return [
                    {
                        label: "items",
                        data: [stats.map((jobsStats) => jobsStats.stats?.itemsCount ?? 0).reduce((a, b) => a + b)],
                        backgroundColor: "#32C3A4",
                    },
                ];
            if (statOption === StatType.RUNTIME)
                return [
                    {
                        label: "runtime",
                        data: [stats.map((jobsStats) => jobsStats.stats?.runtime ?? 0).reduce((a, b) => a + b)],
                        backgroundColor: "#32C3A4",
                    },
                ];
            if (statOption === StatType.SUCCESS_RATE)
                return [
                    {
                        label: "Job success rate",
                        data: [
                            stats.map((jobsStats) => jobsStats.stats?.successRate ?? 0).reduce((a, b) => a + b) /
                                stats.length,
                        ],
                        backgroundColor: "#32C3A4",
                    },
                ];
            if (statOption === StatType.STATUS_CODE)
                return [
                    {
                        label: "200",
                        data: setVal({
                            arr: new Array(8).fill(0),
                            val: stats
                                .map((jobsStats) => jobsStats.stats?.statusCodes.status200 ?? 0)
                                .reduce((a, b) => a + b),
                            index: 0,
                        }),
                        backgroundColor: ["#32C3A4"],
                    },
                    {
                        label: "301",
                        data: setVal({
                            arr: new Array(8).fill(0),
                            val: stats
                                .map((jobsStats) => jobsStats.stats?.statusCodes.status301 ?? 0)
                                .reduce((a, b) => a + b),
                            index: 1,
                        }),
                        backgroundColor: "#D1A34F",
                    },
                    {
                        label: "302",
                        data: setVal({
                            arr: new Array(8).fill(0),
                            val: stats
                                .map((jobsStats) => jobsStats.stats?.statusCodes.status302 ?? 0)
                                .reduce((a, b) => a + b),
                            index: 2,
                        }),
                        backgroundColor: "#A13764",
                    },
                    {
                        label: "401",
                        data: setVal({
                            arr: new Array(8).fill(0),
                            val: stats
                                .map((jobsStats) => jobsStats.stats?.statusCodes.status401 ?? 0)
                                .reduce((a, b) => a + b),
                            index: 3,
                        }),
                        backgroundColor: "#3C7BC6",
                    },
                    {
                        label: "403",
                        data: setVal({
                            arr: new Array(8).fill(0),
                            val: stats
                                .map((jobsStats) => jobsStats.stats?.statusCodes.status403 ?? 0)
                                .reduce((a, b) => a + b),
                            index: 4,
                        }),
                        backgroundColor: "#7DC932",
                    },
                    {
                        label: "404",
                        data: setVal({
                            arr: new Array(8).fill(0),
                            val: stats
                                .map((jobsStats) => jobsStats.stats?.statusCodes.status404 ?? 0)
                                .reduce((a, b) => a + b),
                            index: 5,
                        }),
                        backgroundColor: "#FE9F99",
                    },
                    {
                        label: "429",
                        data: setVal({
                            arr: new Array(8).fill(0),
                            val: stats
                                .map((jobsStats) => jobsStats.stats?.statusCodes.status429 ?? 0)
                                .reduce((a, b) => a + b),
                            index: 6,
                        }),
                        backgroundColor: "#E7E255",
                    },
                    {
                        label: "500",
                        data: setVal({
                            arr: new Array(8).fill(0),
                            val: stats
                                .map((jobsStats) => jobsStats.stats?.statusCodes.status500 ?? 0)
                                .reduce((a, b) => a + b),
                            index: 7,
                        }),
                        backgroundColor: "#6C757D",
                    },
                ];
            if (statOption === StatType.LOGS)
                return [
                    {
                        label: "INFO",
                        data: setVal({
                            arr: new Array(5).fill(0),
                            val: stats.map((jobsStats) => jobsStats.stats?.logs.infoLogs ?? 0).reduce((a, b) => a + b),
                            index: 0,
                        }),
                        backgroundColor: "#32C3A4",
                    },
                    {
                        label: "DEBUG",
                        data: setVal({
                            arr: new Array(5).fill(0),
                            val: stats.map((jobsStats) => jobsStats.stats?.logs.debugLogs ?? 0).reduce((a, b) => a + b),
                            index: 1,
                        }),
                        backgroundColor: "#D1A34F",
                    },
                    {
                        label: "ERROR",
                        data: setVal({
                            arr: new Array(5).fill(0),
                            val: stats.map((jobsStats) => jobsStats.stats?.logs.errorLogs ?? 0).reduce((a, b) => a + b),
                            index: 2,
                        }),
                        backgroundColor: "#A13764",
                    },
                    {
                        label: "WARNING",
                        data: setVal({
                            arr: new Array(5).fill(0),
                            val: stats
                                .map((jobsStats) => jobsStats.stats?.logs.warningLogs ?? 0)
                                .reduce((a, b) => a + b),
                            index: 3,
                        }),
                        backgroundColor: "#E7E255",
                    },
                    {
                        label: "CRITICAL",
                        data: setVal({
                            arr: new Array(5).fill(0),
                            val: stats
                                .map((jobsStats) => jobsStats.stats?.logs.criticalLogs ?? 0)
                                .reduce((a, b) => a + b),
                            index: 4,
                        }),
                        backgroundColor: "#6C757D",
                    },
                ];
        }
        if (stats instanceof GetJobsStats) {
        }

        if (statOption === StatType.PAGES)
            return [
                {
                    label: "scraped",
                    data: [/*stats .s .pages.scrapedPages ?? 0).reduce((a, b) => a + b)*/ 0, 0],
                    backgroundColor: "#32C3A4",
                },
                {
                    label: "missed",
                    data: [
                        0,
                        stats.map((jobsStats) => jobsStats.stats?.pages.missedPages ?? 0).reduce((a, b) => a + b),
                    ],
                    backgroundColor: "#A13764",
                },
            ];
        if (statOption === StatType.ITEMS)
            return [
                {
                    label: "items",
                    data: [stats.map((jobsStats) => jobsStats.stats?.itemsCount ?? 0).reduce((a, b) => a + b)],
                    backgroundColor: "#32C3A4",
                },
            ];
        if (statOption === StatType.RUNTIME)
            return [
                {
                    label: "runtime",
                    data: [stats.map((jobsStats) => jobsStats.stats?.runtime ?? 0).reduce((a, b) => a + b)],
                    backgroundColor: "#32C3A4",
                },
            ];
        if (statOption === StatType.SUCCESS_RATE)
            return [
                {
                    label: "Job success rate",
                    data: [
                        stats.map((jobsStats) => jobsStats.stats?.successRate ?? 0).reduce((a, b) => a + b) /
                            stats.length,
                    ],
                    backgroundColor: "#32C3A4",
                },
            ];
        if (statOption === StatType.STATUS_CODE)
            return [
                {
                    label: "200",
                    data: setVal({
                        arr: new Array(8).fill(0),
                        val: stats
                            .map((jobsStats) => jobsStats.stats?.statusCodes.status200 ?? 0)
                            .reduce((a, b) => a + b),
                        index: 0,
                    }),
                    backgroundColor: ["#32C3A4"],
                },
                {
                    label: "301",
                    data: setVal({
                        arr: new Array(8).fill(0),
                        val: stats
                            .map((jobsStats) => jobsStats.stats?.statusCodes.status301 ?? 0)
                            .reduce((a, b) => a + b),
                        index: 1,
                    }),
                    backgroundColor: "#D1A34F",
                },
                {
                    label: "302",
                    data: setVal({
                        arr: new Array(8).fill(0),
                        val: stats
                            .map((jobsStats) => jobsStats.stats?.statusCodes.status302 ?? 0)
                            .reduce((a, b) => a + b),
                        index: 2,
                    }),
                    backgroundColor: "#A13764",
                },
                {
                    label: "401",
                    data: setVal({
                        arr: new Array(8).fill(0),
                        val: stats
                            .map((jobsStats) => jobsStats.stats?.statusCodes.status401 ?? 0)
                            .reduce((a, b) => a + b),
                        index: 3,
                    }),
                    backgroundColor: "#3C7BC6",
                },
                {
                    label: "403",
                    data: setVal({
                        arr: new Array(8).fill(0),
                        val: stats
                            .map((jobsStats) => jobsStats.stats?.statusCodes.status403 ?? 0)
                            .reduce((a, b) => a + b),
                        index: 4,
                    }),
                    backgroundColor: "#7DC932",
                },
                {
                    label: "404",
                    data: setVal({
                        arr: new Array(8).fill(0),
                        val: stats
                            .map((jobsStats) => jobsStats.stats?.statusCodes.status404 ?? 0)
                            .reduce((a, b) => a + b),
                        index: 5,
                    }),
                    backgroundColor: "#FE9F99",
                },
                {
                    label: "429",
                    data: setVal({
                        arr: new Array(8).fill(0),
                        val: stats
                            .map((jobsStats) => jobsStats.stats?.statusCodes.status429 ?? 0)
                            .reduce((a, b) => a + b),
                        index: 6,
                    }),
                    backgroundColor: "#E7E255",
                },
                {
                    label: "500",
                    data: setVal({
                        arr: new Array(8).fill(0),
                        val: stats
                            .map((jobsStats) => jobsStats.stats?.statusCodes.status500 ?? 0)
                            .reduce((a, b) => a + b),
                        index: 7,
                    }),
                    backgroundColor: "#6C757D",
                },
            ];
        return [
            {
                label: "INFO",
                data: setVal({
                    arr: new Array(5).fill(0),
                    val: stats.map((jobsStats) => jobsStats.stats?.logs.infoLogs ?? 0).reduce((a, b) => a + b),
                    index: 0,
                }),
                backgroundColor: "#32C3A4",
            },
            {
                label: "DEBUG",
                data: setVal({
                    arr: new Array(5).fill(0),
                    val: stats.map((jobsStats) => jobsStats.stats?.logs.debugLogs ?? 0).reduce((a, b) => a + b),
                    index: 1,
                }),
                backgroundColor: "#D1A34F",
            },
            {
                label: "ERROR",
                data: setVal({
                    arr: new Array(5).fill(0),
                    val: stats.map((jobsStats) => jobsStats.stats?.logs.errorLogs ?? 0).reduce((a, b) => a + b),
                    index: 2,
                }),
                backgroundColor: "#A13764",
            },
            {
                label: "WARNING",
                data: setVal({
                    arr: new Array(5).fill(0),
                    val: stats.map((jobsStats) => jobsStats.stats?.logs.warningLogs ?? 0).reduce((a, b) => a + b),
                    index: 3,
                }),
                backgroundColor: "#E7E255",
            },
            {
                label: "CRITICAL",
                data: setVal({
                    arr: new Array(5).fill(0),
                    val: stats.map((jobsStats) => jobsStats.stats?.logs.criticalLogs ?? 0).reduce((a, b) => a + b),
                    index: 4,
                }),
                backgroundColor: "#6C757D",
            },
        ];
        return [
            {
                label: "",
                data: [],
            },
        ];
    };

    labelsGenerator = (statOption: StatType) => {
        if (statOption === StatType.PAGES) return ["scraped", "missed"];
        else if (statOption === StatType.ITEMS) return ["items"];
        else if (statOption === StatType.RUNTIME) return ["runtime"];
        else if (statOption === StatType.SUCCESS_RATE) return ["job success rate"];
        else if (statOption === StatType.STATUS_CODE) return ["200", "301", "302", "401", "403", "404", "429", "500"];
        else if (statOption === StatType.COVERAGE) return ["coverage"];
        else if (statOption === StatType.LOGS) return ["info", "debug", "error", "warning", "critical"];
        return [];
    };

    charts = (statOption: StatType): JSX.Element => {
        const labels: string[] = this.labelsGenerator(statOption);

        const datasets: ChartDataset<"bar", number[]>[] = this.datasetsGeneratorArray(statOption);

        const data: ChartData<"bar", number[], string> = {
            labels: labels,
            datasets: datasets,
        };

        return (
            <>
                <div className="stats-charts mb-4">
                    <Bar
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: "y",
                            plugins: {
                                legend: {
                                    position: "right" as const,
                                },
                            },
                            scales: {
                                x: {
                                    stacked: true,
                                },
                                y: {
                                    stacked: true,
                                    grid: {
                                        display: false,
                                    },
                                    min:
                                        statOption === StatType.COVERAGE || statOption === StatType.SUCCESS_RATE
                                            ? 0
                                            : undefined,
                                    max:
                                        statOption === StatType.COVERAGE || statOption === StatType.SUCCESS_RATE
                                            ? 100
                                            : undefined,
                                },
                            },
                        }}
                        data={data}
                    />
                </div>
            </>
        );
    };

    render() {
        const { stats, pages, items, runtime, successRate, statusCodes, coverage, logs } = this.props;
        console.log(stats);
        const tabsItems = [];
        if (pages)
            tabsItems.push({
                label: "Pages",
                key: StatType.PAGES,
                children: this.charts(StatType.PAGES),
            });
        if (items)
            tabsItems.push({
                label: "Items",
                key: StatType.ITEMS,
                children: this.charts(StatType.ITEMS),
            });
        if (runtime)
            tabsItems.push({
                label: "Runtime",
                key: StatType.RUNTIME,
                children: this.charts(StatType.RUNTIME),
            });
        if (successRate)
            tabsItems.push({
                label: "Job success rate",
                key: StatType.SUCCESS_RATE,
                children: this.charts(StatType.SUCCESS_RATE),
            });
        if (statusCodes)
            tabsItems.push({
                label: "Status code",
                key: StatType.STATUS_CODE,
                children: this.charts(StatType.STATUS_CODE),
            });
        if (coverage)
            tabsItems.push({
                label: "Coverage",
                key: StatType.COVERAGE,
                children: this.charts(StatType.COVERAGE),
            });
        if (logs)
            tabsItems.push({
                label: "Logs",
                key: StatType.LOGS,
                children: this.charts(StatType.LOGS),
            });

        return <Tabs className="w-full float-right text-estela-black-medium text-xs md:text-sm" items={tabsItems} />;
    }
}
