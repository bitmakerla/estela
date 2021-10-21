import React, { Component, ReactElement } from "react";
import { Layout, Typography, Row, Space, Tag, Pagination, Table, Button } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersCronjobsUpdateRequest,
    ApiProjectsSpidersCronjobsReadRequest,
    ApiProjectsSpidersJobsListRequest,
    SpiderCronJob,
    SpiderJob,
    SpiderCronJobUpdateStatusEnum,
} from "../../services/api";
import { authNotification, resourceNotAllowedNotification, Header, ProjectSidenav, Spin } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Text, Title } = Typography;

interface ArgsData {
    name: string;
    value: string;
}

interface EnvVarsData {
    name: string;
    value: string;
}

interface SpiderJobData {
    id: number | undefined;
    key: number | undefined;
    date: string;
    status: string | undefined;
    cronjob: number | null | undefined;
}

interface CronJobDetailPageState {
    loaded: boolean;
    name: string | undefined;
    args: ArgsData[];
    envVars: EnvVarsData[];
    status: string | undefined;
    jobs: SpiderJobData[];
    count: number;
    current: number;
    schedule: string | undefined;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    cronjobId: string;
}

export class CronJobDetailPage extends Component<RouteComponentProps<RouteParams>, CronJobDetailPageState> {
    PAGE_SIZE = 10;
    state = {
        loaded: false,
        name: "",
        args: [],
        envVars: [],
        jobs: [],
        status: "",
        schedule: "",
        count: 0,
        current: 0,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    cronjobId: string = this.props.match.params.cronjobId;
    columns = [
        {
            title: "Job ID",
            dataIndex: "id",
            key: "id",
            render: (jobID: number): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${jobID}`}>{jobID}</Link>
            ),
        },
        {
            title: "Date",
            dataIndex: "date",
            key: "date",
        },
        {
            title: "Cronjob",
            key: "cronjob",
            dataIndex: "cronjob",
            render: (cronjob: number): ReactElement =>
                cronjob ? (
                    <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${cronjob}`}>
                        {cronjob}
                    </Link>
                ) : (
                    <div></div>
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
            const requestParams: ApiProjectsSpidersCronjobsReadRequest = {
                pid: this.projectId,
                sid: this.spiderId,
                cjid: this.cronjobId,
            };
            this.apiService.apiProjectsSpidersCronjobsRead(requestParams).then(
                async (response: SpiderCronJob) => {
                    let args = response.cargs;
                    if (args === undefined) {
                        args = [];
                    }
                    let envVars = response.cenvVars;
                    if (envVars === undefined) {
                        envVars = [];
                    }
                    const data = await this.getJobs(1);
                    const jobs: SpiderJobData[] = data.data;
                    this.setState({
                        name: response.name,
                        args: [...args],
                        envVars: [...envVars],
                        status: response.status,
                        schedule: response.schedule,
                        jobs: [...jobs],
                        count: data.count,
                        current: data.current,
                        loaded: true,
                    });
                },
                (error: unknown) => {
                    console.error(error);
                    resourceNotAllowedNotification();
                },
            );
        }
    }

    getJobs = async (page: number): Promise<{ data: SpiderJobData[]; count: number; current: number }> => {
        const requestParams: ApiProjectsSpidersJobsListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            page,
            pageSize: this.PAGE_SIZE,
            cronjob: parseInt(this.cronjobId),
        };
        const response = await this.apiService.apiProjectsSpidersJobsList(requestParams);
        const data = response.results.map((job: SpiderJob, iterator: number) => ({
            key: iterator,
            id: job.jid,
            args: job.args,
            date: convertDateToString(job.created),
            status: job.jobStatus,
            cronjob: job.cronjob,
        }));
        return { data, count: response.count, current: page };
    };

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        const data = await this.getJobs(page);
        const jobs: SpiderJobData[] = data.data;
        this.setState({
            jobs: [...jobs],
            count: data.count,
            current: data.current,
            loaded: true,
        });
    };

    updateStatus = (): void => {
        status = SpiderCronJobUpdateStatusEnum.Disabled;
        if (this.state.status == status) {
            status = SpiderCronJobUpdateStatusEnum.Active;
        }
        const request: ApiProjectsSpidersCronjobsUpdateRequest = {
            cjid: this.cronjobId,
            sid: this.spiderId,
            pid: this.projectId,
            data: {
                status: SpiderCronJobUpdateStatusEnum.Disabled,
                schedule: this.state.schedule,
            },
        };
        this.apiService.apiProjectsSpidersCronjobsUpdate(request).then((response) => {
            this.setState({ status: response.status });
        });
    };

    render(): JSX.Element {
        const { loaded, args, envVars, status, count, current, jobs, schedule } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} />
                    <Content className="content-padding">
                        {loaded ? (
                            <Layout className="white-background">
                                <Content>
                                    <Title level={5} className="text-center">
                                        CronJob {this.cronjobId}
                                    </Title>
                                    <Row justify="center" className="cronjob-data">
                                        <Space direction="vertical" size="large">
                                            <Text>
                                                <b>CronJob ID:</b>&nbsp; {this.cronjobId}
                                            </Text>
                                            <Text>
                                                <b>Spider ID:</b>&nbsp;
                                                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}`}>
                                                    {this.spiderId}
                                                </Link>
                                            </Text>
                                            <Text>
                                                <b>Project ID:</b>
                                                <Link to={`/projects/${this.projectId}`}>&nbsp; {this.projectId}</Link>
                                            </Text>
                                            <Text>
                                                <b>Status:</b>&nbsp; {status}
                                            </Text>
                                            <Text>
                                                <b>Schedule:</b>&nbsp; {schedule}
                                            </Text>
                                            <Space direction="vertical">
                                                <b>Arguments</b>
                                                {args.map((arg: ArgsData, id) => (
                                                    <Tag key={id}>
                                                        {arg.name}: {arg.value}
                                                    </Tag>
                                                ))}
                                            </Space>
                                            <Space direction="vertical">
                                                <b>Environment variables</b>
                                                {envVars.map((envVar: EnvVarsData, id) => (
                                                    <Tag key={id}>
                                                        {envVar.name}: {envVar.value}
                                                    </Tag>
                                                ))}
                                            </Space>
                                            <Button danger className="create-new-job" onClick={this.updateStatus}>
                                                {status == SpiderCronJobUpdateStatusEnum.Active ? (
                                                    <div>Disable CronJob</div>
                                                ) : (
                                                    <div>Enable CronJob</div>
                                                )}
                                            </Button>
                                        </Space>
                                    </Row>
                                    <Row justify="center" className="cronjob-data">
                                        <Space direction="vertical" size="large">
                                            <Table columns={this.columns} dataSource={jobs} pagination={false} />
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
