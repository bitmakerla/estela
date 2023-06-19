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
import { StatType, Spin as Spinner } from "../../shared";
import { GlobalStats, SpidersJobsStats } from "../../services";
import { Empty } from "antd";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getJobsDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "Finished",
            data: statsData.map((statData) => statData.stats.jobs?.finishedJobs ?? 0),
            backgroundColor: "#32C3A4",
        },
        {
            label: "Running",
            data: statsData.map((statData) => statData.stats.jobs?.runningJobs ?? 0),
            backgroundColor: "#D1A34F",
        },
        {
            label: "Error",
            data: statsData.map((statData) => statData.stats.jobs?.errorJobs ?? 0),
            backgroundColor: "#A13764",
        },
        {
            label: "Unknown",
            data: statsData.map((statData) => statData.stats.jobs?.unknownJobs ?? 0),
            backgroundColor: "#6C757D",
        },
    ];
};

const getPagesDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "Scraped",
            data: statsData.map((statData) => statData.stats.pages.scrapedPages ?? 0),
            backgroundColor: "#32C3A4",
        },
        {
            label: "Missed",
            data: statsData.map((statData) => statData.stats.pages.missedPages ?? 0),
            backgroundColor: "#A13764",
        },
    ];
};

const getItemsDataset = (statsData: GlobalStats[]) => {
    const datasets = [
        {
            label: "Scraped",
            data: statsData.map((statData) => statData.stats.itemsCount ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
    return datasets;
};

const getRuntimeDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "Runtime (seconds)",
            data: statsData.map((statData) => statData.stats.runtime ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
};

const getCoverageDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "Item coverage (percentage)",
            data: statsData.map((statsData) => statsData.stats.coverage.totalItemsCoverage ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
};

const getSuccessRateDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "Success rate (percentage)",
            data: statsData.map((statData) => statData.stats.successRate ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
};

const getStatusCodeDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "200",
            data: statsData.map((statData) => statData.stats.statusCodes.status200 ?? 0),
            backgroundColor: ["#32C3A4"],
        },
        {
            label: "301",
            data: statsData.map((statData) => statData.stats.statusCodes.status301 ?? 0),
            backgroundColor: "#D1A34F",
        },
        {
            label: "302",
            data: statsData.map((statData) => statData.stats.statusCodes.status302 ?? 0),
            backgroundColor: "#A13764",
        },
        {
            label: "401",
            data: statsData.map((statData) => statData.stats.statusCodes.status401 ?? 0),
            backgroundColor: "#3C7BC6",
        },
        {
            label: "403",
            data: statsData.map((statData) => statData.stats.statusCodes.status403 ?? 0),
            backgroundColor: "#7DC932",
        },
        {
            label: "404",
            data: statsData.map((statData) => statData.stats.statusCodes.status404 ?? 0),
            backgroundColor: "#FE9F99",
        },
        {
            label: "429",
            data: statsData.map((statData) => statData.stats.statusCodes.status429 ?? 0),
            backgroundColor: "#E7E255",
        },
        {
            label: "500",
            data: statsData.map((statData) => statData.stats.statusCodes.status500 ?? 0),
            backgroundColor: "#6C757D",
        },
    ];
};

const getLogsDataset = (statData: GlobalStats[]) => {
    return [
        {
            label: "INFO",
            data: statData.map((statData) => statData.stats.logs.infoLogs ?? 0),
            backgroundColor: "#32C3A4",
        },
        {
            label: "DEBUG",
            data: statData.map((statData) => statData.stats.logs.debugLogs ?? 0),
            backgroundColor: "#D1A34F",
        },
        {
            label: "ERROR",
            data: statData.map((statData) => statData.stats.logs.errorLogs ?? 0),
            backgroundColor: "#A13764",
        },
        {
            label: "WARNING",
            data: statData.map((statData) => statData.stats.logs.warningLogs ?? 0),
            backgroundColor: "#E7E255",
        },
        {
            label: "CRITICAL",
            data: statData.map((statData) => statData.stats.logs.criticalLogs ?? 0),
            backgroundColor: "#6C757D",
        },
    ];
};

interface ChartProps {
    loadedStats: boolean;
    stats: GlobalStats[] | SpidersJobsStats[];
    statOption: StatType;
}

export class ChartsSection extends Component<ChartProps, unknown> {
    datasetsGenerators: { [key in StatType]: (statsData: GlobalStats[]) => ChartDataset<"bar", number[]>[] } = {
        [StatType.JOBS]: getJobsDataset,
        [StatType.PAGES]: getPagesDataset,
        [StatType.ITEMS]: getItemsDataset,
        [StatType.RUNTIME]: getRuntimeDataset,
        [StatType.COVERAGE]: getCoverageDataset,
        [StatType.SUCCESS_RATE]: getSuccessRateDataset,
        [StatType.STATUS_CODE]: getStatusCodeDataset,
        [StatType.LOGS]: getLogsDataset,
    };

    render() {
        const { loadedStats, stats, statOption } = this.props;

        const labels: string[] = stats.map((stat) => stat.date.toLocaleDateString().slice(0, 10));

        const datasets: ChartDataset<"bar", number[]>[] = this.datasetsGenerators[statOption](stats);

        const data: ChartData<"bar", number[], string> = {
            labels: labels,
            datasets: datasets,
        };

        if (!loadedStats) {
            return <Spinner />;
        }

        return (
            <>
                {stats.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <Bar
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    position: "bottom" as const,
                                },
                            },
                            scales: {
                                x: {
                                    stacked: true,
                                    grid: {
                                        display: false,
                                    },
                                },
                                y: {
                                    stacked: true,
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
                )}
            </>
        );
    }
}
