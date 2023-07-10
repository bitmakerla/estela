import React, { Component } from "react";
import { Spin as Spinner } from "../../shared";
import { ApiApi, JobsPagination, SpidersPagination } from "../../services";
import { Button, Row, Tabs } from "antd";
import ArrowLeft from "../../assets/icons/arrowLeft.svg";
import ArrowRight from "../../assets/icons/arrowRight.svg";
import "./StatsDateModalContent.scss";
// import { ChartsModalSection } from "./ChartsModalSection";

interface StatsDateModalContentState {
    activeSpider: number | null;
    loadedSpiders: boolean;
    spiders: SpidersPagination;
    loadedJobs: boolean;
    jobs: JobsPagination;
}

interface StatsDateModalContentProps {
    pid: string;
    apiService: ApiApi;
    startDate: string;
    endDate: string;
}

export class StatsDateModalContent extends Component<StatsDateModalContentProps, StatsDateModalContentState> {
    state: StatsDateModalContentState = {
        activeSpider: null, // cambiar esto a null luego
        loadedSpiders: false,
        spiders: {} as SpidersPagination,
        loadedJobs: false,
        jobs: {} as JobsPagination,
    };

    async componentDidMount(): Promise<void> {
        try {
            const { pid, startDate, endDate, apiService } = this.props;
            const spiders: SpidersPagination = await apiService.apiStatsSpiders({
                pid: pid,
                startDate: startDate,
                endDate: endDate,
            });
            if (spiders.results.length === 0) {
                this.setState({ loadedSpiders: true, spiders: spiders });
                return;
            }
            this.setState({ loadedSpiders: true, spiders: spiders, activeSpider: spiders.results[0].sid || null });
            this.retrieveJobsSpider();
        } catch (error) {
            console.error(error);
        }
    }

    retrieveJobsSpider = async (spider?: number) => {
        this.setState({ loadedJobs: false });
        try {
            const { pid, startDate, endDate, apiService } = this.props;
            const { activeSpider } = this.state;

            if (activeSpider === null) throw new Error("No active spider found");

            const jobs = await apiService.apiStatsJobs({
                pid: pid,
                spider: spider || activeSpider,
                startDate: startDate,
                endDate: endDate,
            });
            this.setState({ loadedJobs: true, jobs: jobs, activeSpider: spider || activeSpider });
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
                children: (
                    <></>
                    // <ChartsModalSection
                    //     stats={groupedStats.get(activeSpider) || []}
                    //     pages
                    //     items
                    //     runtime
                    //     statusCodes
                    //     logs
                    // />
                ),
            },
        ];
        const jobsItems = jobs.results.map((job, index) => {
            return {
                label: <p className="text-estela-black-full text-right">Job {job.jid}</p>,
                key: `${index}`,
                children: <p>job stats {job.jid}</p>,
            };
        });
        return items.concat(jobsItems);
    };

    render() {
        const { activeSpider, loadedSpiders, spiders, loadedJobs } = this.state;

        return (
            <div className="rounded-lg">
                <div className={`bg-estela mt-6 rounded-t-lg ${!loadedSpiders && "animate-pulse h-28"}`}>
                    {loadedSpiders && activeSpider && (
                        <>
                            <Row className="flex justify-center items-center py-4 gap-32">
                                <div className="stroke-estela-white-full hover:cursor-pointer">
                                    <ArrowLeft className="h-6 w-6 hover:drop-shadow-md hover:brightness-100" />
                                </div>
                                <div className="text-estela-white-full text-sm">
                                    <p className="text-center">SATURDAY</p>
                                    <p className="text-center">01 January, 2023</p>
                                </div>
                                <div className="stroke-estela-white-full hover:cursor-pointer">
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
                                <Tabs tabPosition="left" items={this.generateTabsItems()} className="w-full" />
                            </div>
                            <div className="w-4/12 pl-6">
                                <Button className="w-full mb-8">See all information</Button>
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
