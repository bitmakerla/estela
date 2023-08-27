import React, { Component, ReactElement } from "react";
import { Layout, Pagination, Typography, Checkbox, Tag, Button, Row, Col, Space, Table } from "antd";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import { ApiService } from "../../services";
import Filter from "../../assets/icons/filter.svg";
import Setting from "../../assets/icons/setting.svg";
import FolderDotted from "../../assets/icons/folderDotted.svg";
import JobCreateModal from "../JobCreateModal";
import {
    ApiProjectsReadRequest,
    ApiProjectsJobsRequest,
    ProjectJob,
    Spider,
    SpiderJob,
    Project,
} from "../../services/api";
import { resourceNotAllowedNotification, Spin, PaginationItem, RouteParams } from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Text } = Typography;

const waiting = 0;
const queued = 1;
const running = 2;
const completed = 3;
const stopped = 4;
const withError = 5;

interface SpiderData {
    sid: number;
    name: string;
}

interface BaseInfo {
    jid: number | undefined;
    sid: SpiderData;
    cid?: number | null | undefined;
}

interface Args {
    name: string;
    value: string;
}

interface ArgsData {
    name: string;
    value: string;
    key: number;
}

interface TagsData {
    name: string;
}

interface SpiderJobData {
    info: BaseInfo;
    key: number | undefined;
    date: string;
    tags: TagsData[] | undefined;
    args: Args[] | undefined;
    status: string | undefined;
}

interface ProjectJobListPageState {
    name: string;
    jobs: SpiderJobData[];
    tableStatus: boolean[];
    waitingJobs: SpiderJobData[];
    queueJobs: SpiderJobData[];
    runningJobs: SpiderJobData[];
    completedJobs: SpiderJobData[];
    stoppedJobs: SpiderJobData[];
    errorJobs: SpiderJobData[];
    loaded: boolean;
    count: number;
    current: number;
    loading: boolean;
    isEmpty: boolean;
}

interface StateType {
    open: boolean;
    spider: Spider;
}

