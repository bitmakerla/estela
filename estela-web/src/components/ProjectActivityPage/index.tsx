import React, { Component, Fragment } from "react";
import { Link } from "react-router-dom";
import { Layout, List, Pagination, Typography, Row, Col, Button } from "antd";
import { RouteComponentProps } from "react-router-dom";

import "./styles.scss";
import { Header, ProjectSidenav, Spin } from "../../shared";

const { Content } = Layout;
const { Title } = Typography;

interface ProjectActivityPageState {
    loaded: boolean;
}

interface RouteParams {
    projectId: string;
}

export class ProjectActivityPage extends Component<RouteComponentProps<RouteParams>, ProjectActivityPageState> {
    state: ProjectActivityPageState = {
        loaded: true,
    };
    projectId: string = this.props.match.params.projectId;
    render(): JSX.Element {
        const { loaded } = this.state;
        return (
            <Layout className="general-container">
                <Header />
                <Layout className="bg-white">
                    {loaded ? (
                        <Fragment>
                            <ProjectSidenav projectId={this.projectId} path={"/activity"} />
                            <Content className="bg-metal rounded-2xl">
                                <div className="lg:m-10 md:mx-6 mx-2">
                                    <Row className="flow-root my-6">
                                        <Col className="float-left">
                                            <p className="text-xl font-medium text-silver float-left">
                                                PROJECT ACTIVITY
                                            </p>
                                        </Col>
                                    </Row>
                                </div>
                            </Content>
                        </Fragment>
                    ) : (
                        <Spin />
                    )}
                </Layout>
            </Layout>
        );
    }
}
