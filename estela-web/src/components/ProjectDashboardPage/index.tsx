import React, { Component, Fragment, ReactElement } from "react";
import { Layout, Pagination, Spin as Spiner, Button, Row, Col, Table, Card, Space, Typography } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import {
    ApiProjectsReadRequest,
    ApiProjectsJobsRequest,
    Project,
    ProjectJob,
    SpiderJob,
    ProjectUsage,
} from "../../services/api";
import { resourceNotAllowedNotification, Spin, PaginationItem } from "../../shared";
import { convertDateToString } from "../../utils";
import { UserContext, UserContextProps } from "../../context";

const { Text } = Typography;

interface Ids {
    sid: number | undefined;
    jid: number | undefined;
    cid?: number | null | undefined;
}

interface SpiderJobData {
    id: Ids;
    key: number | undefined;
    date: string;
    status: string | undefined;
}

interface ProjectDashboardPageState {
    name: string;
    jobs: SpiderJobData[];
    network: number;
    processingTime: string;
    storage: number;
    projectUseLoaded: boolean;
    loaded: boolean;
    count: number;
    current: number;
}

interface RouteParams {
    projectId: string;
}

export class ProjectDashboardPage extends Component<RouteComponentProps<RouteParams>, ProjectDashboardPageState> {
    PAGE_SIZE = 10;
    state: ProjectDashboardPageState = {
        name: "",
        jobs: [],
        network: 0,
        processingTime: "0",
        storage: 0,
        loaded: false,
        projectUseLoaded: false,
        count: 0,
        current: 0,
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
            title: "CRONJOB",
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
        this.getJobs(1);
        this.getUsageRecords();
    }

    getJobs = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsJobsRequest = {
            pid: this.projectId,
            page,
            pageSize: this.PAGE_SIZE,
        };
        await this.apiService.apiProjectsJobs(requestParams).then((response: ProjectJob) => {
            const data = response.results.map((job: SpiderJob, iterator: number) => ({
                key: iterator,
                id: { jid: job.jid, sid: job.spider, cid: job.cronjob },
                args: job.args,
                date: convertDateToString(job.created),
                status: job.jobStatus,
            }));
            const jobs: SpiderJobData[] = data;
            this.setState({ jobs: [...jobs], loaded: true, count: response.count, current: page });
        });
    };

    getUsageRecords = async (): Promise<void> => {
        await this.apiService.apiProjectsCurrentUsage({ pid: this.projectId }).then((response: ProjectUsage) => {
            const time = parseFloat(response.processingTime ?? "0");
            this.setState({
                projectUseLoaded: true,
                network: response.networkUsage,
                processingTime: String(Math.round(time * 100) / 100),
                storage: response.itemsDataSize + response.requestsDataSize + response.logsDataSize,
            });
        });
    };

    formatBytes = (bytes: number): string => {
        if (!+bytes) {
            return "0 Bytes";
        } else {
            const sizes = ["Bytes", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
        }
    };

    onPageChange = async (page: number): Promise<void> => {
        await this.getJobs(page);
    };

    render(): JSX.Element {
        const { name, loaded, projectUseLoaded, jobs, count, current, network, processingTime, storage } = this.state;
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
                        <Row className="lg:mx-6 mx-2 grid grid-cols-5 gap-2 lg:gap-4">
                            <Col className="bg-metal grid justify-start col-span-1 gap-2">
                                <Space direction="vertical">
                                    <Card bordered={false} className="bg-white h-48 rounded-lg">
                                        <Space direction="vertical">
                                            <Text className="text-base text-estela-black-medium break-words">
                                                NETWORK USED
                                            </Text>
                                            {projectUseLoaded ? (
                                                <>
                                                    <Text className="text-xl my-2 font-bold leading-8">
                                                        {this.formatBytes(network)}
                                                    </Text>
                                                </>
                                            ) : (
                                                <Spiner className="my-4" />
                                            )}
                                            <Text className="text-sm text-estela-black-medium">Sum of all jobs</Text>
                                        </Space>
                                    </Card>
                                    <Card bordered={false} className="bg-white h-48 rounded-lg">
                                        <Space direction="vertical">
                                            <Text className="text-base text-estela-black-medium break-words">
                                                PROCESSING TIME USED
                                            </Text>
                                            {projectUseLoaded ? (
                                                <Text className="text-xl my-2 font-bold leading-8">
                                                    {processingTime} seg
                                                </Text>
                                            ) : (
                                                <Spiner className="my-4" />
                                            )}
                                            <Text className="text-sm text-estela-black-medium">Sum of all jobs</Text>
                                        </Space>
                                    </Card>
                                    <Card bordered={false} className="bg-white h-48 rounded-lg">
                                        <Space direction="vertical">
                                            <Text className="text-base text-estela-black-medium">STORAGE USED</Text>
                                            {projectUseLoaded ? (
                                                <Text className="text-xl my-2 font-bold leading-8">
                                                    {this.formatBytes(storage)}
                                                </Text>
                                            ) : (
                                                <Spiner className="my-4" />
                                            )}
                                            <Text className="text-sm text-estela-black-medium">Sum of all jobs</Text>
                                        </Space>
                                    </Card>
                                </Space>
                            </Col>
                            <Col className="bg-metal col-span-4">
                                <Card bordered={false} className="bg-white rounded-2xl">
                                    <Row className="flow-root">
                                        <Text className="float-left text-base font-medium text-estela-black-medium m-4 sm:m-2">
                                            RECENT JOBS
                                        </Text>
                                        <Link
                                            className="float-right m-4 sm:m-2 text-estela-blue-full hover:text-estela-blue-medium font-medium text-base"
                                            to={`/projects/${this.projectId}/jobs`}
                                        >
                                            See all
                                        </Link>
                                    </Row>
                                    <Table
                                        columns={this.columns}
                                        dataSource={jobs}
                                        pagination={false}
                                        className="mx-4 sm:m-2"
                                    />
                                    <Pagination
                                        className="text-center"
                                        defaultCurrent={1}
                                        total={count}
                                        current={current}
                                        pageSize={this.PAGE_SIZE}
                                        onChange={this.onPageChange}
                                        showSizeChanger={false}
                                        itemRender={PaginationItem}
                                    />
                                </Card>
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
