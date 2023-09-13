import React, { Component } from "react";
import { Button, Layout, Typography, message, Row, Col, Tabs, Radio } from "antd";
import type { RadioChangeEvent } from "antd";
import { RouteComponentProps, Link } from "react-router-dom";
import { EnvVarsSetting } from "../../components/EnvVarsSettingsPage";

import "./styles.scss";
import CronjobCreateModal from "../CronjobCreateModal";
import JobCreateModal from "../JobCreateModal";
import { ApiService } from "../../services";

import {
    ApiProjectsSpidersReadRequest,
    ApiProjectsSpidersJobsListRequest,
    ApiProjectsSpidersUpdateRequest,
    ApiProjectsDeploysListRequest,
    Deploy,
    Spider,
    SpiderDataStatusEnum,
    SpiderUpdateDataStatusEnum,
    SpiderUpdate,
    SpiderJob,
    SpiderJobArg,
    SpiderJobTag,
    SpiderJobEnvVar,
} from "../../services/api";
import { resourceNotAllowedNotification, Spin } from "../../shared";
import { convertDateToString, handleInvalidDataError } from "../../utils";
import { JobsList } from "../../components";

const { Content } = Layout;
const { Text } = Typography;

interface SpiderData {
    sid: number;
    name: string;
}

interface BaseInfo {
    jid: number | undefined;
    spider: SpiderData;
    cid?: number | null | undefined;
}

interface SpiderJobData {
    info: BaseInfo;
    key: number | undefined;
    date: string;
    status: string | undefined;
    args: SpiderJobArg[] | undefined;
    tags: SpiderJobTag[] | undefined;
}

interface SpiderDetailPageState {
    name: string;
    spider: Spider;
    loaded: boolean;
    count: number;
    current: number;
    optionTab: string;
    tableStatus: boolean[];
    jobs: SpiderJobData[];
    waitingJobs: SpiderJobData[];
    queueJobs: SpiderJobData[];
    runningJobs: SpiderJobData[];
    completedJobs: SpiderJobData[];
    stoppedJobs: SpiderJobData[];
    errorJobs: SpiderJobData[];
    scheduledJobsCount: number;
    spiderCreationDate: string;
    persistenceChanged: boolean;
    newDataStatus: SpiderUpdateDataStatusEnum | undefined;
    dataStatus: SpiderDataStatusEnum | SpiderUpdateDataStatusEnum | undefined;
    dataExpiryDays: number | null | undefined;
    envVars: SpiderJobEnvVar[];
}

interface RouteParams {
    projectId: string;
    spiderId: string;
}

interface OptionDataPersistance {
    label: string;
    key: number;
    value: number;
}

