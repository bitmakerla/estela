import React, { Component } from "react";
import { Row, Table } from "antd";
import moment from "moment";
import type { ColumnsType } from "antd/es/table";
import { formatSecondsToHHMMSS } from "../../utils";
import { ApiApi, ProjectStats, SpidersStats } from "../../services";

interface StatsTableDataType {
    key: string;
    statsDate: ProjectStats;
}

interface DataListSectionProps {
    loadedStats: boolean;
    stats: ProjectStats[] | SpidersStats[];
    pid: string;
    apiService: ApiApi;
}

interface DataListSectionState {
    loadedDatesStats: boolean[];
    jobsDateStats: ProjectStats[][];
    focusedStatIndex: number;
}

export class StatsTableSection extends Component<DataListSectionProps, DataListSectionState> {
    state: DataListSectionState = {
        loadedDatesStats: [],
        jobsDateStats: [],
        focusedStatIndex: 0,
    };

    componentDidUpdate() {
        const { stats } = this.props;
        const { loadedDatesStats, jobsDateStats } = this.state;
        if (loadedDatesStats.length === 0 && jobsDateStats.length === 0 && stats.length !== 0) {
            const newLoadedDatesStats = Array(stats.length).fill(false);
            const newJobsDateStats = Array<ProjectStats[]>(stats.length);
            this.setState({ loadedDatesStats: [...newLoadedDatesStats], jobsDateStats: [...newJobsDateStats] });
        }
    }

    colsStatsTable: ColumnsType<StatsTableDataType> = [
        {
            title: <p className="text-estela-black-full font-medium text-xs text-center">DAY</p>,
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
            title: <p className="text-estela-black-full font-medium text-xs text-center">JOBS</p>,
            dataIndex: "jobs",
            key: "jobs",
            align: "center",
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
            title: <p className="text-estela-black-full font-medium text-xs text-center">PAGES</p>,
            dataIndex: "scrapedPages",
            key: "scrapedPages",
            align: "center",
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
            title: <p className="text-estela-black-full font-medium text-xs text-center">M. PAGES</p>,
            dataIndex: "missedPages",
            key: "missedPages",
            align: "center",
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
            title: <p className="text-estela-black-full font-medium text-xs text-center">ITEMS</p>,
            dataIndex: "items",
            key: "items",
            align: "center",
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
            title: <p className="text-estela-black-full font-medium text-xs text-center">RUN TIME</p>,
            dataIndex: "runtime",
            key: "runtime",
            align: "center",
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
            title: <p className="text-estela-black-full font-medium text-xs text-center">JOB SUC. RATE</p>,
            dataIndex: "jobSuccessRate",
            key: "jobSuccessRate",
            align: "center",
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
    ];

    render() {
        const { loadedStats, stats } = this.props;

        if (!loadedStats) {
            return <Row className="animate-pulse mt-6 h-12 w-full bg-estela-blue-low rounded-md" />;
        }

        if (loadedStats && stats.length === 0) {
            return <></>;
        }

        const dataDatesStats: StatsTableDataType[] = stats.map((stat, index) => {
            return {
                key: `${index}`,
                statsDate: stat,
            };
        });

        return (
            <Table className="w-full" columns={this.colsStatsTable} dataSource={dataDatesStats} pagination={false} />
        );
    }
}
