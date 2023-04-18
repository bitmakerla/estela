import React, { Component, ReactElement } from "react";
import {
    Layout,
    Pagination,
    Input,
    Typography,
    Select,
    Modal,
    Checkbox,
    Tag,
    Button,
    Row,
    Col,
    Space,
    Table,
    message,
} from "antd";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import { Link, RouteComponentProps } from "react-router-dom";
import "./styles.scss";
import history from "../../history";
import { ApiService } from "../../services";
import Run from "../../assets/icons/play.svg";
import Filter from "../../assets/icons/filter.svg";
import Setting from "../../assets/icons/setting.svg";
import Add from "../../assets/icons/add.svg";
import {
    ApiProjectsSpidersJobsCreateRequest,
    ApiProjectsSpidersListRequest,
    ApiProjectsReadRequest,
    ApiProjectsJobsRequest,
    SpiderJobCreate,
    SpiderDataStatusEnum,
    ProjectJob,
    SpiderJob,
    Project,
    Spider,
} from "../../services/api";
import {
    resourceNotAllowedNotification,
    incorrectDataNotification,
    invalidDataNotification,
    Spin,
    PaginationItem,
} from "../../shared";
import { convertDateToString } from "../../utils";
import { checkExternalError } from "ExternalComponents/CardNotification";

const { Content } = Layout;
const { Option } = Select;
const { Text } = Typography;

