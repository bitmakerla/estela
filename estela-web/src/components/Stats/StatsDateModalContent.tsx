import React, { Component } from "react";
import { Spin as Spinner } from "../../shared";
import { ApiApi, JobsPagination, SpidersPagination, SpiderJobStats, Spider } from "../../services";
import { Button, Row, Tabs } from "antd";
import ArrowLeft from "../../assets/icons/arrowLeft.svg";
import ArrowRight from "../../assets/icons/arrowRight.svg";
import DoubleLeft from "../../assets/icons/doubleLeft.svg";
import DoubleRight from "../../assets/icons/doubleRight.svg";
import "./StatsDateModalContent.scss";
import moment from "moment";
import { Link } from "react-router-dom";
import { ChartsModalSection } from "./ChartsModalSection";
import { durationToSeconds, durationToString, formatBytes, parseDuration, secondsToDuration } from "../../utils";

interface StatsDateModalContentState {
    activeSpider: Spider;
    spiders: SpidersPagination;
    loadedSpiders: boolean;
    currSpidersPage: number;
    activeJob: SpiderJobStats;
    jobs: JobsPagination;
    loadedJobs: boolean;
    currJobsPage: number;
    overviewTabSelected: boolean;
}

interface StatsDateModalContentProps {
    pid: string;
    apiService: ApiApi;
    startDate: string;
    endDate: string;
    nextDate: () => void;
    prevDate: () => void;
}

export class StatsDateModalContent extends Component<StatsDateModalContentProps, StatsDateModalContentState> {
    abortController = new AbortController();
    jobPageSize = 10;
    spiderPageSize = 10;
    isMounted = false;

    state: StatsDateModalContentState = {
        activeSpider: {} as Spider,
        spiders: {} as SpidersPagination,
        loadedSpiders: false,
        currSpidersPage: 1,
        activeJob: {} as SpiderJobStats,
        jobs: {} as JobsPagination,
        loadedJobs: false,
        currJobsPage: 1,
        overviewTabSelected: true,
    };

    async componentDidMount(): Promise<void> {
        this.isMounted = true;
        if (this.isMounted) {
            const activeSpider = await this.retrieveSpiders(1);
            if (activeSpider) this.retrieveJobsSpider(activeSpider.sid ?? 0, 1);
        }
    }

    async componentDidUpdate(prevProps: Readonly<StatsDateModalContentProps>) {
        const { startDate, endDate } = this.props;
        if (prevProps.startDate !== startDate && prevProps.endDate !== endDate) {
            if (this.isMounted) {
                const activeSpider = await this.retrieveSpiders(1);
                if (activeSpider) this.retrieveJobsSpider(activeSpider.sid ?? 0, 1);
            }
        }
    }

    componentWillUnmount(): void {
        this.isMounted = false;
        this.abortController.abort();
    }

    retrieveSpiders = async (page?: number) => {
        this.isMounted && this.setState({ loadedSpiders: false, overviewTabSelected: true });
        try {
            const { currSpidersPage } = this.state;
            const { pid, startDate, endDate, apiService } = this.props;
            const spiders: SpidersPagination = await apiService.apiStatsSpiders({
                pid: pid,
                startDate: startDate,
                endDate: endDate,
                offset: new Date().getTimezoneOffset(),
                pageSize: this.spiderPageSize,
                page: page || currSpidersPage,
            });
            if (spiders.results.length === 0 && !this.abortController.signal.aborted && this.isMounted) {
                this.setState({ loadedSpiders: true, spiders: spiders });
                return null;
            }
            if (!this.abortController.signal.aborted && this.isMounted) {
                this.setState({
                    loadedSpiders: true,
                    spiders: spiders,
                    activeSpider: spiders.results[0],
                    currSpidersPage: page || currSpidersPage,
                });
                return spiders.results[0];
            }
        } catch (error) {
            console.error(error);
        }
        return null;
    };