export class SpiderDetailPage extends Component<RouteComponentProps<RouteParams>, SpiderDetailPageState> {
    PAGE_SIZE = 10;
    center = "center";
    state: SpiderDetailPageState = {
        name: "",
        jobs: [],
        spider: {
            sid: 0,
            name: "",
            project: "",
            dataExpiryDays: 0,
            dataStatus: SpiderDataStatusEnum.Persistent,
        },
        envVars: [],
        loaded: false,
        count: 0,
        current: 0,
        optionTab: "overview",
        waitingJobs: [],
        queueJobs: [],
        runningJobs: [],
        completedJobs: [],
        stoppedJobs: [],
        errorJobs: [],
        spiderCreationDate: "",
        scheduledJobsCount: 0,
        dataStatus: undefined,
        dataExpiryDays: 1,
        persistenceChanged: false,
        newDataStatus: undefined,
        tableStatus: new Array<boolean>(5).fill(true),
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;

    async componentDidMount(): Promise<void> {
        const requestParams: ApiProjectsSpidersReadRequest = { pid: this.projectId, sid: parseInt(this.spiderId) };
        this.apiService.apiProjectsSpidersRead(requestParams).then(
            async (response: Spider) => {
                const data = await this.getSpiderJobs(1);
                const waitingJobs = data.data.filter((job: SpiderJobData) => job.status === "WAITING");
                const queueJobs = data.data.filter((job: SpiderJobData) => job.status === "IN_QUEUE");
                const runningJobs = data.data.filter((job: SpiderJobData) => job.status === "RUNNING");
                const completedJobs = data.data.filter((job: SpiderJobData) => job.status === "COMPLETED");
                const stoppedJobs = data.data.filter((job: SpiderJobData) => job.status === "STOPPED");
                const errorJobs = data.data.filter((job: SpiderJobData) => job.status === "ERROR");

                const scheduledJobsCount = data.data
                    .filter((job: SpiderJobData) => job.info.cid !== null && job.info.cid !== undefined)
                    .map((job: SpiderJobData) => job.info.cid)
                    .filter((cronjob, index, self) => {
                        return self.indexOf(cronjob) === index;
                    }).length;

                const tableStatus = [
                    !(waitingJobs.length === 0),
                    !(queueJobs.length === 0),
                    !(runningJobs.length === 0),
                    !(completedJobs.length === 0),
                    !(stoppedJobs.length === 0),
                    !(errorJobs.length === 0),
                ];

                const jobs: SpiderJobData[] = data.data;
                let envVars = response.envVars || [];
                envVars = envVars.map((envVar: SpiderJobEnvVar) => {
                    return {
                        name: envVar.name,
                        value: envVar.masked ? "__MASKED__" : envVar.value,
                        masked: envVar.masked,
                    };
                });
                this.setState({
                    spider: response,
                    name: response.name,
                    dataStatus: response.dataStatus,
                    dataExpiryDays: response.dataExpiryDays,
                    envVars: envVars,
                    jobs: [...jobs],
                    count: data.count,
                    current: data.current,
                    loaded: true,
                    tableStatus: [...tableStatus],
                    waitingJobs: [...waitingJobs],
                    queueJobs: [...queueJobs],
                    runningJobs: [...runningJobs],
                    completedJobs: [...completedJobs],
                    stoppedJobs: [...stoppedJobs],
                    errorJobs: [...errorJobs],
                    scheduledJobsCount: scheduledJobsCount,
                });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
        const requestParamsDeploys: ApiProjectsDeploysListRequest = { pid: this.projectId };
        this.apiService.apiProjectsDeploysList(requestParamsDeploys).then(
            (results) => {
                const deploys: Deploy[] = results.results;
                const deploysAssociated = deploys.filter((deploy: Deploy) => {
                    const spiders: Spider[] = deploy.spiders || [];
                    return spiders.some((spider: Spider) => spider.sid?.toString() === this.spiderId);
                });
                const oldestDeployDate: Date =
                    deploysAssociated.reduce((d1, d2) => {
                        const date1: Date = d1?.created || new Date();
                        const date2: Date = d2?.created || new Date();
                        return date1 < date2 ? d1 : d2;
                    })?.created || new Date();

                this.setState({ spiderCreationDate: convertDateToString(oldestDeployDate) });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    }

    getSpiderJobs = async (page: number): Promise<{ data: SpiderJobData[]; count: number; current: number }> => {
        const requestParams: ApiProjectsSpidersJobsListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            page: page,
            pageSize: this.PAGE_SIZE,
        };
        const response = await this.apiService.apiProjectsSpidersJobsList(requestParams);
        const data: SpiderJobData[] = response.results.map((job: SpiderJob, iterator: number) => ({
            key: iterator,
            info: {
                jid: job.jid,
                spider: job.spider as unknown as SpiderData,
                cid: job.cronjob,
            },
            args: job.args,
            date: convertDateToString(job.created),
            tags: job.tags,
            status: job.jobStatus,
        }));
        return { data, count: response.count, current: page };
    };

    changePersistence = (): void => {
        const requestData: SpiderUpdate = {
            dataStatus: this.state.newDataStatus,
            dataExpiryDays: Number(this.state.dataExpiryDays),
        };
        const request: ApiProjectsSpidersUpdateRequest = {
            pid: this.projectId,
            sid: Number(this.spiderId),
            data: requestData,
        };
        this.apiService.apiProjectsSpidersUpdate(request).then(
            (response) => {
                message.success("Data persistence changed");
                this.setState({
                    dataStatus: response.dataStatus,
                    dataExpiryDays: response.dataExpiryDays,
                    persistenceChanged: false,
                });
            },
            (error: unknown) => {
                handleInvalidDataError(error);
            },
        );
    };

    onDetailMenuTabChange = (option: string) => {
        this.setState({
            optionTab: option,
        });
    };

    onPageChange = async (page: number): Promise<void> => {
        this.setState({ loaded: false });
        const data = await this.getSpiderJobs(page);

        const waitingJobs = data.data.filter((job: SpiderJobData) => job.status === "WAITING");
        const queueJobs = data.data.filter((job: SpiderJobData) => job.status === "IN_QUEUE");
        const runningJobs = data.data.filter((job: SpiderJobData) => job.status === "RUNNING");
        const completedJobs = data.data.filter((job: SpiderJobData) => job.status === "COMPLETED");
        const stoppedJobs = data.data.filter((job: SpiderJobData) => job.status === "STOPPED");
        const errorJobs = data.data.filter((job: SpiderJobData) => job.status === "ERROR");

        const tableStatus = [
            !(waitingJobs.length === 0),
            !(queueJobs.length === 0),
            !(runningJobs.length === 0),
            !(completedJobs.length === 0),
            !(stoppedJobs.length === 0),
            !(errorJobs.length === 0),
        ];

        const jobs: SpiderJobData[] = data.data;
        this.setState({
            jobs: [...jobs],
            count: data.count,
            current: data.current,
            loaded: true,
            tableStatus: [...tableStatus],
            waitingJobs: [...waitingJobs],
            queueJobs: [...queueJobs],
            runningJobs: [...runningJobs],
            completedJobs: [...completedJobs],
            stoppedJobs: [...stoppedJobs],
            errorJobs: [...errorJobs],
        });
    };

    onPersistenceChange = (e: RadioChangeEvent): void => {
        this.setState({ persistenceChanged: true });
        if (e.target.value === 720) {
            this.setState({ newDataStatus: SpiderUpdateDataStatusEnum.Persistent });
        } else {
            this.setState({ newDataStatus: SpiderUpdateDataStatusEnum.Pending, dataExpiryDays: e.target.value });
        }
    };

    onChangeStatus = (index: number, count: number) => {
        if (count === 0) {
            const tableStatus = this.state.tableStatus;
            tableStatus[index] = !tableStatus[index];
            this.setState({ tableStatus: tableStatus });
        }
    };

    overview = (): React.ReactNode => {
        const {
            tableStatus,
            jobs,
            count,
            current,
            waitingJobs,
            queueJobs,
            runningJobs,
            completedJobs,
            stoppedJobs,
            errorJobs,
            spiderCreationDate,
            scheduledJobsCount,
        } = this.state;
        return (
            <Content className="my-4">
                <Row className="my-6 grid grid-cols-4 text-base h-full">
                    <Layout className="bg-metal col-span-1 h-44">
                        <Content className="white-background mr-5 p-3 rounded-lg">
                            <p className="text-base text-silver p-2">SCHEDULED JOBS</p>
                            <p className="text-xl font-bold p-2 leading-8">{scheduledJobsCount}</p>
                        </Content>
                    </Layout>
                    <Layout className="bg-metal col-span-1 h-44">
                        <Content className="white-background mr-5 p-3 rounded-lg">
                            <p className="text-base text-silver p-2">JOBS</p>
                            <p className="text-xl font-bold p-2 leading-8">{jobs.length}</p>
                        </Content>
                    </Layout>
                    <Layout className="bg-metal col-span-2 h-44">
                        <Content className="white-background mr-5 p-3 rounded-lg">
                            <p className="text-base text-silver p-2">DETAILS</p>
                            <div className="grid grid-cols-3 p-2 rounded-lg">
                                <div className="col-span-1">
                                    <p className="text-sm font-bold">Spider ID</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-silver">{this.spiderId}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 p-2 bg-estela-blue-low rounded-lg">
                                <div className="col-span-1">
                                    <p className="text-sm font-bold">Project ID</p>
                                </div>
                                <div className="col-span-2">
                                    <Link
                                        to={`/projects/${this.projectId}/dashboard`}
                                        className="text-estela-blue-medium text-sm"
                                    >
                                        {this.projectId}
                                    </Link>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 p-2 rounded-lg">
                                <div className="col-span-1">
                                    <p className="text-sm font-bold">Creation date</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-silver">{spiderCreationDate}</p>
                                </div>
                            </div>
                        </Content>
                    </Layout>
                </Row>
                <JobsList
                    projectId={this.projectId}
                    tableStatus={tableStatus}
                    waitingJobs={waitingJobs}
                    queueJobs={queueJobs}
                    runningJobs={runningJobs}
                    completedJobs={completedJobs}
                    stoppedJobs={stoppedJobs}
                    errorJobs={errorJobs}
                    count={count}
                    current={current}
                    pageSize={this.PAGE_SIZE}
                    onPageChange={this.onPageChange}
                    onChangeStatus={this.onChangeStatus}
                />
            </Content>
        );
    };

    dataPersistenceOptions = [
        { label: "1 day", key: 1, value: 1 },
        { label: "1 week", key: 2, value: 7 },
        { label: "1 month", key: 3, value: 30 },
        { label: "3 months", key: 4, value: 90 },
        { label: "6 months", key: 5, value: 180 },
        { label: "1 year", key: 6, value: 365 },
        { label: "Forever", key: 7, value: 720 },
    ];

    settings = (): React.ReactNode => {
        const { dataStatus, dataExpiryDays, persistenceChanged, envVars } = this.state;
        return (
            <Row justify="center" className="bg-white rounded-lg">
                <Content className="content-padding">
                    <Row className="bg-white rounded-lg">
                        <Col span={24}>
                            <div className="lg:m-4 md:mx-4 m-2">
                                <p className="text-2xl text-black">Data persistence</p>
                                <p className="text-sm my-2 text-estela-black-medium">
                                    Data persistence will be applied to all jobs and scheduled jobs by default.
                                </p>
                                <Row align="middle">
                                    <Col xs={24} sm={24} md={24} lg={5}>
                                        <p className="text-sm my-2 text-estela-black-full">General Data Persistent</p>
                                    </Col>
                                    <Col xs={24} sm={24} md={24} lg={19}>
                                        <Radio.Group
                                            defaultValue={
                                                dataStatus === SpiderDataStatusEnum.Persistent ? 720 : dataExpiryDays
                                            }
                                            onChange={this.onPersistenceChange}
                                            className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 lg:my-6 my-4"
                                        >
                                            {this.dataPersistenceOptions.map((option: OptionDataPersistance) => (
                                                <Radio.Button className="text-sm" key={option.key} value={option.value}>
                                                    {option.label}
                                                </Radio.Button>
                                            ))}
                                        </Radio.Group>
                                    </Col>
                                </Row>
                                <div className="h-12 w-3/5">
                                    <Button
                                        block
                                        htmlType="submit"
                                        disabled={!persistenceChanged}
                                        onClick={this.changePersistence}
                                        className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md text-base min-h-full"
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </Col>
                    </Row>
                    <EnvVarsSetting
                        projectId={this.projectId}
                        spiderId={this.spiderId}
                        envVarsData={envVars}
                        level="spider"
                    />
                </Content>
            </Row>
        );
    };

    render(): JSX.Element {
        const { loaded, name, optionTab } = this.state;
        return (
            <Content className="bg-metal rounded-2xl">
                {loaded ? (
                    <Layout className="white-background">
                        <Content className="bg-metal rounded-2xl">
                            <Content className="lg:m-10 md:mx-6 mx-2">
                                <Row className="flow-root my-6 space-x-4">
                                    <Col className="float-left">
                                        <Text className="text-estela-black-medium text-xl">{name}</Text>
                                    </Col>
                                    <Col className="float-right">
                                        <CronjobCreateModal
                                            openModal={false}
                                            spider={this.state.spider}
                                            projectId={this.projectId}
                                        />
                                    </Col>
                                    <Col className="float-right">
                                        <JobCreateModal
                                            openModal={false}
                                            spider={this.state.spider}
                                            projectId={this.projectId}
                                        />
                                    </Col>
                                </Row>
                                <Tabs
                                    defaultActiveKey={optionTab}
                                    onChange={this.onDetailMenuTabChange}
                                    items={[
                                        {
                                            label: "Overview",
                                            key: "overview",
                                            children: this.overview(),
                                        },
                                        {
                                            label: "Settings",
                                            key: "settings",
                                            children: this.settings(),
                                        },
                                    ]}
                                />
                            </Content>
                        </Content>
                    </Layout>
                ) : (
                    <Spin />
                )}
            </Content>
        );
    }
}
