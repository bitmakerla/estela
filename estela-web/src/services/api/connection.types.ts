// Connection types for the frontend
export interface Connection {
    cid: number;
    name: string;
    conn_type: ConnectionType;
    host?: string;
    port?: string;
    login?: string;
    password?: string;
    extra?: Record<string, any>;
    project: string;
    created: string;
    updated: string;
}

export interface ConnectionCreate {
    name: string;
    conn_type: ConnectionType;
    host?: string;
    port?: string;
    login?: string;
    password?: string;
    extra?: Record<string, any>;
}

export interface ConnectionUpdate {
    name?: string;
    conn_type?: ConnectionType;
    host?: string;
    port?: string;
    login?: string;
    password?: string;
    extra?: Record<string, any>;
}

export interface ConnectionTest {
    success: boolean;
    message: string;
    details?: Record<string, any>;
}

export interface ConnectionListItem {
    cid: number;
    name: string;
    conn_type: ConnectionType;
    conn_type_display: string;
    created: string;
}

export enum ConnectionType {
    DATABASE = "DATABASE",
    S3 = "S3",
    FTP = "FTP",
    SFTP = "SFTP",
    HTTP = "HTTP",
    WEBHOOK = "WEBHOOK",
}

export const ConnectionTypeLabels = {
    [ConnectionType.DATABASE]: "Database",
    [ConnectionType.S3]: "AWS S3",
    [ConnectionType.FTP]: "FTP",
    [ConnectionType.SFTP]: "SFTP",
    [ConnectionType.HTTP]: "HTTP",
    [ConnectionType.WEBHOOK]: "Webhook",
};

export interface DatabaseConnectionExtra {
    database_type?: "postgresql" | "mongodb" | "redis";
    database?: string;
}

export interface S3ConnectionExtra {
    region?: string;
    endpoint_url?: string;
}

export interface HttpConnectionExtra {
    headers?: Record<string, string>;
    auth_type?: "basic" | "bearer" | "api_key";
}

export interface WebhookConnectionExtra {
    headers?: Record<string, string>;
    auth_type?: "basic" | "bearer" | "api_key";
    content_type?: "application/json" | "application/xml" | "text/plain";
}
