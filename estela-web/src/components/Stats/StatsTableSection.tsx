import React, { Component } from "react";
import { Modal, Row, Table } from "antd";
import moment from "moment";
import type { ColumnsType } from "antd/es/table";
import { ApiApi, ProjectStats, SpidersStats } from "../../services";
import Cross from "../../assets/icons/cross.svg";
import Expand from "../../assets/icons/expand.svg";
import "./StatsTableSection.scss";
import { StatsDateModalContent } from "./StatsDateModalContent";
import { durationToString, parseDuration } from "../../utils";

interface StatsTableDataType {
    key: string;
    statsDate: ProjectStats;
}

interface StatsTableSectionProps {
    loadedStats: boolean;
    stats: ProjectStats[] | SpidersStats[];
    pid: string;
    apiService: ApiApi;
}

interface StatsTableSectionState {
    focusStatsDateIndex: number;
    openDateModal: boolean;
    startDateModal: string;
    endDateModal: string;
}

export class StatsTableSection extends Component<StatsTableSectionProps, StatsTableSectionState> {
    state: StatsTableSectionState = {
        focusStatsDateIndex: 0,
        openDateModal: false,
        startDateModal: "",
        endDateModal: "",
    };

    colsStatsTable: ColumnsType<StatsTableDataType> = [
        {
            title: "",
            dataIndex: "details",
            key: "details",
            align: "center",
            render: (_, { statsDate }, index) => {
                return (
                    <div
                        title="see details"
                        onClick={() => {
                            const dateString = statsDate.date.toLocaleDateString();
                            const [startDate, endDate] = [
                                moment(dateString, "M/D/YYYY").format("YYYY-MM-DD"),
                                moment(dateString, "M/D/YYYY").format("YYYY-MM-DD"),
                            ];
                            this.setState({
                                openDateModal: true,
                                focusStatsDateIndex: index,
                                startDateModal: startDate,
                                endDateModal: endDate,
                            });
                        }}
                    >
                        <Expand className="w-5 h-5 stroke-estela" />
                    </div>
                );
            },
        },
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
                const runtime = parseDuration(statsDate.stats.runtime?.toString() || "0:00:00");
                runtime.milliseconds = 0;
                return <p className="text-black text-xs font-normal">{durationToString(runtime)}</p>;
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
        const { openDateModal, focusStatsDateIndex, startDateModal, endDateModal } = this.state;
        const { loadedStats, stats, apiService, pid } = this.props;

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
                    rowClassName="hover:cursor-pointer"
                    columns={this.colsStatsTable}
                    dataSource={dataDatesStats}
                    pagination={false}
                    onRow={(record, rowIndex) => {
                        return {
                            onClick: () => {
                                const dateString = record.statsDate.date.toLocaleDateString();
                                const [startDate, endDate] = [
                                    moment(dateString, "M/D/YYYY").format("YYYY-MM-DD"),
                                    moment(dateString, "M/D/YYYY").format("YYYY-MM-DD"),
                                ];
                                this.setState({
                                    openDateModal: true,
                                    focusStatsDateIndex: rowIndex ?? 0,
                                    startDateModal: startDate,
                                    endDateModal: endDate,
                                });
                            },
                        };
                    }}
                />

                <Modal
                    open={openDateModal}
                    onCancel={() => this.setState({ openDateModal: false })}
                    title={null}
                    className="stats-date-modal"
                    width="90%"
                    closeIcon={<Cross className="w-6 h-6 stroke-white mx-auto mt-3" />}
                    footer={null}
                    destroyOnClose
                >
                    <StatsDateModalContent
                        pid={pid}
                        apiService={apiService}
                        startDate={startDateModal}
                        endDate={endDateModal}
                        nextDate={() => {
                            if (focusStatsDateIndex > 0) {
                                const dateString = stats[focusStatsDateIndex - 1].date.toLocaleDateString();
                                const [startDate, endDate] = [
                                    moment(dateString, "M/D/YYYY").startOf("day").format("YYYY-MM-DD"),
                                    moment(dateString, "M/D/YYYY").endOf("day").format("YYYY-MM-DD"),
                                ];
                                this.setState({
                                    focusStatsDateIndex: focusStatsDateIndex - 1,
                                    startDateModal: startDate,
                                    endDateModal: endDate,
                                });
                            }
                        }}
                        prevDate={() => {
                            if (focusStatsDateIndex < stats.length - 1) {
                                const dateString = stats[focusStatsDateIndex + 1].date.toLocaleDateString();
                                const [startDate, endDate] = [
                                    moment(dateString, "M/D/YYYY").format("YYYY-MM-DD"),
                                    moment(dateString, "M/D/YYYY").format("YYYY-MM-DD"),
                                ];
                                this.setState({
                                    focusStatsDateIndex: focusStatsDateIndex + 1,
                                    startDateModal: startDate,
                                    endDateModal: endDate,
                                });
                            }
                        }}
                    />
                </Modal>
            </>
        );
    }
}
