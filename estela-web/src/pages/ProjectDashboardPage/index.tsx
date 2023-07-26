import React, { Component, Fragment } from "react";
import { Layout, Button, Row, Col, Typography, notification } from "antd";
import { RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import { ApiProjectsReadRequest, Project, ProjectUsage, ProjectStats } from "../../services/api";
import { BytesMetric, formatBytes } from "../../utils";
import { resourceNotAllowedNotification, Spin } from "../../shared";
import { UserContext, UserContextProps } from "../../context";
import moment from "moment";
import type { RangePickerProps } from "antd/es/date-picker";
import { HeaderSection, ChartsSection, StatsTableSection } from "../../components";

const { Text } = Typography;
const { Content } = Layout;

interface ProjectDashboardPageState {
    name: string;
    loaded: boolean;
    formattedNetwork: BytesMetric;
    processingTime: number;
    formattedStorage: BytesMetric;
    count: number;
    current: number;
    loadedStats: boolean;
    projectStats: ProjectStats[];
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
        formattedNetwork: {
            quantity: 0,
            type: "",
        },
        processingTime: 0,
        formattedStorage: {
            quantity: 0,
            type: "",
        },
        loaded: false,
        count: 0,
        current: 0,
        loadedStats: false,
        projectStats: [],
        statsStartDate: moment().subtract(7, "days").startOf("day"),
        statsEndDate: moment(),
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
        this.setState({ loadedStats: false });
        const { statsStartDate, statsEndDate } = this.state;
        if (startDate && endDate) {
            this.setState({
                statsStartDate: moment.utc(startDate),
                statsEndDate: moment.utc(endDate),
            });
        }
        await this.apiService
            .apiStatsList({
                pid: this.projectId,
                startDate: !startDate ? statsStartDate.format("YYYY-MM-DD") : startDate,
                endDate: !endDate ? statsEndDate.format("YYYY-MM-DD") : endDate,
                offset: new Date().getTimezoneOffset(),
            })
            .then(
                (response: ProjectStats[]) => {
                    this.setState({
                        projectStats: [...response],
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

    calcAverageSuccessRate = (): number => {
        const { projectStats } = this.state;
        if (projectStats.length === 0) return 0;
        const successRates = projectStats.map((stat) => (stat.stats.successRate ?? 0) / 100);
        const sumSuccessRates = successRates.reduce((acc, cur) => acc + cur, 0);
        return sumSuccessRates / successRates.length;
    };

    onChangeDateRangeHandler: RangePickerProps["onChange"] = (_, dateStrings) => {
        this.setState({ loadedStats: false });
        const [startDateUTC, endDateUTC] = [
            moment(dateStrings[0]).startOf("day").format("YYYY-MM-DD"),
            moment(dateStrings[1]).endOf("day").format("YYYY-MM-DD"),
        ];
        this.getProjectStatsAndUpdateDates(startDateUTC, endDateUTC);
    };

    onRefreshEventHandler = async () => {
        await this.getProjectStatsAndUpdateDates();
    };

    render(): JSX.Element {
        const {
            name,
            loaded,
            projectStats,
            loadedStats,
            formattedNetwork,
            formattedStorage,
            processingTime,
            statsStartDate,
            statsEndDate,
        } = this.state;

        return (
            <Layout className="bg-metal rounded-t-2xl">
                {loaded ? (
                    <Fragment>
                        <Row className="flow-root lg:m-8 m-4">
                            <Col className="float-left flex items-center gap-4 text-xl leading-6 text-estela-black-medium font-medium">
                                {name}
                            </Col>
                            <Col className="flex justify-end float-right lg:mx-4 mx-2">
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
                        <div className="bg-metal m-4">
                            <Content className="bg-white rounded-2xl py-5 pr-8 pl-5 w-full">
                                <HeaderSection
                                    onRefreshEventHandler={this.onRefreshEventHandler}
                                    onChangeDateRangeHandler={this.onChangeDateRangeHandler}
                                    formattedNetwork={formattedNetwork}
                                    formattedStorage={formattedStorage}
                                    processingTime={processingTime}
                                    stats={projectStats}
                                    loadedStats={loadedStats}
                                    startDate={statsStartDate.format("ddd, DD MMM")}
                                    endDate={statsEndDate.format("ddd, DD MMM")}
                                />
                                <ChartsSection stats={projectStats.slice().reverse()} loadedStats={loadedStats} />
                                <StatsTableSection
                                    pid={this.projectId}
                                    apiService={this.apiService}
                                    stats={projectStats}
                                    loadedStats={loadedStats}
                                />
                            </Content>
                        </div>
                    </Fragment>
                ) : (
                    <Spin />
                )}
            </Layout>
        );
    }
}
