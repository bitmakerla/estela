import React, { Fragment, Suspense } from "react";
import { Header } from "../shared";

export const ExternalRoutes = (): JSX.Element => {
    const ComponentRoutes = React.lazy(() => import("DropdownComponent/ComponentRoutes"));
    return (
        <>
            <Header />
            <ComponentRoutes />
        </>
    );
};

export const ExternalDropdownComponent = (): JSX.Element => {
    const DropdownComponent = React.lazy(() => import("DropdownComponent/DropdownComponent"));
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DropdownComponent />
        </Suspense>
    );
};
