import React, { Fragment, Suspense } from "react";
import { Header } from "../shared";

export const ExternalRoutes = (): JSX.Element => {
    if (process.env.MICRO_FRONTEND != undefined) {
        const ComponentRoutes = React.lazy(() => import("DropdownComponent/ComponentRoutes"));
        return (
            <>
                <Header />
                <ComponentRoutes />
            </>
        );
    }
    return <Fragment></Fragment>;
};

export const ExternalDropdownComponent = (): JSX.Element => {
    if (process.env.MICRO_FRONTEND != undefined) {
        const DropdownComponent = React.lazy(() => import("DropdownComponent/DropdownComponent"));
        return (
            <Suspense fallback={<div>Loading...</div>}>
                <DropdownComponent />
            </Suspense>
        );
    }
    return <Fragment></Fragment>;
};
