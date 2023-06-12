import React, { Component } from "react";
import { Row, Table } from "antd";
import moment from "moment";
import type { ColumnsType } from "antd/es/table";
import { formatSecondsToHHMMSS } from "../../utils";
import { GlobalStats, SpidersJobsStats } from "../../services";

interface StatsTableDataType {
    key: string;
    statsDate: GlobalStats;
}

interface DataListSectionProps {
    loadedStats: boolean;
    stats: GlobalStats[] | SpidersJobsStats[];
}

interface DataListSectionState {
    loadedStatsDates: boolean[];
    focusedStatIndex: number;
}

export class StatsTableSection extends Component<DataListSectionProps, DataListSectionState> {
    state: DataListSectionState = {
        loadedStatsDates: [],
        focusedStatIndex: 0,
    };

    componentDidMount() {
        const { stats } = this.props;
        const newLoadedJobsDateStats = Array(stats.length).fill(false);
        this.setState({ loadedStatsDates: [...newLoadedJobsDateStats] });
    }

    retrieveDateJobsStats = async (index: number, jobsMetadata: JobsMetadata[]): Promise<void> => {
        const params: ApiStatsJobsStatsRequest = {
            pid: this.projectId,
            data: jobsMetadata,
        };
        await this.apiService.apiStatsJobsStats(params).then((response: GetJobsStats[]) => {
            if (!this.mounted) return;
            const { jobsDateStats, loadedJobsDateStats } = this.state;
            const newLoadedJobsDateStats = [...loadedJobsDateStats];
            newLoadedJobsDateStats[index] = true;
            const newJobsDateStats = [...jobsDateStats];
            newJobsDateStats[index] = response;
            this.setState({
                jobsDateStats: [...newJobsDateStats],
                loadedJobsDateStats: [...newLoadedJobsDateStats],
            });
        });
    };

