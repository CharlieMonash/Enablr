/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Stack, StackProps } from "aws-cdk-lib";
import { ComputeType } from "aws-cdk-lib/aws-codebuild";
import { PDKPipeline } from "aws-prototyping-sdk/pipeline";
import { Construct } from "constructs";

export class PipelineStack extends Stack {
  readonly pipeline: PDKPipeline;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.pipeline = new PDKPipeline(this, "ApplicationPipeline", {
      primarySynthDirectory: "packages/infra/cdk.out",
      repositoryName: this.node.tryGetContext("repositoryName") || "monorepo",
      publishAssetsInParallel: false,
      crossAccountKeys: true,
      synth: {},
      dockerEnabledForSelfMutation: true,
      dockerEnabledForSynth: true,
      sonarCodeScannerConfig: this.node.tryGetContext("sonarqubeScannerConfig"),
      codeBuildDefaults: {
        buildEnvironment: {
          // Needs to be privileged to be able to use docker builds
          privileged: true,
          // Needs to be a bit larger for the docker builds
          computeType: ComputeType.LARGE,
        },
      },
    });
  }
}
