import React, { Component } from "react";
import { Layout, Typography, Collapse, Row, Space, Tag, Button } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { ApiService, AuthService } from "../../services";
import {
    ApiProjectsSpidersJobsReadRequest,
    SpiderJobUpdateStatusEnum,
    ApiProjectsSpidersJobsUpdateRequest,
    ApiProjectsSpidersJobsDataListRequest,
    SpiderJob,
    SpiderJobUpdate,
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
const { Panel } = Collapse;

interface Dictionary {
    [Key: string]: string;
}

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

interface JobDetailPageState {
    loaded: boolean;
    name: string | undefined;
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    date: string;
    status: string | undefined;
    cronjob: number | undefined | null;
    stats: Dictionary;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    jobId: string;
}

export class JobDetailPage extends Component<RouteComponentProps<RouteParams>, JobDetailPageState> {
    state: JobDetailPageState = {
        loaded: false,
        name: "",
        args: [],
        envVars: [],
        tags: [],
        date: "",
        status: "",
        cronjob: null,
        stats: {},
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    jobId: number = parseInt(this.props.match.params.jobId);
    newJobId: string = this.props.match.params.jobId;

    async componentDidMount(): Promise<void> {
        if (!AuthService.getAuthToken()) {
            authNotification();
        } else {
            const requestParams: ApiProjectsSpidersJobsReadRequest = {
                pid: this.projectId,
                sid: this.spiderId,
                jid: this.jobId,
            };
            this.apiService.apiProjectsSpidersJobsRead(requestParams).then(
                async (response: SpiderJob) => {
                    let args = response.args;
                    if (args === undefined) {
                        args = [];
                    }
                    let envVars = response.envVars;
                    if (envVars === undefined) {
                        envVars = [];
                    }
                    let tags = response.tags;
                    if (tags === undefined) {
                        tags = [];
                    }
                    this.setState({
                        name: response.name,
                        args: [...args],
                        envVars: [...envVars],
                        tags: [...tags],
                        date: convertDateToString(response.created),
                        status: response.jobStatus,
                        cronjob: response.cronjob,
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

    stopJob = (): void => {
        const request: ApiProjectsSpidersJobsUpdateRequest = {
            jid: this.jobId,
            sid: this.spiderId,
            pid: this.projectId,
            data: {
                jid: this.jobId,
                status: SpiderJobUpdateStatusEnum.Stopped,
            },
        };
        this.apiService.apiProjectsSpidersJobsUpdate(request).then(
            (response: SpiderJobUpdate) => {
                this.setState({ status: response.status });
            },
            (error: unknown) => {
                console.error(error);
                incorrectDataNotification();
            },
        );
    };

    getStats = (key: string | string[]): void => {
        if (key.length === 0) {
            return;
        }
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: this.newJobId,
            type: "logs",
        };
        this.apiService.apiProjectsSpidersJobsDataList(requestParams).then(
            (response) => {
                let data: Dictionary = {};
                console.log(response.results?.length);
                if (response.results?.length) {
                    const safe_data: unknown[] = response.results ?? [];
                    data = safe_data[0] as Dictionary;
                    this.setState({ stats: data });
                }
            },
            (error: unknown) => {
                console.error(error);
                resourceNotAllowedNotification();
            },
        );
    };

    render(): JSX.Element {
        const { loaded, args, envVars, tags, date, status, cronjob, stats } = this.state;
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
                                        Job {this.jobId}
                                    </Title>
                                    <Row justify="center" className="spider-data">
                                        <Space direction="vertical" size="large">
                                            <Text>
                                                <b>Job ID:</b>&nbsp; {this.jobId}
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
                                                <b>Cronjob:</b>
                                                <Link
                                                    to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${cronjob}`}
                                                >
                                                    &nbsp; {cronjob}
                                                </Link>
                                            </Text>
                                            <Text>
                                                <b>Date:</b>&nbsp; {date}
                                            </Text>
                                            <Text>
                                                <b>Status:</b>&nbsp; {status}
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
                                            <Link
                                                to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${this.jobId}/data`}
                                            >
                                                <Button type="primary" className="create-new-job">
                                                    Go to spider job data
                                                </Button>
                                            </Link>
                                            <Button danger className="stop-job" onClick={this.stopJob}>
                                                <div>Stop Job</div>
                                            </Button>
                                            <Collapse onChange={this.getStats}>
                                                <Panel header="Scrapy Stats" key="1">
                                                    <Text>
                                                        {Object.keys(stats).map((key, idx) => {
                                                            return (
                                                                <div key={idx}>
                                                                    <b>{key}</b>: {stats[key]}
                                                                </div>
                                                            );
                                                        })}
                                                    </Text>
                                                </Panel>
                                            </Collapse>
                                        </Space>
                                    </Row>
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
