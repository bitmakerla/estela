import React, { Component, Fragment } from "react";
import { Layout, Button, Row, Col, Typography, notification } from "antd";
import { RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import {
    ApiProjectsReadRequest,
    Project,
    ProjectUsage,
    ApiStatsListRequest,
    ProjectStats,
    Stats,
} from "../../services/api";
import { BytesMetric, formatBytes, parseDurationToSeconds } from "../../utils";
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
    projectUsageModal: boolean;
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
        projectUsageModal: false,
        loadedStats: false,
        projectStats: [],
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
            startDate: !startDate ? statsStartDate.toISOString() : startDate,
            endDate: !endDate ? statsEndDate.toISOString() : endDate,
        };

        if (startDate && endDate) {
            this.setState({
                statsStartDate: moment.utc(startDate),
                statsEndDate: moment.utc(endDate),
            });
        }

        await this.apiService.apiStatsList(params).then(
            (response: ProjectStats[]) => {
                const tempStats = new Map<string, Stats[]>();
                response.forEach((stat) => {
                    if (stat.stats.runtime) {
                        stat.stats.runtime = parseDurationToSeconds(stat.stats.runtime.toString());
                    }
                    const tempDate = moment(stat.date).format("YYYY-MM-DD");
                    const statsArr = tempStats.get(tempDate);
                    if (statsArr) {
                        tempStats.set(tempDate, statsArr.concat([{ ...stat.stats }]));
                        return;
                    }
                    tempStats.set(tempDate, [{ ...stat.stats }]);
                });
                const finalProjectStats: ProjectStats[] = Array.from(tempStats.entries()).map(([date, stats]) => {
                    const reducedStats = stats.reduce((acc, curr) => {
                        return {
                            jobs: {
                                totalJobs: (acc.jobs?.totalJobs ?? 0) + (curr.jobs?.totalJobs ?? 0),
                                waitingJobs: (acc.jobs?.waitingJobs ?? 0) + (curr.jobs?.waitingJobs ?? 0),
                                runningJobs: (acc.jobs?.runningJobs ?? 0) + (curr.jobs?.runningJobs ?? 0),
                                stoppedJobs: (acc.jobs?.stoppedJobs ?? 0) + (curr.jobs?.stoppedJobs ?? 0),
                                completedJobs: (acc.jobs?.completedJobs ?? 0) + (curr.jobs?.completedJobs ?? 0),
                                inQueueJobs: (acc.jobs?.inQueueJobs ?? 0) + (curr.jobs?.inQueueJobs ?? 0),
                                errorJobs: (acc.jobs?.errorJobs ?? 0) + (curr.jobs?.errorJobs ?? 0),
                            },
                            pages: {
                                totalPages: (acc.pages.totalPages ?? 0) + (curr.pages.totalPages ?? 0),
                                scrapedPages: (acc.pages.scrapedPages ?? 0) + (curr.pages.scrapedPages ?? 0),
                                missedPages: (acc.pages.missedPages ?? 0) + (curr.pages.missedPages ?? 0),
                            },
                            itemsCount: (acc.itemsCount ?? 0) + (curr.itemsCount ?? 0),
                            successRate: (acc.successRate ?? 0) + (curr.successRate ?? 0),
                            runtime: (acc.runtime ?? 0) + (curr.runtime ?? 0),
                            statusCodes: {
                                status200: (acc.statusCodes.status200 ?? 0) + (curr.statusCodes.status200 ?? 0),
                                status301: (acc.statusCodes.status301 ?? 0) + (curr.statusCodes.status301 ?? 0),
                                status302: (acc.statusCodes.status302 ?? 0) + (curr.statusCodes.status302 ?? 0),
                                status401: (acc.statusCodes.status401 ?? 0) + (curr.statusCodes.status401 ?? 0),
                                status403: (acc.statusCodes.status403 ?? 0) + (curr.statusCodes.status403 ?? 0),
                                status404: (acc.statusCodes.status404 ?? 0) + (curr.statusCodes.status404 ?? 0),
                                status429: (acc.statusCodes.status429 ?? 0) + (curr.statusCodes.status429 ?? 0),
                                status500: (acc.statusCodes.status500 ?? 0) + (curr.statusCodes.status500 ?? 0),
                            },
                            logs: {
                                totalLogs: (acc.logs.totalLogs ?? 0) + (curr.logs.totalLogs ?? 0),
                                debugLogs: (acc.logs.debugLogs ?? 0) + (curr.logs.debugLogs ?? 0),
                                infoLogs: (acc.logs.infoLogs ?? 0) + (curr.logs.infoLogs ?? 0),
                                warningLogs: (acc.logs.warningLogs ?? 0) + (curr.logs.warningLogs ?? 0),
                                errorLogs: (acc.logs.errorLogs ?? 0) + (curr.logs.errorLogs ?? 0),
                                criticalLogs: (acc.logs.criticalLogs ?? 0) + (curr.logs.criticalLogs ?? 0),
                            },
                            coverage: {
                                totalItems: (acc.coverage?.totalItems ?? 0) + (curr.coverage?.totalItems ?? 0),
                                totalItemsCoverage:
                                    (acc.coverage?.totalItemsCoverage ?? 0) + (curr.coverage?.totalItemsCoverage ?? 0),
                            },
                        };
                    });

                    if (
                        reducedStats.jobs &&
                        reducedStats.jobs.completedJobs &&
                        reducedStats.jobs.completedJobs !== 0 &&
                        reducedStats.coverage &&
                        reducedStats.coverage.totalItemsCoverage
                    ) {
                        reducedStats.coverage.totalItemsCoverage /= reducedStats.jobs.completedJobs;
                    }

                    if (reducedStats.successRate) {
                        reducedStats.successRate /= stats.length;
                    }
                    return {
                        date: moment(date).toDate(),
                        stats: reducedStats,
                    };
                });

                this.setState({
                    projectStats: finalProjectStats,
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
            moment(dateStrings[0]).startOf("day").utc().toISOString(),
            moment(dateStrings[1]).endOf("day").utc().toISOString(),
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
                                    formattedNetwork={formattedNetwork}
                                    formattedStorage={formattedStorage}
                                    processingTime={processingTime}
                                    stats={projectStats}
                                    loadedStats={loadedStats}
                                    startDate={statsStartDate.local().format("ddd, DD MMM")}
                                    endDate={statsEndDate.local().format("ddd, DD MMM")}
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
