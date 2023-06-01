import React, { Component } from "react";
import { Row, Col, Collapse } from "antd";
import moment from "moment";
import { GlobalStats, SpidersJobsStats } from "../../services";

const { Panel } = Collapse;

interface DataListSectionProps {
    loadedStats: boolean;
    stats: GlobalStats[] | SpidersJobsStats[];
}

interface DataListSectionState {
    focusedStatIndex: number;
}

export class DataListSection extends Component<DataListSectionProps, DataListSectionState> {
    state: DataListSectionState = {
        focusedStatIndex: 0,
    };

    render() {
        const { loadedStats, stats } = this.props;
        const { focusedStatIndex } = this.state;

        if (!loadedStats) {
            return (
                <>
                    <Row className="animate-pulse h-12 w-full grid grid-cols-4 md:grid-cols-6 lg:grid-cols-7 justify-items-center bg-estela-blue-low rounded-md" />
                </>
            );
        }

        if (loadedStats && stats.length === 0) {
            return <></>;
        }

        const focusedStat: GlobalStats = stats[focusedStatIndex];

        return (
            <>
                <Row className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-7 justify-items-center bg-estela-blue-low rounded-md">
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">{focusedStat.stats.jobs.totalJobs ?? 0}</p>
                        <p className="text-sm text-center text-estela-black-medium">Jobs</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">{focusedStat.stats.pages.totalPages ?? 0}</p>
                        <p className="text-sm text-center text-estela-black-medium">Pages</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">{focusedStat.stats.itemsCount ?? 0}</p>
                        <p className="text-sm text-center text-estela-black-medium">Items</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">{(focusedStat.stats.runtime ?? 0).toFixed(2)}</p>
                        <p className="text-sm text-center text-estela-black-medium">Runtime</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">
                            {(focusedStat.stats.successRate ?? 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-center text-estela-black-medium">Success rate</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">
                            {(focusedStat.stats.coverage.totalItemsCoverage ?? 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-center text-estela-black-medium">Coverage</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">{focusedStat.stats.logs.totalLogs ?? 0}</p>
                        <p className="text-sm text-center text-estela-black-medium">Logs</p>
                    </Col>
                </Row>

                <Row className="mt-5 px-4 grid grid-cols-4 md:grid-cols-6 bg-estela-background rounded-md">
                    <Col className="my-2">
                        <p className="text-sm text-center text-estela-black-full">DAY</p>
                    </Col>
                    <Col className="my-2">
                        <p className="text-sm text-center text-estela-black-full">JOBS</p>
                    </Col>
                    <Col className="my-2">
                        <p className="text-sm text-center text-estela-black-full">PAGES</p>
                    </Col>
                    <Col className="my-2">
                        <p className="text-sm text-center text-estela-black-full">ITEMS</p>
                    </Col>
                    <Col className="my-2">
                        <p className="text-sm text-center text-estela-black-full">RUNTIME</p>
                    </Col>
                    <Col className="my-2">
                        <p className="text-sm text-center text-estela-black-full">S. RATE</p>
                    </Col>
                </Row>
                <Collapse
                    bordered={false}
                    className="bg-white"
                    onChange={(key: string | string[]) => {
                        if (key && !Array.isArray(key)) {
                            const { focusedStatIndex } = this.state;
                            const index = parseInt(key, 10);
                            index !== focusedStatIndex && this.setState({ focusedStatIndex: index });
                        }
                    }}
                    ghost
                    accordion
                >
                    {stats.map((stat, index) => {
                        const dateString = stat.date.toISOString();
                        const totalJobs = stat.stats.jobs.totalJobs ?? 0;
                        const totalPages = stat.stats.pages.totalPages ?? 0;
                        const jobsSize = {
                            finishedJobs: totalJobs !== 0 ? (100 * (stat.stats.jobs.finishedJobs ?? 0)) / totalJobs : 0,
                            runningJobs: totalJobs !== 0 ? (100 * (stat.stats.jobs.runningJobs ?? 0)) / totalJobs : 0,
                            errorJobs: totalJobs !== 0 ? (100 * (stat.stats.jobs.errorJobs ?? 0)) / totalJobs : 0,
                            unknownJobs: totalJobs !== 0 ? (100 * (stat.stats.jobs.unknownJobs ?? 0)) / totalJobs : 0,
                        };
                        const pagesSize = {
                            scrapedPages:
                                totalPages !== 0 ? (100 * (stat.stats.pages.scrapedPages ?? 0)) / totalPages : 0,
                            missedPages:
                                totalPages !== 0 ? (100 * (stat.stats.pages.missedPages ?? 0)) / totalPages : 0,
                        };
                        const successRate = (stat.stats.successRate ?? 0).toFixed(2);
                        return (
                            <Panel
                                header={
                                    <Row className="grid grid-cols-4 md:grid-cols-6 justify-items-stretch">
                                        <Col className="grid grid-cols-1">
                                            <p className="text-black font-medium">
                                                {moment.utc(dateString).format("dddd")}
                                            </p>
                                            <p className="text-estela-black-medium">
                                                {moment.utc(dateString).format("DD MMMM, YYYY")}
                                            </p>
                                        </Col>
                                        <Col className="grid grid-cols-1 px-2">
                                            <div className="flex items-center h-2.5 justify-start">
                                                <div
                                                    className="h-full rounded bg-estela-complementary-green"
                                                    style={{ width: `${jobsSize.finishedJobs}%` }}
                                                />
                                                <div
                                                    className="h-full rounded bg-estela-complementary-yellow"
                                                    style={{ width: `${jobsSize.runningJobs}%` }}
                                                />
                                                <div
                                                    className="h-full rounded bg-estela-complementary-purple"
                                                    style={{ width: `${jobsSize.errorJobs}%` }}
                                                />
                                                <div
                                                    className="h-full rounded bg-estela-black-medium"
                                                    style={{ width: `${jobsSize.unknownJobs}%` }}
                                                />
                                            </div>
                                            <p className="text-estela-black-full text-xs">{totalJobs} jobs</p>
                                        </Col>
                                        <Col className="grid grid-cols-1 px-2">
                                            <div className="flex items-center h-2.5 justify-start">
                                                <div
                                                    className="h-full rounded bg-estela-complementary-green"
                                                    style={{ width: `${pagesSize.scrapedPages}%` }}
                                                />
                                                <div
                                                    className="h-full rounded bg-estela-complementary-purple"
                                                    style={{ width: `${pagesSize.missedPages}%` }}
                                                />
                                            </div>
                                            <p className="text-estela-black-full text-xs">{totalPages} pages</p>
                                        </Col>
                                        <Col className="m-auto">
                                            <p className="text-estela-black-full text-justify">
                                                {stat.stats.itemsCount ?? 0}
                                            </p>
                                        </Col>
                                        <Col className="m-auto">
                                            <p className="text-estela-black-full">
                                                {moment()
                                                    .startOf("day")
                                                    .seconds(stat.stats.runtime ?? 0)
                                                    .format("HH:mm:ss")}
                                            </p>
                                        </Col>
                                        <Col className="m-auto">
                                            <p className="text-estela-black-full text-center">{successRate}%</p>
                                        </Col>
                                    </Row>
                                }
                                key={`${index}`}
                            >
                                <Row className="grid grid-cols-6">
                                    <Col className="col-start-2 grid grid-cols-1 content-start">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-estela-complementary-green" />
                                            <span className="text-estela-black-full text-xs">
                                                {stat.stats.jobs.totalJobs ?? 0} finished
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-estela-complementary-yellow" />
                                            <span className="text-estela-black-full text-xs">
                                                {stat.stats.jobs.runningJobs ?? 0} running
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-estela-complementary-purple" />
                                            <span className="text-estela-black-full text-xs">
                                                {stat.stats.jobs.errorJobs ?? 0} error
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-estela-black-medium" />
                                            <span className="text-estela-black-full text-xs">
                                                {stat.stats.jobs.unknownJobs ?? 0} unknown
                                            </span>
                                        </div>
                                    </Col>
                                    <Col className="grid grid-cols-1 content-start">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-estela-complementary-green" />
                                            <span className="text-estela-black-full text-xs">
                                                {stat.stats.pages.scrapedPages ?? 0} scraped
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 bg-estela-complementary-purple" />
                                            <span className="text-estela-black-full text-xs">
                                                {stat.stats.pages.missedPages ?? 0} missed
                                            </span>
                                        </div>
                                    </Col>
                                </Row>
                            </Panel>
                        );
                    })}
                </Collapse>
            </>
        );
    }
}
