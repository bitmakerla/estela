import React, { Component, Fragment } from "react";
import { Layout, Button, Row, Col, Typography, notification, Modal } from "antd";
import { RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import { ApiProjectsReadRequest, Project, ProjectUsage, GlobalStats, ApiStatsListRequest } from "../../services/api";
import { BytesMetric, formatBytes } from "../../utils";
import { resourceNotAllowedNotification, Spin } from "../../shared";
import { UserContext, UserContextProps } from "../../context";
import moment from "moment";
import type { RangePickerProps } from "antd/es/date-picker";
import { HeaderSection, ChartsSection, StatsTableSection, ProjectHealth } from "../../components";

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
    projectUsageModal: boolean;
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
        processingTime: 0,
        projectUsageModal: false,
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

    render(): JSX.Element {
        const {
            name,
            loaded,
            globalStats,
            loadedStats,
            projectUsageModal,
            formattedNetwork,
            formattedStorage,
            processingTime,
        } = this.state;

        return (
            <Layout className="bg-metal rounded-t-2xl">
                {loaded ? (
                    <Fragment>
                        <Row className="flow-root lg:m-8 m-4">
                            <Col className="float-left flex items-center gap-4 text-xl leading-6 text-estela-black-medium font-medium">
                                {name}
                                <Button
                                    size="small"
                                    className="flex items-center rounded-lg font-medium bg-estela-blue-full stroke-estela-white-full text-estela-white-full hover:bg-estela-blue-full hover:stroke-estela-white-full hover:text-estela-white-full"
                                    onClick={() => this.setState({ projectUsageModal: true })}
                                >
                                    See Health &amp; Resources
                                </Button>
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
                                />
                                <ChartsSection stats={globalStats.slice().reverse()} loadedStats={loadedStats} />
                                <StatsTableSection stats={globalStats} loadedStats={loadedStats} />
                            </Content>
                        </div>
                        <Modal
                            title={null}
                            destroyOnClose={true}
                            open={projectUsageModal}
                            footer={null}
                            width="35%"
                            onCancel={() => this.setState({ projectUsageModal: false })}
                        >
                            <div className="bg-metal p-4 mt-5 rounded-lg">
                                <ProjectHealth
                                    formattedNetwork={formattedNetwork}
                                    formattedStorage={formattedStorage}
                                    processingTime={processingTime}
                                    stats={globalStats}
                                    loadedStats={loadedStats}
                                />
                            </div>
                        </Modal>
                    </Fragment>
                ) : (
                    <Spin />
                )}
            </Layout>
        );
    }
}
