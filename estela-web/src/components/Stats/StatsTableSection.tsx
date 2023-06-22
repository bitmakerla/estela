import React, { Component } from "react";
import { Modal, Row, Table } from "antd";
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
        openDateModal: true,
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
        {
            title: <p className="text-estela-black-full font-medium text-xs text-center">ERROR</p>,
            dataIndex: "errorLogs",
            key: "errorLogs",
            align: "center",
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
            title: <p className="text-estela-black-full font-medium text-xs text-center">WARNING</p>,
            dataIndex: "warningLogs",
            key: "warningLogs",
            align: "center",
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
            title: <p className="text-estela-black-full font-medium text-xs text-center">CRITICAL</p>,
            dataIndex: "criticalLogs",
            key: "criticalLogs",
            align: "center",
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
        const { openDateModal, loadedDatesStats, jobsDateStats } = this.state;
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
            <>
                <Table
                    className="w-full"
                    rowClassName="row-highlighted hover:bg-estela focus:bg-estela"
                    columns={this.colsStatsTable}
                    dataSource={dataDatesStats}
                    expandable={{
                        expandedRowRender: (record, index) => {
                            if (!loadedDatesStats[index]) {
                                this.retrieveDateJobsStats(index, record.statsDate.jobsMetadata);
                                return <Spin />;
                            }
                            const dataDateTraceStats: StatsTraceabilityDataType[] = jobsDateStats[index].map(
                                (jobStat: GetJobsStats, jobIndex: number) => {
                                    const status =
                                        record.statsDate.jobsMetadata.find((jobMeta) => jobMeta.jid === jobStat.jid)
                                            ?.jobStatus ?? "UNKNOWN";
                                    return {
                                        key: `${jobIndex}`,
                                        statsDate: jobStat,
                                        jobStatus: status,
                                    };
                                },
                            );
                            return (
                                <Table
                                    className="w-full"
                                    pagination={false}
                                    columns={this.colsTraceabilityTable}
                                    dataSource={dataDateTraceStats}
                                />
                            );
                        },
                    }}
                    pagination={false}
                    onRow={(record, rowIndex) => {
                        return {
                            onClick: () => {
                                this.setState({ openDateModal: true, focusStatsDateIndex: rowIndex ?? 0 });
                                this.retrieveDateJobsStats(rowIndex ?? 0, record.statsDate.jobsMetadata);
                            },
                        };
                    }}
                />
                {loadedDatesStats.length !== 0 && (
                    <Modal
                        open={openDateModal}
                        onCancel={() => this.setState({ openDateModal: false })}
                        title={null}
                        className="stats-date-modal"
                        width="90%"
                        closeIcon={<Cross className="w-6 h-6 stroke-white mx-auto mt-3" />}
                        footer={null}
                    >
                        <StatsDateModalContent
                            loadedStats={/*loadedDatesStats[focusStatsDateIndex]*/ true}
                            stats={
                                /*jobsDateStats[focusStatsDateIndex]*/ [
                                    {
                                        jid: 80,
                                        spider: 16,
                                        stats: {
                                            pages: { totalPages: 1730, scrapedPages: 475, missedPages: 1255 },
                                            itemsCount: 21197,
                                            runtime: 262.838066,
                                            statusCodes: {
                                                status200: 475,
                                                status301: 10,
                                                status302: 107,
                                                status401: 0,
                                                status403: 0,
                                                status404: 48,
                                                status429: 3759,
                                                status500: 0,
                                            },
                                            successRate: 0,
                                            logs: {
                                                totalLogs: 0,
                                                debugLogs: 0,
                                                infoLogs: 1267,
                                                warningLogs: 0,
                                                errorLogs: 1207,
                                                criticalLogs: 0,
                                            },
                                            coverage: { totalItems: 21197, totalItemsCoverage: 100 },
                                        },
                                    },
                                    {
                                        jid: 81,
                                        spider: 16,
                                        stats: {
                                            pages: { totalPages: 1730, scrapedPages: 475, missedPages: 1255 },
                                            itemsCount: 21197,
                                            runtime: 262.838066,
                                            statusCodes: {
                                                status200: 475,
                                                status301: 10,
                                                status302: 107,
                                                status401: 0,
                                                status403: 0,
                                                status404: 48,
                                                status429: 3759,
                                                status500: 0,
                                            },
                                            successRate: 0,
                                            logs: {
                                                totalLogs: 0,
                                                debugLogs: 0,
                                                infoLogs: 1267,
                                                warningLogs: 0,
                                                errorLogs: 1207,
                                                criticalLogs: 0,
                                            },
                                            coverage: { totalItems: 21197, totalItemsCoverage: 100 },
                                        },
                                    },
                                    {
                                        jid: 79,
                                        spider: 6,
                                        stats: {
                                            pages: { totalPages: 394, scrapedPages: 394, missedPages: 0 },
                                            itemsCount: 3238,
                                            runtime: 58.529975,
                                            statusCodes: {
                                                status200: 394,
                                                status301: 0,
                                                status302: 0,
                                                status401: 0,
                                                status403: 0,
                                                status404: 0,
                                                status429: 0,
                                                status500: 0,
                                            },
                                            successRate: 0,
                                            logs: {
                                                totalLogs: 0,
                                                debugLogs: 0,
                                                infoLogs: 8,
                                                warningLogs: 0,
                                                errorLogs: 0,
                                                criticalLogs: 0,
                                            },
                                            coverage: { totalItems: 3238, totalItemsCoverage: 100 },
                                        },
                                    },
                                    {
                                        jid: 82,
                                        spider: 5,
                                        stats: {
                                            pages: { totalPages: 394, scrapedPages: 394, missedPages: 0 },
                                            itemsCount: 3238,
                                            runtime: 58.529975,
                                            statusCodes: {
                                                status200: 394,
                                                status301: 0,
                                                status302: 0,
                                                status401: 0,
                                                status403: 0,
                                                status404: 0,
                                                status429: 0,
                                                status500: 0,
                                            },
                                            successRate: 0,
                                            logs: {
                                                totalLogs: 0,
                                                debugLogs: 0,
                                                infoLogs: 8,
                                                warningLogs: 0,
                                                errorLogs: 0,
                                                criticalLogs: 0,
                                            },
                                            coverage: { totalItems: 3238, totalItemsCoverage: 100 },
                                        },
                                    },
                                ]
                            }
                        />
                    </Modal>
                )}
            </>
        );
    }
}
