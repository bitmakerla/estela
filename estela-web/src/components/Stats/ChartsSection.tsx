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
import { ProjectStats, SpidersStats } from "../../services";
import { Empty, Tabs } from "antd";
import moment from "moment";
import "./ChartsSection.scss";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const getJobsDataset = (statsData: ProjectStats[]) => {
    return [
        {
            label: "Completed",
            data: statsData.map((statData) => statData.stats.jobs?.completedJobs ?? 0),
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
            label: "Waiting",
            data: statsData.map((statData) => statData.stats.jobs?.waitingJobs ?? 0),
            backgroundColor: "#3C7BC6",
        },
        {
            label: "Stopped",
            data: statsData.map((statData) => statData.stats.jobs?.stoppedJobs ?? 0),
            backgroundColor: "#FE9F99",
        },
        {
            label: "In Queue",
            data: statsData.map((statData) => statData.stats.jobs?.inQueueJobs ?? 0),
            backgroundColor: "#E7E255",
        },
    ];
};

const getPagesDataset = (statsData: ProjectStats[]) => {
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

const getItemsDataset = (statsData: ProjectStats[]) => {
    const datasets = [
        {
            label: "Scraped",
            data: statsData.map((statData) => statData.stats.itemsCount ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
    return datasets;
};

const getRuntimeDataset = (statsData: ProjectStats[]) => {
    return [
        {
            label: "Runtime (seconds)",
            data: statsData.map((statData) => statData.stats.runtime ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
};

const getCoverageDataset = (statsData: ProjectStats[]) => {
    return [
        {
            label: "Item coverage (percentage)",
            data: statsData.map((statsData) => statsData.stats.coverage?.totalItemsCoverage ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
};

const getSuccessRateDataset = (statsData: ProjectStats[]) => {
    return [
        {
            label: "Success rate (percentage)",
            data: statsData.map((statData) => statData.stats.successRate ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
};

const getStatusCodeDataset = (statsData: ProjectStats[]) => {
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

const getLogsDataset = (statData: ProjectStats[]) => {
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

interface ChartsSectionProps {
    loadedStats: boolean;
    stats: ProjectStats[] | SpidersStats[];
}

export class ChartsSection extends Component<ChartsSectionProps, unknown> {
    datasetsGenerators: { [key in StatType]: (statsData: ProjectStats[]) => ChartDataset<"bar", number[]>[] } = {
        [StatType.JOBS]: getJobsDataset,
        [StatType.PAGES]: getPagesDataset,
        [StatType.ITEMS]: getItemsDataset,
        [StatType.RUNTIME]: getRuntimeDataset,
        [StatType.COVERAGE]: getCoverageDataset,
        [StatType.SUCCESS_RATE]: getSuccessRateDataset,
        [StatType.STATUS_CODE]: getStatusCodeDataset,
        [StatType.LOGS]: getLogsDataset,
    };

    charts = (statOption: StatType): JSX.Element => {
        const { stats } = this.props;

        const labels: string[] = stats.map((stat) => {
            return moment(stat.date).format("ddd, DD MMM");
        });

        const datasets: ChartDataset<"bar", number[]>[] = this.datasetsGenerators[statOption](stats);

        const data: ChartData<"bar", number[], string> = {
            labels: labels,
            datasets: datasets,
        };

        return (
            <>
                {stats.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <div className="stats-charts mb-4">
                        <Bar
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
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
                    </div>
                )}
            </>
        );
    };

    render() {
        const { loadedStats } = this.props;

        if (!loadedStats) {
            return <Spinner />;
        }

        return (
            <Tabs
                className="w-full float-right text-estela-black-medium text-xs md:text-sm"
                items={[
                    {
                        label: "Jobs",
                        key: StatType.JOBS,
                        children: this.charts(StatType.JOBS),
                    },
                    {
                        label: "Pages",
                        key: StatType.PAGES,
                        children: this.charts(StatType.PAGES),
                    },
                    {
                        label: "Items",
                        key: StatType.ITEMS,
                        children: this.charts(StatType.ITEMS),
                    },
                    {
                        label: "Runtime",
                        key: StatType.RUNTIME,
                        children: this.charts(StatType.RUNTIME),
                    },
                    {
                        label: "Job success rate",
                        key: StatType.SUCCESS_RATE,
                        children: this.charts(StatType.SUCCESS_RATE),
                    },
                    {
                        label: "Status code",
                        key: StatType.STATUS_CODE,
                        children: this.charts(StatType.STATUS_CODE),
                    },
                    {
                        label: "Logs",
                        key: StatType.LOGS,
                        children: this.charts(StatType.LOGS),
                    },
                ]}
            />
        );
    }
}