interface Ids {
    sid: number | undefined;
    jid: number | undefined;
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

interface EnvVarsData {
    name: string;
    value: string;
    masked: boolean;
    key: number;
}

interface TagsData {
    name: string;
}

interface Tags {
    name: string;
    key: number;
}

interface SpiderJobData {
    id: Ids;
    key: number | undefined;
    date: string;
    tags: TagsData[] | undefined;
    args: Args[] | undefined;
    status: string | undefined;
}

interface OptionDataPersistance {
    label: string;
    key: number;
    value: number;
}

interface ProjectJobListPageState {
    name: string;
    jobs: SpiderJobData[];
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    newTags: Tags[];
    spiders: Spider[];
    dataExpiryDays: number | null | undefined;
    dataStatus: SpiderDataStatusEnum | undefined;
    loadedSpiders: boolean;
    spiderId: string;
    tableStatus: boolean[];
    queueJobs: SpiderJobData[];
    runningJobs: SpiderJobData[];
    completedJobs: SpiderJobData[];
    errorJobs: SpiderJobData[];
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    newEnvVarMasked: boolean;
    newTagName: string;
    modal: boolean;
    loaded: boolean;
    count: number;
    current: number;
    externalComponent: JSX.Element;
    loading: boolean;
}

interface RouteParams {
    projectId: string;
}

interface StateType {
    open: boolean;
}

export class ProjectJobListPage extends Component<RouteComponentProps<RouteParams>, ProjectJobListPageState> {
    PAGE_SIZE = 10;
    LocationState = this.props.location.state as StateType;
    state: ProjectJobListPageState = {
        name: "",
        spiderId: "",
        jobs: [],
        spiders: [],
        queueJobs: [],
        runningJobs: [],
        completedJobs: [],
        errorJobs: [],
        args: [],
        envVars: [],
        tags: [],
        newTags: [],
        dataExpiryDays: 1,
        dataStatus: undefined,
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
        newEnvVarMasked: false,
        newTagName: "",
        loading: false,
        modal: this.LocationState ? this.LocationState.open : false,
        externalComponent: <></>,
        loadedSpiders: false,
        tableStatus: new Array<boolean>(4).fill(true),
        loaded: false,
        count: 0,
        current: 0,
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    countKey = 0;

    dataPersistenceOptions = [
        { label: "1 day", key: 1, value: 1 },
        { label: "1 week", key: 2, value: 7 },
        { label: "1 month", key: 3, value: 30 },
        { label: "3 months", key: 4, value: 90 },
        { label: "6 months", key: 5, value: 180 },
        { label: "1 year", key: 6, value: 365 },
        { label: "Forever", key: 7, value: 720 },
    ];

    columns = [
        {
            title: "JOB",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link
                    to={`/projects/${this.projectId}/spiders/${id.sid}/jobs/${id.jid}`}
                    className="text-estela-blue-medium"
                >
                    Job-{id.jid}
                </Link>
            ),
        },
        {
            title: "SPIDER ID",
            dataIndex: "id",
            key: "id",
            render: (id: Ids): ReactElement => (
                <Link to={`/projects/${this.projectId}/spiders/${id.sid}`} className="text-estela-blue-medium">
                    {id.sid}
                </Link>
            ),
        },
        {
            title: "SCHEDULED JOB",
            key: "id",
            dataIndex: "id",
            render: (id: Ids): ReactElement =>
                id.cid ? (
                    <Link
                        to={`/projects/${this.projectId}/spiders/${id.sid}/cronjobs/${id.cid}`}
                        className="text-estela-blue-medium"
                    >
                        Sche-Job-{id.cid}
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
        this.getProjectSpiders(1);
    }

    getProjectSpiders = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersListRequest = { pid: this.projectId, page, pageSize: this.PAGE_SIZE };
        this.apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                if (results.results.length == 0 || results.results == undefined) {
                    this.setState({ spiders: [], loadedSpiders: true });
                } else {
                    this.setState({
                        spiders: [...results.results],
                        dataStatus: results.results[0].dataStatus,
                        dataExpiryDays: results.results[0].dataExpiryDays,
                        spiderId: String(results.results[0].sid),
                        loadedSpiders: true,
                    });
                }
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

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
                tags: job.tags,
            }));
            const errorJobs = data.filter((job: SpiderJobData) => job.status === "ERROR");
            const completedJobs = data.filter((job: SpiderJobData) => job.status === "COMPLETED");
            const runningJobs = data.filter((job: SpiderJobData) => job.status === "RUNNING");
            const queueJobs = data.filter((job: SpiderJobData) => job.status === "IN_QUEUE");
            const tableStatus = [
                queueJobs.length === 0 ? false : true,
                runningJobs.length === 0 ? false : true,
                completedJobs.length === 0 ? false : true,
                errorJobs.length === 0 ? false : true,
            ];
            this.setState({
                tableStatus: [...tableStatus],
                errorJobs: [...errorJobs],
                completedJobs: [...completedJobs],
                runningJobs: [...runningJobs],
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

    handlePersistenceChange = (value: number): void => {
        if (value == 720) {
            this.setState({ dataStatus: SpiderDataStatusEnum.Persistent });
        } else {
            this.setState({ dataExpiryDays: value });
        }
    };

    handleSpiderChange = (value: string): void => {
        const spiderId = this.state.spiders.find((spider) => {
            return spider.name === value;
        });
        this.setState({ spiderId: String(spiderId?.sid) });
    };

    onChangeEnvVarMasked = (e: CheckboxChangeEvent) => {
        this.setState({ newEnvVarMasked: e.target.checked });
    };

    addArgument = (): void => {
        const args = [...this.state.args];
        const newArgName = this.state.newArgName.trim();
        const newArgValue = this.state.newArgValue.trim();
        if (newArgName && newArgValue && newArgName.indexOf(" ") == -1) {
            args.push({ name: newArgName, value: newArgValue, key: this.countKey++ });
            this.setState({ args: [...args], newArgName: "", newArgValue: "" });
        } else {
            invalidDataNotification("Invalid argument name/value pair.");
        }
    };

    addEnvVar = (): void => {
        const envVars = [...this.state.envVars];
        const newEnvVarName = this.state.newEnvVarName.trim();
        const newEnvVarValue = this.state.newEnvVarValue.trim();
        const newEnvVarMasked = this.state.newEnvVarMasked;
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            envVars.push({ name: newEnvVarName, value: newEnvVarValue, masked: newEnvVarMasked, key: this.countKey++ });
            this.setState({ envVars: [...envVars], newEnvVarName: "", newEnvVarValue: "", newEnvVarMasked: false });
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
        }
    };

    addTag = (): void => {
        const tags = [...this.state.tags];
        const newTags = [...this.state.newTags];
        const newTagName = this.state.newTagName.trim();
        if (newTagName && newTagName.indexOf(" ") == -1) {
            newTags.push({ name: newTagName, key: this.countKey++ });
            tags.push({ name: newTagName });
            this.setState({ tags: [...tags], newTags: [...newTags], newTagName: "" });
        } else {
            invalidDataNotification("Invalid tag name.");
        }
    };

    handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newArgName") {
            this.setState({ newArgName: value });
        } else if (name === "newArgValue") {
            this.setState({ newArgValue: value });
        } else if (name === "newEnvVarName") {
            this.setState({ newEnvVarName: value });
        } else if (name === "newEnvVarValue") {
            this.setState({ newEnvVarValue: value });
        } else if (name === "newTagName") {
            this.setState({ newTagName: value });
        }
    };

    handleRemoveArg = (id: number): void => {
        const args = [...this.state.args];
        args.splice(id, 1);
        this.setState({ args: [...args] });
    };

    handleRemoveEnvVar = (id: number): void => {
        const envVars = [...this.state.envVars];
        envVars.splice(id, 1);
        this.setState({ envVars: [...envVars] });
    };

    handleRemoveTag = (id: number): void => {
        const tags = [...this.state.tags];
        tags.splice(id, 1);
        this.setState({ tags: [...tags] });
    };

    handleSubmit = (): void => {
        this.setState({ loading: true });
        const requestData = {
            args: [...this.state.args],
            envVars: [...this.state.envVars],
            tags: [...this.state.tags],
            dataStatus: String(this.state.dataStatus),
            dataExpiryDays: Number(this.state.dataExpiryDays),
        };
        const request: ApiProjectsSpidersJobsCreateRequest = {
            data: requestData,
            pid: this.projectId,
            sid: this.state.spiderId,
        };
        this.apiService.apiProjectsSpidersJobsCreate(request).then(
            (response: SpiderJobCreate) => {
                this.setState({ loading: false });
                history.push(`/projects/${this.projectId}/spiders/${this.state.spiderId}/jobs/${response.jid}`);
            },
            async (error) => {
                this.setState({ loading: false });
                const data = await error.json();
                const [errorComponent, err] = checkExternalError(data);
                if (err) {
                    invalidDataNotification(data.detail);
                    this.setState({ externalComponent: <></> });
                    this.setState({ externalComponent: errorComponent });
                } else {
                    incorrectDataNotification();
                }
                this.setState({ modal: false });
            },
        );
    };

    render(): JSX.Element {
        const {
            loaded,
            loadedSpiders,
            spiders,
            tableStatus,
            errorJobs,
            modal,
            externalComponent,
            args,
            envVars,
            completedJobs,
            runningJobs,
            queueJobs,
            count,
            current,
            newArgName,
            newArgValue,
            newEnvVarName,
            newEnvVarValue,
            newTagName,
            loading,
            dataStatus,
            dataExpiryDays,
            tags,
            newEnvVarMasked,
        } = this.state;
        return (
            <Content>
                {loaded && loadedSpiders ? (
                    <Layout className="bg-metal rounded-2xl">
                        <Content className="lg:m-10 md:mx-6 mx-2">
                            <Row className="flow-root">
                                <Col className="float-left">
                                    <Text className="text-xl font-medium text-estela-black-medium float-left">
                                        JOB OVERVIEW
                                    </Text>
                                </Col>
                                <Col className="float-right">
                                    <Button
                                        icon={<Run className="mr-2" width={19} />}
                                        size="large"
                                        className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                        onClick={() => {
                                            if (spiders.length == 0) {
                                                message.error("Not implemented yet.");
                                            } else {
                                                this.setState({ modal: true });
                                            }
                                        }}
                                    >
                                        Run new job
                                    </Button>
                                    {externalComponent}
                                    <Modal
                                        style={{
                                            overflow: "hidden",
                                            padding: 0,
                                        }}
                                        centered
                                        width={450}
                                        open={modal}
                                        title={<p className="text-xl text-center font-normal">NEW JOB</p>}
                                        onCancel={() => this.setState({ modal: false })}
                                        footer={null}
                                    >
                                        <Row>
                                            <p className="my-2 text-base">Spider</p>
                                            <Select
                                                style={{ borderRadius: 16 }}
                                                size="large"
                                                className="w-full"
                                                defaultValue={spiders[0] ? spiders[0].name : ""}
                                                onChange={this.handleSpiderChange}
                                            >
                                                {spiders.map((spider: Spider) => (
                                                    <Option key={spider.sid} value={spider.name}>
                                                        {spider.name}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </Row>
                                        <Row>
                                            <p className="text-base my-2">Data persistence</p>
                                            <Select
                                                onChange={this.handlePersistenceChange}
                                                className="w-full"
                                                size="large"
                                                defaultValue={dataStatus === "PERSISTENT" ? 720 : dataExpiryDays}
                                            >
                                                {this.dataPersistenceOptions.map((option: OptionDataPersistance) => (
                                                    <Option className="text-sm" key={option.key} value={option.value}>
                                                        {option.label}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </Row>
                                        <Row>
                                            <p className="text-base my-2">Arguments</p>
                                            <Space direction="vertical">
                                                <Space direction="horizontal">
                                                    {args.map((arg: ArgsData, id: number) => (
                                                        <Tag
                                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                            closable
                                                            key={id}
                                                            onClose={() => this.handleRemoveArg(id)}
                                                        >
                                                            {arg.name}: {arg.value}
                                                        </Tag>
                                                    ))}
                                                </Space>
                                                <Space direction="horizontal">
                                                    <Input
                                                        size="large"
                                                        className="border-estela-blue-full rounded-l-lg"
                                                        name="newArgName"
                                                        placeholder="name"
                                                        value={newArgName}
                                                        onChange={this.handleInputChange}
                                                    />
                                                    <Input
                                                        size="large"
                                                        className="border-estela-blue-full rounded-r-lg"
                                                        name="newArgValue"
                                                        placeholder="value"
                                                        value={newArgValue}
                                                        onChange={this.handleInputChange}
                                                    />
                                                    <Button
                                                        shape="circle"
                                                        size="small"
                                                        icon={<Add />}
                                                        className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                        onClick={this.addArgument}
                                                    ></Button>
                                                </Space>
                                            </Space>
                                        </Row>
                                        <Row>
                                            <p className="text-base my-2">Environment Variables</p>
                                            <Space direction="vertical">
                                                <Space direction="horizontal">
                                                    {envVars.map((envVar: EnvVarsData, id: number) => (
                                                        <Tag
                                                            className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                            closable
                                                            key={envVar.key}
                                                            onClose={() => this.handleRemoveEnvVar(id)}
                                                        >
                                                            {envVar.masked
                                                                ? envVar.name
                                                                : `${envVar.name}: ${envVar.value}`}
                                                        </Tag>
                                                    ))}
                                                </Space>
                                                <Space direction="horizontal">
                                                    <Checkbox
                                                        checked={newEnvVarMasked}
                                                        onChange={this.onChangeEnvVarMasked}
                                                    >
                                                        Masked
                                                    </Checkbox>
                                                    <Input
                                                        size="large"
                                                        className="border-estela-blue-full rounded-l-lg"
                                                        name="newEnvVarName"
                                                        placeholder="name"
                                                        value={newEnvVarName}
                                                        onChange={this.handleInputChange}
                                                    />
                                                    <Input
                                                        size="large"
                                                        className="border-estela-blue-full rounded-r-lg"
                                                        name="newEnvVarValue"
                                                        placeholder="value"
                                                        value={newEnvVarValue}
                                                        onChange={this.handleInputChange}
                                                    />
                                                    <Button
                                                        shape="circle"
                                                        size="small"
                                                        icon={<Add />}
                                                        className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                        onClick={this.addEnvVar}
                                                    ></Button>
                                                </Space>
                                            </Space>
                                        </Row>
                                        <Space direction="vertical" className="my-2">
                                            <p className="text-base">Tags</p>
                                            <Space direction="horizontal">
                                                {tags.map((tag: TagsData, id) => (
                                                    <Tag
                                                        className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                        closable
                                                        key={id}
                                                        onClose={() => this.handleRemoveTag(id)}
                                                    >
                                                        {tag.name}
                                                    </Tag>
                                                ))}
                                            </Space>
                                            <Space direction="horizontal">
                                                <Input
                                                    size="large"
                                                    className="border-estela-blue-full rounded-lg"
                                                    name="newTagName"
                                                    placeholder="name"
                                                    value={newTagName}
                                                    onChange={this.handleInputChange}
                                                />
                                                <Button
                                                    shape="circle"
                                                    size="small"
                                                    icon={<Add />}
                                                    className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                                    onClick={this.addTag}
                                                ></Button>
                                            </Space>
                                        </Space>
                                        <Row className="flow-root mt-4">
                                            <Button
                                                loading={loading}
                                                onClick={this.handleSubmit}
                                                size="large"
                                                className="float-left w-48 h-12 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                                            >
                                                Create
                                            </Button>
                                            <Button
                                                size="large"
                                                className="float-right w-48 h-12 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                                onClick={() => this.setState({ modal: false })}
                                            >
                                                Cancel
                                            </Button>
                                        </Row>
                                    </Modal>
                                </Col>
                            </Row>
                            <Row className="my-4 grid gap-2 grid-cols-1 lg:grid-cols-5 items-start w-full">
                                <Col className="float-left col-span-4">
                                    {tableStatus[0] && (
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
                                    {tableStatus[1] && (
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
                                    {tableStatus[2] && (
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
                                    {tableStatus[3] && (
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
                                                checked={queueJobs.length == 0 ? tableStatus[0] : true}
                                                onChange={() => this.onChangeStatus(0, queueJobs.length)}
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
                                                checked={runningJobs.length == 0 ? tableStatus[1] : true}
                                                onChange={() => this.onChangeStatus(1, runningJobs.length)}
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
                                                checked={completedJobs.length == 0 ? tableStatus[2] : true}
                                                onChange={() => this.onChangeStatus(2, completedJobs.length)}
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
                                                checked={errorJobs.length == 0 ? tableStatus[3] : true}
                                                onChange={() => this.onChangeStatus(3, errorJobs.length)}
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
