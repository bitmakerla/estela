import React, { Component, Fragment, ReactElement } from "react";
import { Layout, Pagination, Row, Table } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import { ApiProjectsReadRequest, ApiProjectsJobsRequest, Project, ProjectJob, SpiderJob } from "../../services/api";
import { authNotification, resourceNotAllowedNotification, ProjectSidenav, Spin } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;

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
        loaded: false,
        count: 0,
        current: 0,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

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
        const { loaded, jobs, count, current } = this.state;
        return (
            <Layout className="general-container">
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} path={"/dashboard"} />
                    <Layout className="bg-metal rounded-t-2xl h-screen">
                        {loaded ? (
                            <Fragment>
                                <Row className="my-6 grid grid-cols-5 text-base mx-10 h-full">
                                    <Layout className="bg-metal col-span-1">
                                        <Content className="white-background mr-5">
                                            <p className="text-base text-silver p-2">BANDWIDTH USED</p>
                                            <p className="text-xl font-bold p-2 leading-8">00 GB</p>
                                        </Content>
                                        <Content className="white-background mt-5 mr-5">
                                            <p className="text-base text-silver p-2">PROCESSING TIME USED</p>
                                            <p className="text-xl font-bold p-2 leading-8">00</p>
                                        </Content>
                                        <Content className="white-background mt-5 mr-5">
                                            <p className="text-base text-silver p-2">STORAGE USED</p>
                                            <p className="text-xl font-bold p-2 leading-8">00 GB</p>
                                        </Content>
                                    </Layout>
                                    <Layout className="bg-metal col-span-4 ">
                                        <Content className="white-background  rounded-2xl h-scree">
                                            <p className="text-base font-medium text-silver m-10">RECENT JOBS</p>
                                            <Table
                                                columns={this.columns}
                                                dataSource={jobs}
                                                pagination={false}
                                                size="large"
                                                className="ml-10 mr-10"
                                            />
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
                                </Row>
                            </Fragment>
                        ) : (
                            <Spin />
                        )}
                    </Layout>
                </Layout>
            </Layout>
        );
    }
}
