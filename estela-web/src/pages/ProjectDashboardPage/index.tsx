import React, { Component, Fragment, ReactElement } from "react";
import {
    Layout,
    Spin as Spinner,
    Button,
    Row,
    Col,
    Card,
    Space,
    Typography,
    DatePicker,
    Divider,
    Tabs,
    Collapse,
    Tooltip as TooltipAnt,
    Table,
    notification,
    Empty,
} from "antd";
import type { ColumnsType } from "antd/es/table";
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
    ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import Run from "../../assets/icons/run.svg";
import Help from "../../assets/icons/help.svg";
import {
    ApiProjectsReadRequest,
    Project,
    ProjectUsage,
    GlobalStats,
    ApiStatsListRequest,
    JobsMetadata,
    ApiStatsJobsStatsRequest,
    GetJobsStats,
} from "../../services/api";
import { formatSecondsToHHMMSS, formatBytes } from "../../utils";
import { resourceNotAllowedNotification, Spin } from "../../shared";
import { UserContext, UserContextProps } from "../../context";
import moment from "moment";
import type { RangePickerProps } from "antd/es/date-picker";

ChartJS.register(CategoryScale, ArcElement, LinearScale, BarElement, Title, Tooltip, Legend);

const getJobsDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "Finished",
            data: statsData.map((statData) => (statData.stats.jobs ? statData.stats.jobs.finishedJobs ?? 0 : 0)),
            backgroundColor: "#32C3A4",
        },
        {
            label: "Running",
            data: statsData.map((statData) => (statData.stats.jobs ? statData.stats.jobs.runningJobs ?? 0 : 0)),
            backgroundColor: "#D1A34F",
        },
        {
            label: "Error",
            data: statsData.map((statData) => (statData.stats.jobs ? statData.stats.jobs.errorJobs ?? 0 : 0)),
            backgroundColor: "#A13764",
        },
        {
            label: "Unknown",
            data: statsData.map((statData) => (statData.stats.jobs ? statData.stats.jobs.unknownJobs ?? 0 : 0)),
            backgroundColor: "#6C757D",
        },
    ];
};

