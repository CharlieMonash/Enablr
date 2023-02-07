import { CloudscapeReactTsWebsiteProject } from "@aws-prototyping-sdk/cloudscape-react-ts-website";
import { pipeline, nx_monorepo } from "aws-prototyping-sdk";
import { ApprovalLevel } from "projen/lib/awscdk";

const monorepo = new nx_monorepo.NxMonorepoProject({
  defaultReleaseBranch: "mainline",
  devDeps: [
    "aws-prototyping-sdk",
    "@aws-prototyping-sdk/cloudscape-react-ts-website",
  ],
  name: "monorepo",
});

const frontend = new CloudscapeReactTsWebsiteProject({
  applicationName: "enablr",
  defaultReleaseBranch: "main",
  parent: monorepo,
  devDeps: ["@aws-prototyping-sdk/cloudscape-react-ts-website"],
  name: "enablr",
  outdir: "packages/frontend",

  deps: ["react-qr-code"],
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});

frontend.eslint?.addRules({
  quotes: [
    "error",
    "double",
    {
      avoidEscape: true,
    },
  ],
  "comma-dangle": ["error", "only-multiline"],
  "@typescript-eslint/indent": ["warn", 2],
});

new pipeline.PDKPipelineTsProject({
  defaultReleaseBranch: "mainline",
  name: "infra",
  cdkVersion: "2.0.0",
  appEntrypoint: "pipeline.ts",
  parent: monorepo,
  requireApproval: ApprovalLevel.NEVER,
  outdir: "packages/infra",
  tsconfig: {
    compilerOptions: {
      lib: ["es2019", "dom"],
    },
  },
  deps: [
    "@aws-prototyping-sdk/identity",
    "@aws-prototyping-sdk/static-website",
    "@aws-cdk/aws-cognito-identitypool-alpha",
    "cdk-lambda-powertools-python-layer",
    "@aws-cdk/aws-lambda-python-alpha",
  ],
});

monorepo.synth();
