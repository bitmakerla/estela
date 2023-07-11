import React, { Component } from "react";
import { Button, Layout, Pagination, Typography, Row, Table, Col, Checkbox, Space, Tag } from "antd";
import { PaginationItem } from "../../shared";
import Setting from "../../assets/icons/setting.svg";
import Filter from "../../assets/icons/filter.svg";

const { Content } = Layout;
const { Text } = Typography;

interface StatusData {
    status: number;
    hasData: boolean;
    statusTitle: string;
    statusJobs: SpiderJobData[];
}

interface JobListProps {
    tableStatus: StatusData[];
    count: number;
    current: number;
}

export class JobList extends Component<JobListProps> {
    PAGE_SIZE = 10;

    onChangeStatus = (index: number, count: number) => {
        if (count === 0) {
            const tableStatus = this.state.tableStatus;
            tableStatus[index].hasData = !tableStatus[index].hasData;
            this.setState({ tableStatus: tableStatus });
        }
    };

    render() {
        const { tableStatus, count, current } = this.props;
        this.setState({ tableStatus: tableStatus });
        return (
            <Content className="my-4">
                <Row className="flow-root lg:my-6 my-4">
                    <Text className="float-left text-estela-black-full font-medium text-2xl">Associated jobs</Text>
                    <Button
                        onClick={() => this.setState({ tableStatus: Array(5) })}
                        className="float-right py-1 px-3 text-estela-blue-full border-none text-base font-medium hover:text-estela-blue-full hover:bg-estela-blue-low rounded-lg"
                    >
                        See all
                    </Button>
                </Row>
                <Content className="grid gap-2 grid-cols-1 lg:grid-cols-5 items-start w-full">
                    <Col className="float-left col-span-4">
                        {tableStatus.map(({ hasData, statusTitle, statusJobs }) => {
                            if (hasData) {
                                return (
                                    <Row key={statusTitle} className="my-2 rounded-lg bg-white">
                                        <Content className="flow-root lg:m-4 mx-4 my-2 w-full">
                                            <Col className="float-left py-1">
                                                <Text className="mr-2 text-estela-black-medium font-medium text-lg">
                                                    {statusTitle}
                                                </Text>
                                                <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                    {statusJobs.length}
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
                                                dataSource={statusJobs}
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
                                );
                            } else {
                                return null;
                            }
                        })}
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
                                {tableStatus.map(({ status, hasData, statusTitle, statusJobs }) => {
                                    return (
                                        <Checkbox
                                            key={statusTitle}
                                            checked={statusJobs.length == 0 ? tableStatus[hasData] : true}
                                            onChange={() => this.onChangeStatus(status, statusJobs.length)}
                                        >
                                            <Space direction="horizontal">
                                                <Text className="text-estela-black-medium font-medium text-sm">
                                                    {statusTitle}
                                                </Text>
                                                <Tag className="rounded-2xl bg-estela-white-medium text-estela-black-low border-estela-white-medium">
                                                    {statusJobs.length}
                                                </Tag>
                                            </Space>
                                        </Checkbox>
                                    );
                                })}
                            </Content>
                        </Content>
                    </Col>
                </Content>
            </Content>
        );
    }
}
