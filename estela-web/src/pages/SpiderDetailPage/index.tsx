import React, { Component, ReactElement } from "react";
import {
    Button,
    Layout,
    Pagination,
    Typography,
    message,
    Row,
    Table,
    Col,
    Tabs,
    Radio,
    Checkbox,
    Space,
    Tag,
} from "antd";
import type { RadioChangeEvent } from "antd";
import { RouteComponentProps, Link } from "react-router-dom";

import "./styles.scss";
import CronjobCreateModal from "../CronjobCreateModal";
import JobCreateModal from "../JobCreateModal";
import { ApiService } from "../../services";
import Setting from "../../assets/icons/setting.svg";
import Filter from "../../assets/icons/filter.svg";

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
} from "../../services/api";
import { resourceNotAllowedNotification, Spin, PaginationItem } from "../../shared";
import { convertDateToString, handleInvalidDataError } from "../../utils";

const { Content } = Layout;
const { Text } = Typography;

const waiting = 0;
const queued = 1;
const running = 2;
const completed = 3;
const withError = 4;

interface SpiderData {
    sid: number;
    name: string;
}

interface SpiderJobData {
    id: number | null | undefined;
    key: number | null | undefined;
    spider: SpiderData;
    jobStatus: string | null | undefined;
    cronjob: number | null | undefined;
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
    errorJobs: SpiderJobData[];
    scheduledJobsCount: number;
    spiderCreationDate: string;
    persistenceChanged: boolean;
    newDataStatus: SpiderUpdateDataStatusEnum | undefined;
    dataStatus: SpiderDataStatusEnum | SpiderUpdateDataStatusEnum | undefined;
    dataExpiryDays: number | null | undefined;
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
        loaded: false,
        count: 0,
        current: 0,
        optionTab: "overview",
        waitingJobs: [],
        queueJobs: [],
        runningJobs: [],
        completedJobs: [],
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

