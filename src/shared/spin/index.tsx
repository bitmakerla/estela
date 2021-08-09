import React, { Component } from "react";
import { Col, Row, Spin } from "antd";

import "./styles.scss";

export class CustomSpin extends Component<unknown> {
    render(): JSX.Element {
        return (
            <Row className="spin">
                <Col span={6} offset={12}>
                    <Spin size="large" />
                </Col>
            </Row>
        );
    }
}
