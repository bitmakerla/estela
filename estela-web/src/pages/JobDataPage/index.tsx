import React, { useState, useEffect } from "react";
import { Layout, Row, Col, Typography, Button, Dropdown, Modal, Pagination, Card, Input } from "antd";
import { resourceNotAllowedNotification, dataDeletedNotification, Spin, PaginationItem } from "../../shared";

import Export from "../../assets/icons/export.svg";
import Delete from "../../assets/icons/trash.svg";
import ArrowDown from "../../assets/icons/arrowDown.svg";

import {
    ApiProjectsSpidersJobsDataListRequest,
    ApiProjectsSpidersJobsDataDeleteRequest,
    DeleteJobData,
    InlineResponse2006,
} from "../../services/api";
import { ApiService } from "../../services";

const { Content } = Layout;
const { Text, Paragraph } = Typography;

const apiService = ApiService();
const PAGE_SIZE = 10;

interface Dictionary {
    [Key: string]: string;
}

interface JobsDataProps {
    projectId: string;
    spiderId: string;
    jobId: string;
}

const deleteSpiderJobData = (type_: string, projectId: string, spiderId: string, jobId: string): Promise<boolean> => {
    const request: ApiProjectsSpidersJobsDataDeleteRequest = {
        pid: projectId,
        sid: spiderId,
        jid: jobId,
        type: type_,
    };
    return apiService.apiProjectsSpidersJobsDataDelete(request).then(
        (response: DeleteJobData) => {
            dataDeletedNotification(response.count);
            return true;
        },
        (error: unknown) => {
            error;
            resourceNotAllowedNotification();
            return false;
        },
    );
};

const getData = async (
    type_: string,
    page: number,
    projectId: string,
    spiderId: string,
    jobId: string,
    pageSize?: number,
): Promise<InlineResponse2006> => {
    const requestParams: ApiProjectsSpidersJobsDataListRequest = {
        pid: projectId,
        sid: spiderId,
        jid: jobId,
        type: type_,
        page: page,
        pageSize: pageSize ?? PAGE_SIZE,
    };
    return apiService.apiProjectsSpidersJobsDataList(requestParams).then(
        (response) => {
            return response;
        },
        (error: unknown) => {
            error;
            resourceNotAllowedNotification();
            return {} as InlineResponse2006;
        },
    );
};

type ItemDictionary = { [key: string]: ItemDictionary } | ArrayLike<ItemDictionary>;

type ItemProps = {
    data: ItemDictionary;
};

function Item({ data }: ItemProps) {
    return (
        <Col>
            {Object.entries(data).map(([itemPropKey, itemProp], index: number) => {
                return (
                    <Row
                        align="middle"
                        key={index}
                        className={`py-1 ${index % 2 ? "rounded-lg bg-estela-blue-low" : ""}`}
                    >
                        <Col className="pr-10 pl-5">
                            <Text className="font-bold">{itemPropKey}</Text>
                        </Col>
                        {typeof itemProp === "object" && itemProp !== null && !Array.isArray(itemProp) && (
                            <Item data={itemProp} />
                        )}
                        {typeof itemProp === "string" && itemProp.length <= 300 && (
                            <Col>
                                <Text className="text-estela-black-medium">{itemProp}</Text>
                            </Col>
                        )}
                        {typeof itemProp === "string" && itemProp.length > 300 && (
                            <Col>
                                <Paragraph
                                    className="text-estela-black-medium"
                                    ellipsis={{ rows: 3, expandable: true, symbol: "more" }}
                                >
                                    {itemProp}
                                </Paragraph>
                            </Col>
                        )}
                        {typeof itemProp === "number" && (
                            <Col>
                                <Text className="text-estela-black-medium">{itemProp}</Text>
                            </Col>
                        )}
                        {Array.isArray(itemProp) && typeof itemProp[0] === "object" && (
                            <Col>
                                {itemProp.map((itemPropItem, index) => (
                                    <Item key={index} data={itemPropItem} />
                                ))}
                            </Col>
                        )}
                        {Array.isArray(itemProp) && typeof itemProp[0] === "string" && (
                            <Col>
                                {itemProp.map((entry, index) => {
                                    return index === itemProp.length - 1 ? (
                                        <Text className="text-estela-black-medium" key={index}>
                                            {entry}
                                        </Text>
                                    ) : (
                                        <Text className="text-estela-black-medium" key={index}>
                                            {entry},{" "}
                                        </Text>
                                    );
                                })}
                            </Col>
                        )}
                        {itemProp === null && (
                            <Col>
                                <Text className="text-estela-black-medium">null</Text>
                            </Col>
                        )}
                    </Row>
                );
            })}
        </Col>
    );
}

