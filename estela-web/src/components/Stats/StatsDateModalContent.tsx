import React, { Component } from "react";
import { Spin as Spinner } from "../../shared";
import { GetJobsStats } from "../../services";
import { Button, Row, Tabs } from "antd";
import ArrowLeft from "../../assets/icons/arrowLeft.svg";
import ArrowRight from "../../assets/icons/arrowRight.svg";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import "./StatsDateModalContent.scss";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface StatsDateModalContentState {
    activeSpider: number;
}

interface StatsDateModalContentProps {
    loadedStats: boolean;
    stats: GetJobsStats[];
}

export class StatsDateModalContent extends Component<StatsDateModalContentProps, StatsDateModalContentState> {
    stats: StatsDateModalContentState = {
        activeSpider: 0,
    };

    // Esta función está dando problemas con el maximun depth
    // componentDidUpdate() {
    //     const { loadedStats } = this.props;
    //     if (loadedStats) {
    //         const groupedStats = this.groupStatsBySpiders();
    //         this.setState({ activeSpider: Array.from(groupedStats.keys())[0] });
    //     }
    // }

    groupStatsBySpiders = (): Map<number, GetJobsStats[]> => {
        const { loadedStats, stats } = this.props;
        if (!loadedStats) return new Map<number, GetJobsStats[]>();
        const groupedStats = new Map<number, GetJobsStats[]>();
        stats.forEach((stat) => {
            const jobsStats = groupedStats.get(stat.spider ?? 0);
            if (jobsStats) {
                jobsStats.push(stat);
            } else {
                groupedStats.set(stat.spider ?? 0, [{ ...stat }]);
            }
        });
        const groupedBySpidersStats = new Map(Array.from(groupedStats.entries()).sort((a, b) => a[0] - b[0]));
        return groupedBySpidersStats;
    };

    render() {
        const { loadedStats } = this.props;

        const groupedStats = Array.from(this.groupStatsBySpiders().entries());

        const items = [
            {
                label: <p className="text-estela-black-full text-right">Overview</p>,
                key: "overview",
                children: (
                    <Tabs
                        items={[
                            {
                                label: "Pages",
                                key: "pages",
                                children: (
                                    <>
                                        <Bar
                                            options={{
                                                indexAxis: "y" as const,
                                                elements: {
                                                    bar: {
                                                        borderWidth: 2,
                                                    },
                                                },
                                                responsive: true,
                                                plugins: {
                                                    legend: {
                                                        display: false,
                                                    },
                                                },
                                            }}
                                            data={{
                                                labels: ["dataset 1", "dataset 2"],
                                                datasets: [
                                                    {
                                                        label: "dataset 1",
                                                        data: new Array(2).fill(null).map((_, index) => 10 * index),
                                                        borderColor: "rgb(255, 99, 132)",
                                                        backgroundColor: "rgba(255, 99, 132, 0.5)",
                                                    },
                                                    {
                                                        label: "dataset 2",
                                                        data: new Array(2).fill(null).map((_, index) => 10 * index),
                                                        borderColor: "rgb(255, 99, 132)",
                                                        backgroundColor: "rgba(255, 99, 132, 0.5)",
                                                    },
                                                ],
                                            }}
                                        />
                                        <div className="bg-[#FFFECD] rounded-lg mt-3 px-20 py-5">
                                            <Tabs
                                                items={[
                                                    {
                                                        label: "Scraped",
                                                        key: "scraped",
                                                        children: "scraped pages",
                                                    },
                                                    {
                                                        label: "Missed",
                                                        key: "missed",
                                                        children: "missed pages",
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </>
                                ),
                            },
                            {
                                label: "Items",
                                key: "items",
                                children: "items",
                            },
                            {
                                label: "Run Time",
                                key: "runtime",
                                children: "runtime",
                            },
                            {
                                label: "Job success rate",
                                key: "job_success_rate",
                                children: "job success rate",
                            },
                            {
                                label: "Status codes",
                                key: "status_codes",
                                children: "status codes",
                            },
                            {
                                label: "Logs",
                                key: "logs",
                                children: "logs",
                            },
                        ]}
                    />
                ),
            },
        ];

        return (
            <div className="rounded-lg">
                <div className={`bg-estela mt-6 rounded-t-lg ${!loadedStats && "animate-pulse h-28"}`}>
                    {loadedStats && (
                        <>
                            <Row className="flex justify-center items-center py-4 gap-32">
                                <div className="stroke-estela-white-full hover:cursor-pointer">
                                    <ArrowLeft className="h-6 w-6 hover:drop-shadow-md hover:brightness-100" />
                                </div>
                                <div className="text-estela-white-full text-sm">
                                    <p className="text-center">SATURDAY</p>
                                    <p className="text-center">01 January, 2023</p>
                                </div>
                                <div className="stroke-estela-white-full">
                                    <ArrowRight className="h-6 w-6" />
                                </div>
                            </Row>
                            <Row className="flex items-center ml-20 gap-2">
                                <p className="text-sm text-white">Spiders</p>
                                {groupedStats.map(([spider, stats]) => {
                                    return (
                                        <Button
                                            key={spider}
                                            className="rounded-t-lg border-0 bg-estela-blue-medium text-estela-white-full hover:bg-estela-white-full hover:text-estela-blue-full focus:bg-estela-white-full focus:text-estela-blue-full"
                                            onClick={() => console.log(stats)}
                                        >
                                            Spider {spider}
                                        </Button>
                                    );
                                })}
                            </Row>
                        </>
                    )}
                </div>
                <div className="bg-white rounded-lg">
                    {loadedStats ? (
                        <div className="ml-5 mr-7 py-7 pr-5 flex divide-x">
                            <div className="w-8/12 pr-6">
                                <Tabs tabPosition="left" items={items} className="w-full" />
                            </div>
                            <div className="w-4/12 pl-6">
                                <Button className="w-full mb-8">See all information</Button>
                                <p className="text-estela-black-full text-base font-medium">Spider usage stats</p>
                                <div className="flex items-center gap-x-5">
                                    <div className="rounded-lg border-2 border-estela-blue-full p-3 bg-estela-blue-low my-5">
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
                            </div>
                        </div>
                    ) : (
                        <Spinner className="mb-auto" />
                    )}
                </div>
            </div>
        );
    }
}
