import React, { Component, ReactElement } from "react";
import { Layout, Pagination, Typography, Row, Space, Table } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsReadRequest,
    ApiProjectsCronjobsRequest,
    Project,
    ProjectCronJob,
    SpiderCronJob,
} from "../../services/api";
import { authNotification, resourceNotAllowedNotification, ProjectSidenav, Spin } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Title, Text } = Typography;

interface Ids {
    sid: number | undefined;
    cid: number | undefined;
}

interface TagsData {
    name: string;
}

interface SpiderCronJobData {
    id: Ids;
    key: number | undefined;
    date: string;
    status: string | undefined;
    schedule: string | undefined;
    tags: TagsData[] | undefined;
}

interface ProjectJobListPageState {
    name: string;
    cronjobs: SpiderCronJobData[];
    loaded: boolean;
    count: number;
    current: number;
}

interface RouteParams {
    projectId: string;
}

export class ProjectCronJobListPage extends Component<RouteComponentProps<RouteParams>, ProjectJobListPageState> {
    PAGE_SIZE = 10;
    state: ProjectJobListPageState = {
        name: "",
        cronjobs: [],
        loaded: false,
        count: 0,
        current: 0,
    };

    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    columns = [
        {
            title: "CronJob ID",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}/cronjobs/${id.cid}`}>{id.cid}</Link>
            ),
        },
        {
            title: "Spider",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}`}>{id.sid}</Link>
            ),
        },
        {
            title: "Date",
            key: "date",
            dataIndex: "date",
        },
        {
            title: "Schedule",
            key: "schedule",
            dataIndex: "schedule",
        },
        {
            title: "Status",
            key: "status",
            dataIndex: "status",
        },
    ];

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
            this.apiService.apiProjectsRead(requestParams).then(
                (response: Project) => {
                    this.setState({ name: response.name });
                },
                (error: unknown) => {
                    console.error(error);
                    resourceNotAllowedNotification();
                },
            );
            this.getCronJobs(1);
        }
    }

    getCronJobs = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsCronjobsRequest = {
            pid: this.projectId,
            page,
            pageSize: this.PAGE_SIZE,
        };

        await this.apiService.apiProjectsCronjobs(requestParams).then((response: ProjectCronJob) => {
            const data = response.results.map((cronjob: SpiderCronJob, iterator: number) => ({
                key: iterator,
                id: { sid: cronjob.spider, cid: cronjob.cjid },
                date: convertDateToString(cronjob.created),
                status: cronjob.status,
                schedule: cronjob.schedule,
                tags: cronjob.ctags,
            }));
            const cronjobs: SpiderCronJobData[] = data;
            this.setState({ cronjobs: [...cronjobs], loaded: true, count: response.count, current: page });
        });
    };

    onPageChange = async (page: number): Promise<void> => {
        await this.getCronJobs(page);
    };

    render(): JSX.Element {
        const { loaded, name, cronjobs, count, current } = this.state;
        return (
            <Layout className="general-container">
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} path={"/cronjobs"} />
                    <Content className="content-padding">
                        {loaded ? (
                            <Layout className="white-background">
                                <Content>
                                    <Title level={4} className="text-center">
                                        {name}
                                    </Title>
                                    <Row justify="center" className="spider-data">
                                        <Space direction="vertical" size="large">
                                            <Text>
                                                <b>Project ID:</b>
                                                <Link to={`/projects/${this.projectId}`}>&nbsp; {this.projectId}</Link>
                                            </Text>
                                            <Table
                                                columns={this.columns}
                                                dataSource={cronjobs}
                                                pagination={false}
                                                size="middle"
                                            />
                                        </Space>
                                    </Row>
                                    <Pagination
                                        className="pagination"
                                        defaultCurrent={1}
                                        total={count}
                                        current={current}
                                        pageSize={this.PAGE_SIZE}
                                        onChange={this.onPageChange}
                                        showSizeChanger={false}
                                    />
                                </Content>
                            </Layout>
                        ) : (
                            <Spin />
                        )}
                    </Content>
                </Layout>
            </Layout>
        );
    }
}