export class ProjectJobListPage extends Component<RouteComponentProps<RouteParams>, ProjectJobListPageState> {
    PAGE_SIZE = 10;
    LocationState = this.props.location.state as StateType;
    state: ProjectJobListPageState = {
        name: "",
        jobs: [],
        waitingJobs: [],
        queueJobs: [],
        runningJobs: [],
        completedJobs: [],
        stoppedJobs: [],
        errorJobs: [],
        loading: false,
        tableStatus: new Array<boolean>(5).fill(true),
        loaded: false,
        count: 0,
        current: 0,
        isEmpty: false,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;

    columns = [
        {
            title: "JOB",
            dataIndex: "info",
            key: "info",
            render: (info: BaseInfo): ReactElement => (
                <Link
                    to={`/projects/${this.projectId}/spiders/${info.spider.sid}/jobs/${info.jid}`}
                    className="text-estela-blue-medium"
                >
                    Job-{info.jid}
                </Link>
            ),
        },
        {
            title: "SPIDER",
            dataIndex: "info",
            key: "info",
            render: (info: BaseInfo): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${info.spider.sid}`} className="text-estela-blue-medium">
                    {info.spider.name}
                </Link>
            ),
        },
        {
            title: "SCHEDULED JOB",
            key: "info",
            dataIndex: "info",
            render: (info: BaseInfo): ReactElement =>
                info.cid ? (
                    <Link
                        to={`/projects/${this.projectId}/spiders/${info.spider.sid}/cronjobs/${info.cid}`}
                        className="text-estela-blue-medium"
                    >
                        Sche-Job-{info.cid}
                    </Link>
                ) : (
                    <Text className="text-estela-black-medium text-xs">Not associated</Text>
                ),
        },
        {
            title: "ARGUMENTS",
            dataIndex: "args",
            key: "args",
            render: (args: ArgsData[]): ReactElement => (
                <Content>
                    {args.map((arg: ArgsData, id: number) => (
                        <Tag key={id} className="text-xs text-estela border-estela rounded bg-button-hover">
                            {arg.name}: {arg.value}
                        </Tag>
                    ))}
                </Content>
            ),
        },
        {
            title: "TAGS",
            dataIndex: "tags",
            key: "tags",
            render: (tags: TagsData[]): ReactElement => (
                <Content>
                    {tags.map((tag: TagsData, id) => (
                        <Tag key={id} className="text-estela border-estela rounded bg-button-hover">
                            {tag.name}
                        </Tag>
                    ))}
                </Content>
            ),
        },
    ];

    async componentDidMount(): Promise<void> {
        const requestParams: ApiProjectsReadRequest = { pid: this.projectId };
        this.apiService.apiProjectsRead(requestParams).then(
            (response: Project) => {
                this.setState({ name: response.name });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
        this.getJobs(1);
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
                info: { jid: job.jid, spider: job.spider, cid: job.cronjob },
                args: job.args,
                date: convertDateToString(job.created),
                status: job.jobStatus,
                tags: job.tags,
            }));
            response.results.length === 0 ? this.setState({ isEmpty: true }) : this.setState({ isEmpty: false });

            const waitingJobs = data.filter((job: SpiderJobData) => job.status === "WAITING");
            const queueJobs = data.filter((job: SpiderJobData) => job.status === "IN_QUEUE");
            const runningJobs = data.filter((job: SpiderJobData) => job.status === "RUNNING");
            const completedJobs = data.filter((job: SpiderJobData) => job.status === "COMPLETED");
            const stoppedJobs = data.filter((job: SpiderJobData) => job.status === "STOPPED");
            const errorJobs = data.filter((job: SpiderJobData) => job.status === "ERROR");

            const tableStatus = [
                waitingJobs.length === 0 ? false : true,
                queueJobs.length === 0 ? false : true,
                runningJobs.length === 0 ? false : true,
                completedJobs.length === 0 ? false : true,
                stoppedJobs.length === 0 ? false : true,
                errorJobs.length === 0 ? false : true,
            ];

            this.setState({
                tableStatus: [...tableStatus],
                errorJobs: [...errorJobs],
                completedJobs: [...completedJobs],
                stoppedJobs: [...stoppedJobs],
                runningJobs: [...runningJobs],
                waitingJobs: [...waitingJobs],
                queueJobs: [...queueJobs],
                loaded: true,
                count: response.count,
                current: page,
            });
        });
    };

    onPageChange = async (page: number): Promise<void> => {
        await this.getJobs(page);
    };

    onChangeStatus = (index: number, count: number) => {
        if (count === 0) {
            const tableStatus = this.state.tableStatus;
            tableStatus[index] = !tableStatus[index];
            this.setState({ tableStatus: tableStatus });
        }
    };

    emptyText = (): ReactElement => (
        <Content className="flex w-full h-96 flex-col items-center justify-center text-estela-black-medium">
            <FolderDotted className="w-20 h-20" />
            <p>No jobs yet.</p>
        </Content>
    );

    render(): JSX.Element {
        const {
            loaded,
            tableStatus,
            errorJobs,
            completedJobs,
            stoppedJobs,
            runningJobs,
            queueJobs,
            waitingJobs,
            count,
            current,
            isEmpty,
        } = this.state;
        return (
            <Content>
                {loaded ? (
                    <Layout className="bg-metal rounded-2xl">
                        <Content className="lg:m-10 md:mx-6 mx-2">
                            <Row className="flow-root">
                                <Col className="float-left">
                                    <Text className="text-xl font-medium text-estela-black-medium float-left">
                                        JOB OVERVIEW
                                    </Text>
                                </Col>
                                <Col className="float-right">
                                    <JobCreateModal projectId={this.projectId} openModal={false} spider={null} />
                                </Col>
                            </Row>
                            <Row className="my-4 grid gap-2 grid-cols-1 lg:grid-cols-5 items-start w-full">
                                <Col className="float-left col-span-4">
                                    {tableStatus[waiting] && (
                                        <Row className="my-2 rounded-lg bg-white">
                                            <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                                                <Col className="float-left py-1">
                                                    <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                                        Waiting
                                                    </Text>
                                                    <Tag className="rounded-2xl bg-estela-yellow-low text-estela-yellow-full border-estela-yellow-low">
                                                        {waitingJobs.length}
                                                    </Tag>
                                                </Col>
                                                <Col className="flex float-right">
                                                    <Button
                                                        disabled={true}
                                                        icon={<Filter className="h-6 w-6 mr-2" />}
                                                        size="large"
                                                        className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                                    >
                                                        Filter
                                                    </Button>
                                                    <Button
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
                                                    locale={{ emptyText: "No jobs yet" }}
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
                                                    <Tag className="rounded-2xl bg-estela-yellow-low text-estela-yellow-full border-estela-yellow-low">
                                                        {queueJobs.length}
                                                    </Tag>
                                                </Col>
                                                <Col className="flex float-right">
                                                    <Button
                                                        disabled={true}
                                                        icon={<Filter className="h-6 w-6 mr-2" />}
                                                        size="large"
                                                        className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                                    >
                                                        Filter
                                                    </Button>
                                                    <Button
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
                                                    locale={{ emptyText: "No jobs yet" }}
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
                                                    <Tag className="rounded-2xl bg-estela-green-low text-estela-green-full border-estela-green-low">
                                                        {runningJobs.length}
                                                    </Tag>
                                                </Col>
                                                <Col className="flex float-right">
                                                    <Button
                                                        disabled={true}
                                                        icon={<Filter className="h-6 w-6 mr-2" />}
                                                        size="large"
                                                        className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                                    >
                                                        Filter
                                                    </Button>
                                                    <Button
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
                                                    dataSource={runningJobs}
                                                    pagination={false}
                                                    locale={{ emptyText: "No jobs yet" }}
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
                                                        Finished
                                                    </Text>
                                                    <Tag className="rounded-2xl bg-estela-blue-low text-estela-blue-full border-estela-blue-low">
                                                        {completedJobs.length}
                                                    </Tag>
                                                </Col>
                                                <Col className="flex float-right">
                                                    <Button
                                                        disabled={true}
                                                        icon={<Filter className="h-6 w-6 mr-2" />}
                                                        size="large"
                                                        className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                                    >
                                                        Filter
                                                    </Button>
                                                    <Button
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
                                                    locale={{ emptyText: "No jobs yet" }}
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
                                    {tableStatus[stopped] && (
                                        <Row className="my-2 rounded-lg bg-white">
                                            <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                                                <Col className="float-left py-1">
                                                    <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                                        Stopped
                                                    </Text>
                                                    <Tag className="rounded-2xl bg-estela-red-low text-estela-red-full border-estela-red-low">
                                                        {stoppedJobs.length}
                                                    </Tag>
                                                </Col>
                                                <Col className="flex float-right">
                                                    <Button
                                                        disabled={true}
                                                        icon={<Filter className="h-6 w-6 mr-2" />}
                                                        size="large"
                                                        className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                                    >
                                                        Filter
                                                    </Button>
                                                    <Button
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
                                                    dataSource={stoppedJobs}
                                                    pagination={false}
                                                    locale={{ emptyText: "No jobs yet" }}
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
                                                    <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                                        Error
                                                    </Text>
                                                    <Tag className="rounded-2xl bg-estela-red-low text-estela-red-full border-estela-red-low">
                                                        {errorJobs.length}
                                                    </Tag>
                                                </Col>
                                                <Col className="flex float-right">
                                                    <Button
                                                        disabled={true}
                                                        icon={<Filter className="h-6 w-6 mr-2" />}
                                                        size="large"
                                                        className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                                    >
                                                        Filter
                                                    </Button>
                                                    <Button
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
                                                    locale={{ emptyText: "No jobs yet" }}
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
                                    <Row>{isEmpty && this.emptyText()}</Row>
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
                                                disabled={isEmpty}
                                                checked={waitingJobs.length == 0 ? tableStatus[waiting] : true}
                                                onChange={() => this.onChangeStatus(waiting, waitingJobs.length)}
                                            >
                                                <Space direction="horizontal">
                                                    <Text className="text-estela-black-medium font-medium text-sm">
                                                        Waiting
                                                    </Text>
                                                    <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                        {waitingJobs.length}
                                                    </Tag>
                                                </Space>
                                            </Checkbox>
                                            <br />
                                            <Checkbox
                                                disabled={isEmpty}
                                                checked={queueJobs.length == 0 ? tableStatus[queued] : true}
                                                onChange={() => this.onChangeStatus(queued, queueJobs.length)}
                                            >
                                                <Space direction="horizontal">
                                                    <Text className="text-estela-black-medium font-medium text-sm">
                                                        Queue
                                                    </Text>
                                                    <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                        {queueJobs.length}
                                                    </Tag>
                                                </Space>
                                            </Checkbox>
                                            <br />
                                            <Checkbox
                                                disabled={isEmpty}
                                                checked={runningJobs.length == 0 ? tableStatus[running] : true}
                                                onChange={() => this.onChangeStatus(running, runningJobs.length)}
                                            >
                                                <Space direction="horizontal">
                                                    <Text className="text-estela-black-medium font-medium text-sm">
                                                        Running
                                                    </Text>
                                                    <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                        {runningJobs.length}
                                                    </Tag>
                                                </Space>
                                            </Checkbox>
                                            <br />
                                            <Checkbox
                                                disabled={isEmpty}
                                                checked={completedJobs.length == 0 ? tableStatus[completed] : true}
                                                onChange={() => this.onChangeStatus(completed, completedJobs.length)}
                                            >
                                                <Space direction="horizontal">
                                                    <Text className="text-estela-black-medium font-medium text-sm">
                                                        Completed
                                                    </Text>
                                                    <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                        {completedJobs.length}
                                                    </Tag>
                                                </Space>
                                            </Checkbox>
                                            <br />
                                            <Checkbox
                                                disabled={isEmpty}
                                                checked={stoppedJobs.length == 0 ? tableStatus[stopped] : true}
                                                onChange={() => this.onChangeStatus(stopped, stoppedJobs.length)}
                                            >
                                                <Space direction="horizontal">
                                                    <Text className="text-estela-black-medium font-medium text-sm">
                                                        Stopped
                                                    </Text>
                                                    <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                        {stoppedJobs.length}
                                                    </Tag>
                                                </Space>
                                            </Checkbox>
                                            <br />
                                            <Checkbox
                                                disabled={isEmpty}
                                                checked={errorJobs.length == 0 ? tableStatus[withError] : true}
                                                onChange={() => this.onChangeStatus(withError, errorJobs.length)}
                                            >
                                                <Space direction="horizontal">
                                                    <Text className="text-estela-black-medium font-medium text-sm">
                                                        Error
                                                    </Text>
                                                    <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                        {errorJobs.length}
                                                    </Tag>
                                                </Space>
                                            </Checkbox>
                                        </Content>
                                    </Content>
                                </Col>
                            </Row>
                        </Content>
                    </Layout>
                ) : (
                    <Spin />
                )}
            </Content>
        );
    }
}
