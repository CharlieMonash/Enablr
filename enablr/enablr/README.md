# Enablr Prototype

**Note: If using windows this will require wsl2 and some instructions may deviate**

For technical decisions, detailed architecture and cost modelling: refer to the Path-to-Production document supplied at the end of the prototype journey.

## Getting Started

Ensure you have the following installed globally:

- [node > 14](https://nodejs.org/en/download/package-manager/) (or use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to install) C(y)
- [yarn](https://classic.yarnpkg.cdockom/lang/en/docs/install)
- [Python >= 3.7](https://www.python.org/downloads/)
- [AWS cli](https://aws.amazon.com/cli/)
- [CDK cli](https://docs.aws.amazon.com/cdk/v2/guide/cli.html)
- [docker desktop](https://www.docker.com/products/docker-desktop/)
- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

This should be all you need to get started. Pay attention to console errors that may indicate missing tools and packages.

## Building and deploying

### Dashboard

- Configure your aws CLI (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html). This will help automate your deployments
- Ensure docker desktop is running

- From the root of the directory run:

  - `yarn`
  - move to the `packages/frontend` directory. There might be eslint warnings output here. They can be safely ignored.
  - run `yarn build`
  - move to the `packages/infra` directory
  - run `cdk list` if everything is setup properly you should see an output. This may take a while the first time it runs.
  - If you have never run CDK in this account you will first need to bootstrap the account [CDK Bootstrap](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html)
  - run `cdk deploy Dev/Frontend` - Both of these may take a long time to run ~ 15 - 30 minutes
  - run `cdk deploy Dev/Reminder` - Both of these may take a long time to run ~ 15 - 30 minutes

_If you are wanting an automatically delivered pipeline solution please see the codePipeline section._

- From within the AWS console:
- Go to the [cognito console](https://ap-southeast-2.console.aws.amazon.com/cognito/v2/home?region=ap-southeast-2#)
  - Go into the first user pool
  - Under the Sign-in experience tab scroll down to the `Multi-factor authentication` section and click 'edit'
  - Allow authenticator apps
- Go to the [cloudfront] page. You should see a single record. Go to the domain. It will look like `d3xxxxxeldy.cloudfront.net` This is where your frontend is hosted.

Now the website is up and running you need to populate some data.
A script has been written that uses python to do this. See the `scripts/` directory.

Open up the `populate-all-data.py` file. There are values in here you need to add:

- Add the email of the supporter
- Change the supporter and childs names if needed

Once the values are to your liking, the below command will populate a set of data into your environment. _NOTE_ before doing this replace the values with the names of your new dynamoDB tables and Cognito userpool id. They can be found in the DynamoDB section and cognito sections in the AWS console, respectfully.

There has been some portion of a value provided, replace the entire string from within the quotes, the examples provided are to give an indication of what the identifier would look like.

Before running this you will need to install `boto3` for python using `pip install boto3`

```
SUPPORTER_TABLE_NAME="Dev-API-SupporterTable450A3E4A-7DU503G04XFI" \
INDIVIDUAL_TABLE_NAME="Dev-API-IndividualsTable05A6AA06-17X3FRB7GOSSK" \
TASK_TABLE_NAME="Dev-API-TaskTable22070546-1L0KUWL7ZI3OC" \
ACCESS_TABLE_NAME="Dev-API-AccessTable13A21DD9-EOMZOM4AHXPA" \
USER_POOL_ID="us-east-1_X4Mw37FJJ" \
python3 populate-all-data.py
```

If this runs successfully, then you will get no errors and a 'Ran successfully' print in the console.

Within about 5 minute (typically) the email address will be sent login details.

Go to the login screen (the address for this is in cloudfront) and use the details to log in. _Careful, the email always appends a full stop `.` to the temporary password. No idea why, but don't accidentally copy paste the full stop._

When you have successfully logged in you should be presented with a dashboard and a single child you have access to.

There are several other scripts in the `/scripts` directory that can be used moving forwards. Feel free to edit as needed, the breakdown should help describe the data model and assist with creating data in the future.

Should this script mess up due to an error. Delete the records it created in DynamoDB from the AWS console and try again with guidance from the error output.

#### Adding in historical dummy data

In order to show off the best aspects of the dashboard it's necessary to have 'good looking' data such as reminders that might be partially filled out over time.

One of the problems with doing demos with large spaces of time in between is that the data might get stale and you could end up with a poor set of data for demos.

In this repo there is another script under `/scripts` called `backfill-data.py` that is run the same way as the previous scripts. it will require the Individuals table name as well as the reminders table name.

Before running this you will need to run `pip install pytz`

You will need to provide the individuals_id that you can find in the individuals table in DynamoDB. The script will then backfill the last month of data with increasing task completion rates.

Up to the current time.

Once you have all the values you can run the command

```bash
INDIVIDUAL_TABLE_NAME="Dev-API-Indi<your individuals table name replace this whole string>" \
REMINDER_TABLE_NAME="Dev-API-ReminderTa<your reminder table name replace this whole string>" \
INDIVIDUAL_ID="1ac063b5-ab12-49b<your individuals id replace this whole string>" \
python3 backfill-data.py
```

#### Developing with the frontend locally

In order to run the frontend locally you need to have the solution fully deployed. You will need to find a file within the s3 bucket create for the frontend. Upon navigating to S3 there will be a bucket named similar to: `dev-frontend-staticwebsitewebsitebucket0fdxxxxxxx-xxxxxxx` the file in there called `runtime-config.json` should be downloaded locally and placed into the `packages/frontend/public/runtime-config.json` position.

Then from the `packages/frontend` directory run `yarn dev`

### Mobile APP!!!

Within the `packages/app` directory there is a flutter app, used in the app workflow to check off tasks.

This app is intended as a demonstration, as such it has no deployment process and runs in debug mode on a device.

It's suggested that you follow the [flutter install steps](https://docs.flutter.dev/get-started/install) and the [editor setup steps](https://docs.flutter.dev/get-started/editor)

When that's finished, open the flutter app directory within your chosen IDE (Tested with visual studio code)
Within the file `packages/app/enablr_flutter_application/lib/consts.dart` you will need to edit the API URL to be the one that the frontend uses. It looks something like `https://efwetgaas.execute-api.ap-southeast-2.amazonaws.com`

and run in debug mode (f5 on most IDE's).

Before this will work on the QR code of the dashboard, there is one more process:

In a fresh directory you need to generate a public/private signing key combination using openssl

```
openssl genrsa -out jwt-key 4096
openssl rsa -in jwt-key -pubout > jwt-key.pub
```

This will generate two files, jwt-key and jwt-pub.

Next the process of adding these keys into AWS to be used in the workflow:

- Secrets manager
- Parameter store
- Name it /jwt-public
- Create parameter
- SecureString
- My Current Account
- leave KMS Key ID as default
- Paste the public key value into the value
- this should start with -----BEGIN PUBLIC KEY-----

Now do the same but with the name
/jwt-private

and paste the jwt-key content.

Once this is all done and running your QR code scanning demo should work.

### Insights

Within the `packages/infra` directory there is an insights stack. This stack adds a cloudwatch dashboard into the AWS console with several widgets already added. Run `cdk deploy Dev/Insights` to have this deployed.

## Usage of projen/nx

This project is built using [projen](https://github.com/projen/projen) and [nx](https://nx.dev/getting-started/intro) as such all tasks should be invoked
via either:

- `npx nx run-many --target=<task> --all` - executes the `<task>` on every package, in dependency order.
- `npx nx run <package_name>:<task>` - executes the `<task>` on the specified `<package_name>`.

To build the full project, run `npx nx run-many --target=build --all`

Any change to `projects/*` or `.projenrc.ts` requires a synth to be executed. To do this, run: `npx projen` from the root directory.

This includes adding libraries to package.json, modifications to other config files such as eslint and related documents.

This setup is not essential to continued development if found to be unnecessary.

## Packages

Within the packages directory the solution is broken up into functional components

### Infra

The infra directory contains all the code that is used within AWS. This includes security, databases, apis, and functions that help events propogate throughout the system.

Use use an infrastructure as code framework called [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/home.html). The language used is Typescript in this instance.

### CodePipeline and CI/CD

When building prototypes we utilize AWS CodePipeline to deploy our code. Within the CDK code in the `packages/infra` directory there is a pipeline construct. This is what we use to automatically deploy code once it has been pushed into a git repository.

Within the directory running `cdk deploy pipeline` will instantiate a code repository in codeCommit, and a CI/CD workflow.

In order to interface with the repository in CodeCommit it is recommended to set up the [GRC tool](https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-git-remote-codecommit.html)
