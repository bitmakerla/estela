import React, { Component, ReactElement } from "react";
import { Layout, Typography, Row, Space, Tag, Pagination, Table, Switch, Button } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersCronjobsUpdateRequest,
    ApiProjectsSpidersCronjobsReadRequest,
    ApiProjectsSpidersJobsListRequest,
    ApiProjectsSpidersCronjobsRunOnceRequest,
    SpiderCronJob,
    SpiderJob,
    SpiderCronJobUpdateStatusEnum,
    SpiderCronJobUpdate,
} from "../../services/api";
import {
    authNotification,
    resourceNotAllowedNotification,
    incorrectDataNotification,
    Header,
    ProjectSidenav,
    Spin,
} from "../../shared";
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

interface TagsData {
    name: string;
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
    tags: TagsData[];
    status: string | undefined;
    jobs: SpiderJobData[];
    count: number;
    current: number;
    schedule: string | undefined;
    unique_collection: boolean | undefined;
    new_schedule: string | undefined;
    loading_status: boolean;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    cronjobId: string;
}

export class CronJobDetailPage extends Component<RouteComponentProps<RouteParams>, CronJobDetailPageState> {
    PAGE_SIZE = 10;
    initial_schedule = "";
    state = {
        loaded: false,
        name: "",
        args: [],
        envVars: [],
        tags: [],
        jobs: [],
        status: "",
        schedule: "",
        unique_collection: false,
        new_schedule: "",
        count: 0,
        current: 0,
        loading_status: false,
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
                    let tags = response.ctags;
                    if (tags === undefined) {
                        tags = [];
                    }
                    this.initial_schedule = response.schedule || "";
                    const data = await this.getJobs(1);
                    const jobs: SpiderJobData[] = data.data;
                    this.setState({
                        name: response.name,
                        args: [...args],
                        envVars: [...envVars],
                        tags: [...tags],
                        status: response.status,
                        schedule: response.schedule,
                        unique_collection: response.uniqueCollection,
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

    handleInputChange = (event: string): void => {
        this.setState({ new_schedule: event });
        this.updateSchedule(event);
    };

    updateSchedule = (_schedule: string): void => {
        const requestData: SpiderCronJobUpdate = {
            schedule: _schedule,
        };
        const request: ApiProjectsSpidersCronjobsUpdateRequest = {
            cjid: this.cronjobId,
            pid: this.projectId,
            sid: this.spiderId,
            data: requestData,
        };
        this.apiService.apiProjectsSpidersCronjobsUpdate(request).then(
            (response: SpiderCronJobUpdate) => {
                this.setState({ schedule: response.schedule });
            },
            (error: unknown) => {
                console.log(error);
                incorrectDataNotification();
            },
        );
    };

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

    runOnce = (): void => {
        const requestParams: ApiProjectsSpidersCronjobsRunOnceRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            cjid: this.cronjobId,
        };
        this.apiService.apiProjectsSpidersCronjobsRunOnce(requestParams).then(
            async (response: SpiderCronJob) => {
                console.log(response);
                const data = await this.getJobs(1);
                const jobs: SpiderJobData[] = data.data;
                this.setState({ jobs: [...jobs] });
            },
            (error: unknown) => {
                console.log(error);
            },
        );
    };

    updateStatus = (active: boolean): void => {
        console.log(active);
        this.setState({ loading_status: true });
        let _status = SpiderCronJobUpdateStatusEnum.Disabled;
        if (this.state.status == _status) {
            _status = SpiderCronJobUpdateStatusEnum.Active;
        }
        const request: ApiProjectsSpidersCronjobsUpdateRequest = {
            cjid: this.cronjobId,
            sid: this.spiderId,
            pid: this.projectId,
            data: {
                status: _status,
                schedule: this.state.schedule,
            },
        };
        this.apiService.apiProjectsSpidersCronjobsUpdate(request).then((response) => {
            this.setState({ status: response.status, loading_status: false });
            console.log("Everything is gona be okay");
        });
    };

    render(): JSX.Element {
        const {
            loaded,
            args,
            envVars,
            tags,
            status,
            count,
            current,
            jobs,
            schedule,
            unique_collection,
            loading_status,
        } = this.state;
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
                                                <b>Active:</b>&nbsp;
                                                <Switch
                                                    loading={loading_status}
                                                    defaultChecked={status == SpiderCronJobUpdateStatusEnum.Active}
                                                    onChange={this.updateStatus}
                                                />
                                            </Text>
                                            <Text
                                                editable={{
                                                    tooltip: "click to edit text",
                                                    onChange: this.handleInputChange,
                                                }}
                                            >
                                                <b>Schedule:</b>&nbsp; {schedule}
                                            </Text>
                                            <Text>
                                                <b>Unique Collection:</b>&nbsp;
                                                {unique_collection ? "Yes" : "No"}
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
                                            <Space direction="vertical">
                                                <b>Tags</b>
                                                <Space direction="horizontal">
                                                    {tags.map((tag: TagsData, id) => (
                                                        <Tag key={id}>{tag.name}</Tag>
                                                    ))}
                                                </Space>
                                            </Space>
                                            <Button type="primary" className="go-to-spiders" onClick={this.runOnce}>
                                                Run once
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
