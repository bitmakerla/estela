import React, { Component } from "react";
import { Spin as Spinner } from "../../shared";
import { ApiApi, JobsPagination, SpidersPagination, SpiderJobStats } from "../../services";
import { Button, Row, Tabs } from "antd";
import ArrowLeft from "../../assets/icons/arrowLeft.svg";
import ArrowRight from "../../assets/icons/arrowRight.svg";
import "./StatsDateModalContent.scss";
import moment from "moment";
import { Link } from "react-router-dom";
import { ChartsModalSection } from "./ChartsModalSection";

interface StatsDateModalContentState {
    activeSpider: number | null;
    loadedSpiders: boolean;
    spiders: SpidersPagination;
    loadedJobs: boolean;
    jobs: JobsPagination;
    overviewTabSelected: boolean;
    jobSelected: SpiderJobStats;
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

    state: StatsDateModalContentState = {
        activeSpider: null,
        loadedSpiders: false,
        spiders: {} as SpidersPagination,
        loadedJobs: false,
        jobs: {} as JobsPagination,
        overviewTabSelected: true,
        jobSelected: {} as SpiderJobStats,
    };

    async componentDidMount(): Promise<void> {
        try {
            const { pid, startDate, endDate, apiService } = this.props;
            const spiders: SpidersPagination = await apiService.apiStatsSpiders({
                pid: pid,
                startDate: startDate,
                endDate: endDate,
            });
            if (spiders.results.length === 0 && !this.abortController.signal.aborted) {
                this.setState({ loadedSpiders: true, spiders: spiders });
                return;
            }
            if (!this.abortController.signal.aborted) {
                this.setState({
                    loadedSpiders: true,
                    spiders: spiders,
                    activeSpider: spiders.results[0].sid || null,
                });
                this.retrieveJobsSpider();
            }
        } catch (error) {
            console.error(error);
        }
    }

    async componentDidUpdate(prevProps: Readonly<StatsDateModalContentProps>) {
        const { pid, startDate, endDate, apiService } = this.props;
        if (prevProps.startDate !== startDate && prevProps.endDate !== endDate) {
            this.setState({ loadedSpiders: false });
            try {
                const spiders: SpidersPagination = await apiService.apiStatsSpiders({
                    pid: pid,
                    startDate: startDate,
                    endDate: endDate,
                });
                if (spiders.results.length === 0) {
                    if (!this.abortController.signal.aborted) {
                        this.setState({
                            loadedSpiders: true,
                            spiders: spiders,
                            activeSpider: spiders.results[0].sid || null,
                        });
                    }
                    return;
                }
                if (!this.abortController.signal.aborted) {
                    this.setState({
                        loadedSpiders: true,
                        spiders: spiders,
                        activeSpider: spiders.results[0].sid || null,
                    });
                    this.retrieveJobsSpider();
                }
            } catch (error) {
                console.error(error);
            }
        }
    }

    componentWillUnmount(): void {
        this.abortController.abort();
    }

