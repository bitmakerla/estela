import React from "react";
import { Table, Button, Tag, Space, Popconfirm, Typography } from "antd";
import { EditOutlined, DeleteOutlined, PlayCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { ColumnType } from "antd/lib/table";
import moment from "moment";

import { ConnectionList, ConnectionConnTypeEnum } from "../../services/api/generated-api";

const { Text } = Typography;

interface ConnectionListComponentProps {
    connections: ConnectionList[];
    onEdit: (connectionId: number) => void;
    onDelete: (connectionId: number) => Promise<void>;
    onTest: (connectionId: number) => Promise<void>;
    testingConnection: number | null;
}

// Connection type display labels
const ConnectionTypeLabels: Record<ConnectionConnTypeEnum, string> = {
    [ConnectionConnTypeEnum.Database]: "Database",
    [ConnectionConnTypeEnum.S3]: "AWS S3",
    [ConnectionConnTypeEnum.Ftp]: "FTP",
    [ConnectionConnTypeEnum.Sftp]: "SFTP",
    [ConnectionConnTypeEnum.Http]: "HTTP",
    [ConnectionConnTypeEnum.Webhook]: "Webhook",
};

const ConnectionTypeColors: Record<ConnectionConnTypeEnum, string> = {
    [ConnectionConnTypeEnum.Database]: "purple",
    [ConnectionConnTypeEnum.S3]: "orange",
    [ConnectionConnTypeEnum.Ftp]: "cyan",
    [ConnectionConnTypeEnum.Sftp]: "green",
    [ConnectionConnTypeEnum.Http]: "blue",
    [ConnectionConnTypeEnum.Webhook]: "magenta",
};

export const ConnectionListComponent: React.FC<ConnectionListComponentProps> = ({
    connections,
    onEdit,
    onDelete,
    onTest,
    testingConnection,
}) => {
    const columns: ColumnType<ConnectionList>[] = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (name: string) => (
                <Text strong className="text-estela-black-full">
                    {name}
                </Text>
            ),
        },
        {
            title: "Type",
            dataIndex: "connType",
            key: "connType",
            render: (connType: ConnectionConnTypeEnum) => (
                <Tag color={ConnectionTypeColors[connType]}>{ConnectionTypeLabels[connType]}</Tag>
            ),
        },
        {
            title: "Created",
            dataIndex: "created",
            key: "created",
            render: (created: string) => (
                <Text className="text-estela-black-medium">{moment(created).format("MMM DD, YYYY")}</Text>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, connection: ConnectionList) => (
                <Space className="connection-actions">
                    <Button
                        type="default"
                        size="small"
                        icon={testingConnection === connection.cid ? <LoadingOutlined /> : <PlayCircleOutlined />}
                        onClick={() => onTest(connection.cid!)}
                        disabled={testingConnection === connection.cid}
                        className="text-estela hover:text-estela-blue border-estela hover:border-estela-blue"
                    >
                        {testingConnection === connection.cid ? "Testing..." : "Test"}
                    </Button>
                    <Button
                        type="default"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => onEdit(connection.cid!)}
                        className="text-estela hover:text-estela-blue border-estela hover:border-estela-blue"
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete connection"
                        description={`Are you sure you want to delete "${connection.name}"?`}
                        onConfirm={() => onDelete(connection.cid!)}
                        okText="Yes"
                        cancelText="No"
                        okButtonProps={{
                            className:
                                "bg-estela-red-full border-estela-red-full hover:bg-estela-red-low hover:border-estela-red-low",
                        }}
                    >
                        <Button
                            type="default"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            className="text-estela-red-full hover:text-estela-red-full border-estela-red-full hover:border-estela-red-full"
                        >
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="bg-white rounded-lg p-6">
            <Table
                columns={columns}
                dataSource={connections}
                rowKey="cid"
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} connections`,
                }}
                locale={{
                    emptyText: (
                        <div className="text-center py-8">
                            <Text className="text-estela-black-medium">
                                No connections found. Create your first connection to get started.
                            </Text>
                        </div>
                    ),
                }}
                className="connection-list"
            />
        </div>
    );
};