const getPagesDataset = (statsData: GlobalStats[]) => {
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

const getItemsDataset = (statsData: GlobalStats[]) => {
    const datasets: ChartDataset<"bar", number[]>[] = [
        {
            label: "Scraped",
            data: statsData.map((statData) => statData.stats.itemsCount ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
    return datasets;
};

const getRuntimeDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "Runtime (seconds)",
            data: statsData.map((statData) => statData.stats.runtime ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
};

const getCoverageDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "Item coverage (percentage)",
            data: statsData.map((statsData) => statsData.stats.coverage.totalItemsCoverage ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
};

const getSuccessRateDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "Job success rate (percentage)",
            data: statsData.map((statData) => statData.stats.successRate ?? 0),
            backgroundColor: "#32C3A4",
        },
    ];
};

const getStatusCodeDataset = (statsData: GlobalStats[]) => {
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

const getLogsDataset = (statData: GlobalStats[]) => {
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

const { Text } = Typography;
const { Content } = Layout;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

interface TableDataType {
    key: string;
    jobStats: GetJobsStats;
    jobStatus: string;
}

enum StatType {
    JOBS = "JOBS",
    PAGES = "PAGES",
    ITEMS = "ITEMS",
    RUNTIME = "RUNTIME",
    COVERAGE = "COVERAGE",
    SUCCESS_RATE = "SUCCESS_RATE",
    STATUS_CODE = "STATUS_CODE",
    LOGS = "LOGS",
}

interface ProjectDashboardPageState {
    name: string;
    network: number;
    processingTime: number;
    storage: number;
    projectUseLoaded: boolean;
    loaded: boolean;
    count: number;
    current: number;
    loadedStats: boolean;
    globalStats: GlobalStats[];
    jobsDateStats: GetJobsStats[][];
    loadedJobsDateStats: boolean[];
    statOptionTab: StatType;
    statsStartDate: moment.Moment;
    statsEndDate: moment.Moment;
}

interface RouteParams {
    projectId: string;
}

export class ProjectDashboardPage extends Component<RouteComponentProps<RouteParams>, ProjectDashboardPageState> {
    PAGE_SIZE = 10;
    state: ProjectDashboardPageState = {
        name: "",
        network: 0,
        processingTime: 0,
        storage: 0,
        loaded: false,
        projectUseLoaded: false,
        count: 0,
        current: 0,
        loadedStats: false,
        globalStats: [],
        jobsDateStats: [],
        loadedJobsDateStats: [],
        statOptionTab: StatType.JOBS,
        statsStartDate: moment().subtract(7, "days").startOf("day").utc(),
        statsEndDate: moment().utc(),
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    static contextType = UserContext;

    async componentDidMount(): Promise<void> {
        const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
        this.apiService.apiProjectsRead(requestParams).then(
            (response: Project) => {
                this.setState({ name: response.name });
                const { updateRole } = this.context as UserContextProps;
                const userRole = AuthService.getUserRole();
                if (userRole) {
                    updateRole && updateRole(userRole);
                }
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
        this.getUsageRecords();
        this.getProjectStatsAndUpdateDates();
    }

    getUsageRecords = async (): Promise<void> => {
        await this.apiService.apiProjectsCurrentUsage({ pid: this.projectId }).then((response: ProjectUsage) => {
            const time = parseFloat(response.processingTime ?? "0");
            this.setState({
                projectUseLoaded: true,
                network: response.networkUsage,
                processingTime: Math.round(time * 100) / 100,
                storage: response.itemsDataSize + response.requestsDataSize + response.logsDataSize,
                loaded: true,
            });
        });
    };

    getProjectStatsAndUpdateDates = async (
        startDate?: string | undefined | null,
        endDate?: string | undefined | null,
    ): Promise<void> => {
        const { statsStartDate, statsEndDate } = this.state;
        const params: ApiStatsListRequest = {
            pid: this.projectId,
            startDate: !startDate ? statsStartDate.format("YYYY-MM-DD") : startDate,
            endDate: !endDate ? statsEndDate.format("YYYY-MM-DD") : endDate,
        };

        if (startDate && endDate) {
            this.setState({
                statsStartDate: moment(startDate, "YYYY-MM-DD"),
                statsEndDate: moment(endDate, "YYYY-MM-DD"),
            });
        }

        await this.apiService.apiStatsList(params).then(
            (response: GlobalStats[]) => {
                const newLoadedJobsStats = new Array(response.length).fill(false);
                const newJobsDateStats = new Array<GetJobsStats[]>(response.length);
                this.setState({
                    globalStats: response,
                    jobsDateStats: [...newJobsDateStats],
                    loadedJobsDateStats: [...newLoadedJobsStats],
                    loadedStats: true,
                });
            },
            (error: Error) => {
                notification.error({
                    message: "No data",
                    description: error.message,
                });
                this.setState({ loadedStats: true });
            },
        );
    };

    retrieveDateJobsStats = async (index: number, jobsMetadata: JobsMetadata[]): Promise<void> => {
        const params: ApiStatsJobsStatsRequest = {
            pid: this.projectId,
            data: jobsMetadata,
        };
        await this.apiService.apiStatsJobsStats(params).then((response: GetJobsStats[]) => {
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

    calcAverageSuccessRate = (): number => {
        const { globalStats } = this.state;
        if (globalStats.length === 0) return 0;
        const successRates = globalStats.map((stat) => (stat.stats.successRate ?? 0) / 100);
        const sumSuccessRates = successRates.reduce((acc, cur) => acc + cur, 0);
        return sumSuccessRates / successRates.length;
    };

    chartsSection: () => JSX.Element = () => {
        const { globalStats, statOptionTab, loadedStats } = this.state;
        const datasetsGenerators: { [key in StatType]: (statsData: GlobalStats[]) => ChartDataset<"bar", number[]>[] } =
            {
                [StatType.JOBS]: getJobsDataset,
                [StatType.PAGES]: getPagesDataset,
                [StatType.ITEMS]: getItemsDataset,
                [StatType.RUNTIME]: getRuntimeDataset,
                [StatType.COVERAGE]: getCoverageDataset,
                [StatType.SUCCESS_RATE]: getSuccessRateDataset,
                [StatType.STATUS_CODE]: getStatusCodeDataset,
                [StatType.LOGS]: getLogsDataset,
            };
        const reversedGlobalStats = globalStats.slice().reverse();
        const labels: string[] = reversedGlobalStats.map((stat) => stat.date.toLocaleDateString().slice(0, 10));
        const datasets: ChartDataset<"bar", number[]>[] = datasetsGenerators[statOptionTab](reversedGlobalStats);
        const data: ChartData<"bar", number[], string> = {
            labels,
            datasets: datasets,
        };

        if (!loadedStats) {
            return <Spin />;
        }

        return (
            <>
                {globalStats.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <Bar
                        options={{
                            responsive: true,
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
                                        statOptionTab === StatType.COVERAGE || statOptionTab === StatType.SUCCESS_RATE
                                            ? 0
                                            : undefined,
                                    max:
                                        statOptionTab === StatType.COVERAGE || statOptionTab === StatType.SUCCESS_RATE
                                            ? 100
                                            : undefined,
                                },
                            },
                        }}
                        data={data}
                    />
                )}
            </>
        );
    };

    onStatsTabChange: (activeStat: string) => void = (activeStat: string) => {
        switch (activeStat) {
            case "JOBS":
                this.setState({ statOptionTab: StatType.JOBS });
                break;
            case "PAGES":
                this.setState({ statOptionTab: StatType.PAGES });
                break;
            case "ITEMS":
                this.setState({ statOptionTab: StatType.ITEMS });
                break;
            case "RUNTIME":
                this.setState({ statOptionTab: StatType.RUNTIME });
                break;
            case "COVERAGE":
                this.setState({ statOptionTab: StatType.COVERAGE });
                break;
            case "SUCCESS_RATE":
                this.setState({ statOptionTab: StatType.SUCCESS_RATE });
                break;
            case "STATUS_CODE":
                this.setState({ statOptionTab: StatType.STATUS_CODE });
                break;
            default:
                this.setState({ statOptionTab: StatType.LOGS });
                break;
        }
    };

    headSection: () => JSX.Element = () => {
        const { statsStartDate, statsEndDate } = this.state;

        const onChangeDateRange: RangePickerProps["onChange"] = (_, dateStrings) => {
            this.setState({ loadedStats: false });
            const [startDateUTC, endDateUTC] = [
                moment(dateStrings[0]).utc().format("YYYY-MM-DD"),
                moment(dateStrings[1]).endOf("day").utc().format("YYYY-MM-DD"),
            ];
            this.getProjectStatsAndUpdateDates(startDateUTC, endDateUTC);
        };

        return (
            <>
                <Row className="flow-root items-center justify-end space-x-4 space-x-reverse">
                    <RangePicker
                        onChange={onChangeDateRange}
                        defaultValue={[
                            moment.utc(statsStartDate.format()).local(),
                            moment.utc(statsEndDate.format()).local(),
                        ]}
                        ranges={{
                            Today: [moment(), moment()],
                            "Last 72h": [moment().subtract(3, "days").startOf("day"), moment().endOf("day")],
                            "Last 7 Days": [moment().subtract(7, "days").startOf("day"), moment().endOf("day")],
                            "Last 14 Days": [moment().subtract(14, "days").startOf("day"), moment().endOf("day")],
                            "Last 30 Days": [moment().subtract(30, "days").startOf("day"), moment().endOf("day")],
                        }}
                        format="YYYY-MM-DD"
                        className="statDateRangePicker flex float-right w-60 items-center rounded-lg font-medium stroke-white border-estela-blue-full hover:stroke-estela bg-estela-blue-low"
                    />
                    <Button
                        icon={<Run className="mr-2" width={19} />}
                        className="flex float-right items-center rounded-3xl font-medium stroke-estela border-estela hover:stroke-estela bg-estela-blue-low text-estela hover:text-estela text-sm hover:border-estela"
                        onClick={() => {
                            this.setState({ loadedStats: false });
                            this.getProjectStatsAndUpdateDates();
                        }}
                    >
                        Refresh
                    </Button>
                </Row>
                <Divider className="bg-estela-black-low mb-5" />
                <Content className="flow-root">
                    <Tabs
                        className="float-right w-full text-estela-black-medium text-xs md:text-sm"
                        defaultActiveKey={"optionTab"}
                        onChange={this.onStatsTabChange}
                        items={[
                            {
                                label: "Jobs",
                                key: StatType.JOBS,
                                children: this.chartsSection(),
                            },
                            {
                                label: "Pages",
                                key: StatType.PAGES,
                                children: this.chartsSection(),
                            },
                            {
                                label: "Items",
                                key: StatType.ITEMS,
                                children: this.chartsSection(),
                            },
                            {
                                label: "Runtime",
                                key: StatType.RUNTIME,
                                children: this.chartsSection(),
                            },
                            {
                                label: "Job Success rate",
                                key: StatType.SUCCESS_RATE,
                                children: this.chartsSection(),
                            },
                            {
                                label: "Status code",
                                key: StatType.STATUS_CODE,
                                children: this.chartsSection(),
                            },
                            {
                                label: "Logs",
                                key: StatType.LOGS,
                                children: this.chartsSection(),
                            },
                        ]}
                    />
                </Content>
            </>
        );
    };

    dataSection: () => JSX.Element = () => {
        const { loadedStats, globalStats, jobsDateStats, loadedJobsDateStats } = this.state;

        if (!loadedStats) {
            return (
                <Row className="animate-pulse h-12 w-full grid grid-cols-4 md:grid-cols-6 lg:grid-cols-7 justify-items-center bg-estela-blue-low rounded-md" />
            );
        }

        if (loadedStats && globalStats.length === 0) {
            return <></>;
        }

        const columns: ColumnsType<TableDataType> = [
            {
                title: "JOB",
                dataIndex: "id",
                key: "id",
                align: "center",
                render: (_, { jobStats }): ReactElement => {
                    const spiderID = jobStats.spider ?? 0;
                    const jobID = jobStats.jid ?? 0;
                    return (
                        <Link
                            to={`/projects/${this.projectId}/spiders/${spiderID}/jobs/${jobID}`}
                            target="_blank"
                            className="text-estela-blue-medium"
                        >
                            Job-{jobID}
                        </Link>
                    );
                },
            },
            {
                title: "SPIDER ID",
                dataIndex: "spider",
                key: "spider",
                align: "center",
                render: (_, { jobStats }): ReactElement => {
                    const spiderID = jobStats.spider ?? 0;
                    return (
                        <Link
                            to={`/projects/${this.projectId}/spiders/${spiderID}`}
                            target="_blank"
                            className="text-estela-blue-medium"
                        >
                            Spider-{spiderID}
                        </Link>
                    );
                },
            },
            {
                title: "STATUS",
                dataIndex: "status",
                filters: [
                    {
                        text: "COMPLETED",
                        value: "COMPLETED",
                    },
                    {
                        text: "ERROR",
                        value: "ERROR",
                    },
                    {
                        text: "RUNNING",
                        value: "RUNNING",
                    },
                    {
                        text: "UNKNOWN",
                        value: "UNKNOWN",
                    },
                ],
                key: "status",
                align: "center",
                onFilter: (status, record) => String(status) === record.jobStatus,
                render: (_, { jobStatus }): ReactElement => (
                    <span className="text-xs text-estela-black-medium">{jobStatus}</span>
                ),
            },
            {
                title: "ITEMS",
                dataIndex: "items",
                key: "items",
                align: "center",
                render: (_, { jobStats }): ReactElement => {
                    const items = jobStats.stats?.itemsCount || "no data";
                    return <span className="text-xs text-estela-black-medium">{items}</span>;
                },
            },
            {
                title: "RUNTIME",
                dataIndex: "runtime",
                key: "runtime",
                align: "center",
                render: (_, { jobStats }): ReactElement => {
                    let runtime = "no data";
                    if (jobStats.stats) runtime = formatSecondsToHHMMSS(jobStats.stats.runtime ?? 0);
                    return <span className="text-xs text-estela-black-medium">{runtime}</span>;
                },
            },
            {
                title: "SCRAPED PAGES",
                dataIndex: "scraped_pages",
                key: "scraped_pages",
                align: "center",
                render: (_, { jobStats }): ReactElement => (
                    <span className="text-xs text-estela-black-medium">
                        {jobStats.stats?.pages.scrapedPages ?? "no data"}
                    </span>
                ),
            },
            {
                title: "MISSED PAGES",
                dataIndex: "missed_pages",
                key: "missed_pages",
                align: "center",
                render: (_, { jobStats }): ReactElement => (
                    <span className="text-xs text-estela-black-medium">
                        {jobStats.stats?.pages.missedPages ?? "no data"}
                    </span>
                ),
            },
        ];

        const generateDataSource = (index: number) => {
            const data: TableDataType[] = jobsDateStats[index].map((jobStat: GetJobsStats, jobIndex: number) => {
                let status =
                    globalStats[index].jobsMetadata.find((jobMeta) => jobMeta.jid === jobStat.jid)?.jobStatus ??
                    "UNKNOWN";
                if (status !== "COMPLETED" && status !== "ERROR" && status !== "RUNNING") status = "UNKNOWN";
                return {
                    key: `${jobIndex}`,
                    jobStats: jobStat,
                    jobStatus: status,
                };
            });
            return data;
        };

        const accumulatedStat = {
            totalJobs: globalStats.reduce(
                (acc, curr) => acc + (curr.stats.jobs ? curr.stats.jobs.finishedJobs ?? 0 : 0),
                0,
            ),
            totalPages: globalStats.reduce((acc, curr) => acc + (curr.stats.pages.totalPages ?? 0), 0),
            totalItems: globalStats.reduce((acc, curr) => acc + (curr.stats.itemsCount ?? 0), 0),
            totalRuntime: globalStats.reduce((acc, curr) => acc + (curr.stats.runtime ?? 0), 0),
            totalSuccessRate:
                globalStats.reduce((acc, curr) => acc + (curr.stats.successRate ?? 0), 0) / globalStats.length,
            totalCoverage:
                globalStats.reduce((acc, curr) => acc + (curr.stats.coverage.totalItemsCoverage ?? 0), 0) /
                globalStats.length,
            totalLogs: globalStats.reduce((acc, curr) => acc + (curr.stats.logs.totalLogs ?? 0), 0),
        };

        return (
            <>
                <Row className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-6 justify-items-center bg-estela-blue-low rounded-md mt-2">
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">{accumulatedStat.totalJobs}</p>
                        <p className="text-sm text-center text-estela-black-medium">Jobs</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">{accumulatedStat.totalPages}</p>
                        <p className="text-sm text-center text-estela-black-medium">Pages</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">{accumulatedStat.totalItems}</p>
                        <p className="text-sm text-center text-estela-black-medium">Items</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">
                            {formatSecondsToHHMMSS(accumulatedStat.totalRuntime)}
                        </p>
                        <p className="text-sm text-center text-estela-black-medium">Runtime</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">{accumulatedStat.totalSuccessRate.toFixed(2)}</p>
                        <p className="text-sm text-center text-estela-black-medium">Job success rate</p>
                    </Col>
                    <Col className="grid grid-cols-1 my-2">
                        <p className="text-sm text-center text-black">{accumulatedStat.totalLogs}</p>
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
                        <p className="text-sm text-center text-estela-black-full">JOB SUCCESS RATE</p>
                    </Col>
                </Row>
                <Collapse
                    bordered={false}
                    className="bg-white"
                    ghost
                    accordion
                    onChange={(key) => {
                        if (!Array.isArray(key)) {
                            const numKey = +key;
                            if (loadedJobsDateStats[numKey] === false) {
                                this.retrieveDateJobsStats(numKey, globalStats[numKey].jobsMetadata);
                            }
                        }
                    }}
                >
                    {globalStats.map((stat, index) => {
                        const dateString = stat.date.toLocaleDateString();
                        const totalJobs = stat.stats.jobs ? stat.stats.jobs.totalJobs ?? 0 : 0;
                        const totalPages = stat.stats.pages.totalPages ?? 0;
                        const jobsSize = {
                            finishedJobs:
                                totalJobs !== 0
                                    ? (100 * (stat.stats.jobs ? stat.stats.jobs.finishedJobs ?? 0 : 0)) / totalJobs
                                    : 0,
                            runningJobs:
                                totalJobs !== 0
                                    ? (100 * (stat.stats.jobs ? stat.stats.jobs.runningJobs ?? 0 : 0)) / totalJobs
                                    : 0,
                            errorJobs:
                                totalJobs !== 0
                                    ? (100 * (stat.stats.jobs ? stat.stats.jobs.errorJobs ?? 0 : 0)) / totalJobs
                                    : 0,
                            unknownJobs:
                                totalJobs !== 0
                                    ? (100 * (stat.stats.jobs ? stat.stats.jobs.unknownJobs ?? 0 : 0)) / totalJobs
                                    : 0,
                        };
                        const jobsSizeArr = Object.values(jobsSize);
                        const firstIndex = jobsSizeArr.findIndex((size) => size !== 0);
                        const lastIndex =
                            jobsSizeArr.length - jobsSizeArr.reverse().findIndex((size) => size !== 0) - 1;

                        const pagesSize = {
                            scrapedPages:
                                totalPages !== 0 ? (100 * (stat.stats.pages.scrapedPages ?? 0)) / totalPages : 0,
                            missedPages:
                                totalPages !== 0 ? (100 * (stat.stats.pages.missedPages ?? 0)) / totalPages : 0,
                        };
                        if (pagesSize.scrapedPages !== 0 && pagesSize.missedPages !== 0) {
                            const minimumRatio = 10;
                            if (pagesSize.scrapedPages < minimumRatio) {
                                pagesSize.scrapedPages = minimumRatio;
                                pagesSize.missedPages = 100 - minimumRatio;
                            } else if (pagesSize.missedPages < minimumRatio) {
                                pagesSize.missedPages = minimumRatio;
                                pagesSize.scrapedPages = 100 - minimumRatio;
                            }
                        }
                        const successRate = (stat.stats.successRate ?? 0).toFixed(2);
                        return (
                            <Panel
                                header={
                                    <Row className="grid grid-cols-4 md:grid-cols-6 justify-items-stretch">
                                        <Col className="grid grid-cols-1">
                                            <p className="text-black font-medium">
                                                {moment(dateString, "M/D/YYYY").format("dddd")}
                                            </p>
                                            <p className="text-estela-black-medium">
                                                {moment(dateString, "M/D/YYYY").format("DD MMMM, YYYY")}
                                            </p>
                                        </Col>
                                        <Col className="grid grid-cols-1 px-2">
                                            <div className="flex items-center h-2.5 justify-start">
                                                <div
                                                    className={`${firstIndex === 0 && "rounded-l"} ${
                                                        lastIndex === 0 && "rounded-r"
                                                    } h-full bg-estela-complementary-green`}
                                                    style={{ width: `${jobsSize.finishedJobs}%` }}
                                                />
                                                <div
                                                    className={`${firstIndex === 1 && "rounded-l"} ${
                                                        lastIndex === 1 && "rounded-r"
                                                    } h-full bg-estela-complementary-yellow`}
                                                    style={{ width: `${jobsSize.runningJobs}%` }}
                                                />
                                                <div
                                                    className={`${firstIndex === 2 && "rounded-l"} ${
                                                        lastIndex === 2 && "rounded-r"
                                                    } h-full bg-estela-complementary-purple`}
                                                    style={{ width: `${jobsSize.errorJobs}%` }}
                                                />
                                                <div
                                                    className={`${firstIndex === 3 && "rounded-l"} ${
                                                        lastIndex === 3 && "rounded-r"
                                                    } h-full bg-estela-black-medium`}
                                                    style={{ width: `${jobsSize.unknownJobs}%` }}
                                                />
                                            </div>
                                            <p className="text-estela-black-full text-xs">{totalJobs} jobs</p>
                                        </Col>
                                        <Col className="grid grid-cols-1 px-2">
                                            <div className="flex items-center h-2.5 justify-start">
                                                <div
                                                    className={`${pagesSize.scrapedPages > 0 && "rounded-l"} ${
                                                        pagesSize.missedPages === 0 && "rounded-r"
                                                    } h-full bg-estela-complementary-green`}
                                                    style={{ width: `${pagesSize.scrapedPages}%` }}
                                                />
                                                <div
                                                    className={`${pagesSize.missedPages > 0 && "rounded-r"} ${
                                                        pagesSize.scrapedPages === 0 && "rounded-l"
                                                    } h-full bg-estela-complementary-purple`}
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
                                                {formatSecondsToHHMMSS(stat.stats.runtime ?? 0)}
                                            </p>
                                        </Col>
                                        <Col className="m-auto">
                                            <p className="text-estela-black-full text-center">{successRate}%</p>
                                        </Col>
                                    </Row>
                                }
                                key={`${index}`}
                                className="my-auto"
                            >
                                {loadedJobsDateStats[index] && (
                                    <Table
                                        columns={columns}
                                        pagination={false}
                                        dataSource={generateDataSource(index)}
                                        size="small"
                                        scroll={{ x: "max-content" }}
                                    />
                                )}
                                {!loadedJobsDateStats[index] && <Spin />}
                            </Panel>
                        );
                    })}
                </Collapse>
            </>
        );
    };

    projectUsageSection: () => JSX.Element = () => {
        const { projectUseLoaded, network, processingTime, storage, loadedStats } = this.state;

        const averageSuccessRates = this.calcAverageSuccessRate();
        const dataChart = {
            datasets: [
                {
                    label: "GB",
                    data: [averageSuccessRates, 1 - averageSuccessRates],
                    backgroundColor: ["#D1A34F", "#F1F1F1"],
                    borderWidth: 1,
                    cutout: "90%",
                    circumference: 180,
                    rotation: 270,
                    borderRadius: 4,
                },
            ],
        };

        return (
            <Space direction="vertical">
                <Card bordered={false} className="bg-white rounded-lg">
                    <Space direction="vertical" className="w-full">
                        <div className="flex items-center justify-between">
                            <Text className="text-base text-estela-black-medium break-words">HEALTH</Text>
                            <TooltipAnt
                                placement="left"
                                title="Average job success rate of all dates in the specified range."
                            >
                                <Help className="w-4 h-4 stroke-estela-black-medium" />
                            </TooltipAnt>
                        </div>
                        {loadedStats ? (
                            <div className="mx-auto w-40 static">
                                <Doughnut
                                    plugins={[
                                        {
                                            id: "successRateNeedle",
                                            afterDatasetDraw(chart: ChartJS) {
                                                const { ctx } = chart;
                                                ctx.save();
                                                const x = chart.getDatasetMeta(0).data[0].x;
                                                const y = chart.getDatasetMeta(0).data[0].y;
                                                ctx.textAlign = "center";
                                                ctx.textBaseline = "middle";
                                                ctx.font = "bold 1rem/1.5rem sans-serif";
                                                ctx.fillStyle = "#D1A34F";
                                                ctx.fillText(`${(100 * averageSuccessRates).toFixed(2)}%`, x, y - 20);
                                                ctx.font = "0.75rem/1rem sans-serif";
                                                ctx.fillStyle = "#6C757D";
                                                ctx.fillText("avg. success rate", x, y);
                                            },
                                        },
                                    ]}
                                    options={{
                                        responsive: true,
                                        events: [],
                                    }}
                                    data={dataChart}
                                />
                            </div>
                        ) : (
                            <Spin />
                        )}
                    </Space>
                </Card>
                <Card bordered={false} className="bg-white rounded-lg">
                    <Space direction="vertical" className={`${loadedStats && "w-full"}`}>
                        <div className="flex items-center justify-between mb-4">
                            <Text className="text-base text-estela-black-medium break-words">USAGE STATS</Text>
                            <TooltipAnt placement="left" title="Usage of the project.">
                                <Help className="w-4 h-4 stroke-estela-black-medium" />
                            </TooltipAnt>
                        </div>
                        {projectUseLoaded ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between space-x-4">
                                    <Text className="text-sm text-estela-black-medium break-words">
                                        Processing time
                                    </Text>
                                    <Text className="text-base text-estela-black-full break-words">
                                        {formatSecondsToHHMMSS(processingTime)}
                                    </Text>
                                </div>
                                <div className="flex items-center justify-between space-x-4">
                                    <Text className="text-sm text-estela-black-medium break-words">Bandwidth</Text>
                                    <Text className="text-base text-estela-black-full break-words">
                                        {formatBytes(network)}
                                    </Text>
                                </div>
                                <div className="flex items-center justify-between space-x-4">
                                    <Text className="text-sm text-estela-black-medium break-words">Storage</Text>
                                    <Text className="text-base text-estela-black-full break-words">
                                        {formatBytes(storage)}
                                    </Text>
                                </div>
                            </div>
                        ) : (
                            <Spinner className="my-4" />
                        )}
                    </Space>
                </Card>
            </Space>
        );
    };

    render(): JSX.Element {
        const { name, loaded } = this.state;

        return (
            <Layout className="bg-metal rounded-t-2xl h-screen">
                {loaded ? (
                    <Fragment>
                        <Row className="flow-root lg:m-8 m-4">
                            <Col className="text-xl leading-6 text-estela-black-medium font-medium float-left">
                                {name}
                            </Col>
                            <Col className="flex float-right lg:mx-4 mx-2">
                                <Text className="my-1 mr-2 text-base text-estela-black-medium">
                                    ID : {this.projectId}
                                </Text>
                                <Button
                                    onClick={() => {
                                        navigator.clipboard.writeText(this.projectId);
                                    }}
                                    icon={<Copy className="w-6 h-6" />}
                                    className="flex items-center justify-center border-white stroke-estela text-estela hover:bg-estela-blue-low hover:border-estela rounded-md"
                                ></Button>
                            </Col>
                        </Row>
                        <Row className="lg:mx-6 mx-4 grid grid-cols-7 gap-2 lg:gap-4 justify-between">
                            <Col className="bg-metal col-span-5">
                                <Content className="bg-white rounded-2xl py-5 pr-8 pl-5">
                                    {this.headSection()}
                                    {this.dataSection()}
                                </Content>
                            </Col>
                            <Col className="bg-metal grid justify-start col-span-2 gap-2">
                                {this.projectUsageSection()}
                            </Col>
                        </Row>
                    </Fragment>
                ) : (
                    <Spin />
                )}
            </Layout>
        );
    }
}