    columns = [
        {
            title: "JOB",
            dataIndex: "id",
            key: "id",
            render: (jobID: number): ReactElement => (
                <Link
                    to={`/projects/${this.projectId}/spiders/${this.spiderId}/jobs/${jobID}`}
                    className="text-estela-blue-medium"
                >
                    Job-{jobID}
                </Link>
            ),
        },
        {
            title: "SPIDER",
            dataIndex: "spider",
            key: "spider",
            render: (spider: SpiderData): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${this.spiderId}`} className="text-estela-blue-medium">
                    {spider.name}
                </Link>
            ),
        },
        {
            title: "SCHEDULED JOB",
            dataIndex: "cronjob",
            key: "cronjob",
            render: (cronjob: number): ReactElement =>
                cronjob ? (
                    <Link
                        to={`/projects/${this.projectId}/spiders/${this.spiderId}/cronjobs/${cronjob}`}
                        className="text-estela-blue-medium"
                    >
                        Sche-Job-{cronjob}
                    </Link>
                ) : (
                    <span className="text-xs text-estela-black-medium">Not associated</span>
                ),
        },
        {
            title: "ARGUMENTS",
            dataIndex: "args",
            key: "args",
            render: (args: SpiderJobArg[]): ReactElement =>
                args.length !== 0 ? (
                    <>
                        {args.map((arg, index) => {
                            return (
                                <span key={index} className="text-xs text-estela-black-medium">
                                    {arg.name}={arg.value}
                                </span>
                            );
                        })}
                    </>
                ) : (
                    <></>
                ),
        },
        {
            title: "TAGS",
            dataIndex: "tags",
            key: "tags",
            render: (tags: SpiderJobTag[]): ReactElement =>
                tags.length !== 0 ? (
                    <>
                        {tags.map((tag, index) => {
                            return (
                                <span key={index} className="text-xs text-estela-black-medium">
                                    {tag.name}
                                </span>
                            );
                        })}
                    </>
                ) : (
                    <></>
                ),
        },
    ];

    async componentDidMount(): Promise<void> {
        const requestParams: ApiProjectsSpidersReadRequest = { pid: this.projectId, sid: parseInt(this.spiderId) };
        this.apiService.apiProjectsSpidersRead(requestParams).then(
            async (response: Spider) => {
                const data = await this.getSpiderJobs(1);

                const waitingJobs = data.data.filter((job: SpiderJobData) => job.jobStatus === "WAITING");
                const queueJobs = data.data.filter((job: SpiderJobData) => job.jobStatus === "IN_QUEUE");
                const runningJobs = data.data.filter((job: SpiderJobData) => job.jobStatus === "RUNNING");
                const completedJobs = data.data.filter((job: SpiderJobData) => job.jobStatus === "COMPLETED");
                const errorJobs = data.data.filter((job: SpiderJobData) => job.jobStatus === "ERROR");

                const scheduledJobsCount = data.data
                    .filter((job: SpiderJobData) => job.cronjob !== null && job.cronjob !== undefined)
                    .map((job: SpiderJobData) => job.cronjob)
                    .filter((cronjob, index, self) => {
                        return self.indexOf(cronjob) === index;
                    }).length;

                const tableStatus = [
                    !(waitingJobs.length === 0),
                    !(queueJobs.length === 0),
                    !(runningJobs.length === 0),
                    !(completedJobs.length === 0),
                    !(errorJobs.length === 0),
                ];

                const jobs: SpiderJobData[] = data.data;
                this.setState({
                    spider: response,
                    name: response.name,
                    dataStatus: response.dataStatus,
                    dataExpiryDays: response.dataExpiryDays,
                    jobs: [...jobs],
                    count: data.count,
                    current: data.current,
                    loaded: true,
                    tableStatus: [...tableStatus],
                    waitingJobs: [...waitingJobs],
                    queueJobs: [...queueJobs],
                    runningJobs: [...runningJobs],
                    completedJobs: [...completedJobs],
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
        const data = response.results.map((job: SpiderJob, iterator: number) => ({
            key: iterator,
            id: job.jid,
            spider: job.spider,
            args: job.args,
            tags: job.tags,
            jobStatus: job.jobStatus,
            cronjob: job.cronjob,
        }));
        return { data, count: response.count, current: page };
    };

    changePersistence = (): void => {
        const requestData: SpiderUpdate = {
            name: this.state.name,
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

        const waitingJobs = data.data.filter((job: SpiderJobData) => job.jobStatus === "WAITING");
        const queueJobs = data.data.filter((job: SpiderJobData) => job.jobStatus === "IN_QUEUE");
        const runningJobs = data.data.filter((job: SpiderJobData) => job.jobStatus === "RUNNING");
        const completedJobs = data.data.filter((job: SpiderJobData) => job.jobStatus === "COMPLETED");
        const errorJobs = data.data.filter((job: SpiderJobData) => job.jobStatus === "ERROR");

        const tableStatus = [
            !(waitingJobs.length === 0),
            !(queueJobs.length === 0),
            !(runningJobs.length === 0),
            !(completedJobs.length === 0),
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
                <Content className="grid gap-2 grid-cols-1 lg:grid-cols-5 items-start w-full">
                    <Col className="float-left col-span-4">
                        {tableStatus[waiting] && (
                            <Row className="my-2 rounded-lg bg-white">
                                <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                                    <Col className="float-left py-1">
                                        <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                            Waiting
                                        </Text>
                                        <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                            {waitingJobs.length}
                                        </Tag>
                                    </Col>
                                    <Col className="flex float-right">
                                        <Button
                                            disabled
                                            icon={<Filter className="h-6 w-6 mr-2" />}
                                            size="large"
                                            className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                        >
                                            Filter
                                        </Button>
                                        <Button
                                            disabled
                                            icon={<Setting className="h-6 w-6" />}
                                            size="large"
                                            className="flex items-center justify-center stroke-estela-black-medium border-none hover:stroke-estela bg-white"
                                        ></Button>
                                    </Col>
                                </Content>
                                <Content className="mx-4 my-1">
                                    <Table
                                        scroll={{}}
                                        size="small"
                                        rowSelection={{
                                            type: "checkbox",
                                        }}
                                        columns={this.columns}
                                        dataSource={waitingJobs}
                                        pagination={false}
                                    />
                                </Content>
                                <Row className="w-full h-6 bg-estela-white-low"></Row>
                                <Space direction="horizontal" className="my-2 mx-4">
                                    <Button
                                        disabled
                                        className="bg-estela-red-low border-estela-red-low text-estela-red-full hover:bg-estela-red-low hover:text-estela-red-full hover:border-estela-red-full rounded-2xl"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        disabled
                                        className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl"
                                    >
                                        Edit
                                    </Button>
                                </Space>
                            </Row>
                        )}
                        {tableStatus[queued] && (
                            <Row className="my-2 rounded-lg bg-white">
                                <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                                    <Col className="float-left py-1">
                                        <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                            In queue
                                        </Text>
                                        <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                            {queueJobs.length}
                                        </Tag>
                                    </Col>
                                    <Col className="flex float-right">
                                        <Button
                                            disabled
                                            icon={<Filter className="h-6 w-6 mr-2" />}
                                            size="large"
                                            className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                        >
                                            Filter
                                        </Button>
                                        <Button
                                            disabled
                                            icon={<Setting className="h-6 w-6" />}
                                            size="large"
                                            className="flex items-center justify-center stroke-estela-black-medium border-none hover:stroke-estela bg-white"
                                        ></Button>
                                    </Col>
                                </Content>
                                <Content className="mx-4 my-1">
                                    <Table
                                        scroll={{}}
                                        size="small"
                                        rowSelection={{
                                            type: "checkbox",
                                        }}
                                        columns={this.columns}
                                        dataSource={queueJobs}
                                        pagination={false}
                                    />
                                </Content>
                                <Row className="w-full h-6 bg-estela-white-low"></Row>
                                <Space direction="horizontal" className="my-2 mx-4">
                                    <Button
                                        disabled
                                        className="bg-estela-red-low border-estela-red-low text-estela-red-full hover:bg-estela-red-low hover:text-estela-red-full hover:border-estela-red-full rounded-2xl"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        disabled
                                        className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl"
                                    >
                                        Edit
                                    </Button>
                                </Space>
                            </Row>
                        )}
                        {tableStatus[running] && (
                            <Row className="my-2 rounded-lg bg-white">
                                <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                                    <Col className="float-left py-1">
                                        <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                            Running
                                        </Text>
                                        <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                            {runningJobs.length}
                                        </Tag>
                                    </Col>
                                    <Col className="flex float-right">
                                        <Button
                                            disabled
                                            icon={<Filter className="h-6 w-6 mr-2" />}
                                            size="large"
                                            className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                        >
                                            Filter
                                        </Button>
                                        <Button
                                            disabled
                                            icon={<Setting className="h-6 w-6" />}
                                            size="large"
                                            className="flex items-center justify-center stroke-estela-black-medium border-none hover:stroke-estela bg-white"
                                        ></Button>
                                    </Col>
                                </Content>
                                <Content className="mx-4 my-1">
                                    <Table
                                        scroll={{}}
                                        size="small"
                                        rowSelection={{
                                            type: "checkbox",
                                        }}
                                        columns={this.columns}
                                        dataSource={runningJobs}
                                        pagination={false}
                                    />
                                </Content>
                                <Row className="w-full h-6 bg-estela-white-low"></Row>
                                <Space direction="horizontal" className="my-2 mx-4">
                                    <Button
                                        disabled
                                        className="bg-estela-red-low border-estela-red-low text-estela-red-full hover:bg-estela-red-low hover:text-estela-red-full hover:border-estela-red-full rounded-2xl"
                                    >
                                        Cancel
                                    </Button>
                                </Space>
                            </Row>
                        )}
                        {tableStatus[completed] && (
                            <Row className="my-2 rounded-lg bg-white">
                                <Row className="flow-root lg:m-4 mx-4 my-2 w-full">
                                    <Col className="float-left py-1">
                                        <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                            Completed
                                        </Text>
                                        <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                            {completedJobs.length}
                                        </Tag>
                                    </Col>
                                    <Col className="flex float-right">
                                        <Button
                                            disabled
                                            icon={<Filter className="h-6 w-6 mr-2" />}
                                            size="large"
                                            className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                        >
                                            Filter
                                        </Button>
                                        <Button
                                            disabled
                                            icon={<Setting className="h-6 w-6" />}
                                            size="large"
                                            className="flex items-center justify-center stroke-estela-black-medium border-none hover:stroke-estela bg-white"
                                        ></Button>
                                    </Col>
                                </Row>
                                <Content className="mx-4 my-1">
                                    <Table
                                        size="small"
                                        rowSelection={{
                                            type: "checkbox",
                                        }}
                                        columns={this.columns}
                                        dataSource={completedJobs}
                                        pagination={false}
                                    />
                                </Content>
                                <Row className="w-full h-6 bg-estela-white-low"></Row>
                                <Space direction="horizontal" className="my-2 mx-4">
                                    <Button
                                        disabled
                                        className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl"
                                    >
                                        Run again
                                    </Button>
                                </Space>
                            </Row>
                        )}
                        {tableStatus[withError] && (
                            <Row className="my-2 rounded-lg bg-white">
                                <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                                    <Col className="float-left py-1">
                                        <Text className="mr-2 text-estela-black-medium font-medium text-lg">Error</Text>
                                        <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                            {errorJobs.length}
                                        </Tag>
                                    </Col>
                                    <Col className="flex float-right">
                                        <Button
                                            disabled
                                            icon={<Filter className="h-6 w-6 mr-2" />}
                                            size="large"
                                            className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                        >
                                            Filter
                                        </Button>
                                        <Button
                                            disabled
                                            icon={<Setting className="h-6 w-6" />}
                                            size="large"
                                            className="flex items-center justify-center stroke-estela-black-medium border-none hover:stroke-estela bg-white"
                                        ></Button>
                                    </Col>
                                </Content>
                                <Content className="mx-4 my-1">
                                    <Table
                                        size="small"
                                        rowSelection={{
                                            type: "checkbox",
                                        }}
                                        columns={this.columns}
                                        dataSource={errorJobs}
                                        pagination={false}
                                    />
                                </Content>
                                <Row className="w-full h-6 bg-estela-white-low"></Row>
                                <Space direction="horizontal" className="my-2 mx-4">
                                    <Button
                                        disabled
                                        className="bg-estela-blue-low border-estela-blue-low text-estela-blue-full hover:bg-estela-blue-low hover:text-estela-blue-full hover:border-estela-blue-full rounded-2xl"
                                    >
                                        Run again
                                    </Button>
                                </Space>
                            </Row>
                        )}
                        <Row>
                            <Pagination
                                className="pagination"
                                defaultCurrent={1}
                                total={count}
                                current={current}
                                pageSize={this.PAGE_SIZE}
                                onChange={this.onPageChange}
                                showSizeChanger={false}
                                itemRender={PaginationItem}
                            />
                        </Row>
                    </Col>
                    <Col className="float-right my-2 col-span-1 rounded-lg w-48 bg-white">
                        <Content className="my-2 mx-3">
                            <Text className="text-estela-black-medium font-medium text-xs">STATUS</Text>
                            <Content className="my-2">
                                <Checkbox
                                    checked={waitingJobs.length === 0 ? tableStatus[waiting] : true}
                                    onChange={() => this.onChangeStatus(waiting, waitingJobs.length)}
                                >
                                    <Space direction="horizontal">
                                        <Text className="text-estela-black-medium font-medium text-sm">Waiting</Text>
                                        <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                            {waitingJobs.length}
                                        </Tag>
                                    </Space>
                                </Checkbox>
                                <br />
                                <Checkbox
                                    checked={queueJobs.length === 0 ? tableStatus[queued] : true}
                                    onChange={() => this.onChangeStatus(queued, queueJobs.length)}
                                >
                                    <Space direction="horizontal">
                                        <Text className="text-estela-black-medium font-medium text-sm">In queue</Text>
                                        <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                            {queueJobs.length}
                                        </Tag>
                                    </Space>
                                </Checkbox>
                                <br />
                                <Checkbox
                                    checked={runningJobs.length === 0 ? tableStatus[running] : true}
                                    onChange={() => this.onChangeStatus(running, runningJobs.length)}
                                >
                                    <Space direction="horizontal">
                                        <Text className="text-estela-black-medium font-medium text-sm">Running</Text>
                                        <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                            {runningJobs.length}
                                        </Tag>
                                    </Space>
                                </Checkbox>
                                <br />
                                <Checkbox
                                    checked={completedJobs.length === 0 ? tableStatus[completed] : true}
                                    onChange={() => this.onChangeStatus(completed, completedJobs.length)}
                                >
                                    <Space direction="horizontal">
                                        <Text className="text-estela-black-medium font-medium text-sm">Completed</Text>
                                        <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                            {completedJobs.length}
                                        </Tag>
                                    </Space>
                                </Checkbox>
                                <br />
                                <Checkbox
                                    checked={errorJobs.length == 0 ? tableStatus[withError] : true}
                                    onChange={() => this.onChangeStatus(withError, errorJobs.length)}
                                >
                                    <Space direction="horizontal">
                                        <Text className="text-estela-black-medium font-medium text-sm">Error</Text>
                                        <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                            {errorJobs.length}
                                        </Tag>
                                    </Space>
                                </Checkbox>
                            </Content>
                        </Content>
                    </Col>
                </Content>
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
        const { dataStatus, dataExpiryDays, persistenceChanged } = this.state;
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
