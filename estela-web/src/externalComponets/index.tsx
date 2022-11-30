import React, { Suspense } from "react";

export const ExternalRoutes = (): JSX.Element => {
    const ComponentRoutes = React.lazy(() => import("DropdownComponent/ComponentRoutes"));
    return (
        <>
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
