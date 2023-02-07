/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Header, Spinner } from "@cloudscape-design/components";
import { useContext, useEffect } from "react";
import { AppLayoutContext } from "./App";
import { RuntimeConfigContext } from "./Auth";
import { Supporter } from "./pages/supporter/Supporter";

/**
 * Component to render the home "/" route.
 */
export const SupportersHome: React.FC = () => {
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
          <Supporter supporterId={runtimeContext.user.attributes.sub} />
        ) : (
          <Spinner />
        )
      }
    </RuntimeConfigContext.Consumer>
  );
};
