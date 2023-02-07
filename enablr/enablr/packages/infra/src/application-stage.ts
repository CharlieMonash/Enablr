/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { APIStack } from "./api-stack";
import { AuthStack } from "./auth-stack";
import { FrontendStack } from "./frontend-stack";
import { InsightsStack } from "./insights-stack";
import { ReminderStack } from "./reminder-stack";

export class ApplicationStage extends Stage {
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    const authStack = new AuthStack(this, "Auth");

    const apiStack = new APIStack(this, "API", {
      // Pass in the user pool with supporter logins
      userPool: authStack.userIdentity.userPool,
    });

    const reminderStack = new ReminderStack(this, "Reminder", {
      individualTable: apiStack.individualTable,
      reminderTable: apiStack.reminderTable,
      taskTable: apiStack.taskTable,
    });

    new FrontendStack(this, "Frontend", {
      userIdentity: authStack.userIdentity,
      apiURL: apiStack.apiGateway.url,
    });

    new InsightsStack(this, "Insights", {
      userEventLambda: reminderStack.individualEventLambda,
      supporterAPI: apiStack.supporterAPI,
      taskAPI: apiStack.taskAPI,
      individualAPI: apiStack.individualAPI,
      registerAPI: apiStack.registerAPI,
      authorizer: apiStack.authorizer,
      apiGateway: apiStack.apiGateway,
      deviceAPI: apiStack.deviceAPI,
    });
  }
}
