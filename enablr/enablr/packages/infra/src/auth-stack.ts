/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { UserIdentity } from "@aws-prototyping-sdk/identity";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

export class AuthStack extends Stack {
  userIdentity: UserIdentity;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // TODO: Ensure MFA is on by default
    this.userIdentity = new UserIdentity(this, "UserIdentity");
  }
}