    retrieveJobsSpider = async (spider?: number) => {
        this.setState({ loadedJobs: false });
        try {
            const { pid, startDate, endDate, apiService } = this.props;
            const { activeSpider } = this.state;

            if (activeSpider === null) throw new Error("No active spider found");

            const jobs = apiService.apiStatsJobs({
                pid: pid,
                spider: spider || activeSpider,
                startDate: startDate,
                endDate: endDate,
            });
            jobs.then((jobs) => {
                if (!this.abortController.signal.aborted) {
                    this.setState({ loadedJobs: true, jobs: jobs, activeSpider: spider || activeSpider });
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
        const { jobs } = this.state;
        const items = [
            {
                label: <p className="text-estela-black-full text-right">Overview</p>,
                key: "overview",
                children: <ChartsModalSection stats={jobs.results} pages items runtime statusCodes logs />,
            },
        ];
        const jobsItems = jobs.results.map((job) => {
            return {
                label: <p className="text-estela-black-full text-right">Job {job.jid}</p>,
                key: `${job.jid}`,
                children: <p>job stats {job.jid}</p>,
            };
        });
        return items.concat(jobsItems);
    };

    render() {
        const { nextDate, prevDate, startDate, pid } = this.props;
        const { activeSpider, loadedSpiders, spiders, loadedJobs, overviewTabSelected } = this.state;

        return (
            <div className="rounded-lg">
                <div className={`bg-estela mt-6 rounded-t-lg ${!loadedSpiders && "animate-pulse h-28"}`}>
                    {loadedSpiders && activeSpider && (
                        <>
                            <Row className="flex justify-center items-center py-4 gap-32">
                                <div
                                    className="stroke-estela-white-full hover:cursor-pointer"
                                    onClick={() => prevDate()}
                                >
                                    <ArrowLeft className="h-6 w-6 hover:drop-shadow-md hover:brightness-100" />
                                </div>
                                <div className="text-estela-white-full text-sm">
                                    <p className="text-center">{moment.utc(startDate).local().format("dddd")}</p>
                                    <p className="text-center">
                                        {moment.utc(startDate).local().format("DD MMMM, YYYY")}
                                    </p>
                                </div>
                                <div
                                    className="stroke-estela-white-full hover:cursor-pointer"
                                    onClick={() => nextDate()}
                                >
                                    <ArrowRight className="h-6 w-6" />
                                </div>
                            </Row>
                            <Row className="flex items-center ml-20 gap-2">
                                <p className="text-sm text-white">Spiders</p>
                                {spiders.results.map((spider, index) => {
                                    const style =
                                        spider.sid === activeSpider
                                            ? "rounded-t-lg border-0 bg-estela-white-full text-estela-blue-full hover:bg-estela-white-full hover:text-estela-blue-full focus:bg-estela-white-full focus:text-estela-blue-full"
                                            : "rounded-t-lg border-0 bg-estela-blue-medium text-estela-white-full hover:bg-estela-white-full hover:text-estela-blue-full focus:bg-estela-white-full focus:text-estela-blue-full";
                                    return (
                                        <Button
                                            key={index}
                                            className={style}
                                            onClick={() => {
                                                this.retrieveJobsSpider(spider.sid);
                                            }}
                                            title={`${spider.name}`}
                                        >
                                            Spider {spider.sid}
                                        </Button>
                                    );
                                })}
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
                                    }}
                                    items={this.generateTabsItems()}
                                    className="w-full"
                                />
                            </div>
                            <div className="w-4/12 pl-6">
                                {overviewTabSelected ? (
                                    <Link
                                        to={`/projects/${pid}/spiders/${activeSpider}`}
                                        className="flex items-center justify-between w-full text-estela-white-full stroke-estela-white-full bg-bitmaker-primary py-2 px-3 mb-8 rounded-lg hover:text-estela-white-full"
                                    >
                                        <span>See all spider {activeSpider} information</span>
                                        <ArrowRight className="w-6 h-6" />
                                    </Link>
                                ) : (
                                    <Button className="w-full mb-8">See all information</Button>
                                )}
                                <p className="text-estela-black-full text-base font-medium">Spider usage stats</p>
                                <div className="divide-y">
                                    <div className="flex items-center gap-x-5 py-5">
                                        <div className="rounded-lg border-2 border-estela-blue-full p-3 bg-estela-blue-low">
                                            <p className="text-center text-estela-blue-full text-lg font-bold">999.9</p>
                                            <p className="text-center text-estela-blue-full text-sm">GB</p>
                                        </div>
                                        <div>
                                            <p className="text-estela-black-full text-sm font-medium">Storage</p>
                                            <p className="text-estela-black-medium text-xs">
                                                The storage collected by your spiders.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-x-5 py-5">
                                        <div className="rounded-lg border-2 border-estela-blue-full p-3 bg-estela-blue-low">
                                            <p className="text-center text-estela-blue-full text-lg font-bold">999.9</p>
                                            <p className="text-center text-estela-blue-full text-sm">GB</p>
                                        </div>
                                        <div>
                                            <p className="text-estela-black-full text-sm font-medium">Bandwidth</p>
                                            <p className="text-estela-black-medium text-xs">
                                                How far the crawler navigates from the initial seed URLs
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-x-5 py-5">
                                        <div className="rounded-lg border-2 border-estela-blue-full p-3 bg-estela-blue-low">
                                            <p className="text-center text-estela-blue-full text-lg font-bold">999.9</p>
                                            <p className="text-center text-estela-blue-full text-sm">GB</p>
                                        </div>
                                        <div>
                                            <p className="text-estela-black-full text-sm font-medium">
                                                Processing time
                                            </p>
                                            <p className="text-estela-black-medium text-xs">
                                                Average time taken for a server to respond to a request
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-base text-estela-black-full font-medium">Keep exploring...</p>
                                <p className="text-sm text-estela-black-medium">
                                    This spider has deployed jobs these other dates
                                </p>
                            </div>
                        </div>
                    ) : (
                        <Spinner className="pb-4" />
                    )}
                </div>
            </div>
        );
    }
}