export function JobItemsData({ projectId, spiderId, jobId }: JobsDataProps) {
    const [openModal, setOpenModal] = useState(false);
    const [loadedButton, setLoadedButton] = useState(false);
    const [current, setCurrent] = useState(0);
    const [count, setCount] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [items, setItems] = useState<ItemDictionary[]>([]);

    useEffect(() => {
        getData("items", 1, projectId, spiderId, jobId).then((response) => {
            let data: ItemDictionary[] = [];
            if (response.results?.length) {
                const safe_data: unknown[] = response.results ?? [];
                data = safe_data as ItemDictionary[];
                setItems(data);
                setCurrent(1);
                setCount(response.count);
                setLoaded(true);
            }
            setLoaded(true);
        });
    }, []);

    const onItemsPageChange = async (page: number): Promise<void> => {
        setLoaded(false);
        await getData("items", page, projectId, spiderId, jobId).then((response) => {
            let data: ItemDictionary[] = [];
            if (response.results?.length) {
                const safe_data: unknown[] = response.results ?? [];
                data = safe_data as ItemDictionary[];
                setItems(data);
                setCurrent(page);
                setCount(response.count);
                setLoaded(true);
            }
            setLoaded(true);
        });
    };

    return (
        <Content className="bg-metal content-padding">
            {loaded ? (
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
                                    setOpenModal(true);
                                }}
                                className="flex items-center mr-2 stroke-estela-red-full border-estela-red-low bg-estela-red-low text-estela-red-full hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-2xl"
                            >
                                Delete items
                            </Button>
                            <Modal
                                open={openModal}
                                onOk={() => {
                                    setOpenModal(false);
                                    setLoadedButton(true);
                                    deleteSpiderJobData("items", projectId, spiderId, jobId).then((response) => {
                                        if (response) {
                                            setItems([]);
                                            setCurrent(0);
                                            setCount(0);
                                            setLoaded(true);
                                            setLoadedButton(false);
                                        }
                                    });
                                }}
                                onCancel={() => {
                                    setOpenModal(false);
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
                    {items.map((item: ItemDictionary, index: number) => {
                        return (
                            <Card key={index} className="w-full mt-2" style={{ borderRadius: "8px" }} bordered={false}>
                                <Row className="flow-root mx-1 my-2 w-full space-x-4" align="middle">
                                    <Col className="flex float-left">
                                        <Text className="py-2 text-estela-black-full font-medium text-base">
                                            ITEM {PAGE_SIZE * (current - 1) + index + 1}
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
                                    <Item data={item} />
                                </>
                            </Card>
                        );
                    })}
                    <Pagination
                        className="pagination"
                        defaultCurrent={1}
                        simple
                        total={count}
                        current={current}
                        pageSize={PAGE_SIZE}
                        onChange={onItemsPageChange}
                        showSizeChanger={false}
                        itemRender={PaginationItem}
                    />
                </>
            ) : (
                <Spin />
            )}
        </Content>
    );
}