    retrieveJobsSpider = async (spider: number, page?: number) => {
        this.isMounted && this.setState({ loadedJobs: false, overviewTabSelected: true });
        try {
            const { pid, startDate, endDate, apiService } = this.props;
            const { activeSpider, currJobsPage } = this.state;

            if (!activeSpider.sid) throw new Error("No active spider found");
            const jobs = apiService.apiStatsSpiderJobs({
                pid: pid,
                sid: `${spider}`,
                startDate: startDate,
                endDate: endDate,
                offset: new Date().getTimezoneOffset(),
                pageSize: this.jobPageSize,
                page: page || currJobsPage,
            });
            jobs.then((jobs) => {
                if (jobs.results.length === 0 && !this.abortController.signal.aborted && this.isMounted) {
                    this.setState({ loadedJobs: true, jobs: jobs });
                    return;
                }
                if (!this.abortController.signal.aborted && this.isMounted) {
                    this.setState({ loadedJobs: true, jobs: jobs, currJobsPage: page || currJobsPage });
                    return;
                }
            }).catch((error) => {
                if (error.name === "AbortError") {
                    return;
                }
                console.error(error);
            });
        } catch (error) {
            console.error(error);
        }
    };

    generateTabsItems = () => {
        const { pid } = this.props;
        const { jobs } = this.state;
        const items = [
            {
                label: <p className="text-estela-black-full text-right">Overview</p>,
                key: "overview",
                children: <ChartsModalSection pid={pid} stats={jobs.results} pages items runtime statusCodes logs />,
            },
        ];
        const jobsItems = jobs.results.map((job) => {
            return {
                label: <p className="text-estela-black-full text-right">Job {job.jid}</p>,
                key: `${job.jid}`,
                children: <ChartsModalSection pid={pid} stats={job} pages statusCodes logs />,
            };
        });
        return items.concat(jobsItems);
    };

