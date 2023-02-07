/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Stack, StackProps } from "aws-cdk-lib";
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import {
  Dashboard,
  GraphWidget,
  LogQueryVisualizationType,
  LogQueryWidget,
  Metric,
} from "aws-cdk-lib/aws-cloudwatch";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface InsightsProps extends StackProps {
  userEventLambda: lambda.Function;
  supporterAPI: lambda.Function;
  taskAPI: lambda.Function;
  individualAPI: lambda.Function;
  registerAPI: lambda.Function;
  deviceAPI: lambda.Function;
  authorizer: lambda.Function;
  apiGateway: RestApi;
}

export class InsightsStack extends Stack {
  constructor(scope: Construct, id: string, props: InsightsProps) {
    super(scope, id, props);

    const dashboard = new Dashboard(this, "EnablrDashboardDashboard", {
      dashboardName: "EnablrDashboard",
    });

    const invocations = new Metric({
      namespace: "AWS/Lambda",
      metricName: "Invocations",
      statistic: "sum",
    });

    const userEventWidget = new GraphWidget({
      title: "User Details Edits",
      left: [
        invocations.with({
          dimensionsMap: {
            FunctionName: props.userEventLambda.functionName,
          },
        }),
      ],
    });

    const appActivityWidget = new GraphWidget({
      title: "App activity",
      left: [
        invocations.with({
          dimensionsMap: {
            FunctionName: props.authorizer.functionName,
          },
        }),
      ],
    });

    const appRegistrationWidget = new GraphWidget({
      title: "App registration activity",
      // view: GraphWidgetView.BAR,
      left: [
        invocations.with({
          dimensionsMap: {
            FunctionName: props.registerAPI.functionName,
          },
        }),
      ],
    });

    const uniquePerHour = new LogQueryWidget({
      title: "Unique Supporters per hour",
      logGroupNames: [props.supporterAPI.logGroup.logGroupName],
      view: LogQueryVisualizationType.BAR,
      queryLines: [
        `'"proxy":"individuals'`,
        `parse message.requestContext.authorizer.claims '"sub":"*"' as sub`,
        "stats count_distinct(sub) as unique_individuals by bin(1h)",
        "sort @timestamp desc",
      ],
    });

    const dashboardVisits = new LogQueryWidget({
      title: "Total calls to load individuals on a dashboard",
      logGroupNames: [props.supporterAPI.logGroup.logGroupName],
      view: LogQueryVisualizationType.BAR,
      queryLines: [
        `fields strcontains(@message, '"proxy":"individuals') as call_count`,
        "stats sum(call_count) as calls by bin(10s)",
        "sort @timestamp desc",
      ],
    });

    const callsToCheckTask = new LogQueryWidget({
      title: "Calls to complete a task",
      logGroupNames: [props.deviceAPI.logGroup.logGroupName],
      view: LogQueryVisualizationType.BAR,
      // The lines will be automatically combined using '\n|'.
      queryLines: [
        `fields strcontains(@message, '"proxy":"update-reminder') as call_count`,
        "stats sum(call_count) as calls by bin(10s)",
        "sort @timestamp desc",
      ],
    });

    // This will be multiple hits if an individual has multiple tasks
    const callsToLoadAPP = new LogQueryWidget({
      title: "Calls to load tasks",
      logGroupNames: [props.deviceAPI.logGroup.logGroupName],
      view: LogQueryVisualizationType.BAR,
      queryLines: [
        `fields strcontains(@message, '"proxy":"reminders') as call_count`,
        "stats sum(call_count) as calls by bin(10s)",
        "sort @timestamp desc",
      ],
    });

    dashboard.addWidgets(userEventWidget, uniquePerHour, dashboardVisits);
    dashboard.addWidgets(appActivityWidget, appRegistrationWidget);
    dashboard.addWidgets(callsToLoadAPP, callsToCheckTask);
  }
}