export function JobRequestsData({ projectId, spiderId, jobId }: JobsDataProps) {
    const [openModal, setOpenModal] = useState(false);
    const [loadedButton, setLoadedButton] = useState(false);
    const [current, setCurrent] = useState(0);
    const [count, setCount] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [requests, setRequests] = useState<Dictionary[]>([]);

    useEffect(() => {
        getData("requests", 1, projectId, spiderId, jobId).then((response) => {
            let data: Dictionary[] = [];
            if (response.results?.length) {
                const safe_data: unknown[] = response.results ?? [];
                data = safe_data as Dictionary[];
                setRequests(data);
                setLoaded(true);
                setCurrent(1);
                setCount(response.count);
            }
            setLoaded(true);
        });
    }, []);

    const onRequestsPageChange = async (page: number): Promise<void> => {
        setLoaded(false);
        await getData("requests", page, projectId, spiderId, jobId, page).then((response) => {
            let data: Dictionary[] = [];
            if (response.results?.length) {
                const safe_data: unknown[] = response.results ?? [];
                data = safe_data as Dictionary[];
                setRequests(data);
                setLoaded(true);
                setCurrent(page);
                setCount(response.count);
            }
            setLoaded(true);
        });
    };

    return (
        <Content className="bg-metal content-padding">
            {loaded ? (
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
                                    setOpenModal(true);
                                }}
                                className="flex items-center mr-2 stroke-estela-red-full border-estela-red-low bg-estela-red-low text-estela-red-full hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-2xl"
                            >
                                Delete requests
                            </Button>
                            <Modal
                                open={openModal}
                                onOk={() => {
                                    setOpenModal(false);
                                    setLoadedButton(true);
                                    deleteSpiderJobData("requests", projectId, spiderId, jobId).then((response) => {
                                        if (response) {
                                            setRequests([]);
                                            setCurrent(0);
                                            setCount(0);
                                            setLoaded(true);
                                            setLoadedButton(false);
                                        }
                                    });
                                }}
                                onCancel={() => {
                                    setOpenModal(false);
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
                            <Card key={index} className="w-full mt-2" style={{ borderRadius: "8px" }} bordered={false}>
                                <Row className="flow-root mx-1 my-2 w-full space-x-4" align="middle">
                                    <Col className="flex float-left">
                                        <Text className="py-2 text-estela-black-full font-medium text-base">
                                            REQUEST {PAGE_SIZE * (current - 1) + index + 1}
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
                                        if (requestProp === null) {
                                            requestContent = (
                                                <Text className="text-estela-black-medium px-4">null</Text>
                                            );
                                        } else if (requestProp.length > 300) {
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
                        total={count}
                        current={current}
                        pageSize={PAGE_SIZE}
                        onChange={onRequestsPageChange}
                        showSizeChanger={false}
                        itemRender={PaginationItem}
                    />
                </>
            ) : (
                <Spin />
            )}
        </Content>
    );
}

export function JobLogsData({ projectId, spiderId, jobId }: JobsDataProps) {
    const [openModal, setOpenModal] = useState(false);
    const [loadedButton, setLoadedButton] = useState(false);
    const [current, setCurrent] = useState(0);
    const [count, setCount] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [logs, setLogs] = useState<Dictionary[]>([]);
    useEffect(() => {
        getData("logs", 1, projectId, spiderId, jobId).then((response) => {
            let data: Dictionary[] = [];
            if (response.results?.length) {
                const safe_data: unknown[] = response.results ?? [];
                data = safe_data as Dictionary[];
                setLogs(data);
                setLoaded(true);
                setCurrent(1);
                setCount(response.count);
            }
            setLoaded(true);
        });
    }, []);

    const onLogsPageChange = async (page: number): Promise<void> => {
        setLoaded(false);
        await getData("logs", page, projectId, spiderId, jobId, page).then((response) => {
            let data: Dictionary[] = [];
            if (response.results?.length) {
                const safe_data: unknown[] = response.results ?? [];
                data = safe_data as Dictionary[];
                setLogs(data);
                setLoaded(true);
                setCurrent(page);
                setCount(response.count);
            }
            setLoaded(true);
        });
    };

    return (
        <Content className="bg-metal content-padding">
            {loaded ? (
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
                                    setOpenModal(true);
                                }}
                                className="flex items-center mr-2 stroke-estela-red-full border-estela-red-low bg-estela-red-low text-estela-red-full hover:text-estela-red-full text-sm hover:border-estela-red-full rounded-2xl"
                            >
                                Delete logs
                            </Button>
                            <Modal
                                open={openModal}
                                onOk={() => {
                                    setOpenModal(false);
                                    setLoadedButton(true);
                                    deleteSpiderJobData("logs", projectId, spiderId, jobId).then((response) => {
                                        if (response) {
                                            setLogs([]);
                                            setCurrent(0);
                                            setCount(0);
                                            setLoaded(true);
                                            setLoadedButton(false);
                                        }
                                    });
                                }}
                                onCancel={() => {
                                    setOpenModal(false);
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
                            let logContent = <Text className="text-estela-black-medium">{log.log ?? "No data"}</Text>;
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
                                            {PAGE_SIZE * (current - 1) + index + 1}
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
                        total={count}
                        current={current}
                        pageSize={PAGE_SIZE}
                        onChange={onLogsPageChange}
                        showSizeChanger={false}
                    />
                </>
            ) : (
                <Spin />
            )}
        </Content>
    );
}

export function JobStatsData({ projectId, spiderId, jobId }: JobsDataProps) {
    const [loaded, setLoaded] = useState(false);
    const [stats, setStats] = useState<Dictionary>({});

    useEffect(() => {
        getData("stats", 1, projectId, spiderId, jobId).then((response) => {
            let data: Dictionary = {};
            if (response.results?.length) {
                const safe_data: unknown[] = response.results ?? [];
                data = safe_data[0] as Dictionary;
                setStats(data);
                setLoaded(true);
            }
            setLoaded(true);
        });
    }, []);

    return (
        <Content className="bg-metal content-padding">
            {loaded ? (
                <Row className="grid grid-cols-5 bg-white">
                    <Col className="col-start-2 col-span-3">
                        {Object.entries(stats).map(([statKey, stat], index: number) => {
                            if (statKey === "coverage") {
                                return null;
                            }
                            if (stat === null) {
                                stat = "null";
                            }
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
}
