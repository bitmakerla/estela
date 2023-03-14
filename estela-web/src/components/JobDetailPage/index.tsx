import React, { Component } from "react";
import moment from "moment";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LinearScale } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import {
    Layout,
    Typography,
    Row,
    Col,
    Space,
    Tag,
    Button,
    DatePickerProps,
    Tabs,
    Card,
    Modal,
    Select,
    Pagination,
    Dropdown,
    Input,
} from "antd";
import type { RangePickerProps } from "antd/es/date-picker";
import { Link, RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import history from "../../history";
import { ApiService } from "../../services";
import Copy from "../../assets/icons/copy.svg";
import Pause from "../../assets/icons/pause.svg";
import Add from "../../assets/icons/add.svg";
import Export from "../../assets/icons/export.svg";
import Delete from "../../assets/icons/trash.svg";
import ArrowDown from "../../assets/icons/arrowDown.svg";

import {
    ApiProjectsSpidersJobsReadRequest,
    SpiderJobUpdateStatusEnum,
    ApiProjectsSpidersJobsCreateRequest,
    ApiProjectsSpidersJobsUpdateRequest,
    ApiProjectsSpidersJobsDataListRequest,
    ApiProjectsSpidersListRequest,
    ApiProjectsSpidersJobsDataDeleteRequest,
    DeleteJobData,
    SpiderJob,
    SpiderJobCreate,
    SpiderJobUpdate,
    SpiderJobUpdateDataStatusEnum,
    Spider,
} from "../../services/api";
import {
    resourceNotAllowedNotification,
    incorrectDataNotification,
    dataDeletedNotification,
    invalidDataNotification,
    Spin,
} from "../../shared";
import { convertDateToString } from "../../utils";

const { Content } = Layout;
const { Text, Paragraph } = Typography;
const { Option } = Select;

ChartJS.register(ArcElement, LinearScale, Tooltip, Legend);

interface Dictionary {
    [Key: string]: string;
}

interface OptionDataPersistence {
    label: string;
    key: number;
    value: number;
}

interface ArgsData {
    name: string;
    value: string;
}

interface Args {
    name: string;
    value: string;
    key: number;
}

interface EnvVarsData {
    name: string;
    value: string;
}

interface EnvVars {
    name: string;
    value: string;
    key: number;
}

interface TagsData {
    name: string;
}

interface Tags {
    name: string;
    key: number;
}

interface JobDetailPageState {
    loaded: boolean;
    loadedButton: boolean;
    itemModal: boolean;
    requestModal: boolean;
    logModal: boolean;
    name: string | undefined;
    lifespan: number | undefined;
    totalResponseBytes: number | undefined;
    requestCount: number | undefined;
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    date: string;
    activeKey: string;
    created: string | undefined;
    status: string | undefined;
    cronjob: number | undefined | null;
    stats: Dictionary;
    loadedStats: boolean;
    items: Dictionary[];
    loadedItems: boolean;
    loadedItemsFirstTime: boolean;
    requests: Dictionary[];
    loadedRequests: boolean;
    logs: Dictionary[];
    loadedLogs: boolean;
    itemsCount: number;
    itemsCurrent: number;
    requestsCount: number;
    requestsCurrent: number;
    logsCount: number;
    logsCurrent: number;
    dataStatus: string | undefined;
    dataExpiryDays: number | undefined;
    loading_status: boolean;
    modified: boolean;
    modalStop: boolean;
    modalClone: boolean;
    spiders: Spider[];
    loadedSpiders: boolean;
    spiderName: string;
    newSpiderId: string;
    newDataExpireDays: number;
    newDataStatus: string;
    newTags: Tags[];
    newTagName: string;
    newArgs: Args[];
    newArgName: string;
    newArgValue: string;
    newEnvVars: EnvVars[];
    newEnvVarName: string;
    newEnvVarValue: string;
}

interface RouteParams {
    projectId: string;
    spiderId: string;
    jobId: string;
}

type ItemsMetadataProps = {
    item: Dictionary;
};

interface MetadataField {
    field: string;
    type: string;
}

interface StorageMetric {
    quantity: number;
    type: string;
}

class ItemsMetadata extends Component<ItemsMetadataProps> {
    item = this.props.item;
    metadata: MetadataField[] = [];

    isValidHttpUrl = (str: string): boolean => {
        let url;
        try {
            url = new URL(str);
        } catch (_) {
            return false;
        }
        return url.protocol === "http:" || url.protocol === "https:";
    };

    typeDefinition = (field: string, value: string): MetadataField => {
        const meta: MetadataField = {
            field: field,
            type: "text",
        };
        if (this.isValidHttpUrl(value)) {
            meta.type = "url";
        }
        return meta;
    };

    parseMetadata = (): void => {
        this.metadata.splice(0, this.metadata.length);
        for (const key in this.item) {
            this.metadata.push(this.typeDefinition(key, this.item[key]));
        }
    };

    render(): React.ReactNode {
        this.parseMetadata();
        return (
            <>
                {this.metadata.map((item: MetadataField, index: number) => {
                    if (index & 1) {
                        return (
                            <Row
                                key={`metadata-${index}`}
                                className="grid grid-cols-3 bg-estela-blue-low py-1 px-4 rounded-lg"
                            >
                                <Col className="col-span-1">
                                    <Text className="font-bold">{item.field}</Text>
                                </Col>
                                <Col className="col-span-2">
                                    <Text className="text-estela-black-medium">{item.type}</Text>
                                </Col>
                            </Row>
                        );
                    }
                    return (
                        <Row key={`metadata-${index}`} className="grid grid-cols-3 py-1 px-4 mt-4">
                            <Col className="col-span-1">
                                <Text className="font-bold">{item.field}</Text>
                            </Col>
                            <Col className="col-span-2">
                                <Text className="text-estela-black-medium">{item.type}</Text>
                            </Col>
                        </Row>
                    );
                })}
            </>
        );
    }
}

export class JobDetailPage extends Component<RouteComponentProps<RouteParams>, JobDetailPageState> {
    PAGE_SIZE = 10;
    dataRequests = "requests";
    dataItems = "items";
    dataLogs = "logs";
    state: JobDetailPageState = {
        loaded: false,
        loadedButton: false,
        itemModal: false,
        requestModal: false,
        logModal: false,
        name: "",
        lifespan: 0,
        totalResponseBytes: 0,
        requestCount: 0,
        args: [],
        envVars: [],
        tags: [],
        date: "",
        activeKey: "1",
        created: "",
        status: "",
        cronjob: null,
        stats: {},
        loadedStats: false,
        items: [],
        loadedItems: false,
        loadedItemsFirstTime: false,
        requests: [],
        loadedRequests: false,
        logs: [],
        loadedLogs: false,
        itemsCount: 0,
        itemsCurrent: 0,
        requestsCount: 0,
        requestsCurrent: 1,
        logsCount: 0,
        logsCurrent: 1,
        dataStatus: "",
        dataExpiryDays: 0,
        loading_status: false,
        modified: false,
        modalStop: false,
        modalClone: false,
        spiders: [],
        loadedSpiders: false,
        spiderName: "",
        newSpiderId: "",
        newDataExpireDays: 1,
        newDataStatus: "PENDING",
        newTags: [],
        newTagName: "",
        newArgs: [],
        newArgName: "",
        newArgValue: "",
        newEnvVars: [],
        newEnvVarName: "",
        newEnvVarValue: "",
    };
    apiService = ApiService();
    projectId: string = this.props.match.params.projectId;
    spiderId: string = this.props.match.params.spiderId;
    jobId: number = parseInt(this.props.match.params.jobId);
    newJobId: string = this.props.match.params.jobId;
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

    async componentDidMount(): Promise<void> {
        const requestParams: ApiProjectsSpidersJobsReadRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: this.jobId,
        };
        this.apiService.apiProjectsSpidersJobsRead(requestParams).then(
            async (response: SpiderJob) => {
                const args = response.args || [];
                const envVars = response.envVars || [];
                const tags = response.tags || [];
                const lifeSpanArr: string[] = String(response.lifespan ?? 0).split(":");
                const lifespan: number =
                    lifeSpanArr.length !== 3 ? 0 : +lifeSpanArr[0] * 3600 + +lifeSpanArr[1] * 60 + +lifeSpanArr[2];
                this.setState({
                    name: response.name,
                    lifespan: lifespan,
                    totalResponseBytes: response.totalResponseBytes,
                    args: [...args],
                    envVars: [...envVars],
                    tags: [...tags],
                    date: convertDateToString(response.created),
                    created: `${response.created}`,
                    status: response.jobStatus,
                    cronjob: response.cronjob,
                    requestCount: response.requestCount,
                    loaded: true,
                    dataStatus: response.dataStatus,
                    dataExpiryDays: response.dataExpiryDays == null ? 1 : response.dataExpiryDays,
                });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
        this.getProjectSpiders();
        await this.getItems(1);
        this.setState({ loadedItemsFirstTime: true });
    }

    getProjectSpiders = async (): Promise<void> => {
        const requestParams: ApiProjectsSpidersListRequest = { pid: this.projectId };
        this.apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                if (results.results.length == 0 || results.results == undefined) {
                    this.setState({ spiders: [], loadedSpiders: true });
                } else {
                    const spiderName = results.results.find(
                        (spider: Spider) => String(spider?.sid) === this.spiderId,
                    )?.name;
                    this.setState({
                        spiders: [...results.results],
                        spiderName: spiderName || "",
                        newSpiderId: String(results.results[0].sid),
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

    getData = async (): Promise<void> => {
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: `${this.jobId}`,
        };
        this.apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                if (results.results.length == 0 || results.results == undefined) {
                    this.setState({ spiders: [], loadedSpiders: true });
                } else {
                    const spiderName = results.results.find(
                        (spider: Spider) => String(spider?.sid) === this.spiderId,
                    )?.name;
                    this.setState({
                        spiders: [...results.results],
                        spiderName: spiderName || "",
                        newSpiderId: String(results.results[0].sid),
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

    handlePersistenceChange = (value: number): void => {
        if (value == 720) {
            this.setState({ newDataStatus: "PERSISTENT" });
        } else {
            this.setState({ newDataExpireDays: value });
        }
    };

    handleRemoveTag = (id: number): void => {
        const newTags = [...this.state.newTags];
        newTags.splice(id, 1);
        this.setState({ newTags: [...newTags] });
    };

    handleRemoveArg = (id: number): void => {
        const newArgs = [...this.state.newArgs];
        newArgs.splice(id, 1);
        this.setState({ newArgs: [...newArgs] });
    };

    handleRemoveEnvVar = (id: number): void => {
        const newEnvVars = [...this.state.newEnvVars];
        newEnvVars.splice(id, 1);
        this.setState({ newEnvVars: [...newEnvVars] });
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

    handleSubmit = (): void => {
        const futureDate: Date = new Date();
        futureDate.setDate(futureDate.getDate() + this.state.newDataExpireDays);
        const requestData = {
            args: [...this.state.newArgs],
            envVars: [...this.state.newEnvVars],
            tags: [...this.state.newTags],
            dataStatus: this.state.newDataStatus,
            dataExpiryDays: this.state.newDataExpireDays,
        };
        const request: ApiProjectsSpidersJobsCreateRequest = {
            data: requestData,
            pid: this.projectId,
            sid: this.state.newSpiderId,
        };
        this.apiService.apiProjectsSpidersJobsCreate(request).then(
            (response: SpiderJobCreate) => {
                history.push(`/projects/${this.projectId}/spiders/${this.state.newSpiderId}/jobs/${response.jid}`);
                location.reload();
            },
            (error: unknown) => {
                error;
                incorrectDataNotification();
            },
        );
    };

    handleSpiderChange = (value: string): void => {
        const spiderId = this.state.spiders.find((spider) => {
            return spider.name === value;
        });
        this.setState({ newSpiderId: String(spiderId?.sid) });
    };

    addTag = (): void => {
        const newTags = [...this.state.newTags];
        const newTagName = this.state.newTagName.trim();
        if (newTagName && newTagName.indexOf(" ") == -1) {
            newTags.push({ name: newTagName, key: this.countKey++ });
            this.setState({ newTags: [...newTags], newTagName: "" });
        } else {
            invalidDataNotification("Invalid tag name.");
        }
    };

    addArgument = (): void => {
        const newArgs = [...this.state.newArgs];
        const newArgName = this.state.newArgName.trim();
        const newArgValue = this.state.newArgValue.trim();
        if (newArgName && newArgValue && newArgName.indexOf(" ") == -1) {
            newArgs.push({ name: newArgName, value: newArgValue, key: this.countKey++ });
            this.setState({ newArgs: [...newArgs], newArgName: "", newArgValue: "" });
        } else {
            invalidDataNotification("Invalid argument name/value pair.");
        }
    };

    addEnvVar = (): void => {
        const newEnvVars = [...this.state.newEnvVars];
        const newEnvVarName = this.state.newEnvVarName.trim();
        const newEnvVarValue = this.state.newEnvVarValue.trim();
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            newEnvVars.push({ name: newEnvVarName, value: newEnvVarValue, key: this.countKey++ });
            this.setState({ newEnvVars: [...newEnvVars], newEnvVarName: "", newEnvVarValue: "" });
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
        }
    };

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
                error;
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
                error;
                incorrectDataNotification();
            },
        );
    };

    updateStatus = (_status: SpiderJobUpdateStatusEnum): void => {
        this.setState({ loading_status: true });
        const request: ApiProjectsSpidersJobsUpdateRequest = {
            jid: this.jobId,
            sid: this.spiderId,
            pid: this.projectId,
            data: {
                status: _status,
            },
        };
        this.apiService.apiProjectsSpidersJobsUpdate(request).then(
            (response) => {
                this.setState({ status: response.status, loading_status: false });
            },
            (error: unknown) => {
                error;
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

    getStats = (): void => {
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
                    this.setState({ stats: data, loadedStats: true });
                }
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    deleteSpiderJobData = (type_: string): void => {
        this.setState({ loadedButton: true });
        const request: ApiProjectsSpidersJobsDataDeleteRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: `${this.jobId}`,
            type: type_,
        };
        this.apiService.apiProjectsSpidersJobsDataDelete(request).then(
            (response: DeleteJobData) => {
                if (type_ == "items") {
                    this.setState({ items: [], itemsCount: 0, itemsCurrent: 0, loadedItems: true });
                } else if (type_ == "requests") {
                    this.setState({ requests: [], requestsCount: 0, requestsCurrent: 0, loadedRequests: true });
                } else if (type_ == "logs") {
                    this.setState({ logs: [], logsCount: 0, logsCurrent: 0, loadedLogs: true });
                }
                this.setState({ loadedButton: false });
                dataDeletedNotification(response.count);
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    getItems = async (page: number, pageSize?: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: this.newJobId,
            type: "items",
            page: page,
            pageSize: pageSize ?? this.PAGE_SIZE,
        };
        this.apiService.apiProjectsSpidersJobsDataList(requestParams).then(
            (response) => {
                let data: Dictionary[] = [];
                if (response.results?.length) {
                    const safe_data: unknown[] = response.results ?? [];
                    data = safe_data as Dictionary[];
                    this.setState({ items: data, loadedItems: true, itemsCurrent: page, itemsCount: response.count });
                }
                this.setState({ loadedItems: true, loadedItemsFirstTime: true });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    getRequests = async (page: number, pageSize?: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: this.newJobId,
            type: "requests",
            page: page,
            pageSize: pageSize ?? this.PAGE_SIZE,
        };
        this.apiService.apiProjectsSpidersJobsDataList(requestParams).then(
            (response) => {
                let data: Dictionary[] = [];
                if (response.results?.length) {
                    const safe_data: unknown[] = response.results ?? [];
                    data = safe_data as Dictionary[];
                    this.setState({
                        requests: data,
                        loadedRequests: true,
                        requestsCurrent: page,
                        requestsCount: response.count,
                    });
                }
                this.setState({ loadedRequests: true });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    getLogs = async (page: number, pageSize?: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersJobsDataListRequest = {
            pid: this.projectId,
            sid: this.spiderId,
            jid: this.newJobId,
            type: "logs",
            page: page,
            pageSize: pageSize ?? this.PAGE_SIZE,
        };
        this.apiService.apiProjectsSpidersJobsDataList(requestParams).then(
            (response) => {
                let data: Dictionary[] = [];
                if (response.results?.length) {
                    const safe_data: unknown[] = response.results ?? [];
                    data = safe_data as Dictionary[];
                    this.setState({
                        logs: data,
                        loadedLogs: true,
                        logsCurrent: page,
                        logsCount: response.count,
                    });
                }
                this.setState({ loadedLogs: true });
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    onItemsPageChange = async (page: number): Promise<void> => {
        this.setState({ loadedItems: false });
        await this.getItems(page);
    };

    onRequestsPageChange = async (page: number): Promise<void> => {
        this.setState({ loadedRequests: false });
        await this.getRequests(page);
    };

    onLogsPageChange = async (page: number): Promise<void> => {
        this.setState({ loadedLogs: false });
        await this.getLogs(page);
    };

    formatBytes = (bytes: number): StorageMetric => {
        if (!+bytes) {
            return {
                quantity: 0,
                type: "Bytes",
            };
        } else {
            const sizes = ["Bytes", "KB", "MB", "GB"];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return {
                quantity: parseFloat((bytes / Math.pow(1024, i)).toFixed(2)),
                type: `${sizes[i > sizes.length - 1 ? 3 : i]}`,
            };
        }
    };

    chartConfigs = (storage: StorageMetric): [number[], string[]] => {
        const dataChartProportions = [1, 0];
        const colorChartArray = ["#7DC932", "#F1F1F1"];
        if (storage.type === "Bytes") {
            dataChartProportions[0] = 0.05 * (storage.quantity / 1024);
            dataChartProportions[1] = 1 - dataChartProportions[0];
        } else if (storage.type === "KB") {
            dataChartProportions[0] = 0.1 * (storage.quantity / 1024);
            dataChartProportions[1] = 1 - dataChartProportions[0];
        } else if (storage.type === "MB") {
            dataChartProportions[0] = storage.quantity / 1024;
            dataChartProportions[1] = 1 - dataChartProportions[0];
            if (dataChartProportions[0] > 0.75) {
                colorChartArray[0] = "#FFC002";
            }
            if (dataChartProportions[0] > 0.9) {
                colorChartArray[0] = "#E34A46";
            }
        } else {
            dataChartProportions[0] = storage.quantity;
            colorChartArray[0] = "#E34A46";
        }
        return [dataChartProportions, colorChartArray];
    };

    overview = (): React.ReactNode => {
        const {
            tags,
            lifespan,
            loadedItems,
            loadedItemsFirstTime,
            envVars,
            args,
            date,
            dataStatus,
            dataExpiryDays,
            spiderName,
            totalResponseBytes,
            items,
            status,
        } = this.state;
        const storage: StorageMetric = this.formatBytes(Number(totalResponseBytes));
        const [dataChartProportions, colorChartArray] = this.chartConfigs(storage);
        const lifespanPercentage: number = Math.round(100 * (Math.log(lifespan ?? 1) / Math.log(3600)));
        const dataChart = {
            datasets: [
                {
                    label: "GB",
                    data: [...dataChartProportions],
                    backgroundColor: [...colorChartArray],
                    borderWidth: 1,
                    cutout: "90%",
                    circumference: 300,
                    rotation: 210,
                    borderRadius: 4,
                },
            ],
        };
        return (
            <>
                <Content className="grid sm:grid-cols-1 md:grid-cols-12 lg:grid-cols-12 grid-cols-12 gap-2 items-start lg:w-full">
                    <Card
                        className="w-full sm:col-span-1 md:col-span-5 col-span-5 flex flex-col"
                        style={{ borderRadius: "8px" }}
                        bordered={false}
                    >
                        <Text className="py-2 text-estela-black-medium font-medium text-base">Storage</Text>
                        <Content className="grid w-full h-1/2 place-content-center">
                            <Content className="flex items-center justify-center">
                                <Doughnut
                                    plugins={[
                                        {
                                            id: "storageNeedle",
                                            afterDatasetDraw(chart: ChartJS) {
                                                const { ctx } = chart;
                                                ctx.save();
                                                const x = chart.getDatasetMeta(0).data[0].x;
                                                const y = chart.getDatasetMeta(0).data[0].y;
                                                ctx.textAlign = "center";
                                                ctx.textBaseline = "middle";
                                                ctx.font = "1.875rem/2.25rem sans-serif";
                                                ctx.fillText(`${storage.quantity} ${storage.type}`, x, y - 20);
                                                ctx.font = "1.25rem/1.75rem sans-serif";
                                                ctx.fillText("of 1GB", x, y + 20);
                                            },
                                        },
                                    ]}
                                    options={{
                                        responsive: true,
                                        events: [],
                                    }}
                                    data={dataChart}
                                />
                            </Content>
                        </Content>
                    </Card>
                    <Card
                        className="w-full sm:col-span-1 md:col-span-7 col-span-7 flex flex-col"
                        style={{ borderRadius: "8px" }}
                        bordered={false}
                    >
                        <Text className="py-2 text-estela-black-medium font-medium text-base">DETAILS</Text>
                        <Row className="grid grid-cols-3 py-1 px-2 mt-4">
                            <Col>
                                <Text className="font-bold">Spider ID</Text>
                            </Col>
                            <Col>
                                <Link
                                    to={`/projects/${this.projectId}/spiders/${this.spiderId}`}
                                    className="text-estela-blue-medium px-2"
                                >
                                    {this.spiderId}
                                </Link>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col className="col-span-1">
                                <Text className="font-bold">Project ID</Text>
                            </Col>
                            <Col className="col-span-2">
                                <Link
                                    to={`/projects/${this.projectId}/dashboard`}
                                    className="text-estela-blue-medium px-2"
                                >
                                    {this.projectId}
                                </Link>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col className="col-span-1">
                                <Text className="font-bold">Creation date</Text>
                            </Col>
                            <Col className="col-span-2 px-2">{date}</Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col>
                                <Text className="font-bold">Tags</Text>
                            </Col>
                            <Col className="px-2">
                                <Space direction="horizontal">
                                    {tags.map((tag: TagsData, id) => (
                                        <Tag
                                            className="border-estela-blue-full bg-estela-blue-low text-estela-blue-full rounded-md"
                                            key={id}
                                        >
                                            {tag.name}
                                        </Tag>
                                    ))}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col>
                                <Text className="font-bold">Environment variables</Text>
                            </Col>
                            <Col className="px-2">
                                <Space direction="vertical">
                                    {envVars.map((envVar: EnvVarsData, id) => (
                                        <Tag
                                            className="border-estela-blue-full bg-estela-blue-low text-estela-blue-full rounded-md"
                                            key={id}
                                        >
                                            {envVar.name}: {envVar.value}
                                        </Tag>
                                    ))}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col>
                                <Text className="font-bold">Arguments</Text>
                            </Col>
                            <Col className="px-2">
                                <Space direction="horizontal">
                                    {args.map((arg: ArgsData, id) => (
                                        <Tag
                                            className="border-estela-blue-full bg-estela-blue-low text-estela-blue-full rounded-md"
                                            key={id}
                                        >
                                            {arg.name}: {arg.value}
                                        </Tag>
                                    ))}
                                </Space>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col>
                                <Text className="font-bold">Spider</Text>
                            </Col>
                            <Col>
                                <Link
                                    to={`/projects/${this.projectId}/spiders/${this.spiderId}`}
                                    className="text-estela-blue-medium px-2"
                                >
                                    {spiderName}
                                </Link>
                            </Col>
                        </Row>
                        <Row className="grid grid-cols-3 bg-estela-blue-low py-1 px-2 rounded-lg">
                            <Col>
                                <Text className="font-bold">Job Status</Text>
                            </Col>
                            {status == "COMPLETED" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-blue-low text-estela-blue-full border-estela-blue-full rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                            {status == "RUNNING" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-blue-low text-estela-green-full border-estela-green-full rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                            {status == "ERROR" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-red-low text-estela-red-full border-estela-red-full rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                            {status == "INCOMPLETED" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-red-low text-estela-red-full border-estela-red-full rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                            {status == "STOPPED" && (
                                <Col className="col-span-2 px-2">
                                    <Tag className="bg-estela-white-medium text-estela-yellow border-estela-yellow rounded-md">
                                        {status}
                                    </Tag>
                                </Col>
                            )}
                        </Row>
                        <Row className="grid grid-cols-3 py-1 px-2">
                            <Col>
                                <Text className="font-bold">Data Persistence</Text>
                            </Col>
                            {dataStatus == "PENDING" && <Col className="col-span-2 px-2">{dataExpiryDays} days</Col>}
                            {dataStatus == "PERSISTENT" && <Col className="col-span-2 px-2">Forever</Col>}
                        </Row>
                    </Card>
                </Content>
                <Content className="my-2 grid lg:grid-cols-12 grid-cols-12 gap-1 items-start lg:w-full">
                    <Card
                        className="opacity-40 cursor-not-allowed w-full col-span-2 flex flex-col"
                        style={{ borderRadius: "8px" }}
                        bordered={false}
                    >
                        <Text className="py-0 text-estela-black-medium font-medium text-base">Bandwidth</Text>
                        <Row className="grid grid-cols-1 py-1 mt-3">
                            <Col>
                                <Text className="font-bold text-estela-black-full text-lg">-/-</Text>
                            </Col>
                            <Col>
                                <Text className="text-estela-black-medium text-xs">of project</Text>
                            </Col>
                            <Col>
                                <Content className="w-full bg-estela-white-low rounded-full h-2.5 dark:bg-estela-white-low">
                                    <div
                                        className="bg-estela-states-green-medium h-2.5 rounded-full"
                                        style={{ width: "0%" }}
                                    ></div>
                                </Content>
                            </Col>
                        </Row>
                    </Card>
                    <Card className="w-full col-span-3 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Text className="py-2 m-2 text-estela-black-medium font-medium text-base">Processing Time</Text>
                        <Row className="grid grid-cols-1 py-1 px-2 mt-3">
                            <Col>
                                <Text className="font-bold text-estela-black-full text-lg">
                                    {(lifespan ?? 0).toFixed(2)}
                                </Text>
                                <Text className="text-estela-black-full text-base"> seg</Text>
                            </Col>
                            <Col>
                                <Text className="text-estela-black-medium text-xs">this job</Text>
                            </Col>
                            <Col>
                                <Content className="w-full bg-estela-white-low rounded-full h-2.5 dark:bg-estela-white-low">
                                    <div
                                        className="bg-estela-states-green-medium h-2.5 rounded-full"
                                        style={{
                                            width: `${lifespanPercentage > 98 ? 100 : lifespanPercentage}%`,
                                        }}
                                    ></div>
                                </Content>
                            </Col>
                        </Row>
                    </Card>
                    <Card className="w-full col-span-7 flex flex-col" style={{ borderRadius: "8px" }} bordered={false}>
                        <Row className="flow-root lg:my-6 my-4">
                            <Text className="py-2 m-4 text-estela-black-medium font-medium text-base">Fields</Text>
                            <Button
                                onClick={() => {
                                    this.setState({ activeKey: "2" });
                                }}
                                className="float-right py-1 px-3 text-estela-blue-full border-none text-base hover:text-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                            >
                                See items
                            </Button>
                        </Row>
                        {loadedItemsFirstTime &&
                            (!items.length ? (
                                <Row className="grid grid-cols-3 py-1 px-4 mt-4">
                                    <Col className="text-center col-span-3">
                                        {loadedItems ? (
                                            <Text className="text-estela-black-medium">No data</Text>
                                        ) : (
                                            <Spin />
                                        )}
                                    </Col>
                                </Row>
                            ) : (
                                <ItemsMetadata item={items[0]} />
                            ))}
                    </Card>
                </Content>
            </>
        );
    };

    stats = (): React.ReactNode => {
        const { loadedStats, stats } = this.state;

        return (
            <Content className="bg-metal content-padding">
                {loadedStats ? (
                    <Row className="grid grid-cols-5 bg-white">
                        <Col className="col-start-2 col-span-3">
                            {Object.entries(stats).map(([statKey, stat], index: number) => {
                                if (index % 2) {
                                    return (
                                        <Row
                                            key={index}
                                            className="grid grid-cols-2 bg-estela-blue-low py-1 px-2 rounded-lg"
                                        >
                                            <Col>
                                                <Text className="font-bold">{statKey}</Text>
                                            </Col>
                                            <Col>
                                                <Text className="text-estela-black-full px-4">{stat}</Text>
                                            </Col>
                                        </Row>
                                    );
                                }
                                return (
                                    <Row key={index} className="grid grid-cols-2 py-1 px-2 mt-4">
                                        <Col>
                                            <Text className="font-bold">{statKey}</Text>
                                        </Col>
                                        <Col>
                                            <Text className="text-estela-black-full px-4">{stat}</Text>
                                        </Col>
                                    </Row>
                                );
                            })}
                        </Col>
                    </Row>
                ) : (
                    <Spin />
                )}
            </Content>
        );
    };

    items = (): React.ReactNode => {
        const { loadedItems, loadedButton, items, itemModal, itemsCurrent, itemsCount } = this.state;
        return (
            <Content className="bg-metal content-padding">
                {loadedItems ? (
                    <>
                        <Row className="flow-root my-2 w-full space-x-2" align="middle">
                            <Col className="flex float-left items-center space-x-3">
                                <Text className="text-estela-black-medium text-sm">Filter by:</Text>
                                <Dropdown disabled>
                                    <Button
                                        disabled
                                        size="large"
                                        className="flex items-center w-36 mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                    >
                                        <Text className="float-left text-sm text-estela-black-medium">Field...</Text>
                                        <ArrowDown className="h-3.5 w-4 mr-2 float-right" />
                                    </Button>
                                </Dropdown>
                            </Col>
                            <Col className="flex float-left items-center space-x-3">
                                <Dropdown disabled>
                                    <Button
                                        disabled
                                        size="large"
                                        className="flex items-center w-36 mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                    >
                                        <Text className="float-left text-sm text-estela-black-medium">Action...</Text>
                                        <ArrowDown className="h-3.5 w-4 mr-2 float-right" />
                                    </Button>
                                </Dropdown>
                            </Col>
                            <Col className="flex float-left items-center space-x-3">
                                <Dropdown disabled>
                                    <Button
                                        disabled
                                        size="large"
                                        className="flex items-center w-36 mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                    >
                                        <Text className="float-left text-sm text-estela-black-medium">Action...</Text>
                                        <ArrowDown className="h-3.5 w-4 mr-2 float-right" />
                                    </Button>
                                </Dropdown>
                            </Col>
                            <Col className="flex float-left">
                                <Button
                                    disabled
                                    size="large"
                                    className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                >
                                    Update
                                </Button>
                            </Col>
                            <Col className="flex float-right">
                                <Button
                                    loading={loadedButton}
                                    disabled={items.length === 0}
                                    size="large"
                                    icon={<Delete className="h-3.5 w-4 mr-2" />}
                                    onClick={() => {
                                        this.setState({ itemModal: true });
                                    }}
                                    className="flex items-center mr-2 stroke-estela-red-full border-estela-red-low bg-estela-red-low text-estela-red-full hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-2xl"
                                >
                                    Delete items
                                </Button>
                                <Modal
                                    open={itemModal}
                                    onOk={() => {
                                        this.setState({ itemModal: false });
                                        this.deleteSpiderJobData("items");
                                    }}
                                    onCancel={() => {
                                        this.setState({ itemModal: false });
                                    }}
                                    okText="Yes"
                                    okType="danger"
                                    cancelText="No"
                                    okButtonProps={{ className: "rounded-lg" }}
                                    cancelButtonProps={{ className: "rounded-lg" }}
                                >
                                    <Text>Are you sure you want to delete job items?</Text>
                                </Modal>
                                <Button
                                    disabled
                                    size="large"
                                    icon={<Export className="h-3.5 w-4 mr-2" />}
                                    className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                >
                                    Download
                                </Button>
                            </Col>
                        </Row>
                        {items.map((item: Dictionary, index: number) => {
                            return (
                                <Card
                                    key={index}
                                    className="w-full mt-2"
                                    style={{ borderRadius: "8px" }}
                                    bordered={false}
                                >
                                    <Row className="flow-root mx-1 my-2 w-full space-x-4" align="middle">
                                        <Col className="flex float-left">
                                            <Text className="py-2 text-estela-black-full font-medium text-base">
                                                ITEM {this.PAGE_SIZE * (itemsCurrent - 1) + index + 1}
                                            </Text>
                                        </Col>
                                        <Col className="flex float-right">
                                            <Button
                                                disabled
                                                size="large"
                                                icon={<Export className="h-3.5 w-4 mr-2" />}
                                                className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                            >
                                                Download
                                            </Button>
                                        </Col>
                                    </Row>
                                    <>
                                        {Object.entries(item).map(([itemPropKey, itemProp], index: number) => {
                                            let itemContent = (
                                                <Text className="text-estela-black-medium px-4">{itemProp}</Text>
                                            );

                                            if (itemProp.length > 300) {
                                                itemContent = (
                                                    <Paragraph
                                                        className="text-estela-black-medium px-4"
                                                        ellipsis={{ rows: 3, expandable: true, symbol: "more" }}
                                                    >
                                                        {itemProp}
                                                    </Paragraph>
                                                );
                                            }

                                            return (
                                                <Row
                                                    key={index}
                                                    align="middle"
                                                    className={`grid grid-cols-8 py-1 px-2 ${
                                                        index % 2 ? "rounded-lg bg-estela-blue-low" : ""
                                                    }`}
                                                >
                                                    <Col className="col-span-2">
                                                        <Text className="font-bold">{itemPropKey}</Text>
                                                    </Col>
                                                    <Col className="col-span-6">{itemContent}</Col>
                                                </Row>
                                            );
                                        })}
                                    </>
                                </Card>
                            );
                        })}
                        <Pagination
                            className="pagination"
                            defaultCurrent={1}
                            simple
                            total={itemsCount}
                            current={itemsCurrent}
                            pageSize={this.PAGE_SIZE}
                            onChange={this.onItemsPageChange}
                            showSizeChanger={false}
                        />
                    </>
                ) : (
                    <Spin />
                )}
            </Content>
        );
    };

    requests = (): React.ReactNode => {
        const { loadedRequests, loadedButton, requests, requestModal, requestsCurrent, requestsCount } = this.state;
        return (
            <Content className="bg-metal content-padding">
                {loadedRequests ? (
                    <>
                        <Row className="flow-root my-2 w-full space-x-2" align="middle">
                            <Col className="flex float-left items-center space-x-3">
                                <Text className="text-estela-black-medium text-sm">Filter by:</Text>
                                <Dropdown disabled>
                                    <Button
                                        disabled
                                        size="large"
                                        className="flex items-center w-36 mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                    >
                                        <Text className="float-left text-sm text-estela-black-medium">Field...</Text>
                                        <ArrowDown className="h-3.5 w-4 mr-2 float-right" />
                                    </Button>
                                </Dropdown>
                            </Col>
                            <Col className="flex float-left items-center space-x-3">
                                <Dropdown disabled>
                                    <Button
                                        disabled
                                        size="large"
                                        className="flex items-center w-36 mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                    >
                                        <Text className="float-left text-sm text-estela-black-medium">Action...</Text>
                                        <ArrowDown className="h-3.5 w-4 mr-2 float-right" />
                                    </Button>
                                </Dropdown>
                            </Col>
                            <Col className="flex float-left items-center space-x-3">
                                <Dropdown disabled>
                                    <Button
                                        disabled
                                        size="large"
                                        className="flex items-center w-36 mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                    >
                                        <Text className="float-left text-sm text-estela-black-medium">Criteria...</Text>
                                        <ArrowDown className="h-3.5 w-4 mr-2 float-right" />
                                    </Button>
                                </Dropdown>
                            </Col>
                            <Col className="flex float-left">
                                <Button
                                    disabled
                                    size="large"
                                    className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                >
                                    Update
                                </Button>
                            </Col>
                            <Col className="flex float-right">
                                <Button
                                    loading={loadedButton}
                                    disabled={requests.length === 0}
                                    size="large"
                                    icon={<Delete className="h-3.5 w-4 mr-2" />}
                                    onClick={() => {
                                        this.setState({ requestModal: true });
                                    }}
                                    className="flex items-center mr-2 stroke-estela-red-full border-estela-red-low bg-estela-red-low text-estela-red-full hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-2xl"
                                >
                                    Delete requests
                                </Button>
                                <Modal
                                    open={requestModal}
                                    onOk={() => {
                                        this.setState({ requestModal: false });
                                        this.deleteSpiderJobData("requests");
                                    }}
                                    onCancel={() => {
                                        this.setState({ requestModal: false });
                                    }}
                                    okText="Yes"
                                    okType="danger"
                                    cancelText="No"
                                    okButtonProps={{ className: "rounded-lg" }}
                                    cancelButtonProps={{ className: "rounded-lg" }}
                                >
                                    <Text>Are you sure you want to delete job requests?</Text>
                                </Modal>
                                <Button
                                    disabled
                                    size="large"
                                    icon={<Export className="h-3.5 w-4 mr-2" />}
                                    className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                >
                                    Download
                                </Button>
                            </Col>
                        </Row>
                        {requests.map((request: Dictionary, index: number) => {
                            return (
                                <Card
                                    key={index}
                                    className="w-full mt-2"
                                    style={{ borderRadius: "8px" }}
                                    bordered={false}
                                >
                                    <Row className="flow-root mx-1 my-2 w-full space-x-4" align="middle">
                                        <Col className="flex float-left">
                                            <Text className="py-2 text-estela-black-full font-medium text-base">
                                                REQUEST {this.PAGE_SIZE * (requestsCurrent - 1) + index + 1}
                                            </Text>
                                        </Col>
                                        <Col className="flex float-right">
                                            <Button
                                                disabled
                                                size="large"
                                                icon={<Export className="h-3.5 w-4 mr-2" />}
                                                className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                            >
                                                Download
                                            </Button>
                                        </Col>
                                    </Row>
                                    <>
                                        {Object.entries(request).map(([requestPropKey, requestProp], index: number) => {
                                            let requestContent = (
                                                <Text className="text-estela-black-medium px-4">{requestProp}</Text>
                                            );
                                            if (requestProp.length > 300) {
                                                requestContent = (
                                                    <Paragraph
                                                        className="text-estela-black-medium px-4"
                                                        ellipsis={{ rows: 3, expandable: true, symbol: "more" }}
                                                    >
                                                        {requestProp}
                                                    </Paragraph>
                                                );
                                            }
                                            return (
                                                <Row
                                                    key={index}
                                                    align="middle"
                                                    className={`grid grid-cols-8 py-1 px-2 ${
                                                        index % 2 ? "rounded-lg bg-estela-blue-low" : ""
                                                    }`}
                                                >
                                                    <Col className="col-span-2">
                                                        <Text className="font-bold">{requestPropKey}</Text>
                                                    </Col>
                                                    <Col className="col-span-6">{requestContent}</Col>
                                                </Row>
                                            );
                                        })}
                                    </>
                                </Card>
                            );
                        })}
                        <Pagination
                            className="pagination"
                            defaultCurrent={1}
                            simple
                            total={requestsCount}
                            current={requestsCurrent}
                            pageSize={this.PAGE_SIZE}
                            onChange={this.onRequestsPageChange}
                            showSizeChanger={false}
                        />
                    </>
                ) : (
                    <Spin />
                )}
            </Content>
        );
    };

    logs = (): React.ReactNode => {
        const { loadedLogs, loadedButton, logs, logModal, logsCurrent, logsCount } = this.state;
        return (
            <Content className="bg-metal content-padding">
                {loadedLogs ? (
                    <>
                        <Row className="flow-root my-2 w-full space-x-2" align="middle">
                            <Col className="flex float-left items-center space-x-3">
                                <Text className="text-estela-black-medium text-sm">Search:</Text>
                                <Input disabled className="w-36 h-10 rounded-2xl" placeholder="Enter a word..." />
                            </Col>
                            <Col className="flex float-left">
                                <Button
                                    disabled
                                    size="large"
                                    className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                >
                                    Update
                                </Button>
                            </Col>

                            <Col className="flex float-right">
                                <Button
                                    loading={loadedButton}
                                    disabled={logs.length === 0}
                                    size="large"
                                    icon={<Delete className="h-3.5 w-4 mr-2" />}
                                    onClick={() => {
                                        this.setState({ logModal: true });
                                    }}
                                    className="flex items-center mr-2 stroke-estela-red-full border-estela-red-low bg-estela-red-low text-estela-red-full hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-2xl"
                                >
                                    Delete logs
                                </Button>
                                <Modal
                                    open={logModal}
                                    onOk={() => {
                                        this.setState({ logModal: false });
                                        this.deleteSpiderJobData("logs");
                                    }}
                                    onCancel={() => {
                                        this.setState({ logModal: false });
                                    }}
                                    okText="Yes"
                                    okType="danger"
                                    cancelText="No"
                                    okButtonProps={{ className: "rounded-lg" }}
                                    cancelButtonProps={{ className: "rounded-lg" }}
                                >
                                    <Text>Are you sure you want to delete job logs?</Text>
                                </Modal>
                                <Button
                                    disabled
                                    size="large"
                                    icon={<Export className="h-3.5 w-4 mr-2" />}
                                    className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                >
                                    Download
                                </Button>
                            </Col>
                            <Col className="flex float-right">
                                <Button
                                    disabled
                                    size="large"
                                    className="flex items-center mr-2 stroke-estela-blue-full border-estela-blue-low bg-estela-blue-low text-estela-blue-full hover:text-estela-blue-full text-sm hover:border-estela rounded-2xl"
                                >
                                    Go
                                </Button>
                            </Col>
                            <Col className="flex float-right items-center space-x-3">
                                <Input disabled className="w-36 h-10 rounded-2xl" placeholder="Go to line..." />
                            </Col>
                        </Row>
                        <Content className="bg-white content-padding">
                            <Row align="middle" className="grid grid-cols-12 py-1 px-2 rounded-lg bg-estela-blue-low">
                                <Col className=" col-start-2 col-span-3">
                                    <Text className="font-bold estela-black-full text-xs">TIME</Text>
                                </Col>
                                <Col className="col-span-2">
                                    <Text className="font-bold estela-black-full text-xs">LEVEL</Text>
                                </Col>
                                <Col className="col-span-6">
                                    <Text className="font-bold estela-black-full text-xs">MESSAGE</Text>
                                </Col>
                            </Row>
                            {logs.map((log: Dictionary, index: number) => {
                                let logContent = (
                                    <Text className="text-estela-black-medium">{log.log ?? "No data"}</Text>
                                );
                                if ((log.log ?? "").length > 300) {
                                    logContent = (
                                        <Paragraph
                                            className="text-estela-black-medium"
                                            ellipsis={{ rows: 2, expandable: true, symbol: "more" }}
                                        >
                                            {log.log}
                                        </Paragraph>
                                    );
                                }
                                const logDate = log.datetime
                                    ? new Date(parseFloat(log.datetime) * 1000).toDateString()
                                    : "no date";

                                return (
                                    <Row
                                        key={index}
                                        align="middle"
                                        className={`grid grid-cols-12 py-1 px-2 ${
                                            index % 2 ? "rounded-lg bg-estela-blue-low" : ""
                                        }`}
                                    >
                                        <Col className="col-span-1">
                                            <Text className="text-estela-blue-medium">
                                                {this.PAGE_SIZE * (logsCurrent - 1) + index + 1}
                                            </Text>
                                        </Col>
                                        <Col className="col-span-3">
                                            <Text className="text-estela-black-medium">{logDate}</Text>
                                        </Col>
                                        <Col className="col-span-2">
                                            <Text className="text-estela-black-medium">INFO</Text>
                                        </Col>
                                        <Col className="col-span-6">{logContent}</Col>
                                    </Row>
                                );
                            })}
                        </Content>
                        <Pagination
                            className="pagination"
                            defaultCurrent={1}
                            simple
                            total={logsCount}
                            current={logsCurrent}
                            pageSize={this.PAGE_SIZE}
                            onChange={this.onLogsPageChange}
                            showSizeChanger={false}
                        />
                    </>
                ) : (
                    <Spin />
                )}
            </Content>
        );
    };

    render(): JSX.Element {
        const {
            loaded,
            newTagName,
            status,
            modalStop,
            modalClone,
            spiders,
            activeKey,
            loadedSpiders,
            newTags,
            newArgs,
            newArgName,
            newArgValue,
            newEnvVars,
            newEnvVarName,
            newEnvVarValue,
            itemsCurrent,
            loadedStats,
            loadedItems,
            loadedItemsFirstTime,
            loadedRequests,
            requestsCurrent,
            loadedLogs,
            logsCurrent,
        } = this.state;
        return (
            <Content className="content-padding">
                {loaded && loadedSpiders ? (
                    <Layout className="white-background">
                        <Content className="bg-metal rounded-2xl">
                            <Row className="flow-root lg:mt-10 lg:mx-10 mt-6 mx-6">
                                <Col className="float-left">
                                    <Text className="text-estela-black-medium font-medium text-xl">
                                        Job-{this.jobId}
                                    </Text>
                                </Col>
                                <Col className="float-right flex gap-1">
                                    <Button
                                        onClick={() => {
                                            const newTags: Tags[] = [...this.state.tags].map(
                                                (tag: TagsData, id: number) => ({
                                                    name: tag.name,
                                                    key: id,
                                                }),
                                            );
                                            const newArgs: Args[] = [...this.state.args].map(
                                                (arg: ArgsData, id: number) => ({
                                                    name: arg.name,
                                                    value: arg.value,
                                                    key: id,
                                                }),
                                            );
                                            const newEnvVars: EnvVars[] = [...this.state.envVars].map(
                                                (tag: EnvVarsData, id: number) => ({
                                                    name: tag.name,
                                                    value: tag.value,
                                                    key: id,
                                                }),
                                            );
                                            this.setState({
                                                modalClone: true,
                                                newTags: [...newTags],
                                                newArgs: [...newArgs],
                                                newEnvVars: [...newEnvVars],
                                            });
                                        }}
                                        icon={<Copy className="h-6 w-6 mr-2 text-sm" />}
                                        size="large"
                                        className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                                    >
                                        Clone this job
                                    </Button>
                                    <Button
                                        disabled={!(status == SpiderJobUpdateStatusEnum.Running)}
                                        icon={<Pause className="h-6 w-6 mr-2 text-sm" />}
                                        onClick={() => {
                                            this.setState({ modalStop: true });
                                        }}
                                        size="large"
                                        className="flex items-center stroke-estela-red-full border-estela-red-full hover:stroke-estela-red-full bg-estela-white text-estela-red-full hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-md"
                                    >
                                        Stop this job
                                    </Button>
                                    {modalStop && (
                                        <Modal
                                            style={{
                                                overflow: "hidden",
                                                padding: 0,
                                            }}
                                            centered
                                            width={681}
                                            open={modalStop}
                                            title={
                                                <p className="text-xl text-center mt-2 font-normal">CONFIRM ACTION</p>
                                            }
                                            onCancel={() => this.setState({ modalStop: false })}
                                            footer={null}
                                        >
                                            <Row className="grid sm:grid-cols-1" justify="center">
                                                <Col className="text-center text-estela-black-full">
                                                    Are you sure you want to stop this job?
                                                </Col>
                                            </Row>
                                            <Row justify="center" className="mt-4">
                                                <Button
                                                    size="large"
                                                    className="w-48 h-12 mr-1 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                                                    onClick={() => {
                                                        this.updateStatus(SpiderJobUpdateStatusEnum.Stopped);
                                                        this.setState({ modalStop: false });
                                                    }}
                                                >
                                                    Confirm
                                                </Button>
                                                <Button
                                                    size="large"
                                                    className="w-48 h-12 ml-1 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                                    onClick={() => this.setState({ modalStop: false })}
                                                >
                                                    Cancel
                                                </Button>
                                            </Row>
                                        </Modal>
                                    )}
                                    {modalClone && (
                                        <Modal
                                            style={{
                                                overflow: "hidden",
                                                padding: 0,
                                            }}
                                            centered
                                            width={681}
                                            open={modalClone}
                                            title={<p className="text-xl text-center mt-2 font-normal">NEW JOB</p>}
                                            onCancel={() => this.setState({ modalClone: false })}
                                            footer={null}
                                        >
                                            <Row className="grid sm:grid-cols-1">
                                                <Col className="mx-4">
                                                    <Content>
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
                                                    </Content>
                                                    <Content>
                                                        <p className="text-base my-2">Data persistence</p>
                                                        <Select
                                                            onChange={this.handlePersistenceChange}
                                                            className="w-full"
                                                            size="large"
                                                            defaultValue={this.dataPersistenceOptions[0].value}
                                                        >
                                                            {this.dataPersistenceOptions.map(
                                                                (option: OptionDataPersistence) => (
                                                                    <Option
                                                                        className="text-sm"
                                                                        key={option.key}
                                                                        value={option.value}
                                                                    >
                                                                        {option.label}
                                                                    </Option>
                                                                ),
                                                            )}
                                                        </Select>
                                                    </Content>
                                                    <Content>
                                                        <p className="text-base my-2">Tags</p>
                                                        <Space direction="horizontal">
                                                            {newTags.map((tag: Tags, id: number) => {
                                                                return (
                                                                    <Tag
                                                                        className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                        closable
                                                                        key={tag.key}
                                                                        onClose={() => this.handleRemoveTag(id)}
                                                                    >
                                                                        {tag.name}
                                                                    </Tag>
                                                                );
                                                            })}
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
                                                    </Content>
                                                    <Content>
                                                        <p className="text-base my-2">Arguments</p>
                                                        <Space direction="vertical">
                                                            {newArgs.map((arg: Args, id) => (
                                                                <Tag
                                                                    className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                    closable
                                                                    key={arg.key}
                                                                    onClose={() => this.handleRemoveArg(id)}
                                                                >
                                                                    {arg.name}: {arg.value}
                                                                </Tag>
                                                            ))}
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
                                                    </Content>
                                                    <Content>
                                                        <p className="text-base my-2">Environment Variables</p>
                                                        <Space className="mb-2" direction="horizontal">
                                                            {newEnvVars.map((envVar: EnvVars, id: number) => (
                                                                <Tag
                                                                    className="text-estela-blue-full border-0 bg-estela-blue-low"
                                                                    closable
                                                                    key={envVar.key}
                                                                    onClose={() => this.handleRemoveEnvVar(id)}
                                                                >
                                                                    {envVar.name}: {envVar.value}
                                                                </Tag>
                                                            ))}
                                                        </Space>
                                                        <Space direction="horizontal">
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
                                                    </Content>
                                                </Col>
                                            </Row>
                                            <Row justify="center" className="mt-4">
                                                <Button
                                                    onClick={this.handleSubmit}
                                                    size="large"
                                                    className="w-48 h-12 mr-1 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                                                >
                                                    Confirm
                                                </Button>
                                                <Button
                                                    size="large"
                                                    className="w-48 h-12 ml-1 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                                                    onClick={() => this.setState({ modalClone: false })}
                                                >
                                                    Cancel
                                                </Button>
                                            </Row>
                                        </Modal>
                                    )}
                                </Col>
                            </Row>
                            <Row className="lg:mx-10 mx-6">
                                <Tabs
                                    size="middle"
                                    onChange={(activeKey: string) => {
                                        this.setState({ activeKey: activeKey });
                                        if (activeKey === "2" && !loadedItems && !loadedItemsFirstTime) {
                                            this.getItems(itemsCurrent);
                                        }
                                        if (activeKey === "3" && !loadedRequests) {
                                            this.getRequests(requestsCurrent);
                                        }
                                        if (activeKey === "4" && !loadedLogs) {
                                            this.getLogs(logsCurrent);
                                        }
                                        if (activeKey === "5" && !loadedStats) {
                                            this.getStats();
                                        }
                                    }}
                                    className="w-full"
                                    activeKey={activeKey}
                                    defaultActiveKey={"1"}
                                    items={[
                                        {
                                            label: "Overview",
                                            key: "1",
                                            children: this.overview(),
                                        },
                                        {
                                            label: "Items",
                                            key: "2",
                                            children: this.items(),
                                        },
                                        {
                                            label: "Requests",
                                            key: "3",
                                            children: this.requests(),
                                        },
                                        {
                                            label: "Log",
                                            key: "4",
                                            children: this.logs(),
                                        },
                                        {
                                            label: "Stats",
                                            key: "5",
                                            children: this.stats(),
                                        },
                                    ]}
                                />
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
