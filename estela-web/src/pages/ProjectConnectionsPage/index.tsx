import React, { useState, useEffect } from "react";
import { Button, Layout, Typography, Row, Modal, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useParams } from "react-router-dom";

import { ApiService, AuthService } from "../../services";
import { Connection, ConnectionList, ConnectionTest, ConnectionConnTypeEnum } from "../../services/api/generated-api";
import { handleInvalidDataError } from "../../utils";
import { resourceNotAllowedNotification } from "../../shared";
import { API_BASE_URL } from "../../constants";
import { ConnectionListComponent } from "./ConnectionListComponent";
import { ConnectionFormComponent } from "./ConnectionFormComponent";

import "./styles.scss";

const { Content } = Layout;
const { Title } = Typography;

interface RouteParams {
    projectId: string;
}

interface ConnectionFormData {
    name: string;
    conn_type: ConnectionConnTypeEnum;
    host?: string;
    port?: string;
    login?: string;
    password?: string;
    extra?: Record<string, any>;
}

export const ProjectConnectionsPage: React.FC = () => {
    const { projectId } = useParams<RouteParams>();
    const [connections, setConnections] = useState<ConnectionList[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
    const [testingConnection, setTestingConnection] = useState<number | null>(null);

    const apiService = ApiService();

    const loadConnections = async (): Promise<void> => {
        try {
            // Test with direct fetch to bypass generated API client
            const authHeaders = AuthService.getDefaultAuthHeaders();
            console.log("Auth headers:", authHeaders);
            
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/connections`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                }
            });
            
            console.log("Direct fetch response status:", response.status);
            console.log("Direct fetch response headers:", response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Direct fetch response data:", data);
            
            // Handle response data
            let connectionsData = [];
            if (Array.isArray(data)) {
                connectionsData = data;
            } else if (data && data.results && Array.isArray(data.results)) {
                connectionsData = data.results;
            }

            // Transform connections to match expected format
            const transformedConnections = connectionsData.map((conn: any) => ({
                ...conn,
                connType: conn.conn_type,
            }));

            setConnections(transformedConnections);
        } catch (error) {
            console.error("API call failed with error:", error);
            handleInvalidDataError(error);
            resourceNotAllowedNotification();
        } finally {
            setLoaded(true);
        }
    };

    const handleCreateConnection = async (connectionData: ConnectionFormData): Promise<void> => {
        const connectionPayload: Connection = {
            name: connectionData.name,
            connType: connectionData.conn_type,
            host: connectionData.host,
            port: connectionData.port,
            login: connectionData.login,
            password: connectionData.password,
            extra: connectionData.extra,
        };

        try {
            await apiService.apiProjectsConnectionsCreate({
                pid: projectId!,
                data: connectionPayload,
            });
            message.success("Connection created successfully");
            setShowCreateModal(false);
            await loadConnections();
        } catch (error) {
            console.error("Failed to create connection:", error);
            handleInvalidDataError(error);
            throw error;
        }
    };

    const handleUpdateConnection = async (
        connectionId: number,
        connectionData: Partial<ConnectionFormData>
    ): Promise<void> => {
        const connectionPayload: Partial<Connection> = {
            name: connectionData.name,
            connType: connectionData.conn_type,
            host: connectionData.host,
            port: connectionData.port,
            login: connectionData.login,
            password: connectionData.password,
            extra: connectionData.extra,
        };

        try {
            await apiService.apiProjectsConnectionsUpdate({
                pid: projectId!,
                cid: connectionId.toString(),
                data: connectionPayload,
            });
            message.success("Connection updated successfully");
            setShowEditModal(false);
            setSelectedConnection(null);
            await loadConnections();
        } catch (error) {
            console.error("Failed to update connection:", error);
            handleInvalidDataError(error);
            throw error;
        }
    };

    const handleDeleteConnection = async (connectionId: number): Promise<void> => {
        try {
            await apiService.apiProjectsConnectionsDelete({
                pid: projectId!,
                cid: connectionId.toString(),
            });
            message.success("Connection deleted successfully");
            await loadConnections();
        } catch (error) {
            console.error("Failed to delete connection:", error);
            handleInvalidDataError(error);
        }
    };

    const handleTestConnection = async (connectionId: number): Promise<void> => {
        setTestingConnection(connectionId);
        try {
            const authHeaders = AuthService.getDefaultAuthHeaders();
            const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/connections/${connectionId}/test_connection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                message.success(`Connection test successful: ${result.message}`);
            } else {
                message.error(`Connection test failed: ${result.message}`);
            }
        } catch (error) {
            console.error("Connection test failed:", error);
            message.error("Connection test failed");
            handleInvalidDataError(error);
        } finally {
            setTestingConnection(null);
        }
    };

    const handleEditConnection = async (connectionId: number): Promise<void> => {
        try {
            const connection: Connection = await apiService.apiProjectsConnectionsRead({
                pid: projectId!,
                cid: connectionId.toString(),
            });
            setSelectedConnection(connection);
            setShowEditModal(true);
        } catch (error) {
            console.error("Failed to load connection for editing:", error);
            handleInvalidDataError(error);
        }
    };

    const openCreateModal = (): void => {
        setShowCreateModal(true);
    };

    const closeModals = (): void => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setSelectedConnection(null);
    };

    useEffect(() => {
        if (projectId) {
            loadConnections();
        }
    }, [projectId]);

    return (
        <Content className="bg-metal rounded-2xl">
            {loaded ? (
                <div className="lg:m-10 md:mx-6 m-6">
                    <Row className="font-medium my-6 flex justify-between items-center">
                        <Title level={2} className="text-xl text-silver m-0">
                            PROJECT CONNECTIONS
                        </Title>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreateModal}
                            className="border-estela bg-estela hover:border-estela hover:text-estela text-white rounded-md"
                        >
                            Add Connection
                        </Button>
                    </Row>

                    <ConnectionListComponent
                        connections={connections}
                        onEdit={handleEditConnection}
                        onDelete={handleDeleteConnection}
                        onTest={handleTestConnection}
                        testingConnection={testingConnection}
                    />

                    <Modal
                        title="Create Connection"
                        open={showCreateModal}
                        onCancel={closeModals}
                        footer={null}
                        width={800}
                        destroyOnClose
                    >
                        <ConnectionFormComponent
                            onSubmit={handleCreateConnection}
                            onCancel={closeModals}
                        />
                    </Modal>

                    <Modal
                        title="Edit Connection"
                        open={showEditModal}
                        onCancel={closeModals}
                        footer={null}
                        width={800}
                        destroyOnClose
                    >
                        {selectedConnection && (
                            <ConnectionFormComponent
                                connection={selectedConnection}
                                onSubmit={(data) => handleUpdateConnection(selectedConnection.cid!, data)}
                                onCancel={closeModals}
                                isEdit
                            />
                        )}
                    </Modal>
                </div>
            ) : (
                <div className="flex justify-center items-center h-64">
                    <Typography>Loading connections...</Typography>
                </div>
            )}
        </Content>
    );
};