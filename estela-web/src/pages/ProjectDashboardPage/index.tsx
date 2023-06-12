import React, { Component, Fragment } from "react";
import {
    Layout,
    Spin as Spinner,
    Button,
    Row,
    Col,
    Card,
    Space,
    Typography,
    Tooltip as TooltipAnt,
    notification,
} from "antd";
import { Chart as ChartJS, CategoryScale, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import Help from "../../assets/icons/help.svg";
import { ApiProjectsReadRequest, Project, ProjectUsage, GlobalStats, ApiStatsListRequest } from "../../services/api";
import { BytesMetric, formatSecondsToHHMMSS, formatBytes } from "../../utils";
import { resourceNotAllowedNotification, Spin } from "../../shared";
import { UserContext, UserContextProps } from "../../context";
import moment from "moment";
import type { RangePickerProps } from "antd/es/date-picker";
import { HeaderSection, StatsTableSection } from "../../components";

ChartJS.register(CategoryScale, ArcElement, Title, Tooltip, Legend);

const { Text } = Typography;
const { Content } = Layout;

interface ProjectDashboardPageState {
    name: string;
    formattedNetwork: BytesMetric;
    processingTime: number;
    formattedStorage: BytesMetric;
    projectUseLoaded: boolean;
    loaded: boolean;
    count: number;
    current: number;
    loadedStats: boolean;
    globalStats: GlobalStats[];
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
        formattedNetwork: { quantity: 0, type: "" },
        processingTime: 0,
        formattedStorage: { quantity: 0, type: "" },
        loaded: false,
        projectUseLoaded: false,
        count: 0,
        current: 0,
        loadedStats: false,
        globalStats: [],
        statsStartDate: moment().subtract(7, "days").startOf("day").utc(),
        statsEndDate: moment().utc(),
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    static contextType = UserContext;
    mounted = true;

    async componentDidMount(): Promise<void> {
        const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
        this.apiService.apiProjectsRead(requestParams).then(
            (response: Project) => {
                if (!this.mounted) return;
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

    componentWillUnmount(): void {
        this.mounted = false;
    }

    getUsageRecords = async (): Promise<void> => {
        await this.apiService.apiProjectsCurrentUsage({ pid: this.projectId }).then((response: ProjectUsage) => {
            if (!this.mounted) return;
            const time = parseFloat(response.processingTime ?? "0");
            this.setState({
                projectUseLoaded: true,
                formattedNetwork: formatBytes(response.networkUsage),
                processingTime: Math.round(time * 100) / 100,
                formattedStorage: formatBytes(
                    response.itemsDataSize + response.requestsDataSize + response.logsDataSize,
                ),
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
                this.setState({
                    globalStats: response,
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
            if (!this.mounted) return;
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

    onChangeDateRangeHandler: RangePickerProps["onChange"] = (_, dateStrings) => {
        this.setState({ loadedStats: false });
        const [startDateUTC, endDateUTC] = [
            moment(dateStrings[0]).startOf("day").utc().format("YYYY-MM-DD"),
            moment(dateStrings[1]).endOf("day").utc().format("YYYY-MM-DD"),
        ];
        this.getProjectStatsAndUpdateDates(startDateUTC, endDateUTC);
    };

    onRefreshEventHandler: React.MouseEventHandler<HTMLElement> | undefined = () => {
        this.setState({ loadedStats: false });
        this.getProjectStatsAndUpdateDates();
    };

    projectUsageSection: () => JSX.Element = () => {
        const { projectUseLoaded, formattedNetwork, processingTime, formattedStorage, loadedStats } = this.state;

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
                                        {formattedNetwork.quantity} {formattedNetwork.type}
                                    </Text>
                                </div>
                                <div className="flex items-center justify-between space-x-4">
                                    <Text className="text-sm text-estela-black-medium break-words">Storage</Text>
                                    <Text className="text-base text-estela-black-full break-words">
                                        {formattedStorage.quantity} {formattedStorage.type}
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
        const { name, loaded, globalStats, loadedStats } = this.state;

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
                                    <HeaderSection
                                        projectId={this.projectId}
                                        stats={globalStats}
                                        loadedStats={loadedStats}
                                        onRefreshEventHandler={this.onRefreshEventHandler}
                                        onChangeDateRangeHandler={this.onChangeDateRangeHandler}
                                    />
                                    <StatsTableSection stats={globalStats} loadedStats={loadedStats} />
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
