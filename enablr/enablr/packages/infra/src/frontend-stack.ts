/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import path from "path";
import { UserIdentity } from "@aws-prototyping-sdk/identity";
import {
  StaticWebsite,
  StaticWebsiteOrigin,
} from "@aws-prototyping-sdk/static-website";
import { Stack, StackProps } from "aws-cdk-lib";
import { GeoRestriction } from "aws-cdk-lib/aws-cloudfront";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

interface FrontendProps extends StackProps {
  userIdentity: UserIdentity;
  apiURL: string;
}

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id, props);

    // This has to be done for all these values to prevent issues with the StaticWebsite construct.
    const userPoolId = new StringParameter(this, "UserPoolId", {
      parameterName: "UserPoolId",
      stringValue: props.userIdentity.userPool!.userPoolId,
    });
    const userPoolClientId = new StringParameter(this, "UserPoolClientId", {
      parameterName: "UserPoolClientId",
      stringValue: props.userIdentity.userPoolClient?.userPoolClientId || "x",
    });
    const identityPoolId = new StringParameter(this, "IdentityPoolId", {
      parameterName: "IdentityPoolId",
      stringValue: props.userIdentity.identityPool.identityPoolId,
    });
    const apiDomain = new StringParameter(this, "ApiGWDomain", {
      parameterName: "ApiGWDomain",
      stringValue: props.apiURL,
    });

    new StaticWebsite(this, "StaticWebsite", {
      distributionProps: {
        defaultBehavior: { origin: StaticWebsiteOrigin },
        geoRestriction: GeoRestriction.allowlist("AU"),
      },
      websiteContentPath: path.join(__dirname, "../../frontend/build"),
      runtimeOptions: {
        jsonPayload: {
          region: Stack.of(this).region,
          identityPoolId: identityPoolId.stringValue,
          userPoolId: userPoolId.stringValue,
          userPoolWebClientId: userPoolClientId.stringValue,
          apiURL: apiDomain.stringValue,
        },
      },
    });
  }
}