    rightSidedStatsSection(): JSX.Element {
        const { pid } = this.props;
        const { activeSpider, overviewTabSelected, activeJob, jobs } = this.state;
        const spiderBandwidth = formatBytes(
            jobs.results.reduce((acc, curr) => acc + (curr.totalResponseBytes ?? 0), 0),
        );
        const activeJobLifeSpan = activeJob.stats?.runtime ? activeJob.stats.runtime.toString() : "0:00:00";
        const formattedActiveJobLifeSpan = durationToString(parseDuration(activeJobLifeSpan));
        const spiderProcessingTime = durationToString(
            secondsToDuration(
                Math.round(
                    jobs.results.reduce(
                        (acc, curr) => acc + durationToSeconds(parseDuration(curr.lifespan?.toString())),
                        0,
                    ),
                ),
            ),
        );
        return (
            <>
                {overviewTabSelected && activeSpider.sid ? (
                    <Link
                        to={`/projects/${pid}/spiders/${activeSpider.sid}`}
                        target="_blank"
                        className="flex items-center justify-between w-full text-estela-white-full stroke-estela-white-full bg-bitmaker-primary py-2 px-3 mb-8 rounded-lg hover:text-estela-white-full"
                    >
                        <span>See all spider {activeSpider.name} information</span>
                        <ArrowRight className="w-6 h-6" />
                    </Link>
                ) : (
                    <Link
                        to={`/projects/${pid}/spiders/${activeSpider.sid}/jobs/${activeJob.jid}`}
                        target="_blank"
                        className="flex items-center justify-between w-full text-estela-white-full stroke-estela-white-full bg-estela-blue-full py-2 px-3 mb-8 rounded-lg hover:text-estela-white-full"
                    >
                        <span>See all job {activeJob.jid} information</span>
                        <ArrowRight className="w-6 h-6" />
                    </Link>
                )}

                {!overviewTabSelected && activeJob.jid && (
                    <>
                        <p className="text-estela-black-full text-base font-medium">Job execution stats</p>
                        <div className="divide-y">
                            <div className="flex items-center gap-x-5 py-5">
                                <div className="w-3/12 rounded-lg border-2 border-estela-states-green-full p-3 bg-estela-blue-low">
                                    <p className="text-center text-estela-states-green-full text-sm font-bold">
                                        {formattedActiveJobLifeSpan}
                                    </p>
                                    <p title="Duration" className="text-center text-estela-states-green-full text-sm">
                                        Lifespan
                                    </p>
                                </div>
                                <div className="w-9/12">
                                    <p className="text-estela-black-full text-sm font-medium">Runtime</p>
                                    <p className="text-estela-black-medium text-xs">
                                        How much your spider delayed (HH:MM:SS).
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-x-5 py-5">
                                <div className="w-3/12 rounded-lg border-2 border-estela-states-green-full p-3 bg-estela-blue-low">
                                    <p className="text-center text-estela-states-green-full text-lg font-bold">
                                        {activeJob.itemCount || 0}
                                    </p>
                                    <p className="text-center text-estela-states-green-full text-sm">Items</p>
                                </div>
                                <div className="w-9/12">
                                    <p className="text-estela-black-full text-sm font-medium">Scraped items</p>
                                    <p className="text-estela-black-medium text-xs">
                                        Number of items retrieved by the job.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
                {!overviewTabSelected && activeJob.jid && (
                    <>
                        <p className="text-estela-black-full text-base font-medium">Job usage stats</p>
                        <div className="divide-y">
                            <div className="flex items-center gap-x-5 py-5">
                                <div className="w-3/12 rounded-lg border-2 border-estela-blue-full p-3 bg-estela-blue-low">
                                    <p className="text-center text-estela-blue-full text-lg font-bold">
                                        {formatBytes(activeJob.totalResponseBytes ?? 0).quantity}
                                    </p>
                                    <p className="text-center text-estela-blue-full text-sm">
                                        {formatBytes(activeJob.totalResponseBytes ?? 0).type}
                                    </p>
                                </div>
                                <div className="w-9/12">
                                    <p className="text-estela-black-full text-sm font-medium">Bandwidth</p>
                                    <p className="text-estela-black-medium text-xs">
                                        Size of the network your job used
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {overviewTabSelected && (
                    <>
                        <p className="text-estela-black-full text-base font-medium">Spider usage stats</p>
                        <div className="divide-y">
                            <div className="flex items-center gap-x-5 py-5">
                                <div className="w-3/12 rounded-lg border-2 border-estela-blue-full p-3 bg-estela-blue-low">
                                    <p className="text-center text-estela-blue-full text-lg font-bold">
                                        {spiderBandwidth.quantity}
                                    </p>
                                    <p className="text-center text-estela-blue-full text-sm">{spiderBandwidth.type}</p>
                                </div>
                                <div className="w-9/12">
                                    <p className="text-estela-black-full text-sm font-medium">Bandwidth</p>
                                    <p className="text-estela-black-medium text-xs">
                                        Size of the network your spider used (for the current page)
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-x-5 py-5">
                                <div className="w-3/12 rounded-lg border-2 border-estela-blue-full p-3 bg-estela-blue-low">
                                    <p className="text-center text-estela-blue-full text-sm font-bold">
                                        {spiderProcessingTime}
                                    </p>
                                    <p title="Duration" className="text-center text-estela-blue-full text-sm">
                                        Lifespan
                                    </p>
                                </div>
                                <div className="w-9/12">
                                    <p className="text-estela-black-full text-sm font-medium">Processing time</p>
                                    <p className="text-estela-black-medium text-xs">
                                        Processing time taken by all the jobs of this spider (for the current page)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </>
        );
    }

    render() {
        const { nextDate, prevDate, startDate } = this.props;
        const { activeSpider, loadedSpiders, spiders, loadedJobs, jobs, currSpidersPage } = this.state;
        return (
            <div className="rounded-lg">
                <div className={`bg-estela mt-6 rounded-t-lg ${!loadedSpiders && "animate-pulse h-28"}`}>
                    {loadedSpiders && activeSpider && (
                        <>
                            <Row className="flex justify-center items-center py-4 gap-32">
                                <div
                                    title="previous date"
                                    className="stroke-estela-white-full hover:cursor-pointer"
                                    onClick={() => prevDate()}
                                >
                                    <ArrowLeft className="h-6 w-6 hover:drop-shadow-md hover:brightness-100" />
                                </div>
                                <div className="text-estela-white-full text-sm">
                                    <p className="text-center">{moment(startDate).format("dddd")}</p>
                                    <p className="text-center">{moment(startDate).format("DD MMMM, YYYY")}</p>
                                </div>
                                <div
                                    title="next date"
                                    className="stroke-estela-white-full hover:cursor-pointer"
                                    onClick={() => {
                                        nextDate();
                                    }}
                                >
                                    <ArrowRight className="h-6 w-6" />
                                </div>
                            </Row>
                            <Row className="flex items-center ml-20 gap-2">
                                <p className="text-sm text-white">Spiders</p>

                                {spiders.previous && (
                                    <Button
                                        className="rounded-t-lg border-0 stroke-white hover:stroke-estela-blue-full bg-estela-blue-medium text-estela-blue-full hover:bg-estela-white-full hover:text-estela-blue-full focus:bg-estela-white-full focus:text-estela-blue-full"
                                        onClick={async () => {
                                            const activeSpider = await this.retrieveSpiders(currSpidersPage - 1);
                                            if (activeSpider) this.retrieveJobsSpider(activeSpider.sid ?? 0, 1);
                                        }}
                                        title="previous spiders"
                                    >
                                        <DoubleLeft className="w-4 h-4" />
                                    </Button>
                                )}
                                {spiders.results.map((spider, index) => {
                                    const style =
                                        spider.sid === activeSpider.sid
                                            ? "rounded-t-lg border-0 bg-estela-white-full text-estela-blue-full hover:bg-estela-white-full hover:text-estela-blue-full focus:bg-estela-white-full focus:text-estela-blue-full"
                                            : "rounded-t-lg border-0 bg-estela-blue-medium text-estela-white-full hover:bg-estela-white-full hover:text-estela-blue-full focus:bg-estela-white-full focus:text-estela-blue-full";
                                    return (
                                        <Button
                                            key={index}
                                            className={style}
                                            onClick={() => {
                                                this.setState({
                                                    activeSpider: { ...spider },
                                                });
                                                this.retrieveJobsSpider(spider.sid ?? 0);
                                            }}
                                            title={`Spider ID: ${spider.sid}`}
                                        >
                                            {spider.name}
                                        </Button>
                                    );
                                })}
                                {spiders.next && (
                                    <Button
                                        className="rounded-t-lg border-0 stroke-white hover:stroke-estela-blue-full bg-estela-blue-medium text-estela-blue-full hover:bg-estela-white-full hover:text-estela-blue-full focus:bg-estela-white-full focus:text-estela-blue-full"
                                        onClick={async () => {
                                            const activeSpider = await this.retrieveSpiders(currSpidersPage + 1);
                                            if (activeSpider) this.retrieveJobsSpider(activeSpider.sid ?? 0, 1);
                                        }}
                                        title={`next ${this.spiderPageSize} spiders`}
                                    >
                                        <DoubleRight className="w-4 h-4" />
                                    </Button>
                                )}
                            </Row>
                        </>
                    )}
                </div>
                <div className="bg-white rounded-lg">
                    {loadedSpiders && activeSpider && loadedJobs ? (
                        <div className="ml-5 mr-7 py-7 pr-5 flex divide-x">
                            <div className="w-8/12 pr-6">
                                <Tabs
                                    tabPosition="left"
                                    onChange={(key) => {
                                        this.setState({ overviewTabSelected: key === "overview" });
                                        if (key !== "overview") {
                                            const jobResult = jobs.results.find((job) => `${job.jid}` === key);
                                            if (jobResult) this.setState({ activeJob: jobResult });
                                        }
                                    }}
                                    items={this.generateTabsItems()}
                                    className="w-full"
                                />
                                {jobs.previous && (
                                    <Button
                                        onClick={() => {
                                            const { activeSpider, currJobsPage } = this.state;
                                            this.retrieveJobsSpider(activeSpider.sid ?? 0, currJobsPage - 1);
                                        }}
                                        type="link"
                                        className="bg-transparent flex items-center gap-x-2 stroke-estela-blue-full text-xs text-estela-blue-full hover:text-estela-blue-full focus:text-estela-blue-full"
                                    >
                                        <DoubleLeft className="w-5 h-5" /> Previous jobs
                                    </Button>
                                )}
                                {jobs.next && (
                                    <Button
                                        onClick={() => {
                                            const { activeSpider, currJobsPage } = this.state;
                                            this.retrieveJobsSpider(activeSpider.sid ?? 0, currJobsPage + 1);
                                        }}
                                        type="link"
                                        className="bg-transparent flex items-center gap-x-2 stroke-estela-blue-full text-xs text-estela-blue-full hover:text-estela-blue-full focus:text-estela-blue-full"
                                    >
                                        Next {this.jobPageSize} jobs
                                        <DoubleRight className="w-5 h-5" />
                                    </Button>
                                )}
                            </div>
                            <div className="w-4/12 pl-6">{this.rightSidedStatsSection()}</div>
                        </div>
                    ) : (
                        <Spinner className="pb-4" />
                    )}
                </div>
            </div>
        );
    }
}
