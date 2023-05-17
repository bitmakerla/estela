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
    Tooltip as TooltipAnt,
} from "antd";
import { Chart as ChartJS, CategoryScale, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Doughnut } from "react-chartjs-2";
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
import { Chart, DataListSection, HeaderSection } from "../../components";

ChartJS.register(CategoryScale, ArcElement, Title, Tooltip, Legend);

const { Text } = Typography;
const { Content } = Layout;
const { RangePicker } = DatePicker;

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
        statsStartDate: moment().subtract(7, "days").startOf("day"),
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

    onChangeDateRange: RangePickerProps["onChange"] = (_, dateStrings) => {
        this.setState({ loadedStats: false });
        this.getProjectStatsAndUpdateDates(dateStrings[0], dateStrings[1]);
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
        const { globalStats, loadedStats } = this.state;
        const reversedGlobalStats = globalStats.slice().reverse();

        if (!loadedStats) {
            return <Spin />;
        }

        return <Chart data={reversedGlobalStats} />;
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
                            <Text className="text-base text-estela-black-medium break-words">HEALTH</Text>
                            <TooltipAnt
                                placement="left"
                                title="Average success rate of all jobs in the specified range + Total No. scraped items."
                            >
                                <Help className="w-4 h-4 stroke-estela-black-medium" />
                            </TooltipAnt>
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
                            <TooltipAnt placement="left" title="Usage of the project.">
                                <Help className="w-4 h-4 stroke-estela-black-medium" />
                            </TooltipAnt>
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
        const { name, loaded, loadedStats, globalStats } = this.state;

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
                                    <HeaderSection />
                                    <DataListSection loadedStats={loadedStats} stats={globalStats} />
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
