import React, { Component, ReactElement } from "react";
import { Layout, Pagination, Typography, Row, Space, Table } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsReadRequest, ApiProjectsJobsRequest, Project, ProjectJob, SpiderJob } from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Title, Text } = Typography;

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

interface ProjectJobListPageState {
    name: string;
    jobs: SpiderJobData[];
    loaded: boolean;
    count: number;
    current: number;
}

interface RouteParams {
    projectId: string;
}

export class ProjectJobListPage extends Component<RouteComponentProps<RouteParams>, ProjectJobListPageState> {
    PAGE_SIZE = 10;
    state: ProjectJobListPageState = {
        name: "",
        jobs: [],
        loaded: false,
        count: 0,
        current: 0,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    columns = [
        {
            title: "Job ID",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}/jobs/${id.jid}`}>{id.jid}</Link>
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
            title: "Cronjob",
            key: "id",
            dataIndex: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}/cronjobs/${id.cid}`}>{id.cid}</Link>
            ),
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
            this.getJobs(1);
        }
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

    onPageChange = async (page: number): Promise<void> => {
        await this.getJobs(page);
    };

    render(): JSX.Element {
        const { loaded, name, jobs, count, current } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} path={"/jobs"} />
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
                                                dataSource={jobs}
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
