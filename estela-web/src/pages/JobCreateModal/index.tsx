import React, { useState, useEffect } from "react";
import { Modal, Button, message, Row, Select, Space, Input, Tag } from "antd";

import {
    ApiProjectsSpidersJobsCreateRequest,
    ApiProjectsSpidersListRequest,
    SpiderDataStatusEnum,
    SpiderJobCreate,
    Spider,
} from "../../services/api";
import history from "../../history";
import { ApiService } from "../../services";
import { resourceNotAllowedNotification, invalidDataNotification, incorrectDataNotification } from "../../shared";
import { checkExternalError } from "../../defaultComponents";

import Run from "../../assets/icons/play.svg";
import Add from "../../assets/icons/add.svg";

const { Option } = Select;

interface JobCreateModalProps {
    openModal: boolean;
    spider: Spider | null;
    projectId: string;
}

interface ArgsData {
    name: string;
    value: string;
    key: number;
}

interface EnvVarsData {
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

interface JobData {
    args: ArgsData[];
    envVars: EnvVarsData[];
    tags: TagsData[];
    dataStatus: SpiderDataStatusEnum | undefined;
    dataExpiryDays: number | null | undefined;
}

interface Variable {
    newArgName: string;
    newArgValue: string;
    newEnvVarName: string;
    newEnvVarValue: string;
    newTagName: string;
    newTags: Tags[];
}

interface Request {
    pid: string;
    sid: string;
}

interface OptionDataPersistance {
    label: string;
    key: number;
    value: number;
}

const dataPersistenceOptions = [
    { label: "1 day", key: 1, value: 1 },
    { label: "1 week", key: 2, value: 7 },
    { label: "1 month", key: 3, value: 30 },
    { label: "3 months", key: 4, value: 90 },
    { label: "6 months", key: 5, value: 180 },
    { label: "1 year", key: 6, value: 365 },
    { label: "Forever", key: 7, value: 720 },
];

export default function JobCreateModal({ openModal, spider, projectId }: JobCreateModalProps) {
    const PAGE_SIZE = 15;
    const apiService = ApiService();
    const [open, setOpen] = useState(openModal);
    const [loading, setLoading] = useState(false);
    const [countKey, setCountKey] = useState(0);
    const [spiders, setSpiders] = useState<Spider[]>([]);
    const [externalComponent, setExternalComponent] = useState<React.ReactNode>(<></>);
    const [jobData, setJobData] = useState<JobData>({
        args: [],
        envVars: [],
        tags: [],
        dataStatus: spider ? spider.dataStatus : undefined,
        dataExpiryDays: spider ? spider.dataExpiryDays : 1,
    });
    const [variable, setVariable] = useState<Variable>({
        newArgName: "",
        newArgValue: "",
        newEnvVarName: "",
        newEnvVarValue: "",
        newTagName: "",
        newTags: [],
    });
    const [request, setRequest] = useState<Request>({
        pid: projectId,
        sid: "",
    });

    useEffect(() => {
        getProjectSpiders(1);
    }, []);

    const getProjectSpiders = async (page: number): Promise<void> => {
        const requestParams: ApiProjectsSpidersListRequest = { pid: projectId, page, pageSize: PAGE_SIZE };
        apiService.apiProjectsSpidersList(requestParams).then(
            (results) => {
                const spider_list = results.results;
                if (spider) {
                    let index = 0;
                    index = spider_list.findIndex((listedSpider: Spider) => {
                        return listedSpider.sid == spider.sid;
                    });

                    if (index < 0) {
                        spider_list.unshift(spider);
                        index = 0;
                    }
                    setRequest({ ...request, sid: String(spider_list[index].sid) });
                    setJobData({
                        ...jobData,
                        dataStatus: spider_list[index].dataStatus,
                        dataExpiryDays: spider_list[index].dataExpiryDays,
                    });
                } else {
                    setRequest({ ...request, sid: String(spider_list[0].sid) });
                    setJobData({
                        ...jobData,
                        dataStatus: spider_list[0].dataStatus,
                        dataExpiryDays: spider_list[0].dataExpiryDays,
                    });
                }
                setSpiders(spider_list);
            },
            (error: unknown) => {
                error;
                resourceNotAllowedNotification();
            },
        );
    };

    const handleSpiderChange = (value: string): void => {
        const spiderId = spiders.find((spider) => {
            return spider.name === value;
        });
        setRequest({ ...request, sid: String(spiderId?.sid) });
    };

    const handlePersistenceChange = (value: number): void => {
        if (value == 720) {
            setJobData({ ...jobData, dataStatus: SpiderDataStatusEnum.Persistent });
        } else {
            setJobData({ ...jobData, dataExpiryDays: value });
        }
    };

    const handleRemoveArg = (id: number): void => {
        const args = [...jobData.args];
        args.splice(id, 1);
        setJobData({ ...jobData, args: [...args] });
    };

    const handleRemoveEnvVar = (id: number): void => {
        const envVars = [...jobData.envVars];
        envVars.splice(id, 1);
        setJobData({ ...jobData, envVars: [...envVars] });
    };

    const handleRemoveTag = (id: number): void => {
        const tags = [...jobData.tags];
        tags.splice(id, 1);
        setJobData({ ...jobData, tags: [...tags] });
    };

    const addArgument = (): void => {
        const args = [...jobData.args];
        const newArgName = variable.newArgName.trim();
        const newArgValue = variable.newArgValue.trim();
        if (newArgName && newArgValue && newArgName.indexOf(" ") == -1) {
            args.push({ name: newArgName, value: newArgValue, key: countKey });
            setCountKey(countKey + 1);
            setJobData({ ...jobData, args: [...args] });
            setVariable({ ...variable, newArgName: "", newArgValue: "" });
        } else {
            invalidDataNotification("Invalid argument name/value pair.");
        }
    };

    const addEnvVar = (): void => {
        const envVars = [...jobData.envVars];
        const newEnvVarName = variable.newEnvVarName.trim();
        const newEnvVarValue = variable.newEnvVarValue.trim();
        if (newEnvVarName && newEnvVarValue && newEnvVarName.indexOf(" ") == -1) {
            envVars.push({ name: newEnvVarName, value: newEnvVarValue, key: countKey });
            setCountKey(countKey + 1);
            setJobData({ ...jobData, envVars: [...envVars] });
            setVariable({ ...variable, newEnvVarName: "", newEnvVarValue: "" });
        } else {
            invalidDataNotification("Invalid environment variable name/value pair.");
        }
    };

    const addTag = (): void => {
        const tags = [...jobData.tags];
        const newTags = [...variable.newTags];
        const newTagName = variable.newTagName.trim();
        if (newTagName && newTagName.indexOf(" ") == -1) {
            newTags.push({ name: newTagName, key: countKey });
            setCountKey(countKey + 1);
            tags.push({ name: newTagName });
            setJobData({ ...jobData, tags: [...tags] });
            setVariable({ ...variable, newTags: [...newTags], newTagName: "" });
        } else {
            invalidDataNotification("Invalid tag name.");
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const {
            target: { value, name },
        } = event;
        if (name === "newArgName") {
            setVariable({ ...variable, newArgName: value });
        } else if (name === "newArgValue") {
            setVariable({ ...variable, newArgValue: value });
        } else if (name === "newEnvVarName") {
            setVariable({ ...variable, newEnvVarName: value });
        } else if (name === "newEnvVarValue") {
            setVariable({ ...variable, newEnvVarValue: value });
        } else if (name === "newTagName") {
            setVariable({ ...variable, newTagName: value });
        }
    };

    const handleSubmit = (): void => {
        setLoading(true);
        const { args, envVars, tags, dataStatus, dataExpiryDays } = jobData;
        const { pid, sid } = request;
        const Data = {
            args: [...args],
            envVars: [...envVars],
            tags: [...tags],
            dataStatus: String(dataStatus),
            dataExpiryDays: Number(dataExpiryDays),
        };
        const requests: ApiProjectsSpidersJobsCreateRequest = {
            data: Data,
            pid: pid,
            sid: sid,
        };
        apiService.apiProjectsSpidersJobsCreate(requests).then(
            (response: SpiderJobCreate) => {
                setLoading(false);
                history.push(`/projects/${pid}/spiders/${sid}/jobs/${response.jid}`);
            },
            async (error) => {
                setLoading(false);
                const data = await error.json();
                const [errorComponent, err] = checkExternalError(data);
                if (err) {
                    invalidDataNotification(data.detail);
                    setExternalComponent(errorComponent);
                } else {
                    incorrectDataNotification();
                }
                setOpen(false);
            },
        );
    };

    return (
        <>
            <Button
                icon={<Run className="mr-2" width={19} />}
                size="large"
                className="flex items-center stroke-white border-estela hover:stroke-estela bg-estela text-white hover:text-estela text-sm hover:border-estela rounded-md"
                onClick={() => {
                    if (spiders.length == 0) {
                        message.error("Not implemented yet.");
                    } else {
                        setOpen(true);
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
                open={open}
                centered
                width={450}
                title={<p className="text-xl text-center font-normal">NEW JOB</p>}
                onCancel={() => setOpen(false)}
                footer={null}
            >
                <Row>
                    <p className="my-2 text-base">Spider</p>
                    <Select
                        style={{ borderRadius: 16 }}
                        size="large"
                        className="w-full"
                        defaultValue={spider ? spider.name : spiders[0] ? spiders[0].name : ""}
                        onChange={handleSpiderChange}
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
                        onChange={handlePersistenceChange}
                        className="w-full"
                        size="large"
                        defaultValue={jobData.dataStatus === "PERSISTENT" ? 720 : jobData.dataExpiryDays}
                    >
                        {dataPersistenceOptions.map((option: OptionDataPersistance) => (
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
                            {jobData.args.map((arg: ArgsData, id: number) => (
                                <Tag
                                    className="text-estela-blue-full border-0 bg-estela-blue-low"
                                    closable
                                    key={id}
                                    onClose={() => handleRemoveArg(id)}
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
                                value={variable.newArgName}
                                onChange={handleInputChange}
                            />
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-r-lg"
                                name="newArgValue"
                                placeholder="value"
                                value={variable.newArgValue}
                                onChange={handleInputChange}
                            />
                            <Button
                                shape="circle"
                                size="small"
                                icon={<Add />}
                                className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                onClick={addArgument}
                            ></Button>
                        </Space>
                    </Space>
                </Row>
                <Row>
                    <p className="text-base my-2">Environment Variables</p>
                    <Space direction="vertical">
                        <Space direction="horizontal">
                            {jobData.envVars.map((envVar: EnvVarsData, id: number) => (
                                <Tag
                                    className="text-estela-blue-full border-0 bg-estela-blue-low"
                                    closable
                                    key={envVar.key}
                                    onClose={() => handleRemoveEnvVar(id)}
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
                                value={variable.newEnvVarName}
                                onChange={handleInputChange}
                            />
                            <Input
                                size="large"
                                className="border-estela-blue-full rounded-r-lg"
                                name="newEnvVarValue"
                                placeholder="value"
                                value={variable.newEnvVarValue}
                                onChange={handleInputChange}
                            />
                            <Button
                                shape="circle"
                                size="small"
                                icon={<Add />}
                                className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                                onClick={addEnvVar}
                            ></Button>
                        </Space>
                    </Space>
                </Row>
                <Space direction="vertical" className="my-2">
                    <p className="text-base">Tags</p>
                    <Space direction="horizontal">
                        {jobData.tags.map((tag: TagsData, id) => (
                            <Tag
                                className="text-estela-blue-full border-0 bg-estela-blue-low"
                                closable
                                key={id}
                                onClose={() => handleRemoveTag(id)}
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
                            value={variable.newTagName}
                            onChange={handleInputChange}
                        />
                        <Button
                            shape="circle"
                            size="small"
                            icon={<Add />}
                            className="flex items-center justify-center bg-estela-blue-full border-estela-blue-full stroke-white hover:bg-estela-blue-full hover:border-estela-blue-full hover:stroke-white"
                            onClick={addTag}
                        ></Button>
                    </Space>
                </Space>
                <Row className="flow-root mt-4">
                    <Button
                        loading={loading}
                        onClick={handleSubmit}
                        size="large"
                        className="float-left w-48 h-12 bg-estela-blue-full text-white hover:text-estela-blue-full hover:border-estela-blue-full rounded-lg"
                    >
                        Create
                    </Button>
                    <Button
                        size="large"
                        className="float-right w-48 h-12 bg-white text-estela-blue-full border-estela-blue-full hover:text-estela-blue-full hover:border-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </Button>
                </Row>
            </Modal>
        </>
    );
}
