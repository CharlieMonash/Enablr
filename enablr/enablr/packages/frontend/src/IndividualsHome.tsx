/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Header, Spinner } from "@cloudscape-design/components";
import { useContext, useEffect } from "react";
import { AppLayoutContext } from "./App";
import { RuntimeConfigContext } from "./Auth";
import { Individuals } from "./pages/individual/Individuals";

/**
 * Component to render the home "/" route.
 * This will load up a tab for each individual the current user has access to.
 */
export const IndividualsHome: React.FC = () => {
  const { setAppLayoutProps } = useContext(AppLayoutContext);

  useEffect(() => {
    setAppLayoutProps({
      contentHeader: <Header>Home</Header>,
    });
  }, [setAppLayoutProps]);

  return (
    <RuntimeConfigContext.Consumer>
      {({ runtimeContext }) =>
        runtimeContext.user ? (
          <Individuals supporterId={runtimeContext.user.attributes.sub} />
        ) : (
          <Spinner />
        )
      }
    </RuntimeConfigContext.Consumer>
  );
};
