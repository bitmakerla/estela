import React, { Component } from "react";
import moment from "moment";
import { Layout, Typography, Collapse, Row, Space, Tag, Button, Switch, DatePicker, DatePickerProps } from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
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
    SpiderJobUpdateDataStatusEnum,
} from "../../services/api";
import {
    authNotification,
    resourceNotAllowedNotification,
    incorrectDataNotification,
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
    lifespan: number | undefined;
    totalResponseBytes: number | undefined;
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    date: string;
    created: string | undefined;
    status: string | undefined;
    cronjob: number | undefined | null;
    stats: Dictionary;
    logs: string[];
    count: number;
    current: number;
    dataStatus: string | undefined;
    dataExpiryDays: number | undefined;
    loading_status: boolean;
    modified: boolean;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    jobId: string;
}

export class JobDetailPage extends Component<RouteComponentProps<RouteParams>, JobDetailPageState> {
    PAGE_SIZE = 10;
    dataRequests = "requests";
    dataItems = "items";
    dataLogs = "logs";
    state: JobDetailPageState = {
        loaded: false,
        name: "",
        lifespan: 0,
        totalResponseBytes: 0,
        args: [],
        envVars: [],
        tags: [],
        date: "",
        created: "",
        status: "",
        cronjob: null,
        stats: {},
        logs: [],
        count: 0,
        current: 0,
        dataStatus: "",
        dataExpiryDays: 0,
        loading_status: false,
        modified: false,
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
                        lifespan: response.lifespan,
                        totalResponseBytes: response.totalResponseBytes,
                        args: [...args],
                        envVars: [...envVars],
                        tags: [...tags],
                        date: convertDateToString(response.created),
                        created: `${response.created}`,
                        status: response.jobStatus,
                        cronjob: response.cronjob,
                        loaded: true,
                        dataStatus: response.dataStatus,
                        dataExpiryDays: response.dataExpiryDays == null ? 1 : response.dataExpiryDays,
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

    updateDataExpiry = (): void => {
        this.setState({ loading_status: true });
        const requestData: SpiderJobUpdate = {
            dataStatus:
                this.state.dataStatus == SpiderJobUpdateDataStatusEnum.Persistent
                    ? this.state.dataStatus
                    : SpiderJobUpdateDataStatusEnum.Pending,
            dataExpiryDays: this.state.dataExpiryDays,
        };
        const request: ApiProjectsSpidersJobsUpdateRequest = {
            jid: this.jobId,
            pid: this.projectId,
            sid: this.spiderId,
            data: requestData,
        };
        this.apiService.apiProjectsSpidersJobsUpdate(request).then(
            (response: SpiderJobUpdate) => {
                this.setState({
                    dataStatus: response.dataStatus,
                    dataExpiryDays: response.dataExpiryDays == null ? 1 : response.dataExpiryDays,
                    modified: false,
                    loading_status: false,
                });
            },
            (error: unknown) => {
                console.log(error);
                incorrectDataNotification();
            },
        );
    };

    onChangeData = (): void => {
        const _dataStatus =
            this.state.dataStatus == SpiderJobUpdateDataStatusEnum.Persistent
                ? SpiderJobUpdateDataStatusEnum.Pending
                : SpiderJobUpdateDataStatusEnum.Persistent;
        this.setState({ dataStatus: _dataStatus, modified: true });
    };

    onChangeDay = (value: number): void => {
        this.setState({ dataExpiryDays: value, modified: true });
    };

    disabledDate: RangePickerProps["disabledDate"] = (current) => {
        return current && current < moment().endOf("day");
    };

    onChangeDate: DatePickerProps["onChange"] = (date) => {
        const days = moment.duration(moment(date, "llll").diff(moment(this.state.created, "llll"))).asDays();
        this.setState({ dataExpiryDays: days, modified: true });
    };

    getStats = (key: string | string[]): void => {
        if (key.length === 0) {
            return;
        }
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: this.newJobId,
            type: "stats",
        };
        this.apiService.apiProjectsSpidersJobsDataList(requestParams).then(
            (response) => {
                let data: Dictionary = {};
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
        const {
            loaded,
            args,
            envVars,
            tags,
            date,
            status,
            lifespan,
            totalResponseBytes,
            created,
            cronjob,
            stats,
            dataStatus,
            dataExpiryDays,
            loading_status,
            modified,
        } = this.state;
        return (
            <Layout className="general-container">
                <Layout className="white-background">
                    <ProjectSidenav projectId={this.projectId} path={"/jobs"} />
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
                                            <Text>
                                                <b>Lifespan:</b>&nbsp; {lifespan}
                                            </Text>
                                            <Text>
                                                <b>Total response bytes:</b>&nbsp; {totalResponseBytes}
                                            </Text>
                                            <Text>
                                                <Space direction="vertical">
                                                    <Space direction="horizontal">
                                                        <Text
                                                            disabled={
                                                                dataStatus == SpiderJobUpdateDataStatusEnum.Deleted
                                                            }
                                                        >
                                                            <b>Data Persistent:</b>&nbsp;
                                                            <Switch
                                                                loading={loading_status}
                                                                defaultChecked={
                                                                    dataStatus ==
                                                                    SpiderJobUpdateDataStatusEnum.Persistent
                                                                }
                                                                onChange={this.onChangeData}
                                                                disabled={
                                                                    dataStatus == SpiderJobUpdateDataStatusEnum.Deleted
                                                                }
                                                            />
                                                        </Text>
                                                    </Space>
                                                    <Space direction="horizontal">
                                                        <Text
                                                            disabled={
                                                                dataStatus ==
                                                                    SpiderJobUpdateDataStatusEnum.Persistent ||
                                                                dataStatus == SpiderJobUpdateDataStatusEnum.Deleted
                                                            }
                                                        >
                                                            <b>Date </b>&nbsp;
                                                            <DatePicker
                                                                format="YYYY-MM-DD"
                                                                onChange={this.onChangeDate}
                                                                disabledDate={this.disabledDate}
                                                                defaultValue={moment(created, "llll").add(
                                                                    dataExpiryDays,
                                                                    "days",
                                                                )}
                                                                disabled={
                                                                    dataStatus ==
                                                                        SpiderJobUpdateDataStatusEnum.Persistent ||
                                                                    dataStatus == SpiderJobUpdateDataStatusEnum.Deleted
                                                                }
                                                            />
                                                        </Text>
                                                    </Space>
                                                    {modified && (
                                                        <Button
                                                            type="primary"
                                                            onClick={this.updateDataExpiry}
                                                            size="small"
                                                            loading={loading_status}
                                                        >
                                                            Save
                                                        </Button>
                                                    )}
                                                </Space>
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
                                                to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${this.jobId}/data/${this.dataItems}`}
                                            >
                                                <Button type="primary" className="go-to-job-data">
                                                    Go to spider job items data
                                                </Button>
                                            </Link>
                                            <Link
                                                to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${this.jobId}/data/${this.dataRequests}`}
                                            >
                                                <Button type="primary" className="go-to-job-data">
                                                    Go to spider job request data
                                                </Button>
                                            </Link>
                                            <Link
                                                to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${this.jobId}/data/${this.dataLogs}`}
                                            >
                                                <Button type="primary" className="go-to-job-data">
                                                    Go to spider job logs data
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
                                                                    <b>{key.replace(/\\u002e/g, ".")}</b>: {stats[key]}
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
