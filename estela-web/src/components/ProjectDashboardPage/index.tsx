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
} from "antd";
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
    ApiProjectsStatsListRequest,
} from "../../services/api";
import { resourceNotAllowedNotification, Spin } from "../../shared";
import { UserContext, UserContextProps } from "../../context";
import moment from "moment";
import type { RangePickerProps } from "antd/es/date-picker";

ChartJS.register(CategoryScale, ArcElement, LinearScale, BarElement, Title, Tooltip, Legend);

const getJobsDataset = (statsData: GlobalStats[]) => {
    return [
        {
            label: "Finished",
            data: statsData.map((statData) => statData.stats.jobs.finishedJobs ?? 0),
            backgroundColor: "#32C3A4",
        },
        {
            label: "Running",
            data: statsData.map((statData) => statData.stats.jobs.runningJobs ?? 0),
            backgroundColor: "#D1A34F",
        },
        {
            label: "Error",
            data: statsData.map((statData) => statData.stats.jobs.errorJobs ?? 0),
            backgroundColor: "#A13764",
        },
        {
            label: "Unknown",
            data: statsData.map((statData) => statData.stats.jobs.unknownJobs ?? 0),
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
            label: "Success rate (percentage)",
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

interface Ids {
    sid: number | undefined;
    jid: number | undefined;
    cid?: number | null | undefined;
}

interface ProjectDashboardPageState {
    name: string;
    network: number;
    processingTime: string;
    storage: number;
    projectUseLoaded: boolean;
    loaded: boolean;
    count: number;
    current: number;
    loadedStats: boolean;
    globalStats: GlobalStats[];
    focusedStatIndex: number;
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
        processingTime: "0",
        storage: 0,
        loaded: false,
        projectUseLoaded: false,
        count: 0,
        current: 0,
        loadedStats: false,
        globalStats: [],
        focusedStatIndex: 0,
        statOptionTab: StatType.JOBS,
        statsStartDate: moment("2023-04-15", "YYYY-MM-DD"),
        statsEndDate: moment(),
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    static contextType = UserContext;

    columns = [
        {
            title: "JOB",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}/jobs/${id.jid}`} className="text-[#4D47C3]">
                    Job-{id.jid}
                </Link>
            ),
        },
        {
            title: "SPIDER",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}`}>{id.sid}</Link>
            ),
        },
        {
            title: "DATE",
            key: "date",
            dataIndex: "date",
        },
        {
            title: "SCHEDULED JOB",
            key: "id",
            dataIndex: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}/cronjobs/${id.cid}`}>{id.cid}</Link>
            ),
        },
        {
            title: "STATUS",
            key: "status",
            dataIndex: "status",
        },
    ];

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
                processingTime: String(Math.round(time * 100) / 100),
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
        const params: ApiProjectsStatsListRequest = {
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

        await this.apiService.apiProjectsStatsList(params).then((response: GlobalStats[]) => {
            this.setState({ globalStats: response, loadedStats: true });
        });
    };

    formatBytes = (bytes: number): string => {
        if (!+bytes) {
            return "0 Bytes";
        } else {
            const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
        }
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
        const labels: string[] = reversedGlobalStats.map((stat) => stat.date.toISOString().slice(0, 10));
        const datasets: ChartDataset<"bar", number[]>[] = datasetsGenerators[statOptionTab](reversedGlobalStats);
        const data: ChartData<"bar", number[], string> = {
            labels,
            datasets: datasets,
        };

        if (!loadedStats) {
            return <Spin />;
        }

        return (
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
                        },
                    },
                }}
                data={data}
            />
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
            this.getProjectStatsAndUpdateDates(dateStrings[0], dateStrings[1]);
        };

        return (
            <>
                <Row className="flow-root items-center justify-end space-x-4 space-x-reverse">
                    <RangePicker
                        onChange={onChangeDateRange}
                        defaultValue={[statsStartDate, statsEndDate]}
                        ranges={{
                            Today: [moment(), moment()],
                            "Last 72h": [moment().subtract(3, "days").startOf("day"), moment()],
                            "Last 7 Days": [moment().subtract(7, "days").startOf("day"), moment()],
                            "Last 14 Days": [moment().subtract(14, "days").startOf("day"), moment()],
                            "Last 30 Days": [moment().subtract(30, "days").startOf("day"), moment()],
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
                        className="float-right text-estela-black-medium text-xs md:text-sm"
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
                                label: "Coverage",
                                key: StatType.COVERAGE,
                                children: this.chartsSection(),
                            },
                            {
                                label: "Success rate",
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
        const { loadedStats, globalStats, focusedStatIndex } = this.state;

        if (!loadedStats) {
            return (
                <>
                    <Row className="animate-pulse h-12 w-full grid grid-cols-4 md:grid-cols-6 lg:grid-cols-7 justify-items-center bg-estela-blue-low rounded-md" />
                </>
            );
        }

        if (loadedStats && globalStats.length === 0) {
            return <></>;
        }

        const focusedStat: GlobalStats = globalStats[focusedStatIndex];

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
                    {globalStats.map((stat, index) => {
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
    };

    projectUsageSection: () => JSX.Element = () => {
        const { projectUseLoaded, network, processingTime, storage, loadedStats, globalStats } = this.state;

        const averageSuccessRates = this.calcAverageSuccessRate();
        const itemsScraped = globalStats.map((stat) => stat.stats.itemsCount ?? 0).reduce((acc, cur) => acc + cur, 0);
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
                            <Text className="text-base text-estela-black-medium break-words">&lt;&gt; HEALTH</Text>
                            <Help className="w-4 h-4 stroke-estela-black-medium" />
                        </div>
                        {loadedStats ? (
                            <>
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
                                                    ctx.fillText(`${itemsScraped}`, x, y - 20);
                                                    ctx.font = "0.75rem/1rem sans-serif";
                                                    ctx.fillStyle = "#6C757D";
                                                    ctx.fillText("items scraped", x, y);
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
                                <div className="flex items-center mx-auto gap-2">
                                    <Text className="flex-auto text-4xl text-estela-black-full w-36">
                                        {Math.round(averageSuccessRates * 100)}%
                                    </Text>
                                    <Text className="flex-auto text-sm text-estela-black-medium">
                                        Your spider scraped a lot of data!
                                    </Text>
                                </div>
                            </>
                        ) : (
                            <Spin />
                        )}
                    </Space>
                </Card>
                <Card bordered={false} className="bg-white rounded-lg">
                    <Space direction="vertical" className={`${loadedStats && "w-full"}`}>
                        <div className="flex items-center justify-between mb-4">
                            <Text className="text-base text-estela-black-medium break-words">USAGE STATS</Text>
                            <Help className="w-4 h-4 stroke-estela-black-medium" />
                        </div>
                        {projectUseLoaded ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Text className="text-sm text-estela-black-medium break-words">
                                        Processing time
                                    </Text>
                                    <Text className="text-base text-estela-black-full break-words">
                                        {processingTime} seg
                                    </Text>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Text className="text-sm text-estela-black-medium break-words">Bandwidth</Text>
                                    <Text className="text-base text-estela-black-full break-words">
                                        {this.formatBytes(network)}
                                    </Text>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Text className="text-sm text-estela-black-medium break-words">Storage</Text>
                                    <Text className="text-base text-estela-black-full break-words">
                                        {this.formatBytes(storage)}
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