    columns: ColumnsType<StatsTableDataType> = [
        {
            title: <p className="text-estela-black-full font-medium text-xs">DAY</p>,
            dataIndex: "day",
            key: "day",
            render: (_, { statsDate }) => {
                const dateString = statsDate.date.toLocaleDateString();
                return (
                    <div className="grid grid-cols-1">
                        <p className="text-black text-xs font-medium">
                            {moment(dateString, "M/D/YYYY").format("dddd")}
                        </p>
                        <p className="text-estela-black-medium text-xs">
                            {moment(dateString, "M/D/YYYY").format("DD MMMM, YYYY")}
                        </p>
                    </div>
                );
            },
        },
        {
            title: <p className="text-estela-black-full font-medium text-xs">JOBS</p>,
            dataIndex: "jobs",
            key: "jobs",
            render: (_, { statsDate }) => {
                const totalJobs = statsDate.stats.jobs?.totalJobs ?? 0;
                return <p className="text-black text-xs font-normal">{totalJobs}</p>;
            },
            sorter: (statA, statB) => {
                const jobsA = statA.statsDate.stats.jobs?.totalJobs ?? 0;
                const jobsB = statB.statsDate.stats.jobs?.totalJobs ?? 0;
                return jobsA - jobsB;
            },
        },
        {
            title: <p className="text-estela-black-full font-medium text-xs">PAGES</p>,
            dataIndex: "scrapedPages",
            key: "scrapedPages",
            render: (_, { statsDate }) => {
                const scrapedPages = statsDate.stats.pages.scrapedPages ?? 0;
                return <p className="text-black text-xs font-normal">{scrapedPages}</p>;
            },
            sorter: (statA, statB) => {
                const scrapedPagesA = statA.statsDate.stats.pages.scrapedPages ?? 0;
                const scrapedPagesB = statB.statsDate.stats.pages.scrapedPages ?? 0;
                return scrapedPagesA - scrapedPagesB;
            },
        },
        {
            title: <p className="text-estela-black-full font-medium text-xs">M. PAGES</p>,
            dataIndex: "missedPages",
            key: "missedPages",
            render: (_, { statsDate }) => {
                const missedPages = statsDate.stats.pages.missedPages ?? 0;
                return <p className="text-black text-xs font-normal">{missedPages}</p>;
            },
            sorter: (statA, statB) => {
                const missedPagesA = statA.statsDate.stats.pages.missedPages ?? 0;
                const missedPagesB = statB.statsDate.stats.pages.missedPages ?? 0;
                return missedPagesA - missedPagesB;
            },
        },
        {
            title: <p className="text-estela-black-full font-medium text-xs">ITEMS</p>,
            dataIndex: "items",
            key: "items",
            render: (_, { statsDate }) => {
                const itemsCount = statsDate.stats.itemsCount ?? 0;
                return <p className="text-black text-xs font-normal">{itemsCount}</p>;
            },
            sorter: (statA, statB) => {
                const itemsA = statA.statsDate.stats.itemsCount ?? 0;
                const itemsB = statB.statsDate.stats.itemsCount ?? 0;
                return itemsA - itemsB;
            },
        },
        {
            title: <p className="text-estela-black-full font-medium text-xs">RUN TIME</p>,
            dataIndex: "runtime",
            key: "runtime",
            render: (_, { statsDate }) => {
                const runtime = formatSecondsToHHMMSS(statsDate.stats.runtime ?? 0);
                return <p className="text-black text-xs font-normal">{runtime}</p>;
            },
            sorter: (statA, statB) => {
                const runtimeA = statA.statsDate.stats.runtime ?? 0;
                const runtimeB = statB.statsDate.stats.runtime ?? 0;
                return runtimeA - runtimeB;
            },
        },
        {
            title: <p className="text-estela-black-full font-medium text-xs">JOB SUC. RATE</p>,
            dataIndex: "jobSuccessRate",
            key: "jobSuccessRate",
            render: (_, { statsDate }) => {
                const jobSuccessRate = `${Math.round(statsDate.stats.successRate ?? 0)}%`;
                return <p className="text-black text-xs font-normal">{jobSuccessRate}</p>;
            },
            sorter: (statA, statB) => {
                const successRateA = statA.statsDate.stats.successRate ?? 0;
                const successRateB = statB.statsDate.stats.successRate ?? 0;
                return successRateA - successRateB;
            },
        },
        {
            title: <p className="text-estela-black-full font-medium text-xs">ERROR</p>,
            dataIndex: "errorLogs",
            key: "errorLogs",
            render: (_, { statsDate }) => {
                const errorLogs = statsDate.stats.logs.errorLogs ?? 0;
                return <p className="text-black text-xs font-normal">{errorLogs}</p>;
            },
            sorter: (statA, statB) => {
                const errorLogsA = statA.statsDate.stats.logs.errorLogs ?? 0;
                const errorLogsB = statB.statsDate.stats.logs.errorLogs ?? 0;
                return errorLogsA - errorLogsB;
            },
        },
        {
            title: <p className="text-estela-black-full font-medium text-xs">WARNING</p>,
            dataIndex: "warningLogs",
            key: "warningLogs",
            render: (_, { statsDate }) => {
                const warningLogs = statsDate.stats.logs.warningLogs ?? 0;
                return <p className="text-black text-xs font-normal">{warningLogs}</p>;
            },
            sorter: (statA, statB) => {
                const warningLogsA = statA.statsDate.stats.logs.warningLogs ?? 0;
                const warningLogsB = statB.statsDate.stats.logs.warningLogs ?? 0;
                return warningLogsA - warningLogsB;
            },
        },
        {
            title: <p className="text-estela-black-full font-medium text-xs">CRITICAL</p>,
            dataIndex: "criticalLogs",
            key: "criticalLogs",
            render: (_, { statsDate }) => {
                const criticalLogs = statsDate.stats.logs.criticalLogs ?? 0;
                return <p className="text-black text-xs font-normal">{criticalLogs}</p>;
            },
            sorter: (statA, statB) => {
                const criticalLogsA = statA.statsDate.stats.logs.criticalLogs ?? 0;
                const criticalLogsB = statB.statsDate.stats.logs.criticalLogs ?? 0;
                return criticalLogsA - criticalLogsB;
            },
        },
    ];

    render() {
        const { loadedStats, stats } = this.props;

        if (!loadedStats) {
            return <Row className="animate-pulse mt-6 h-12 w-full bg-estela-blue-low rounded-md" />;
        }

        if (loadedStats && stats.length === 0) {
            return <></>;
        }

        const data: StatsTableDataType[] = stats.map((stat, index) => {
            return {
                key: `${index}`,
                statsDate: stat,
            };
        });

        return (
            <Table
                className="w-full"
                columns={this.columns}
                dataSource={data}
                expandable={{
                    expandedRowRender: (record) => <p>{record.statsDate.stats.runtime}</p>,
                }}
                scroll={{ x: "max-content" }}
                pagination={false}
            />
        );
    }
}
